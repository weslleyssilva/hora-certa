import { useEffect, useState, useMemo } from "react";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { KPICard } from "@/components/ui/kpi-card";
import { AreaChart } from "@/components/charts/AreaChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { PeriodFilter, Period } from "@/components/filters/PeriodFilter";
import { ClientSelector } from "@/components/filters/ClientSelector";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Clock, FileText, TrendingUp, Users, AlertTriangle, Plus, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { formatDate } from "@/lib/utils";

interface DataPoint {
  name: string;
  value: number;
}

interface ExpiringContract {
  id: string;
  client_name: string;
  end_date: string;
  contracted_hours: number;
  daysLeft: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(() => {
    const now = new Date();
    return { startDate: startOfMonth(now), endDate: endOfMonth(now) };
  });
  const [searchQuery, setSearchQuery] = useState("");

  // KPI data
  const [totalHours, setTotalHours] = useState(0);
  const [totalTickets, setTotalTickets] = useState(0);
  const [avgHoursPerTicket, setAvgHoursPerTicket] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [expiringContractsCount, setExpiringContractsCount] = useState(0);

  // Chart data
  const [hoursByClient, setHoursByClient] = useState<DataPoint[]>([]);
  const [ticketsByClient, setTicketsByClient] = useState<DataPoint[]>([]);
  const [consumptionByDay, setConsumptionByDay] = useState<DataPoint[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [period, selectedClient]);

