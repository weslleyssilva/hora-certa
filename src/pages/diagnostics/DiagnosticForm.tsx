import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { PageLoader } from "@/components/ui/loading-spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Stethoscope, Save, Ticket, ArrowLeft, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface Machine {
  id: string;
  nome: string;
  usuario: string | null;
  setor: string | null;
  client_id: string;
}

interface DiagnosticRow {
  id: string;
  data: string;
  status: string;
  problemas: string | null;
  recomendacoes: string | null;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  OK: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  "Atenção": "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400",
  "Crítico": "bg-red-500/15 text-red-700 dark:text-red-400",
};

export default function DiagnosticForm() {
  const { user, isAdmin } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const machineIdParam = searchParams.get("machine");

  const [machines, setMachines] = useState<Machine[]>([]);
  const [selectedMachine, setSelectedMachine] = useState<string>(machineIdParam || "");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form
  const [statusVal, setStatusVal] = useState("OK");
  const [problemas, setProblemas] = useState("");
  const [recomendacoes, setRecomendacoes] = useState("");
  const [discoOk, setDiscoOk] = useState(false);
  const [ramOk, setRamOk] = useState(false);
  const [sistemaOk, setSistemaOk] = useState(false);
  const [testObs, setTestObs] = useState("");

  // History
  const [history, setHistory] = useState<DiagnosticRow[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Detail dialog
  const [detailDiag, setDetailDiag] = useState<DiagnosticRow | null>(null);
  const [detailTests, setDetailTests] = useState<any[]>([]);

  const fetchMachines = async () => {
    const { data, error } = await supabase.from("machines").select("id, nome, usuario, setor, client_id").order("nome");
    if (!error) setMachines((data as Machine[]) || []);
    setLoading(false);
  };

  const fetchHistory = async (machineId: string) => {
    if (!machineId) { setHistory([]); return; }
    setLoadingHistory(true);
    const { data, error } = await supabase
      .from("diagnostics")
      .select("*")
      .eq("maquina_id", machineId)
      .order("data", { ascending: false })
      .limit(20);
    if (!error) setHistory((data as DiagnosticRow[]) || []);
    setLoadingHistory(false);
  };

  useEffect(() => { fetchMachines(); }, []);
  useEffect(() => { fetchHistory(selectedMachine); }, [selectedMachine]);

  const resetForm = () => {
    setStatusVal("OK");
    setProblemas("");
    setRecomendacoes("");
    setDiscoOk(false);
    setRamOk(false);
    setSistemaOk(false);
    setTestObs("");
  };

  const handleSave = async () => {
    if (!selectedMachine) {
      toast({ title: "Selecione uma máquina", variant: "destructive" });
      return;
    }
    setSaving(true);

    // Create diagnostic
    const { data: diag, error: diagErr } = await supabase
      .from("diagnostics")
      .insert({
        maquina_id: selectedMachine,
        data: format(new Date(), "yyyy-MM-dd"),
        status: statusVal,
        problemas: problemas.trim() || null,
        recomendacoes: recomendacoes.trim() || null,
      })
      .select()
      .single();

    if (diagErr) {
      toast({ title: "Erro ao salvar diagnóstico", description: diagErr.message, variant: "destructive" });
      setSaving(false);
      return;
    }

    // Create tests
    const { error: testErr } = await supabase.from("tests").insert({
      diagnostico_id: diag.id,
      disco_ok: discoOk,
      ram_ok: ramOk,
      sistema_ok: sistemaOk,
      observacoes: testObs.trim() || null,
    });

    if (testErr) {
      toast({ title: "Diagnóstico salvo, mas erro nos testes", description: testErr.message, variant: "destructive" });
    } else {
      toast({ title: "Diagnóstico salvo com sucesso" });
    }

    resetForm();
    fetchHistory(selectedMachine);
    setSaving(false);
  };

  const handleGenerateTicket = async (diag: DiagnosticRow) => {
    const machine = machines.find((m) => m.id === selectedMachine);
    if (!machine || !user) return;

    const description = `Manutenção na máquina ${machine.nome}${diag.problemas ? ` - Problema: ${diag.problemas}` : ""}${diag.recomendacoes ? ` - Ação recomendada: ${diag.recomendacoes}` : ""}`;

    const { error } = await supabase.from("tickets").insert({
      client_id: machine.client_id,
      created_by_user_id: user.id,
      requester_name: machine.usuario || "Diagnóstico",
      service_date: diag.data,
      description,
      billed_hours: 0,
      status: "open",
      category: "suporte",
      title: `Diagnóstico - ${machine.nome}`,
    });

    if (error) {
      toast({ title: "Erro ao gerar chamado", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Chamado criado com sucesso", description: "O chamado foi adicionado ao sistema de atendimentos." });
    }
  };

  const openDetail = async (diag: DiagnosticRow) => {
    setDetailDiag(diag);
    const { data } = await supabase.from("tests").select("*").eq("diagnostico_id", diag.id);
    setDetailTests(data || []);
  };

  const currentMachine = machines.find((m) => m.id === selectedMachine);

  if (loading) return <AppLayout><PageLoader /></AppLayout>;

  return (
    <AppLayout>
      <div className="flex items-center gap-3 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/diagnostics/machines")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title="Novo Diagnóstico" description="Registre o diagnóstico de um equipamento" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Formulário de Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Máquina *</Label>
              <Select value={selectedMachine} onValueChange={setSelectedMachine}>
                <SelectTrigger><SelectValue placeholder="Selecione a máquina" /></SelectTrigger>
                <SelectContent>
                  {machines.map((m) => (
                    <SelectItem key={m.id} value={m.id}>{m.nome}{m.setor ? ` (${m.setor})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {currentMachine && (
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <p><strong>Usuário:</strong> {currentMachine.usuario || "—"}</p>
                <p><strong>Setor:</strong> {currentMachine.setor || "—"}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={statusVal} onValueChange={setStatusVal}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="OK">OK</SelectItem>
                  <SelectItem value="Atenção">Atenção</SelectItem>
                  <SelectItem value="Crítico">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Problemas Identificados</Label>
              <Textarea value={problemas} onChange={(e) => setProblemas(e.target.value)} placeholder="Descreva os problemas encontrados..." rows={3} />
            </div>

            <div className="space-y-2">
              <Label>Recomendações</Label>
              <Textarea value={recomendacoes} onChange={(e) => setRecomendacoes(e.target.value)} placeholder="Ações recomendadas..." rows={3} />
            </div>

            {/* Tests checklist */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Checklist de Testes</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox id="disco" checked={discoOk} onCheckedChange={(v) => setDiscoOk(v === true)} />
                  <label htmlFor="disco" className="text-sm">Disco OK?</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="ram" checked={ramOk} onCheckedChange={(v) => setRamOk(v === true)} />
                  <label htmlFor="ram" className="text-sm">RAM OK?</label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox id="sistema" checked={sistemaOk} onCheckedChange={(v) => setSistemaOk(v === true)} />
                  <label htmlFor="sistema" className="text-sm">Sistema OK?</label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Observações dos testes</Label>
                <Textarea value={testObs} onChange={(e) => setTestObs(e.target.value)} placeholder="Observações adicionais dos testes..." rows={2} />
              </div>
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Salvando..." : "Salvar Diagnóstico"}
            </Button>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Diagnósticos</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedMachine ? (
              <p className="text-sm text-muted-foreground">Selecione uma máquina para ver o histórico.</p>
            ) : loadingHistory ? (
              <PageLoader />
            ) : history.length === 0 ? (
              <EmptyState icon={<Stethoscope className="h-6 w-6 text-muted-foreground" />} title="Sem diagnósticos" description="Nenhum diagnóstico registrado para esta máquina" />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{format(new Date(d.data + "T00:00:00"), "dd/MM/yyyy")}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[d.status] || ""}>
                          {d.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openDetail(d)} title="Ver detalhes">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleGenerateTicket(d)} title="Gerar Chamado">
                            <Ticket className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!detailDiag} onOpenChange={(open) => !open && setDetailDiag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes do Diagnóstico</DialogTitle>
          </DialogHeader>
          {detailDiag && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className={STATUS_COLORS[detailDiag.status] || ""}>
                  {detailDiag.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {format(new Date(detailDiag.data + "T00:00:00"), "dd/MM/yyyy")}
                </span>
              </div>
              {detailDiag.problemas && (
                <div>
                  <Label className="text-xs text-muted-foreground">Problemas</Label>
                  <p className="text-sm mt-1">{detailDiag.problemas}</p>
                </div>
              )}
              {detailDiag.recomendacoes && (
                <div>
                  <Label className="text-xs text-muted-foreground">Recomendações</Label>
                  <p className="text-sm mt-1">{detailDiag.recomendacoes}</p>
                </div>
              )}
              {detailTests.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground">Testes</Label>
                  <div className="mt-1 space-y-1 text-sm">
                    <p>Disco: {detailTests[0].disco_ok ? "✅ OK" : "❌ Problema"}</p>
                    <p>RAM: {detailTests[0].ram_ok ? "✅ OK" : "❌ Problema"}</p>
                    <p>Sistema: {detailTests[0].sistema_ok ? "✅ OK" : "❌ Problema"}</p>
                    {detailTests[0].observacoes && <p className="text-muted-foreground">{detailTests[0].observacoes}</p>}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {detailDiag && (
              <Button variant="outline" onClick={() => { handleGenerateTicket(detailDiag); setDetailDiag(null); }}>
                <Ticket className="mr-2 h-4 w-4" /> Gerar Chamado
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
