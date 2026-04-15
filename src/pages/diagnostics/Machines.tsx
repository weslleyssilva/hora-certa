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
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Monitor, Plus, Pencil, Trash2, Search, Stethoscope, FileDown } from "lucide-react";
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
  processador: string | null;
  ram_gb: number | null;
  armazenamento_gb: number | null;
  tipo_disco: string | null;
  sistema_operacional: string | null;
  clients?: { name: string } | null;
  // computed from latest diagnostic
  latest_status?: string | null;
  latest_problemas?: string | null;
  latest_recomendacoes?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  OK: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  "Atenção": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  "Crítico": "bg-red-500/15 text-red-700 dark:text-red-400 border-red-500/30",
};

export default function Machines() {
  const { isAdmin, profile } = useAuth();
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [clients, setClients] = useState<ClientLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterClient, setFilterClient] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [formData, setFormData] = useState({
    nome: "", usuario: "", setor: "", observacoes: "", client_id: "",
    processador: "", ram_gb: "", armazenamento_gb: "", tipo_disco: "", sistema_operacional: "",
  });
  const [saving, setSaving] = useState(false);

  // Summary
  const [summary, setSummary] = useState({ total: 0, ok: 0, atencao: 0, critico: 0, semDiag: 0 });

  const fetchMachines = async () => {
    setLoading(true);
    let query = supabase.from("machines").select("*, clients(name)").order("nome");
    if (isAdmin && filterClient !== "all") {
      query = query.eq("client_id", filterClient);
    }
    const { data: machinesData, error } = await query;
    if (error) {
      toast({ title: "Erro ao carregar máquinas", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    const mList = (machinesData as unknown as Machine[]) || [];

    // Fetch latest diagnostic for each machine
    if (mList.length > 0) {
      const machineIds = mList.map((m) => m.id);
      const { data: diags } = await supabase
        .from("diagnostics")
        .select("maquina_id, status, problemas, recomendacoes, data")
        .in("maquina_id", machineIds)
        .order("data", { ascending: false });

      const latestMap = new Map<string, { status: string; problemas: string | null; recomendacoes: string | null }>();
      diags?.forEach((d: any) => {
        if (!latestMap.has(d.maquina_id)) {
          latestMap.set(d.maquina_id, { status: d.status, problemas: d.problemas, recomendacoes: d.recomendacoes });
        }
      });

      mList.forEach((m) => {
        const latest = latestMap.get(m.id);
        m.latest_status = latest?.status || null;
        m.latest_problemas = latest?.problemas || null;
        m.latest_recomendacoes = latest?.recomendacoes || null;
      });
    }

    setMachines(mList);

    // Compute summary
    const s = { total: mList.length, ok: 0, atencao: 0, critico: 0, semDiag: 0 };
    mList.forEach((m) => {
      if (!m.latest_status) s.semDiag++;
      else if (m.latest_status === "OK") s.ok++;
      else if (m.latest_status === "Atenção") s.atencao++;
      else if (m.latest_status === "Crítico") s.critico++;
    });
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => {
    if (isAdmin) listActiveClients().then(setClients).catch(console.error);
  }, [isAdmin]);

  useEffect(() => { fetchMachines(); }, [filterClient]);

  const filtered = machines.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = !q || m.nome.toLowerCase().includes(q) || m.usuario?.toLowerCase().includes(q) || m.setor?.toLowerCase().includes(q);
    const matchStatus = filterStatus === "all" || (filterStatus === "sem" ? !m.latest_status : m.latest_status === filterStatus);
    return matchSearch && matchStatus;
  });

  const openCreate = () => {
    setEditingMachine(null);
    setFormData({
      nome: "", usuario: "", setor: "", observacoes: "",
      client_id: isAdmin ? "" : (profile?.client_id || ""),
      processador: "", ram_gb: "", armazenamento_gb: "", tipo_disco: "", sistema_operacional: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (m: Machine) => {
    setEditingMachine(m);
    setFormData({
      nome: m.nome, usuario: m.usuario || "", setor: m.setor || "", observacoes: m.observacoes || "",
      client_id: m.client_id,
      processador: m.processador || "", ram_gb: m.ram_gb?.toString() || "", armazenamento_gb: m.armazenamento_gb?.toString() || "",
      tipo_disco: m.tipo_disco || "", sistema_operacional: m.sistema_operacional || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) { toast({ title: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!formData.client_id) { toast({ title: "Selecione um cliente", variant: "destructive" }); return; }

    setSaving(true);
    const payload = {
      nome: formData.nome.trim(),
      usuario: formData.usuario.trim() || null,
      setor: formData.setor.trim() || null,
      observacoes: formData.observacoes.trim() || null,
      client_id: formData.client_id,
      processador: formData.processador.trim() || null,
      ram_gb: formData.ram_gb ? parseInt(formData.ram_gb) : null,
      armazenamento_gb: formData.armazenamento_gb ? parseInt(formData.armazenamento_gb) : null,
      tipo_disco: formData.tipo_disco || null,
      sistema_operacional: formData.sistema_operacional.trim() || null,
    };

    const { error } = editingMachine
      ? await supabase.from("machines").update(payload).eq("id", editingMachine.id)
      : await supabase.from("machines").insert(payload);

    if (error) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingMachine ? "Máquina atualizada" : "Máquina cadastrada" });
      setDialogOpen(false);
      fetchMachines();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("machines").delete().eq("id", id);
    if (error) toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    else { toast({ title: "Máquina excluída" }); fetchMachines(); }
  };

  return (
    <AppLayout>
      <PageHeader title="Inventário de Máquinas" description="Parque de equipamentos e diagnósticos" />

      {/* Resumo Executivo */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{summary.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </Card>
        <Card className="p-4 text-center border-emerald-500/30">
          <p className="text-2xl font-bold text-emerald-600">{summary.ok}</p>
          <p className="text-xs text-muted-foreground">OK</p>
        </Card>
        <Card className="p-4 text-center border-yellow-500/30">
          <p className="text-2xl font-bold text-yellow-600">{summary.atencao}</p>
          <p className="text-xs text-muted-foreground">Atenção</p>
        </Card>
        <Card className="p-4 text-center border-red-500/30">
          <p className="text-2xl font-bold text-red-600">{summary.critico}</p>
          <p className="text-xs text-muted-foreground">Críticas</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-muted-foreground">{summary.semDiag}</p>
          <p className="text-xs text-muted-foreground">Sem diagnóstico</p>
        </Card>
      </div>

      {/* Filtros */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Buscar máquina, usuário ou setor..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        {isAdmin && (
          <Select value={filterClient} onValueChange={setFilterClient}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os clientes</SelectItem>
              {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="OK">OK</SelectItem>
            <SelectItem value="Atenção">Atenção</SelectItem>
            <SelectItem value="Crítico">Crítico</SelectItem>
            <SelectItem value="sem">Sem diagnóstico</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Nova Máquina
        </Button>
      </div>

      {/* Tabela Inventário */}
      {loading ? <PageLoader /> : filtered.length === 0 ? (
        <EmptyState icon={<Monitor className="h-6 w-6 text-muted-foreground" />} title="Nenhuma máquina encontrada" description="Cadastre uma máquina para começar" />
      ) : (
        <Card>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]">ID</TableHead>
                  <TableHead>Máquina</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Processador</TableHead>
                  <TableHead>RAM</TableHead>
                  <TableHead>Disco</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>SO</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Problemas</TableHead>
                  <TableHead>Ação Recomendada</TableHead>
                  {isAdmin && <TableHead>Cliente</TableHead>}
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m, idx) => (
                  <TableRow key={m.id}>
                    <TableCell className="text-muted-foreground text-xs">{String(idx + 1).padStart(3, "0")}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{m.nome}</TableCell>
                    <TableCell>{m.usuario || "—"}</TableCell>
                    <TableCell>{m.setor || "—"}</TableCell>
                    <TableCell className="text-xs">{m.processador || "—"}</TableCell>
                    <TableCell className="text-xs">{m.ram_gb ? `${m.ram_gb} GB` : "—"}</TableCell>
                    <TableCell className="text-xs">{m.armazenamento_gb ? `${m.armazenamento_gb} GB` : "—"}</TableCell>
                    <TableCell className="text-xs">{m.tipo_disco || "—"}</TableCell>
                    <TableCell className="text-xs">{m.sistema_operacional || "—"}</TableCell>
                    <TableCell>
                      {m.latest_status ? (
                        <Badge variant="outline" className={STATUS_COLORS[m.latest_status] || ""}>{m.latest_status}</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{m.latest_problemas || "—"}</TableCell>
                    <TableCell className="max-w-[150px] truncate text-xs">{m.latest_recomendacoes || "—"}</TableCell>
                    {isAdmin && <TableCell className="text-xs">{m.clients?.name || "—"}</TableCell>}
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
                            <Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir máquina?</AlertDialogTitle>
                              <AlertDialogDescription>Remove a máquina e todos os diagnósticos associados.</AlertDialogDescription>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                    {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome da Máquina *</Label>
                <Input value={formData.nome} onChange={(e) => setFormData((f) => ({ ...f, nome: e.target.value }))} placeholder="Ex: PC-ADM-01" />
              </div>
              <div className="space-y-2">
                <Label>Usuário</Label>
                <Input value={formData.usuario} onChange={(e) => setFormData((f) => ({ ...f, usuario: e.target.value }))} placeholder="Usuário da máquina" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Setor</Label>
                <Input value={formData.setor} onChange={(e) => setFormData((f) => ({ ...f, setor: e.target.value }))} placeholder="Ex: Financeiro" />
              </div>
              <div className="space-y-2">
                <Label>Processador</Label>
                <Input value={formData.processador} onChange={(e) => setFormData((f) => ({ ...f, processador: e.target.value }))} placeholder="Ex: i5 4ª Gen" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>RAM (GB)</Label>
                <Input type="number" value={formData.ram_gb} onChange={(e) => setFormData((f) => ({ ...f, ram_gb: e.target.value }))} placeholder="Ex: 8" />
              </div>
              <div className="space-y-2">
                <Label>Armazenamento (GB)</Label>
                <Input type="number" value={formData.armazenamento_gb} onChange={(e) => setFormData((f) => ({ ...f, armazenamento_gb: e.target.value }))} placeholder="Ex: 500" />
              </div>
              <div className="space-y-2">
                <Label>Tipo de Disco</Label>
                <Select value={formData.tipo_disco} onValueChange={(v) => setFormData((f) => ({ ...f, tipo_disco: v }))}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HD">HD</SelectItem>
                    <SelectItem value="SSD">SSD</SelectItem>
                    <SelectItem value="NVMe">NVMe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Sistema Operacional</Label>
              <Input value={formData.sistema_operacional} onChange={(e) => setFormData((f) => ({ ...f, sistema_operacional: e.target.value }))} placeholder="Ex: Windows 10" />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.observacoes} onChange={(e) => setFormData((f) => ({ ...f, observacoes: e.target.value }))} placeholder="Observações gerais" rows={2} />
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