  const loadDashboardData = async () => {
    setIsLoading(true);

    try {
      const startStr = format(period.startDate, "yyyy-MM-dd");
      const endStr = format(period.endDate, "yyyy-MM-dd");
      const today = new Date().toISOString().split("T")[0];

      // Build tickets query
      let ticketsQuery = supabase
        .from("tickets")
        .select("id, service_date, billed_hours, client_id")
        .gte("service_date", startStr)
        .lte("service_date", endStr);

      if (selectedClient) {
        ticketsQuery = ticketsQuery.eq("client_id", selectedClient);
      }

      const { data: tickets } = await ticketsQuery;

      if (tickets) {
        const hours = tickets.reduce((sum, t) => sum + t.billed_hours, 0);
        setTotalHours(hours);
        setTotalTickets(tickets.length);
        setAvgHoursPerTicket(tickets.length > 0 ? Math.round((hours / tickets.length) * 10) / 10 : 0);

        // Aggregate by day
        const byDay: Record<string, number> = {};
        tickets.forEach((t) => {
          byDay[t.service_date] = (byDay[t.service_date] || 0) + t.billed_hours;
        });
        const sortedDays = Object.keys(byDay).sort();
        setConsumptionByDay(
          sortedDays.map((d) => ({
            name: format(parseISO(d), "dd/MM", { locale: ptBR }),
            value: byDay[d],
          }))
        );

        // Aggregate by client (only if not filtering by client)
        if (!selectedClient) {
          const byClient: Record<string, { hours: number; count: number }> = {};
          tickets.forEach((t) => {
            if (!byClient[t.client_id]) {
              byClient[t.client_id] = { hours: 0, count: 0 };
            }
            byClient[t.client_id].hours += t.billed_hours;
            byClient[t.client_id].count += 1;
          });

          // Get client names
          const clientIds = Object.keys(byClient);
          if (clientIds.length > 0) {
            const { data: clients } = await supabase
              .from("clients")
              .select("id, name")
              .in("id", clientIds);

            const clientMap = new Map(clients?.map((c) => [c.id, c.name]) || []);

            const hoursRanking = clientIds
              .map((id) => ({ name: clientMap.get(id) || "N/A", value: byClient[id].hours }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);

            const ticketsRanking = clientIds
              .map((id) => ({ name: clientMap.get(id) || "N/A", value: byClient[id].count }))
              .sort((a, b) => b.value - a.value)
              .slice(0, 10);

            setHoursByClient(hoursRanking);
            setTicketsByClient(ticketsRanking);
          }
        }
      }

      // Active clients count
      const { count: activeCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      setActiveClients(activeCount || 0);

      // Expiring contracts (next 7 days)
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0];

      const { data: expiringData } = await supabase
        .from("contracts")
        .select("id, end_date, contracted_hours, clients(name)")
        .gte("end_date", today)
        .lte("end_date", sevenDaysStr)
        .order("end_date", { ascending: true });

      if (expiringData) {
        const expiring = expiringData.map((c: any) => {
          const endDate = new Date(c.end_date);
          const todayDate = new Date();
          todayDate.setHours(0, 0, 0, 0);
          const daysLeft = Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
          return {
            id: c.id,
            client_name: c.clients?.name || "N/A",
            end_date: c.end_date,
            contracted_hours: c.contracted_hours,
            daysLeft,
          };
        });
        setExpiringContracts(expiring);
        setExpiringContractsCount(expiring.length);
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/admin/clients?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <div className="grid gap-4 md:grid-cols-5">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header with filters */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <PageHeader
            title="Dashboard Administrativo"
            description="Visão geral do sistema"
            className="mb-0"
          />
          <div className="flex flex-wrap items-center gap-3">
            <ClientSelector value={selectedClient} onChange={setSelectedClient} />
            <PeriodFilter value={period} onChange={setPeriod} />
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <KPICard
            title="Total de Horas"
            value={`${totalHours}h`}
            icon={Clock}
            variant="primary"
          />
          <KPICard
            title="Atendimentos"
            value={totalTickets}
            icon={FileText}
          />
          <KPICard
            title="Média Horas/Atend."
            value={`${avgHoursPerTicket}h`}
            icon={TrendingUp}
          />
          <KPICard
            title="Clientes Ativos"
            value={activeClients}
            icon={Users}
            variant="success"
          />
          <KPICard
            title="Contratos Vencendo"
            value={expiringContractsCount}
            icon={AlertTriangle}
            variant={expiringContractsCount > 0 ? "warning" : "default"}
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {!selectedClient && (
            <HorizontalBarChart
              title="Horas por Cliente"
              description="Top 10 clientes por consumo"
              data={hoursByClient}
              formatValue={(v) => `${v}h`}
              height={320}
            />
          )}
          <AreaChart
            title="Evolução do Consumo"
            description="Horas consumidas ao longo do período"
            data={consumptionByDay}
            formatValue={(v) => `${v}h`}
            height={320}
          />
          {!selectedClient && (
            <HorizontalBarChart
              title="Atendimentos por Cliente"
              description="Top 10 clientes por quantidade"
              data={ticketsByClient}
              color="hsl(var(--chart-2))"
              height={320}
            />
          )}
        </div>

        {/* Expiring Contracts and Quick Actions */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Expiring contracts */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Contratos Vencendo
              </CardTitle>
              <CardDescription className="text-sm">Próximos 7 dias</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              {expiringContracts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs">Vencimento</TableHead>
                      <TableHead className="text-xs text-right">Dias</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringContracts.map((contract) => (
                      <TableRow key={contract.id}>
                        <TableCell className="text-sm font-medium">{contract.client_name}</TableCell>
                        <TableCell className="text-sm">{formatDate(contract.end_date)}</TableCell>
                        <TableCell className="text-sm text-right">
                          <span className={contract.daysLeft <= 3 ? "text-destructive font-medium" : "text-warning"}>
                            {contract.daysLeft}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="Nenhum contrato vencendo"
                  description="Não há contratos vencendo nos próximos 7 dias."
                />
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Ações Rápidas</CardTitle>
              <CardDescription className="text-sm">Acesso rápido às funcionalidades</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => navigate("/admin/tickets")}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Atendimento</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => navigate("/admin/products")}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Produto</span>
                </Button>
                <Button
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => navigate("/admin/contracts")}
                >
                  <Plus className="h-4 w-4" />
                  <span className="text-xs">Contrato</span>
                </Button>
              </div>
              <form onSubmit={handleSearch} className="flex gap-2">
                <Input
                  placeholder="Buscar cliente..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9"
                />
                <Button type="submit" size="sm" variant="secondary">
                  <Search className="h-4 w-4" />
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
