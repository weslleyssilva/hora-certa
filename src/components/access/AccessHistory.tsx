import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageLoader } from "@/components/ui/loading-spinner";
import { History, Search } from "lucide-react";
import { listAccessAuditLogs, type AccessAuditLog } from "@/services/accessControl";
import { PermissionStatusBadge } from "./PermissionStatusBadge";
import { toast } from "@/hooks/use-toast";

export function AccessHistory({ clientId, profileEmails }: { clientId: string; profileEmails: Map<string, string> }) {
  const [logs, setLogs] = useState<AccessAuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  useEffect(() => {
    setIsLoading(true);
    listAccessAuditLogs(clientId).then(setLogs).catch((error) => {
      console.error(error);
      toast({ title: "Erro ao carregar histórico", variant: "destructive" });
    }).finally(() => setIsLoading(false));
  }, [clientId]);
  const filtered = useMemo(() => logs.filter((log) => `${log.user_name} ${log.directory_name}`.toLowerCase().includes(search.toLowerCase())), [logs, search]);
  if (isLoading) return <PageLoader />;
  return (
    <Card className="border-border/50">
      <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><CardTitle className="text-base">Histórico de alterações</CardTitle><CardDescription>Situação anterior, nova situação, data e responsável.</CardDescription></div>
        <div className="relative w-full sm:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Colaborador ou diretório" className="pl-9" /></div>
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? <EmptyState icon={<History className="h-6 w-6" />} title="Nenhuma alteração registrada" description="As próximas edições de permissões aparecerão aqui." /> : <div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Data e responsável</TableHead><TableHead>Colaborador</TableHead><TableHead>Diretório</TableHead><TableHead>Leitura anterior → nova</TableHead><TableHead>Alteração anterior → nova</TableHead></TableRow></TableHeader><TableBody>{filtered.map((log) => <TableRow key={log.id}><TableCell className="whitespace-nowrap"><div>{format(new Date(log.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div><div className="text-xs text-muted-foreground">{log.changed_by ? profileEmails.get(log.changed_by) || "Usuário administrador" : "Importação"}</div></TableCell><TableCell className="font-medium">{log.user_name}</TableCell><TableCell>{log.directory_name}</TableCell><TableCell><div className="flex items-center gap-2">{log.previous_read_status ? <PermissionStatusBadge status={log.previous_read_status} operation="read" compact /> : <span className="text-xs text-muted-foreground">Novo</span>}<span>→</span>{log.new_read_status ? <PermissionStatusBadge status={log.new_read_status} operation="read" compact /> : <span className="text-xs text-muted-foreground">Removido</span>}</div></TableCell><TableCell><div className="flex items-center gap-2">{log.previous_write_status ? <PermissionStatusBadge status={log.previous_write_status} operation="write" compact /> : <span className="text-xs text-muted-foreground">Novo</span>}<span>→</span>{log.new_write_status ? <PermissionStatusBadge status={log.new_write_status} operation="write" compact /> : <span className="text-xs text-muted-foreground">Removido</span>}</div></TableCell></TableRow>)}</TableBody></Table></div>}
      </CardContent>
    </Card>
  );
}
