import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Ticket, Plus, Pencil, Trash2, Search, PlayCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatHours, truncate, calculateBilledHours, calculateDurationMinutes } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MIN_BILLED_HOURS, TICKET_STATUS, TICKET_STATUS_LABELS, TICKET_STATUS_VARIANTS } from "@/lib/constants";

interface TicketData {
  id: string;
  client_id: string;
  title: string | null;
  requester_name: string;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  description: string;
  billed_hours: number;
  status: string;
  clients?: { name: string } | null;
}

interface Client {
  id: string;
  name: string;
}

export default function AdminTickets() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAttendDialogOpen, setIsAttendDialogOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<TicketData | null>(null);
  const [attendingTicket, setAttendingTicket] = useState<TicketData | null>(null);
  const [formData, setFormData] = useState({
    client_id: "",
    requester_name: "",
    service_date: "",
    start_time: "",
    end_time: "",
    duration_minutes: "",
    description: "",
    billed_hours: "",
  });
  const [attendFormData, setAttendFormData] = useState({
    service_date: "",
    start_time: "",
    end_time: "",
    duration_minutes: "",
    billed_hours: "",
    description: "",
  });
  const [filterClient, setFilterClient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    loadData();
  }, []);

  // Recalcular horas automaticamente para formulário de criação
  useEffect(() => {
    if (formData.start_time && formData.end_time) {
      const minutes = calculateDurationMinutes(formData.start_time, formData.end_time);
      if (minutes > 0) {
        setFormData((prev) => ({
          ...prev,
          duration_minutes: minutes.toString(),
          billed_hours: calculateBilledHours(minutes).toString(),
        }));
      }
    } else if (formData.duration_minutes) {
      const minutes = parseInt(formData.duration_minutes);
      if (!isNaN(minutes) && minutes > 0) {
        setFormData((prev) => ({
          ...prev,
          billed_hours: calculateBilledHours(minutes).toString(),
        }));
      }
    }
  }, [formData.start_time, formData.end_time, formData.duration_minutes]);

  // Recalcular horas automaticamente para formulário de atendimento
  useEffect(() => {
    if (attendFormData.start_time && attendFormData.end_time) {
      const minutes = calculateDurationMinutes(attendFormData.start_time, attendFormData.end_time);
      if (minutes > 0) {
        setAttendFormData((prev) => ({
          ...prev,
          duration_minutes: minutes.toString(),
          billed_hours: calculateBilledHours(minutes).toString(),
        }));
      }
    } else if (attendFormData.duration_minutes) {
      const minutes = parseInt(attendFormData.duration_minutes);
      if (!isNaN(minutes) && minutes > 0) {
        setAttendFormData((prev) => ({
          ...prev,
          billed_hours: calculateBilledHours(minutes).toString(),
        }));
      }
    }
  }, [attendFormData.start_time, attendFormData.end_time, attendFormData.duration_minutes]);

  const loadData = async () => {
    try {
      const [ticketsRes, clientsRes] = await Promise.all([
        supabase.from("tickets").select("*, clients(name)").order("created_at", { ascending: false }),
        supabase.from("clients").select("id, name").eq("status", "active").order("name"),
      ]);

      if (ticketsRes.error) throw ticketsRes.error;
      if (clientsRes.error) throw clientsRes.error;

      setTickets(ticketsRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({ title: "Erro ao carregar dados", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingTicket(null);
    setFormData({
      client_id: "",
      requester_name: "",
      service_date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      duration_minutes: "",
      description: "",
      billed_hours: MIN_BILLED_HOURS.toString(),
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (ticket: TicketData) => {
    setEditingTicket(ticket);
    setFormData({
      client_id: ticket.client_id,
      requester_name: ticket.requester_name,
      service_date: ticket.service_date,
      start_time: ticket.start_time || "",
      end_time: ticket.end_time || "",
      duration_minutes: ticket.duration_minutes?.toString() || "",
      description: ticket.description,
      billed_hours: ticket.billed_hours.toString(),
    });
    setIsDialogOpen(true);
  };

  const openAttendDialog = (ticket: TicketData) => {
    setAttendingTicket(ticket);
    setAttendFormData({
      service_date: new Date().toISOString().split("T")[0],
      start_time: "",
      end_time: "",
      duration_minutes: "",
      billed_hours: MIN_BILLED_HOURS.toString(),
      description: ticket.description,
    });
    setIsAttendDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.client_id || !formData.requester_name || !formData.service_date || !formData.description) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }

    const billedHours = parseInt(formData.billed_hours);
    if (isNaN(billedHours) || billedHours < MIN_BILLED_HOURS) {
      toast({ title: `Horas faturadas mínimo: ${MIN_BILLED_HOURS}`, variant: "destructive" });
      return;
    }

    if (formData.start_time && formData.end_time && formData.end_time <= formData.start_time) {
      toast({ title: "Hora fim deve ser maior que hora início", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const data = {
        client_id: formData.client_id,
        requester_name: formData.requester_name,
        service_date: formData.service_date,
        start_time: formData.start_time || null,
        end_time: formData.end_time || null,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        description: formData.description,
        billed_hours: billedHours,
        created_by_user_id: user?.id,
        status: TICKET_STATUS.COMPLETED,
      };

      if (editingTicket) {
        const { error } = await supabase
          .from("tickets")
          .update(data)
          .eq("id", editingTicket.id);
        if (error) throw error;
        toast({ title: "Atendimento atualizado com sucesso" });
      } else {
        const { error } = await supabase.from("tickets").insert(data);
        if (error) throw error;
        toast({ title: "Atendimento criado com sucesso" });
      }
      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error saving ticket:", error);
      toast({ title: "Erro ao salvar atendimento", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttend = async () => {
    if (!attendingTicket) return;

    const billedHours = parseInt(attendFormData.billed_hours);
    if (isNaN(billedHours) || billedHours < MIN_BILLED_HOURS) {
      toast({ title: `Horas faturadas mínimo: ${MIN_BILLED_HOURS}`, variant: "destructive" });
      return;
    }

    if (attendFormData.start_time && attendFormData.end_time && attendFormData.end_time <= attendFormData.start_time) {
      toast({ title: "Hora fim deve ser maior que hora início", variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("tickets")
        .update({
          status: TICKET_STATUS.COMPLETED,
          service_date: attendFormData.service_date,
          start_time: attendFormData.start_time || null,
          end_time: attendFormData.end_time || null,
          duration_minutes: attendFormData.duration_minutes ? parseInt(attendFormData.duration_minutes) : null,
          billed_hours: billedHours,
          description: attendFormData.description,
        })
        .eq("id", attendingTicket.id);

      if (error) throw error;
      toast({ title: "Chamado atendido com sucesso!" });
      setIsAttendDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error attending ticket:", error);
      toast({ title: "Erro ao atender chamado", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartProgress = async (ticket: TicketData) => {
    try {
      const { error } = await supabase
        .from("tickets")
        .update({ status: TICKET_STATUS.IN_PROGRESS })
        .eq("id", ticket.id);

      if (error) throw error;
      toast({ title: "Chamado iniciado!" });
      loadData();
    } catch (error) {
      console.error("Error starting ticket:", error);
      toast({ title: "Erro ao iniciar chamado", variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("tickets").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Atendimento excluído com sucesso" });
      loadData();
    } catch (error) {
      console.error("Error deleting ticket:", error);
      toast({ title: "Erro ao excluir atendimento", variant: "destructive" });
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    return TICKET_STATUS_VARIANTS[status] || "default";
  };

  const pendingTickets = tickets.filter((t) => t.status === TICKET_STATUS.OPEN || t.status === TICKET_STATUS.IN_PROGRESS);
  const completedTickets = tickets.filter((t) => t.status === TICKET_STATUS.COMPLETED);

  const filterTickets = (list: TicketData[]) => {
    return list.filter((t) => {
      const matchesClient = !filterClient || t.client_id === filterClient;
      const matchesSearch =
        !searchTerm ||
        t.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.title && t.title.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesClient && matchesSearch;
    });
  };

  const filteredPending = filterTickets(pendingTickets);
  const filteredCompleted = filterTickets(completedTickets);

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Atendimentos"
        description="Gerenciar chamados e atendimentos"
        icon={Ticket}
      >
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog} className="gradient-primary">
              <Plus className="mr-2 h-4 w-4" />
              Novo Atendimento
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTicket ? "Editar Atendimento" : "Novo Atendimento"}</DialogTitle>
              <DialogDescription>
                {editingTicket ? "Atualize as informações do atendimento" : "Registre um novo atendimento"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="space-y-2">
                <Label htmlFor="client">Cliente *</Label>
                <Select
                  value={formData.client_id}
                  onValueChange={(value) => setFormData({ ...formData, client_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="requester_name">Solicitante *</Label>
                  <Input
                    id="requester_name"
                    value={formData.requester_name}
                    onChange={(e) => setFormData({ ...formData, requester_name: e.target.value })}
                    placeholder="Nome do solicitante"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="service_date">Data do Serviço *</Label>
                  <Input
                    id="service_date"
                    type="date"
                    value={formData.service_date}
                    onChange={(e) => setFormData({ ...formData, service_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_time">Hora Início</Label>
                  <Input
                    id="start_time"
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_time">Hora Fim</Label>
                  <Input
                    id="end_time"
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration_minutes">Duração (minutos)</Label>
                  <Input
                    id="duration_minutes"
                    type="number"
                    min="0"
                    value={formData.duration_minutes}
                    onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                    placeholder="Ex: 90"
                    disabled={!!(formData.start_time && formData.end_time)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="billed_hours">Horas Faturadas *</Label>
                  <Input
                    id="billed_hours"
                    type="number"
                    min={MIN_BILLED_HOURS}
                    value={formData.billed_hours}
                    onChange={(e) => setFormData({ ...formData, billed_hours: e.target.value })}
                    placeholder={`Mínimo ${MIN_BILLED_HOURS}`}
                  />
                  <p className="text-xs text-muted-foreground">Mínimo: {MIN_BILLED_HOURS} hora(s)</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descreva o atendimento realizado..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card className="border-warning/50 bg-warning/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Chamados Abertos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">
              {tickets.filter((t) => t.status === TICKET_STATUS.OPEN).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Em Atendimento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {tickets.filter((t) => t.status === TICKET_STATUS.IN_PROGRESS).length}
            </div>
          </CardContent>
        </Card>
        <Card className="border-success/50 bg-success/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Concluídos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">
              {completedTickets.length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Título, solicitante ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Filtrar por Cliente</Label>
              <Select value={filterClient || "all"} onValueChange={(value) => setFilterClient(value === "all" ? "" : value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os clientes</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setFilterClient("");
                  setSearchTerm("");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="pending" className="gap-2">
            Pendentes
            {pendingTickets.length > 0 && (
              <span className="rounded-full bg-warning px-2 py-0.5 text-xs text-warning-foreground">
                {pendingTickets.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Concluídos ({completedTickets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Chamados Pendentes ({filteredPending.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredPending.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPending.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          {formatDate(ticket.service_date)}
                        </TableCell>
                        <TableCell>{ticket.clients?.name || "N/A"}</TableCell>
                        <TableCell>{ticket.title || "-"}</TableCell>
                        <TableCell>{ticket.requester_name}</TableCell>
                        <TableCell>
                          <StatusBadge variant={getStatusBadgeVariant(ticket.status)}>
                            {TICKET_STATUS_LABELS[ticket.status] || ticket.status}
                          </StatusBadge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {ticket.status === TICKET_STATUS.OPEN && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleStartProgress(ticket)}
                                title="Iniciar atendimento"
                              >
                                <PlayCircle className="h-4 w-4 text-primary" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openAttendDialog(ticket)}
                              title="Concluir atendimento"
                            >
                              <CheckCircle className="h-4 w-4 text-success" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Chamado</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir este chamado? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(ticket.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="Nenhum chamado pendente"
                  description="Todos os chamados foram atendidos!"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="completed">
          <Card>
            <CardHeader>
              <CardTitle>Atendimentos Concluídos ({filteredCompleted.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {filteredCompleted.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Horas</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCompleted.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">
                          {formatDate(ticket.service_date)}
                        </TableCell>
                        <TableCell>{ticket.clients?.name || "N/A"}</TableCell>
                        <TableCell>{ticket.requester_name}</TableCell>
                        <TableCell>{formatHours(ticket.billed_hours)}</TableCell>
                        <TableCell className="max-w-[200px]">
                          {truncate(ticket.description, 50)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(ticket)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Atendimento</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja excluir este atendimento? Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(ticket.id)}>
                                    Excluir
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <EmptyState
                  title="Nenhum atendimento concluído"
                  description="Não há atendimentos finalizados ainda."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog para atender chamado */}
      <Dialog open={isAttendDialogOpen} onOpenChange={setIsAttendDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Concluir Atendimento</DialogTitle>
            <DialogDescription>
              {attendingTicket?.title && <span className="font-medium">{attendingTicket.title}</span>}
              <br />
              Registre as horas do atendimento. As horas serão debitadas do contrato do cliente.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label htmlFor="attend_service_date">Data do Atendimento *</Label>
              <Input
                id="attend_service_date"
                type="date"
                value={attendFormData.service_date}
                onChange={(e) => setAttendFormData({ ...attendFormData, service_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attend_start_time">Hora Início</Label>
                <Input
                  id="attend_start_time"
                  type="time"
                  value={attendFormData.start_time}
                  onChange={(e) => setAttendFormData({ ...attendFormData, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attend_end_time">Hora Fim</Label>
                <Input
                  id="attend_end_time"
                  type="time"
                  value={attendFormData.end_time}
                  onChange={(e) => setAttendFormData({ ...attendFormData, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="attend_duration_minutes">Duração (minutos)</Label>
                <Input
                  id="attend_duration_minutes"
                  type="number"
                  min="0"
                  value={attendFormData.duration_minutes}
                  onChange={(e) => setAttendFormData({ ...attendFormData, duration_minutes: e.target.value })}
                  placeholder="Ex: 90"
                  disabled={!!(attendFormData.start_time && attendFormData.end_time)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="attend_billed_hours">Horas Faturadas *</Label>
                <Input
                  id="attend_billed_hours"
                  type="number"
                  min={MIN_BILLED_HOURS}
                  value={attendFormData.billed_hours}
                  onChange={(e) => setAttendFormData({ ...attendFormData, billed_hours: e.target.value })}
                  placeholder={`Mínimo ${MIN_BILLED_HOURS}`}
                />
                <p className="text-xs text-muted-foreground">Mínimo: {MIN_BILLED_HOURS} hora(s)</p>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="attend_description">Descrição do Atendimento</Label>
              <Textarea
                id="attend_description"
                value={attendFormData.description}
                onChange={(e) => setAttendFormData({ ...attendFormData, description: e.target.value })}
                placeholder="Descreva o atendimento realizado..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAttendDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAttend} disabled={isSaving}>
              {isSaving ? "Salvando..." : "Concluir Atendimento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
