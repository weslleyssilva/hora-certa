import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { KPICard } from "@/components/ui/kpi-card";
import { BarChart } from "@/components/charts/BarChart";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Ban, FolderKanban, ShieldCheck, Users } from "lucide-react";
import { ACCESS_LEVEL_LABELS, getAccessLevel, hasDirectoryAccess, type AccessLevel } from "@/lib/accessControl";
import type { AccessDirectory, AccessPermission, AccessUser } from "@/services/accessControl";

const chartColors: Record<AccessLevel, string> = {
  read: "hsl(var(--success))",
  read_write: "hsl(var(--primary))",
  limited: "hsl(var(--warning))",
  denied: "hsl(var(--destructive))",
  undefined: "hsl(var(--muted))",
};

export function AccessOverview({ users, directories, permissions }: {
  users: AccessUser[];
  directories: AccessDirectory[];
  permissions: AccessPermission[];
}) {
  const activeUsers = users.filter((user) => user.active);
  const activeDirectories = directories.filter((directory) => directory.active && directory.parent_id);
  const activeUserIds = new Set(activeUsers.map((user) => user.id));
  const activeDirectoryIds = new Set(activeDirectories.map((directory) => directory.id));
  const activePermissions = permissions.filter((permission) => activeUserIds.has(permission.access_user_id) && activeDirectoryIds.has(permission.directory_id));
  const usersWithAccess = new Set(activePermissions.filter((permission) => hasDirectoryAccess(permission.read_status, permission.write_status)).map((permission) => permission.access_user_id)).size;
  const deniedMarks = activePermissions.reduce((total, permission) => total + Number(permission.read_status === "denied") + Number(permission.write_status === "denied"), 0);
  const distribution = useMemo(() => {
    const counts: Record<AccessLevel, number> = { read: 0, read_write: 0, limited: 0, denied: 0, undefined: 0 };
    activePermissions.forEach((permission) => counts[getAccessLevel(permission.read_status, permission.write_status)] += 1);
    return (Object.keys(counts) as AccessLevel[]).map((level) => ({ name: ACCESS_LEVEL_LABELS[level], value: counts[level], level })).filter((item) => item.value > 0);
  }, [activePermissions]);
  const directoryRanking = activeDirectories.map((directory) => ({
    name: directory.name,
    value: activePermissions.filter((permission) => permission.directory_id === directory.id && hasDirectoryAccess(permission.read_status, permission.write_status)).length,
  })).sort((a, b) => b.value - a.value).slice(0, 8);
  const notes = directories.find((directory) => !directory.parent_id && directory.notes)?.notes;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="Colaboradores ativos" value={activeUsers.length} subtitle={`${users.length - activeUsers.length} inativos`} icon={Users} />
        <KPICard title="Diretórios ativos" value={activeDirectories.length} subtitle={`${directories.filter((directory) => !directory.parent_id).length} grupos principais`} icon={FolderKanban} variant="primary" />
        <KPICard title="Com ao menos um acesso" value={usersWithAccess} subtitle="Leitura, alteração ou acesso limitado" icon={ShieldCheck} variant="success" />
        <KPICard title="Acessos negados registrados" value={deniedMarks} subtitle="Marcações explícitas de negação" icon={Ban} variant="destructive" />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-base">Distribuição dos acessos</CardTitle>
            <CardDescription>Nível predominante de cada combinação colaborador e diretório.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distribution} dataKey="value" nameKey="name" innerRadius={65} outerRadius={95} paddingAngle={2} strokeWidth={0}>
                    {distribution.map((entry) => <Cell key={entry.level} fill={chartColors[entry.level]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: "var(--radius)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs">
              {distribution.map((entry) => <div key={entry.level} className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chartColors[entry.level] }} /><span>{entry.name}: <strong>{entry.value}</strong></span></div>)}
            </div>
          </CardContent>
        </Card>
        <BarChart title="Diretórios com mais colaboradores" description="Quantidade com leitura, alteração ou acesso limitado." data={directoryRanking} formatXAxis={(value) => value.length > 23 ? `${value.slice(0, 23)}…` : value} />
      </div>
      {notes && <Card className="border-border/50"><CardHeader><CardTitle className="text-base">Observações da planilha original</CardTitle><CardDescription>Importadas da aba 13-11-2026 SINTEC.</CardDescription></CardHeader><CardContent><p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{notes}</p></CardContent></Card>}
    </div>
  );
}
