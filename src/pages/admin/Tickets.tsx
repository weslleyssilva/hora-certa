import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Ticket, Plus, Pencil, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDate, formatHours, truncate, calculateBilledHours, calculateDurationMinutes } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { MIN_BILLED_HOURS } from "@/lib/constants";

interface TicketData {
  id: string;
  client_id: string;
  requester_name: string;
  service_date: string;
  start_time: string | null;
  end_time: string | null;
  duration_minutes: number | null;
  description: string;
  billed_hours: number;
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
  const [editingTicket, setEditingTicket] = useState<TicketData | null>(null);
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
  const [filterClient, setFilterClient] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  // Recalcular horas automaticamente
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

  const loadData = async () => {
    try {
      const [ticketsRes, clientsRes] = await Promise.all([
        supabase.from("tickets").select("*, clients(name)").order("service_date", { ascending: false }),
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

  const filteredTickets = tickets.filter((t) => {
    const matchesClient = !filterClient || t.client_id === filterClient;
    const matchesSearch =
      !searchTerm ||
      t.requester_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesClient && matchesSearch;
  });

  if (isLoading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <PageHeader
        title="Atendimentos"
        description="Gerenciar atendimentos e chamados"
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

      {/* Filtros */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Solicitante ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div>
              <Label>Filtrar por Cliente</Label>
              <Select value={filterClient} onValueChange={setFilterClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os clientes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os clientes</SelectItem>
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

      <Card>
        <CardHeader>
          <CardTitle>Lista de Atendimentos ({filteredTickets.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredTickets.length > 0 ? (
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
                {filteredTickets.map((ticket) => (
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
                              <AlertDialogAction
                                onClick={() => handleDelete(ticket.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
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
              title="Nenhum atendimento encontrado"
              description="Registre um novo atendimento para começar."
              action={
                <Button onClick={openCreateDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Atendimento
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
}
