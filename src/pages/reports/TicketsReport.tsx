import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PageLoader } from "@/components/ui/loading-spinner";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft, Download } from "lucide-react";
import { formatDate, formatHours } from "@/lib/utils";
import { PDFDownloadLink } from "@react-pdf/renderer";
import { TicketsReportPDF } from "./TicketsReportPDF";

interface TicketData {
  id: string;
  service_date: string;
  requester_name: string;
  billed_hours: number;
  description: string;
  status: string;
}

interface ContractData {
  contracted_hours: number;
  start_date: string;
  end_date: string;
}

export default function TicketsReport() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { profile, isAdmin, isLoading: isAuthLoading } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [contract, setContract] = useState<ContractData | null>(null);
  const [clientName, setClientName] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Extract params
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const clientIdParam = searchParams.get("clientId");
  const searchParam = searchParams.get("search");

  useEffect(() => {
    if (!isAuthLoading && profile) {
      loadReportData();
    }
  }, [isAuthLoading, profile, fromParam, toParam, clientIdParam]);

  const loadReportData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Determine the client_id to use
      // CLIENT_USER: always use their own client_id (security enforcement)
      // ADMIN: can use clientIdParam or show all
      let effectiveClientId: string | null = null;

      if (!isAdmin) {
        // CLIENT_USER - force their own client_id
        if (!profile?.client_id) {
          setError("Usuário não possui cliente associado");
          return;
        }
        effectiveClientId = profile.client_id;
      } else {
        // ADMIN - use param if provided
        effectiveClientId = clientIdParam;
      }

      // Load client name if we have a specific client
      if (effectiveClientId) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("name")
          .eq("id", effectiveClientId)
          .single();

        if (clientData) {
          setClientName(clientData.name);
        }

        // Load active contract
        const today = new Date().toISOString().split("T")[0];
        const { data: contractData } = await supabase
          .from("contracts")
          .select("contracted_hours, start_date, end_date")
          .eq("client_id", effectiveClientId)
          .lte("start_date", today)
          .gte("end_date", today)
          .order("start_date", { ascending: false })
          .limit(1);

        if (contractData && contractData.length > 0) {
          setContract(contractData[0]);
        }
      } else {
        setClientName("Todos os Clientes");
      }

      // Build tickets query
      let query = supabase
        .from("tickets")
        .select("id, service_date, requester_name, billed_hours, description, status")
        .order("service_date", { ascending: false });

      // Apply client filter (RLS will also enforce for CLIENT_USER)
      if (effectiveClientId) {
        query = query.eq("client_id", effectiveClientId);
      }

      // Apply date filters
      if (fromParam) {
        query = query.gte("service_date", fromParam);
      }
      if (toParam) {
        query = query.lte("service_date", toParam);
      }

      // Apply search filter
      if (searchParam) {
        query = query.or(
          `requester_name.ilike.%${searchParam}%,description.ilike.%${searchParam}%`
        );
      }

      const { data: ticketsData, error: ticketsError } = await query;

      if (ticketsError) throw ticketsError;

      setTickets(ticketsData || []);
    } catch (err) {
      console.error("Error loading report data:", err);
      setError("Erro ao carregar dados do relatório");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate(-1);
  };

  if (isAuthLoading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <PageLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
      </div>
    );
  }

  // Calculate summary
  const totalTickets = tickets.length;
  const totalHours = tickets.reduce((sum, t) => sum + t.billed_hours, 0);
  const contractedHours = contract?.contracted_hours || 0;
  const remainingHours = Math.max(0, contractedHours - totalHours);

  // Format dates for display
  const periodStart = fromParam ? formatDate(fromParam) : "Início";
  const periodEnd = toParam ? formatDate(toParam) : "Fim";
  const emissionDate = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Print controls - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={handleBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex gap-2">
          <PDFDownloadLink
            document={
              <TicketsReportPDF
                clientName={clientName}
                periodStart={fromParam || ""}
                periodEnd={toParam || ""}
                tickets={tickets}
                contractedHours={contract?.contracted_hours}
              />
            }
            fileName={`relatorio-atendimentos-${fromParam || "inicio"}-${toParam || "fim"}.pdf`}
          >
            {({ loading }) => (
              <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                {loading ? "Gerando..." : "Baixar PDF"}
              </Button>
            )}
          </PDFDownloadLink>
          <Button variant="outline" className="border-primary text-primary hover:bg-primary/10" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Report content */}
      <div className="mx-auto max-w-4xl p-8 print:p-4">
        {/* Header */}
        <div className="mb-8 border-b border-gray-300 pb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            RELATÓRIO DE ATENDIMENTOS
          </h1>
          <div className="mt-4 space-y-1 text-sm">
            <p>
              <span className="font-medium text-gray-900">Cliente:</span>{" "}
              <span className="text-gray-700">{clientName}</span>
            </p>
            <p>
              <span className="font-medium text-gray-900">Período:</span>{" "}
              <span className="text-gray-700">{periodStart} - {periodEnd}</span>
            </p>
            <p>
              <span className="font-medium text-gray-900">Emissão:</span>{" "}
              <span className="text-gray-700">{emissionDate}</span>
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-8 rounded-lg border border-gray-300 bg-gray-100 p-6 print:bg-gray-100">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">RESUMO</h2>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-gray-600">Total de Atendimentos</p>
              <p className="text-xl font-bold text-gray-900">{totalTickets}</p>
            </div>
            <div>
              <p className="text-gray-600">Horas Consumidas</p>
              <p className="text-xl font-bold text-gray-900">{formatHours(totalHours)}</p>
            </div>
            {contract && (
              <>
                <div>
                  <p className="text-gray-600">Horas Contratadas</p>
                  <p className="text-xl font-bold text-gray-900">
                    {formatHours(contractedHours)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Saldo</p>
                  <p
                    className={`text-xl font-bold ${
                      remainingHours <= 0 ? "text-red-600" : "text-green-600"
                    }`}
                  >
                    {formatHours(remainingHours)}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Tickets table */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-gray-900">ATENDIMENTOS</h2>
          {tickets.length > 0 ? (
            <table className="w-full border-collapse text-sm border border-gray-300">
              <thead>
                <tr className="border-b border-gray-300 bg-gray-100 print:bg-gray-100">
                  <th className="p-2 text-left font-semibold text-gray-900">Data</th>
                  <th className="p-2 text-left font-semibold text-gray-900">Solicitante</th>
                  <th className="p-2 text-center font-semibold text-gray-900">Horas</th>
                  <th className="p-2 text-left font-semibold text-gray-900">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b border-gray-200">
                    <td className="p-2 whitespace-nowrap text-gray-800">
                      {formatDate(ticket.service_date)}
                    </td>
                    <td className="p-2 text-gray-800">{ticket.requester_name}</td>
                    <td className="p-2 text-center font-medium text-gray-800">
                      {formatHours(ticket.billed_hours)}
                    </td>
                    <td className="p-2 max-w-xs text-gray-800">
                      <span className="line-clamp-2">{ticket.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-semibold print:bg-gray-100">
                  <td className="p-2 text-gray-900" colSpan={2}>
                    Total
                  </td>
                  <td className="p-2 text-center text-gray-900">{formatHours(totalHours)}</td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="py-8 text-center text-gray-500">
              Nenhum atendimento encontrado no período selecionado.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 border-t border-gray-300 pt-4 text-center text-xs text-gray-500">
          Relatório gerado automaticamente pelo sistema
        </div>
      </div>
    </div>
  );
}
