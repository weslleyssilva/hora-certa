import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ticket, Search, Eye, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatTime, formatHours, truncate } from "@/lib/utils";

interface TicketData {
  id: string;
  service_date: string;
  requester_name: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  billed_hours: number;
  description: string;
}

export default function ClientTickets() {
  const { profile } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);

  useEffect(() => {
    if (profile?.client_id) {
      loadTickets();
    }
  }, [profile?.client_id]);

  useEffect(() => {
    filterTickets();
  }, [tickets, searchTerm, startDate, endDate]);

  const loadTickets = async () => {
    if (!profile?.client_id) return;

    try {
      const { data, error } = await supabase
        .from("tickets")
        .select("*")
        .eq("client_id", profile.client_id)
        .order("service_date", { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error("Error loading tickets:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterTickets = () => {
    let result = [...tickets];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (t) =>
          t.requester_name.toLowerCase().includes(term) ||
          t.description.toLowerCase().includes(term)
      );
    }

    if (startDate) {
      result = result.filter((t) => t.service_date >= startDate);
    }

    if (endDate) {
      result = result.filter((t) => t.service_date <= endDate);
    }

    setFilteredTickets(result);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStartDate("");
    setEndDate("");
  };

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Atendimentos"
        description="Histórico de atendimentos e chamados"
        icon={Ticket}
      />

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Solicitante ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="startDate">Data Início</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endDate">Data Fim</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={clearFilters}>
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Tickets */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Atendimentos</CardTitle>
          <CardDescription>
            {filteredTickets.length} atendimento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Horas</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map((ticket) => (
                  <TableRow key={ticket.id}>
                    <TableCell className="font-medium">
                      {formatDate(ticket.service_date)}
                    </TableCell>
                    <TableCell>{ticket.requester_name}</TableCell>
                    <TableCell>{formatHours(ticket.billed_hours)}</TableCell>
                    <TableCell className="max-w-[300px]">
                      {truncate(ticket.description, 60)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTicket(ticket)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Atendimento</DialogTitle>
                            <DialogDescription>
                              {formatDate(ticket.service_date)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-muted-foreground">Solicitante</Label>
                              <p className="font-medium">{ticket.requester_name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {ticket.start_time && (
                                <div>
                                  <Label className="text-muted-foreground">Hora Início</Label>
                                  <p className="font-medium">{formatTime(ticket.start_time)}</p>
                                </div>
                              )}
                              {ticket.end_time && (
                                <div>
                                  <Label className="text-muted-foreground">Hora Fim</Label>
                                  <p className="font-medium">{formatTime(ticket.end_time)}</p>
                                </div>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              {ticket.duration_minutes && (
                                <div>
                                  <Label className="text-muted-foreground">Duração Real</Label>
                                  <p className="font-medium">{ticket.duration_minutes} minutos</p>
                                </div>
                              )}
                              <div>
                                <Label className="text-muted-foreground">Horas Faturadas</Label>
                                <p className="font-medium">{formatHours(ticket.billed_hours)}</p>
                              </div>
                            </div>
                            <div>
                              <Label className="text-muted-foreground">Descrição</Label>
                              <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                                {ticket.description}
                              </p>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum atendimento encontrado"
              description="Não há atendimentos com os filtros aplicados."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
