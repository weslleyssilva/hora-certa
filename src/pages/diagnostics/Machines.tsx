import { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Monitor, Plus, Pencil, Trash2, Search, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { listActiveClients, ClientLite } from "@/services/clients";

interface Machine {
  id: string;
  client_id: string;
  nome: string;
  usuario: string | null;
  setor: string | null;
  observacoes: string | null;
  clients?: { name: string } | null;
}

export default function Machines() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({ nome: "", usuario: "", setor: "", observacoes: "", client_id: "" });
  const [saving, setSaving] = useState(false);

  const fetchMachines = async () => {
    setLoading(true);
    let query = supabase.from("machines").select("*, clients(name)").order("nome");
    
    if (isAdmin && filterClient !== "all") {
      query = query.eq("client_id", filterClient);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Erro ao carregar máquinas", description: error.message, variant: "destructive" });
    } else {
      setMachines((data as unknown as Machine[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) {
      listActiveClients().then(setClients).catch(console.error);
    }
  }, [isAdmin]);

  useEffect(() => {
    fetchMachines();
  }, [filterClient]);

  const filtered = machines.filter((m) => {
    const q = search.toLowerCase();
    return !q || m.nome.toLowerCase().includes(q) || m.usuario?.toLowerCase().includes(q) || m.setor?.toLowerCase().includes(q);
  });

  const openCreate = () => {
    setEditingMachine(null);
    setFormData({ nome: "", usuario: "", setor: "", observacoes: "", client_id: isAdmin ? "" : (profile?.client_id || "") });
    setDialogOpen(true);
  };

  const openEdit = (m: Machine) => {
    setEditingMachine(m);
    setFormData({ nome: m.nome, usuario: m.usuario || "", setor: m.setor || "", observacoes: m.observacoes || "", client_id: m.client_id });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast({ title: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.client_id) {
      toast({ title: "Selecione um cliente", variant: "destructive" });
      return;
    }

    setSaving(true);
    const payload = {
      nome: formData.nome.trim(),
      usuario: formData.usuario.trim() || null,
      setor: formData.setor.trim() || null,
      observacoes: formData.observacoes.trim() || null,
      client_id: formData.client_id,
    };

    if (editingMachine) {
      const { error } = await supabase.from("machines").update(payload).eq("id", editingMachine.id);
      if (error) {
        toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Máquina atualizada" });
        setDialogOpen(false);
        fetchMachines();
      }
    } else {
      const { error } = await supabase.from("machines").insert(payload);
      if (error) {
        toast({ title: "Erro ao criar", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Máquina cadastrada" });
        setDialogOpen(false);
        fetchMachines();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("machines").delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Máquina excluída" });
      fetchMachines();
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Máquinas" description="Cadastro e diagnóstico de equipamentos" />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar máquina..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isAdmin && (
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Todos os clientes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Máquina
        </Button>
      </div>

      {loading ? (
        <PageLoader />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<Monitor className="h-6 w-6 text-muted-foreground" />} title="Nenhuma máquina encontrada" description="Cadastre uma máquina para começar" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Setor</TableHead>
                  {isAdmin && <TableHead>Cliente</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.nome}</TableCell>
                    <TableCell>{m.usuario || "—"}</TableCell>
                    <TableCell>{m.setor || "—"}</TableCell>
                    {isAdmin && <TableCell>{m.clients?.name || "—"}</TableCell>}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/diagnostics/new?machine=${m.id}`)} title="Novo Diagnóstico">
                          <Stethoscope className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(m)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir máquina?</AlertDialogTitle>
                              <AlertDialogDescription>Esta ação removerá a máquina e todos os diagnósticos associados.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(m.id)}>Excluir</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingMachine ? "Editar Máquina" : "Nova Máquina"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {isAdmin && (
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={formData.client_id} onValueChange={(v) => setFormData((f) => ({ ...f, client_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nome da Máquina *</Label>
              <Input value={formData.nome} onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: PC-RH-01" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input value={formData.usuario} onChange={(e) => setFormData((f) => ({ ...f, usuario: e.target.value }))} placeholder="Usuário da máquina" />
              </div>
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={formData.setor} onChange={(e) => setFormData((f) => ({ ...f, setor: e.target.value }))} placeholder="Ex: RH, TI, Financeiro" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Observações gerais sobre o equipamento" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
