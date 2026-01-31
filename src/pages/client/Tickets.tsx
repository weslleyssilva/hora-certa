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
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Ticket, Search, Eye, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate, formatTime, formatHours, truncate } from "@/lib/utils";
import { TICKET_STATUS, TICKET_STATUS_LABELS, TICKET_STATUS_VARIANTS } from "@/lib/constants";
import { toast } from "@/hooks/use-toast";

interface TicketData {
  id: string;
  title: string | null;
  service_date: string;
  requester_name: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  billed_hours: number;
  description: string;
  status: string;
}

export default function ClientTickets() {
  const { profile, user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [filteredTickets, setFilteredTickets] = useState<TicketData[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedTicket, setSelectedTicket] = useState<TicketData | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

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
        .order("created_at", { ascending: false });

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
          t.description.toLowerCase().includes(term) ||
          (t.title && t.title.toLowerCase().includes(term))
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

  const openCreateDialog = () => {
    setFormData({ title: "", description: "" });
    setIsCreateDialogOpen(true);
  };

  const handleCreateTicket = async () => {
    if (!formData.title || !formData.description) {
      toast({ title: "Preencha todos os campos", variant: "destructive" });
      return;
    }

    if (!profile?.client_id || !user?.id) {
      toast({ title: "Erro de autenticação", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("tickets").insert({
        client_id: profile.client_id,
        created_by_user_id: user.id,
        title: formData.title,
        description: formData.description,
        requester_name: profile.email,
        service_date: new Date().toISOString().split("T")[0],
        billed_hours: 0,
        status: TICKET_STATUS.OPEN,
      });

      if (error) throw error;

      toast({ title: "Chamado aberto com sucesso!" });
      setIsCreateDialogOpen(false);
      loadTickets();
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({ title: "Erro ao abrir chamado", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return TICKET_STATUS_VARIANTS[status] || "default";
  };

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  const openTickets = tickets.filter((t) => t.status === TICKET_STATUS.OPEN);
  const inProgressTickets = tickets.filter((t) => t.status === TICKET_STATUS.IN_PROGRESS);
  const completedTickets = tickets.filter((t) => t.status === TICKET_STATUS.COMPLETED);

  return (
    <AppLayout>
      <PageHeader
        title="Chamados"
        description="Abra e acompanhe seus chamados de suporte"
      >
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Chamado
        </Button>
      </PageHeader>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{openTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{inProgressTickets.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{completedTickets.length}</div>
          </CardContent>
        </Card>
      </div>

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
                  placeholder="Título ou descrição..."
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
          <CardTitle>Lista de Chamados</CardTitle>
          <CardDescription>
            {filteredTickets.length} chamado(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredTickets.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
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
                    <TableCell>{ticket.title || "-"}</TableCell>
                    <TableCell>
                      <StatusBadge variant={getStatusBadgeVariant(ticket.status)}>
                        {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>
                      {ticket.billed_hours > 0 ? formatHours(ticket.billed_hours) : "-"}
                    </TableCell>
                    <TableCell className="max-w-[300px]">
                      {truncate(ticket.description, 60)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog open={isDialogOpen && selectedTicket?.id === ticket.id} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTicket(ticket);
                              setIsDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Detalhes do Chamado</DialogTitle>
                            <DialogDescription>
                              {selectedTicket && formatDate(selectedTicket.service_date)}
                            </DialogDescription>
                          </DialogHeader>
                          {selectedTicket && (
                            <div className="space-y-4">
                              {selectedTicket.title && (
                                <div>
                                  <Label className="text-muted-foreground">Título</Label>
                                  <p className="font-medium">{selectedTicket.title}</p>
                                </div>
                              )}
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label className="text-muted-foreground">Status</Label>
                                  <div className="mt-1">
                                    <StatusBadge variant={getStatusBadgeVariant(selectedTicket.status)}>
                                      {TICKET_STATUS_LABELS[selectedTicket.status] || selectedTicket.status}
                                    </StatusBadge>
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Solicitante</Label>
                                  <p className="font-medium">{selectedTicket.requester_name}</p>
                                </div>
                              </div>
                              {selectedTicket.status === TICKET_STATUS.COMPLETED && (
                                <>
                                  <div className="grid grid-cols-2 gap-4">
                                    {selectedTicket.start_time && (
                                      <div>
                                        <Label className="text-muted-foreground">Hora Início</Label>
                                        <p className="font-medium">{formatTime(selectedTicket.start_time)}</p>
                                      </div>
                                    )}
                                    {selectedTicket.end_time && (
                                      <div>
                                        <Label className="text-muted-foreground">Hora Fim</Label>
                                        <p className="font-medium">{formatTime(selectedTicket.end_time)}</p>
                                      </div>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    {selectedTicket.duration_minutes && (
                                      <div>
                                        <Label className="text-muted-foreground">Duração Real</Label>
                                        <p className="font-medium">{selectedTicket.duration_minutes} minutos</p>
                                      </div>
                                    )}
                                    <div>
                                      <Label className="text-muted-foreground">Horas Faturadas</Label>
                                      <p className="font-medium">{formatHours(selectedTicket.billed_hours)}</p>
                                    </div>
                                  </div>
                                </>
                              )}
                              <div>
                                <Label className="text-muted-foreground">Descrição</Label>
                                <p className="mt-1 whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">
                                  {selectedTicket.description}
                                </p>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <EmptyState
              title="Nenhum chamado encontrado"
              description="Não há chamados com os filtros aplicados."
              action={
                <Button variant="outline" onClick={clearFilters}>
                  Limpar Filtros
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Dialog para criar novo chamado */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Abrir Novo Chamado</DialogTitle>
            <DialogDescription>
              Descreva o problema ou solicitação. Nossa equipe irá atendê-lo em breve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Resumo do problema ou solicitação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva detalhadamente o problema ou solicitação..."
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateTicket} disabled={isSaving}>
              {isSaving ? "Enviando..." : "Abrir Chamado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
