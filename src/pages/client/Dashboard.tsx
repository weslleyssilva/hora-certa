import { useEffect, useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { AreaChart } from "@/components/charts/AreaChart";
import { BarChart } from "@/components/charts/BarChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { PeriodFilter, Period } from "@/components/filters/PeriodFilter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Clock, FileText, TrendingUp, Users, Ticket, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, truncate } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { TICKET_STATUS_LABELS, TICKET_STATUS_VARIANTS } from "@/lib/constants";

interface Contract {
  id: string;
  start_date: string;
  end_date: string;
  contracted_hours: number;
}

interface TicketData {
  id: string;
  service_date: string;
  requester_name: string;
  description: string;
  billed_hours: number;
  status: string;
  title: string | null;
  created_at: string;
}

interface Product {
  product_name: string;
  quantity: number;
}

interface DataPoint {
  name: string;
  value: number;
}

export default function ClientDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [contract, setContract] = useState<Contract | null>(null);
  const [clientName, setClientName] = useState("");
  const [period, setPeriod] = useState<Period>(() => {
    const now = new Date();
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  });

  // Data states
  const [consumedHours, setConsumedHours] = useState(0);
  const [ticketCount, setTicketCount] = useState(0);
  const [consumptionByDay, setConsumptionByDay] = useState<DataPoint[]>([]);
  const [ticketsByDay, setTicketsByDay] = useState<DataPoint[]>([]);
  const [topRequesters, setTopRequesters] = useState<DataPoint[]>([]);
  const [recentTickets, setRecentTickets] = useState<TicketData[]>([]);
  const [openTickets, setOpenTickets] = useState<TicketData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const contractPeriod = useMemo(() => {
    if (!contract) return undefined;
    return {
      startDate: parseISO(contract.start_date),
      endDate: parseISO(contract.end_date),
    };
  }, [contract]);

  useEffect(() => {
    loadInitialData();
  }, [profile?.client_id]);

  useEffect(() => {
    if (profile?.client_id) {
      loadDashboardData();
    }
  }, [profile?.client_id, period]);

  const loadInitialData = async () => {
    if (!profile?.client_id) return;

    try {
      // Load client name
      const { data: client } = await supabase
        .from("clients")
        .select("name")
        .eq("id", profile.client_id)
        .single();

      if (client) setClientName(client.name);

      // Load active contract
      const today = new Date().toISOString().split("T")[0];
      const { data: contracts } = await supabase
        .from("contracts")
        .select("id, start_date, end_date, contracted_hours")
        .eq("client_id", profile.client_id)
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false })
        .limit(1);

      const activeContract = contracts?.[0] || null;
      if (activeContract) {
        setContract(activeContract);
        setPeriod({
          startDate: parseISO(activeContract.start_date),
          endDate: parseISO(activeContract.end_date),
        });
      }

      // Load open tickets
      const { data: openTicketsData } = await supabase
        .from("tickets")
        .select("id, title, description, status, created_at, service_date, requester_name, billed_hours")
        .eq("client_id", profile.client_id)
        .in("status", ["open", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5);

      setOpenTickets(openTicketsData || []);
    } catch (error) {
      console.error("Error loading initial data:", error);
    }
  };

  const loadDashboardData = async () => {
    if (!profile?.client_id) return;
    setIsLoading(true);

    try {
      const startStr = format(period.startDate, "yyyy-MM-dd");
      const endStr = format(period.endDate, "yyyy-MM-dd");

      const { data: tickets } = await supabase
        .from("tickets")
        .select("id, service_date, requester_name, description, billed_hours, status, title, created_at")
        .eq("client_id", profile.client_id)
        .gte("service_date", startStr)
        .lte("service_date", endStr)
        .order("service_date", { ascending: false });

      if (tickets) {
        const totalHours = tickets.reduce((sum, t) => sum + t.billed_hours, 0);
        setConsumedHours(totalHours);
        setTicketCount(tickets.length);
        setRecentTickets(tickets.slice(0, 10));

        const byDay: Record<string, { hours: number; count: number }> = {};
        tickets.forEach((t) => {
          if (!byDay[t.service_date]) {
            byDay[t.service_date] = { hours: 0, count: 0 };
          }
          byDay[t.service_date].hours += t.billed_hours;
          byDay[t.service_date].count += 1;
        });

        const sortedDays = Object.keys(byDay).sort();
        setConsumptionByDay(
          sortedDays.map((d) => ({
            name: format(parseISO(d), "dd/MM", { locale: ptBR }),
            value: byDay[d].hours,
          }))
        );
        setTicketsByDay(
          sortedDays.map((d) => ({
            name: format(parseISO(d), "dd/MM", { locale: ptBR }),
            value: byDay[d].count,
          }))
        );

        const byRequester: Record<string, number> = {};
        tickets.forEach((t) => {
          byRequester[t.requester_name] =
            (byRequester[t.requester_name] || 0) + t.billed_hours;
        });
        setTopRequesters(
          Object.entries(byRequester)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)
        );
      }

      const currentMonth = format(new Date(), "yyyy-MM");
      const { data: productsData } = await supabase
        .from("products_used")
        .select("product_name, quantity")
        .eq("client_id", profile.client_id)
        .eq("competence_month", currentMonth);

      if (productsData) {
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const saldoHoras = contract ? contract.contracted_hours - consumedHours : 0;

  if (isLoading && !contract && !clientName) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-28" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <PageHeader
            title="Dashboard"
            description={clientName ? `Bem-vindo, ${clientName}` : "Carregando..."}
            className="mb-0"
          />
          <PeriodFilter
            value={period}
            onChange={setPeriod}
            contractPeriod={contractPeriod}
            showContractOption={!!contract}
          />
        </div>

        {/* No contract warning */}
        {!contract && (
          <Card className="border-warning/50 bg-warning/5">
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

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Horas Contratadas"
            value={contract ? `${contract.contracted_hours}h` : "N/A"}
            icon={FileText}
            variant="primary"
          />
          <KPICard
            title="Horas Consumidas"
            value={`${consumedHours}h`}
            icon={Clock}
          />
          <KPICard
            title="Saldo Disponível"
            value={`${saldoHoras}h`}
            icon={TrendingUp}
            variant={saldoHoras < 0 ? "destructive" : saldoHoras < 5 ? "warning" : "success"}
          />
          <KPICard
            title="Atendimentos"
            value={ticketCount}
            icon={Users}
          />
        </div>

        {/* Progress bar */}
        {contract && (
          <Card className="border-border/50">
            <CardContent className="pt-6">
              <ProgressBar
                value={consumedHours}
                max={contract.contracted_hours}
                label="Consumo do Contrato"
              />
            </CardContent>
          </Card>
        )}

        {/* Open tickets */}
        {openTickets.length > 0 && (
          <Card className="border-warning/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <Ticket className="h-4 w-4 text-warning" />
                    Chamados em Aberto
                  </CardTitle>
                  <CardDescription className="text-sm">Acompanhe seus chamados pendentes</CardDescription>
                </div>
                <Button onClick={() => navigate("/tickets")} variant="outline" size="sm">
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Título</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {openTickets.map((ticket) => (
                    <TableRow key={ticket.id}>
                      <TableCell className="text-sm font-medium">{ticket.title || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge variant={TICKET_STATUS_VARIANTS[ticket.status]}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-sm max-w-[300px]">{truncate(ticket.description, 60)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          <AreaChart
            title="Horas Consumidas"
            description="Evolução do consumo no período"
            data={consumptionByDay}
            formatValue={(v) => `${v}h`}
            height={280}
          />
          <BarChart
            title="Atendimentos por Dia"
            description="Quantidade de atendimentos"
            data={ticketsByDay}
            color="hsl(var(--chart-2))"
            height={280}
          />
        </div>

        {/* Top Requesters */}
        {topRequesters.length > 0 && (
          <HorizontalBarChart
            title="Top Solicitantes"
            description="Maiores consumidores de horas no período"
            data={topRequesters}
            formatValue={(v) => `${v}h`}
            height={240}
          />
        )}

        {/* Tables */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Recent Tickets */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Últimos Atendimentos</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {recentTickets.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Data</TableHead>
                      <TableHead className="text-xs">Solicitante</TableHead>
                      <TableHead className="text-xs text-right">Horas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTickets.slice(0, 5).map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="text-sm">{formatDate(ticket.service_date)}</TableCell>
                        <TableCell className="text-sm">{truncate(ticket.requester_name, 20)}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{ticket.billed_hours}h</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="Sem atendimentos"
                  description="Não há atendimentos no período selecionado."
                />
              )}
            </CardContent>
          </Card>

          {/* Products */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Produtos do Mês</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {products.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Produto</TableHead>
                      <TableHead className="text-xs text-right">Qtd</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm">{product.product_name}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{product.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="Sem produtos"
                  description="Não há produtos registrados este mês."
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
