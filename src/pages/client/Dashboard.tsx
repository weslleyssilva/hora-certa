import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Clock, FileText, Ticket, Package, AlertTriangle, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatHours, truncate, calculatePercentage, isContractActive } from "@/lib/utils";
import { TICKET_STATUS, TICKET_STATUS_LABELS, TICKET_STATUS_VARIANTS } from "@/lib/constants";

interface Contract {
  id: string;
  start_date: string;
  end_date: string;
  contracted_hours: number;
}

interface TicketSummary {
  id: string;
  title: string | null;
  service_date: string;
  requester_name: string;
  billed_hours: number;
  description: string;
  status: string;
}

interface ProductSummary {
  id: string;
  product_name: string;
  quantity: number;
}

interface OpenTicket {
  id: string;
  title: string | null;
  description: string;
  status: string;
  created_at: string;
}

export default function ClientDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [activeContract, setActiveContract] = useState<Contract | null>(null);
  const [consumedHours, setConsumedHours] = useState(0);
  const [recentTickets, setRecentTickets] = useState<TicketSummary[]>([]);
  const [openTickets, setOpenTickets] = useState<OpenTicket[]>([]);
  const [currentProducts, setCurrentProducts] = useState<ProductSummary[]>([]);
  const [clientName, setClientName] = useState("");

  useEffect(() => {
    if (profile?.client_id) {
      loadDashboardData();
    }
  }, [profile?.client_id]);

  const loadDashboardData = async () => {
    if (!profile?.client_id) return;

    try {
      // Carregar dados do cliente
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", profile.client_id)
        .single();

      if (client) setClientName(client.name);

      // Buscar contrato ativo
      const today = new Date().toISOString().split("T")[0];
      const { data: contracts } = await supabase
        .from("contracts")
        .select("*")
        .eq("client_id", profile.client_id)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .limit(1);

      const contract = contracts?.[0] || null;
      setActiveContract(contract);

      // Calcular horas consumidas no período do contrato
      if (contract) {
        const { data: tickets } = await supabase
          .from("tickets")
          .select("billed_hours")
          .eq("client_id", profile.client_id)
          .gte("service_date", contract.start_date)
          .lte("service_date", contract.end_date);

        const total = tickets?.reduce((sum, t) => sum + t.billed_hours, 0) || 0;
        setConsumedHours(total);
      }

      // Últimos 5 atendimentos concluídos
      const { data: ticketsData } = await supabase
        .from("tickets")
        .select("id, title, service_date, requester_name, billed_hours, description, status")
        .eq("client_id", profile.client_id)
        .eq("status", "completed")
        .order("service_date", { ascending: false })
        .limit(5);

      setRecentTickets(ticketsData || []);

      // Chamados abertos/em andamento
      const { data: openTicketsData } = await supabase
        .from("tickets")
        .select("id, title, description, status, created_at")
        .eq("client_id", profile.client_id)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5);

      setOpenTickets(openTicketsData || []);

      // Produtos do mês atual
      const currentMonth = new Date().toISOString().slice(0, 7);
      const { data: productsData } = await supabase
        .from("products_used")
        .select("id, product_name, quantity")
        .eq("client_id", profile.client_id)
        .eq("competence_month", currentMonth)
        .limit(5);

      setCurrentProducts(productsData || []);
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  const remainingHours = activeContract ? activeContract.contracted_hours - consumedHours : 0;
  const usagePercentage = activeContract
    ? calculatePercentage(consumedHours, activeContract.contracted_hours)
    : 0;

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard"
        description={`Bem-vindo, ${clientName}`}
        icon={LayoutDashboard}
      />

      {/* Contrato Ativo */}
      {activeContract ? (
        <div className="grid gap-6 md:grid-cols-4 mb-8">
          <MetricCard
            title="Contrato Vigente"
            value={`${formatDate(activeContract.start_date)} - ${formatDate(activeContract.end_date)}`}
            icon={FileText}
            variant="primary"
          />
          <MetricCard
            title="Horas Contratadas"
            value={formatHours(activeContract.contracted_hours)}
            icon={Clock}
          />
          <MetricCard
            title="Horas Consumidas"
            value={formatHours(consumedHours)}
            subtitle={`${usagePercentage}% utilizado`}
            icon={Ticket}
            variant={usagePercentage > 90 ? "warning" : "default"}
          />
          <MetricCard
            title="Saldo Disponível"
            value={formatHours(remainingHours)}
            icon={Clock}
            variant={remainingHours <= 0 ? "destructive" : "success"}
          />
        </div>
      ) : (
        <Card className="mb-8 border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-4 py-6">
            <AlertTriangle className="h-8 w-8 text-warning" />
            <div>
              <h3 className="font-semibold">Sem contrato ativo</h3>
              <p className="text-sm text-muted-foreground">
                Não há contrato vigente no momento. Entre em contato com o suporte.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Barra de Progresso */}
      {activeContract && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-base">Consumo do Contrato</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={usagePercentage} className="h-3" />
            <div className="mt-2 flex justify-between text-sm text-muted-foreground">
              <span>{formatHours(consumedHours)} consumidas</span>
              <span>{formatHours(activeContract.contracted_hours)} total</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chamados Abertos */}
      {openTickets.length > 0 && (
        <Card className="mb-8 border-warning/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Ticket className="h-5 w-5 text-warning" />
                  Chamados em Aberto
                </CardTitle>
                <CardDescription>Acompanhe seus chamados pendentes</CardDescription>
              </div>
              <Button onClick={() => navigate("/tickets")} variant="outline" size="sm">
                Ver Todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {openTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {ticket.title || "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge variant={TICKET_STATUS_VARIANTS[ticket.status]}>
                        {TICKET_STATUS_LABELS[ticket.status]}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {truncate(ticket.description, 60)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Últimos Atendimentos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ticket className="h-5 w-5" />
              Últimos Atendimentos
            </CardTitle>
            <CardDescription>5 atendimentos concluídos mais recentes</CardDescription>
          </CardHeader>
          <CardContent>
            {recentTickets.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="font-medium">
                        {formatDate(ticket.service_date)}
                      </TableCell>
                      <TableCell>{formatHours(ticket.billed_hours)}</TableCell>
                      <TableCell className="max-w-[200px]">
                        {truncate(ticket.description, 50)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Nenhum atendimento"
                description="Ainda não há atendimentos concluídos."
              />
            )}
          </CardContent>
        </Card>

        {/* Produtos do Mês */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Produtos do Mês
            </CardTitle>
            <CardDescription>Produtos utilizados neste mês</CardDescription>
          </CardHeader>
          <CardContent>
            {currentProducts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">
                        {product.product_name}
                      </TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Nenhum produto"
                description="Não há produtos registrados para este mês."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
