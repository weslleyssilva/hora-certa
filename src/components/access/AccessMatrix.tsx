import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { Download, Layers3, Search, ShieldCheck } from "lucide-react";
import { ACCESS_LEVEL_LABELS, ACCESS_LEVEL_PRESETS, applyAccessLevel, formatPermissionPair, getAccessLevel, normalizeWriteChange, type AccessLevel, type AccessPermissionStatus } from "@/lib/accessControl";
import { accessPermissionSchema, getValidationError } from "@/lib/validations";
import { exportAccessMatrix, savePermission, savePermissionsBatch, type AccessDirectory, type AccessPermission, type AccessScope, type AccessUser, type PermissionChange } from "@/services/accessControl";
import { PermissionStatusBadge } from "./PermissionStatusBadge";
import { toast } from "@/hooks/use-toast";

interface AccessMatrixProps {
  users: AccessUser[];
  directories: AccessDirectory[];
  permissions: AccessPermission[];
  scopes: AccessScope[];
  clientName: string;
  onReload: () => Promise<void>;
}

export function AccessMatrix({ users, directories, permissions, scopes, clientName, onReload }: AccessMatrixProps) {
  const [search, setSearch] = useState("");
  const [userFilter, setUserFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");
  const [levelFilter, setLevelFilter] = useState("all");
  const [batchMode, setBatchMode] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedDirectories, setSelectedDirectories] = useState<string[]>([]);
  const [batchLevel, setBatchLevel] = useState<AccessLevel>("read");
  const [batchScopeText, setBatchScopeText] = useState("");
  const [batchScopeNotes, setBatchScopeNotes] = useState("");
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [target, setTarget] = useState<{ user: AccessUser; directory: AccessDirectory } | null>(null);
  const [readStatus, setReadStatus] = useState<AccessPermissionStatus>("undefined");
  const [writeStatus, setWriteStatus] = useState<AccessPermissionStatus>("undefined");
  const [scopeText, setScopeText] = useState("");
  const [scopeNotes, setScopeNotes] = useState("");
  const activeUsers = useMemo(() => users.filter((user) => user.active), [users]);
  const activeDirectories = useMemo(() => directories.filter((directory) => directory.active && directory.parent_id), [directories]);
  const roots = directories.filter((directory) => !directory.parent_id);
  const permissionMap = useMemo(() => new Map(permissions.map((permission) => [`${permission.access_user_id}:${permission.directory_id}`, permission])), [permissions]);
  const visibleUsers = activeUsers.filter((user) => userFilter === "all" || user.id === userFilter);
  const visibleDirectories = activeDirectories.filter((directory) => {
    if (!directory.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (groupFilter !== "all" && directory.parent_id !== groupFilter) return false;
    if (levelFilter !== "all") {
      const matches = visibleUsers.some((user) => {
        const permission = permissionMap.get(`${user.id}:${directory.id}`);
        return getAccessLevel(permission?.read_status || "undefined", permission?.write_status || "undefined") === levelFilter;
      });
      if (!matches) return false;
    }
    return true;
  });

  useEffect(() => {
    if (!target) return;
    const permission = permissionMap.get(`${target.user.id}:${target.directory.id}`);
    const currentScopes = permission ? scopes.filter((scope) => scope.permission_id === permission.id) : [];
    setReadStatus(permission?.read_status || "undefined");
    setWriteStatus(permission?.write_status || "undefined");
    setScopeText(currentScopes.map((scope) => scope.path).join("\n"));
    setScopeNotes(currentScopes[0]?.notes || "");
  }, [target, permissionMap, scopes]);

  const scopePaths = (value: string) => [...new Set(value.split("\n").map((path) => path.trim()).filter(Boolean))];
  const limited = readStatus === "limited" || writeStatus === "limited";
  const openPermission = (user: AccessUser, directory: AccessDirectory) => setTarget({ user, directory });

  const handleSave = async () => {
    if (!target) return;
    const change: PermissionChange = {
      access_user_id: target.user.id,
      directory_id: target.directory.id,
      read_status: readStatus,
      write_status: writeStatus,
      scope_paths: scopePaths(scopeText),
      scope_notes: scopeNotes.trim() || null,
    };
    const validation = accessPermissionSchema.safeParse(change);
    const validationError = getValidationError(validation);
    if (validationError) return toast({ title: validationError, variant: "destructive" });
    setIsSaving(true);
    try {
      await savePermission(change);
      toast({ title: "Permissão atualizada", description: `${target.user.name} · ${target.directory.name}` });
      setTarget(null);
      await onReload();
    } catch (error: any) {
      toast({ title: "Erro ao salvar permissão", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const toggle = (values: string[], id: string, setter: (next: string[]) => void) => setter(values.includes(id) ? values.filter((value) => value !== id) : [...values, id]);
  const batchChanges = selectedUsers.flatMap((userId) => selectedDirectories.map((directoryId) => {
    const preset = applyAccessLevel(batchLevel);
    return {
      access_user_id: userId,
      directory_id: directoryId,
      read_status: preset.read,
      write_status: preset.write,
      scope_paths: scopePaths(batchScopeText),
      scope_notes: batchScopeNotes.trim() || null,
    };
  }));
  const openBatchConfirmation = () => {
    if (!selectedUsers.length || !selectedDirectories.length) return toast({ title: "Selecione colaboradores e diretórios", variant: "destructive" });
    const sample = batchChanges[0];
    const validation = accessPermissionSchema.safeParse(sample);
    const validationError = getValidationError(validation);
    if (validationError) return toast({ title: validationError, variant: "destructive" });
    setIsBatchConfirmOpen(true);
  };
  const handleBatchSave = async () => {
    setIsSaving(true);
    try {
      await savePermissionsBatch(batchChanges);
      toast({ title: "Edição em lote concluída", description: `${batchChanges.length} permissões atualizadas.` });
      setIsBatchConfirmOpen(false);
      setBatchMode(false);
      setSelectedUsers([]);
      setSelectedDirectories([]);
      await onReload();
    } catch (error: any) {
      toast({ title: "Erro na edição em lote", description: error.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };
  const handleExport = async () => {
    try {
      await exportAccessMatrix({ users: visibleUsers, directories: [...visibleDirectories, ...roots], permissions, scopes, clientName });
      toast({ title: "Planilha Excel gerada", description: "A exportação respeita os filtros aplicados." });
    } catch (error: any) {
      toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div><CardTitle className="text-base">Matriz de permissões</CardTitle><CardDescription>Clique em uma célula para editar leitura, alteração ou escopo limitado.</CardDescription></div>
          <div className="flex flex-wrap gap-2"><Button variant="outline" onClick={handleExport}><Download className="mr-2 h-4 w-4" />Exportar Excel</Button><Button variant={batchMode ? "secondary" : "outline"} onClick={() => setBatchMode(!batchMode)}><Layers3 className="mr-2 h-4 w-4" />{batchMode ? "Fechar lote" : "Edição em lote"}</Button></div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar diretório" className="pl-9" /></div>
            <Select value={userFilter} onValueChange={setUserFilter}><SelectTrigger><SelectValue placeholder="Colaborador" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os colaboradores</SelectItem>{activeUsers.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}</SelectContent></Select>
            <Select value={groupFilter} onValueChange={setGroupFilter}><SelectTrigger><SelectValue placeholder="Grupo" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os grupos</SelectItem>{roots.map((root) => <SelectItem key={root.id} value={root.id}>{root.name}</SelectItem>)}</SelectContent></Select>
            <Select value={levelFilter} onValueChange={setLevelFilter}><SelectTrigger><SelectValue placeholder="Nível" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os níveis</SelectItem>{Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Legenda:</span><PermissionStatusBadge status="granted" operation="read" compact /> Permitida <PermissionStatusBadge status="denied" operation="read" compact /> Negada <PermissionStatusBadge status="limited" operation="read" compact /> Limitada <PermissionStatusBadge status="undefined" operation="read" compact /> Não definida <span className="ml-2">L = leitura · A = alteração</span></div>
        </CardContent>
      </Card>

      {batchMode && <Card className="border-primary/30">
        <CardHeader><CardTitle className="text-base">Aplicar uma permissão em lote</CardTitle><CardDescription>Selecione os destinos e confirme a quantidade exata antes de salvar.</CardDescription></CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-2">
            <div><div className="mb-2 flex items-center justify-between"><Label>Colaboradores ({selectedUsers.length})</Label><Button variant="ghost" size="sm" onClick={() => setSelectedUsers(selectedUsers.length === visibleUsers.length ? [] : visibleUsers.map((user) => user.id))}>Alternar todos</Button></div><div className="grid max-h-48 gap-2 overflow-y-auto rounded-md border p-3 sm:grid-cols-2">{visibleUsers.map((user) => <label key={user.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selectedUsers.includes(user.id)} onCheckedChange={() => toggle(selectedUsers, user.id, setSelectedUsers)} />{user.name}</label>)}</div></div>
            <div><div className="mb-2 flex items-center justify-between"><Label>Diretórios ({selectedDirectories.length})</Label><Button variant="ghost" size="sm" onClick={() => setSelectedDirectories(selectedDirectories.length === visibleDirectories.length ? [] : visibleDirectories.map((directory) => directory.id))}>Alternar todos</Button></div><div className="max-h-48 space-y-2 overflow-y-auto rounded-md border p-3">{visibleDirectories.map((directory) => <label key={directory.id} className="flex items-center gap-2 text-sm"><Checkbox checked={selectedDirectories.includes(directory.id)} onCheckedChange={() => toggle(selectedDirectories, directory.id, setSelectedDirectories)} />{directory.name}</label>)}</div></div>
          </div>
          <div className="grid gap-4 md:grid-cols-2"><div className="space-y-2"><Label>Novo nível</Label><Select value={batchLevel} onValueChange={(value) => setBatchLevel(value as AccessLevel)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div>{batchLevel === "limited" && <div className="space-y-2"><Label>Pastas/subpastas (uma por linha)</Label><Textarea value={batchScopeText} onChange={(event) => setBatchScopeText(event.target.value)} placeholder="Ex.: Documentos vigentes\Qualidade" /></div>}</div>
          {batchLevel === "limited" && <div className="space-y-2"><Label>Observações do escopo</Label><Input value={batchScopeNotes} onChange={(event) => setBatchScopeNotes(event.target.value)} maxLength={2000} /></div>}
          <Button onClick={openBatchConfirmation}>Revisar aplicação em lote</Button>
        </CardContent>
      </Card>}

      <Card className="border-border/50"><CardContent className="p-0">{visibleDirectories.length === 0 || visibleUsers.length === 0 ? <EmptyState icon={<ShieldCheck className="h-6 w-6" />} title="Nenhum resultado" description="Ajuste os filtros para visualizar a matriz." className="m-6" /> : <div className="max-w-full overflow-x-auto"><Table><TableHeader><TableRow><TableHead className="sticky left-0 z-20 min-w-64 bg-card">Diretório</TableHead>{visibleUsers.map((user) => <TableHead key={user.id} className="min-w-28 text-center">{user.name}<span className="block text-[10px] font-normal text-muted-foreground">L · A</span></TableHead>)}</TableRow></TableHeader><TableBody>{visibleDirectories.map((directory) => <TableRow key={directory.id}><TableCell className="sticky left-0 z-10 bg-card font-medium"><div>{directory.name}</div><div className="text-xs font-normal text-muted-foreground">{roots.find((root) => root.id === directory.parent_id)?.name}</div></TableCell>{visibleUsers.map((user) => { const permission = permissionMap.get(`${user.id}:${directory.id}`); const read = permission?.read_status || "undefined"; const write = permission?.write_status || "undefined"; return <TableCell key={user.id} className="p-2 text-center"><button type="button" className="inline-flex items-center gap-1 rounded-md p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={() => openPermission(user, directory)} aria-label={`Editar ${user.name} em ${directory.name}: ${formatPermissionPair(read, write)}`}><PermissionStatusBadge status={read} operation="read" compact /><PermissionStatusBadge status={write} operation="write" compact /></button></TableCell>; })}</TableRow>)}</TableBody></Table></div>}</CardContent></Card>

      <Dialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}><DialogContent><DialogHeader><DialogTitle>Editar permissão</DialogTitle><DialogDescription>{target?.user.name} · {target?.directory.name}</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label>Atalho de nível</Label><Select value={getAccessLevel(readStatus, writeStatus)} onValueChange={(value) => { const preset = applyAccessLevel(value as AccessLevel); setReadStatus(preset.read); setWriteStatus(preset.write); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ACCESS_LEVEL_LABELS).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Leitura</Label><Select value={readStatus} onValueChange={(value) => setReadStatus(value as AccessPermissionStatus)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="granted">Permitida</SelectItem><SelectItem value="denied">Negada</SelectItem><SelectItem value="limited">Limitada</SelectItem><SelectItem value="undefined">Não definida</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label>Alteração</Label><Select value={writeStatus} onValueChange={(value) => { const next = normalizeWriteChange(readStatus, value as AccessPermissionStatus); setReadStatus(next.read); setWriteStatus(next.write); }}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="granted">Permitida</SelectItem><SelectItem value="denied">Negada</SelectItem><SelectItem value="limited">Limitada</SelectItem><SelectItem value="undefined">Não definida</SelectItem></SelectContent></Select></div></div>{limited && <><div className="space-y-2"><Label>Pastas ou subpastas permitidas</Label><Textarea value={scopeText} onChange={(event) => setScopeText(event.target.value)} placeholder="Uma pasta ou subpasta por linha" rows={4} /></div><div className="space-y-2"><Label>Observações do escopo</Label><Textarea value={scopeNotes} onChange={(event) => setScopeNotes(event.target.value)} maxLength={2000} /></div></>}</div><DialogFooter><Button variant="outline" onClick={() => setTarget(null)}>Cancelar</Button><Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar permissão"}</Button></DialogFooter></DialogContent></Dialog>

      <AlertDialog open={isBatchConfirmOpen} onOpenChange={setIsBatchConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar edição em lote</AlertDialogTitle><AlertDialogDescription>Serão alteradas <strong>{batchChanges.length} permissões</strong>: {selectedUsers.length} colaboradores em {selectedDirectories.length} diretórios, para o nível <strong>{ACCESS_LEVEL_LABELS[batchLevel]}</strong>. Esta ação será registrada no histórico.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleBatchSave} disabled={isSaving}>{isSaving ? "Aplicando..." : "Confirmar alterações"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>
  );
}
