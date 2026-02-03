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
    <div className="min-h-screen bg-white">
      {/* Print controls - hidden when printing */}
      <div className="print:hidden sticky top-0 z-10 flex items-center justify-between border-b bg-background p-4">
        <Button variant="outline" onClick={handleBack}>
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
              <Button variant="outline" disabled={loading}>
                <Download className="mr-2 h-4 w-4" />
                {loading ? "Gerando..." : "Baixar PDF"}
              </Button>
            )}
          </PDFDownloadLink>
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            Imprimir
          </Button>
        </div>
      </div>

      {/* Report content */}
      <div className="mx-auto max-w-4xl p-8 print:p-4">
        {/* Header */}
        <div className="mb-8 border-b pb-6">
          <h1 className="text-2xl font-bold text-foreground">
            RELATÓRIO DE ATENDIMENTOS
          </h1>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">Cliente:</span>{" "}
              {clientName}
            </p>
            <p>
              <span className="font-medium text-foreground">Período:</span>{" "}
              {periodStart} - {periodEnd}
            </p>
            <p>
              <span className="font-medium text-foreground">Emissão:</span>{" "}
              {emissionDate}
            </p>
          </div>
        </div>

        {/* Summary */}
        <div className="mb-8 rounded-lg border bg-muted/30 p-6">
          <h2 className="mb-4 text-lg font-semibold">RESUMO</h2>
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <p className="text-muted-foreground">Total de Atendimentos</p>
              <p className="text-xl font-bold">{totalTickets}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Horas Consumidas</p>
              <p className="text-xl font-bold">{formatHours(totalHours)}</p>
            </div>
            {contract && (
              <>
                <div>
                  <p className="text-muted-foreground">Horas Contratadas</p>
                  <p className="text-xl font-bold">
                    {formatHours(contractedHours)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Saldo</p>
                  <p
                    className={`text-xl font-bold ${
                      remainingHours <= 0 ? "text-destructive" : "text-success"
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
          <h2 className="mb-4 text-lg font-semibold">ATENDIMENTOS</h2>
          {tickets.length > 0 ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left font-medium">Data</th>
                  <th className="p-2 text-left font-medium">Solicitante</th>
                  <th className="p-2 text-center font-medium">Horas</th>
                  <th className="p-2 text-left font-medium">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr key={ticket.id} className="border-b">
                    <td className="p-2 whitespace-nowrap">
                      {formatDate(ticket.service_date)}
                    </td>
                    <td className="p-2">{ticket.requester_name}</td>
                    <td className="p-2 text-center font-medium">
                      {formatHours(ticket.billed_hours)}
                    </td>
                    <td className="p-2 max-w-xs">
                      <span className="line-clamp-2">{ticket.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 font-medium">
                  <td className="p-2" colSpan={2}>
                    Total
                  </td>
                  <td className="p-2 text-center">{formatHours(totalHours)}</td>
                  <td className="p-2"></td>
                </tr>
              </tfoot>
            </table>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum atendimento encontrado no período selecionado.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="mt-12 border-t pt-4 text-center text-xs text-muted-foreground">
          Relatório gerado automaticamente pelo sistema
        </div>
      </div>
    </div>
  );
}
