import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { MetricCard } from "@/components/ui/metric-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { LayoutDashboard, Building2, Users, FileText, Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatHours, contractExpiresInDays, getStatusLabel } from "@/lib/utils";

interface ClientWithContract {
  id: string;
  name: string;
  status: string;
  contract?: {
    id: string;
    start_date: string;
    end_date: string;
    contracted_hours: number;
  };
  consumedHours?: number;
}

interface ExpiringContract {
  id: string;
  client_name: string;
  end_date: string;
  contracted_hours: number;
  daysLeft: number;
}

export default function AdminDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [totalClients, setTotalClients] = useState(0);
  const [activeClients, setActiveClients] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeContracts, setActiveContracts] = useState(0);
  const [expiringContracts, setExpiringContracts] = useState<ExpiringContract[]>([]);
  const [topConsumers, setTopConsumers] = useState<{ name: string; hours: number }[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Total de clientes
      const { count: clientCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true });
      setTotalClients(clientCount || 0);

      // Clientes ativos
      const { count: activeCount } = await supabase
        .from("clients")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");
      setActiveClients(activeCount || 0);

      // Total de usuários
      const { count: userCount } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });
      setTotalUsers(userCount || 0);

      // Contratos ativos (data atual entre start e end)
      const today = new Date().toISOString().split("T")[0];
      const { data: activeContractsData, count: contractCount } = await supabase
        .from("contracts")
        .select("*, clients(name)", { count: "exact" })
        .lte("start_date", today)
        .gte("end_date", today);
      setActiveContracts(contractCount || 0);

      // Contratos vencendo em 7 dias
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
      }

      // Ranking de consumo do mês atual
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      const firstDayStr = firstDayOfMonth.toISOString().split("T")[0];

      const { data: ticketsData } = await supabase
        .from("tickets")
        .select("client_id, billed_hours")
        .gte("service_date", firstDayStr)
        .lte("service_date", today);

      if (ticketsData) {
        // Agrupar por cliente
        const byClient: Record<string, number> = {};
        ticketsData.forEach((t) => {
          byClient[t.client_id] = (byClient[t.client_id] || 0) + t.billed_hours;
        });

        // Buscar nomes dos clientes
        const clientIds = Object.keys(byClient);
        if (clientIds.length > 0) {
          const { data: clientsData } = await supabase
            .from("clients")
            .select("id, name")
            .in("id", clientIds);

          const ranking = clientIds
            .map((id) => ({
              name: clientsData?.find((c) => c.id === id)?.name || "N/A",
              hours: byClient[id],
            }))
            .sort((a, b) => b.hours - a.hours)
            .slice(0, 5);

          setTopConsumers(ranking);
        }
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Dashboard Administrativo"
        description="Visão geral do sistema"
        icon={LayoutDashboard}
      />

      {/* Métricas */}
      <div className="grid gap-6 md:grid-cols-4 mb-8">
        <MetricCard
          title="Total de Clientes"
          value={totalClients}
          subtitle={`${activeClients} ativos`}
          icon={Building2}
          variant="primary"
        />
        <MetricCard
          title="Usuários"
          value={totalUsers}
          icon={Users}
        />
        <MetricCard
          title="Contratos Ativos"
          value={activeContracts}
          icon={FileText}
          variant="success"
        />
        <MetricCard
          title="Vencendo em 7 dias"
          value={expiringContracts.length}
          icon={AlertTriangle}
          variant={expiringContracts.length > 0 ? "warning" : "default"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Contratos Vencendo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Contratos Vencendo
            </CardTitle>
            <CardDescription>Contratos que vencem nos próximos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringContracts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias Restantes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringContracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell className="font-medium">
                        {contract.client_name}
                      </TableCell>
                      <TableCell>{formatDate(contract.end_date)}</TableCell>
                      <TableCell>
                        <StatusBadge status={contract.daysLeft <= 3 ? "error" : "warning"}>
                          {contract.daysLeft} dia(s)
                        </StatusBadge>
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

        {/* Ranking de Consumo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Ranking de Consumo
            </CardTitle>
            <CardDescription>Top 5 clientes com mais horas no mês</CardDescription>
          </CardHeader>
          <CardContent>
            {topConsumers.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="text-right">Horas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topConsumers.map((client, index) => (
                    <TableRow key={client.name}>
                      <TableCell className="font-bold text-muted-foreground">
                        {index + 1}º
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-right">
                        {formatHours(client.hours)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <EmptyState
                title="Sem dados"
                description="Não há atendimentos registrados este mês."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
