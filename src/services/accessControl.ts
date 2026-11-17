import { supabase } from "@/integrations/supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { AccessPermissionStatus } from "@/lib/accessControl";

export type AccessUser = Tables<"access_users">;
export type AccessDirectory = Tables<"access_directories">;
export type AccessPermission = Tables<"access_permissions">;
export type AccessScope = Tables<"access_scopes">;
export type AccessAuditLog = Tables<"access_audit_logs">;

export interface PermissionChange {
  access_user_id: string;
  directory_id: string;
  read_status: AccessPermissionStatus;
  write_status: AccessPermissionStatus;
  scope_notes?: string | null;
  scope_paths?: string[];
}

export async function getAccessClientOptions() {
  const [clientsResult, firstAccessResult] = await Promise.all([
    supabase.from("clients").select("id, name, status").order("name"),
    supabase.from("access_users").select("client_id").limit(1),
  ]);
  if (clientsResult.error) throw clientsResult.error;
  if (firstAccessResult.error) throw firstAccessResult.error;
  return {
    clients: clientsResult.data || [],
    preferredClientId: firstAccessResult.data?.[0]?.client_id || clientsResult.data?.[0]?.id || null,
  };
}

export async function listAccessData(clientId: string) {
  const [users, directories, permissions, scopes] = await Promise.all([
    supabase.from("access_users").select("*").eq("client_id", clientId).order("name"),
    supabase.from("access_directories").select("*").eq("client_id", clientId).order("sort_order").order("name"),
    supabase.from("access_permissions").select("*, access_users!inner(client_id)").eq("access_users.client_id", clientId),
    supabase.from("access_scopes").select("*"),
  ]);
  if (users.error) throw users.error;
  if (directories.error) throw directories.error;
  if (permissions.error) throw permissions.error;
  if (scopes.error) throw scopes.error;
  return {
    users: (users.data || []) as AccessUser[],
    directories: (directories.data || []) as AccessDirectory[],
    permissions: (permissions.data || []) as AccessPermission[],
    scopes: (scopes.data || []) as AccessScope[],
  };
}

export async function listProfilesForAccess() {
  const { data, error } = await supabase.from("profiles").select("id, email, name, client_id, role").order("email");
  if (error) throw error;
  return data || [];
}

export async function saveAccessUser(input: TablesInsert<"access_users"> | (TablesUpdate<"access_users"> & { id: string })) {
  const query = "id" in input && input.id
    ? supabase.from("access_users").update(input).eq("id", input.id).select().single()
    : supabase.from("access_users").insert(input as TablesInsert<"access_users">).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function deleteAccessUser(id: string) {
  const { error } = await supabase.from("access_users").delete().eq("id", id);
  if (error) throw error;
}

export async function saveAccessDirectory(input: TablesInsert<"access_directories"> | (TablesUpdate<"access_directories"> & { id: string })) {
  const query = "id" in input && input.id
    ? supabase.from("access_directories").update(input).eq("id", input.id).select().single()
    : supabase.from("access_directories").insert(input as TablesInsert<"access_directories">).select().single();
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function setAccessDirectoryActive(id: string, active: boolean) {
  const { error } = await supabase.from("access_directories").update({ active }).eq("id", id);
  if (error) throw error;
}

export async function savePermission(change: PermissionChange) {
  const { error } = await supabase.rpc("admin_save_permission", {
    p_access_user_id: change.access_user_id,
    p_directory_id: change.directory_id,
    p_read_status: change.read_status,
    p_write_status: change.write_status,
    p_scope_notes: change.scope_notes || null,
    p_scope_paths: change.scope_paths || [],
  });
  if (error) throw error;
}

export async function savePermissionsBatch(changes: PermissionChange[]) {
  const { error } = await supabase.rpc("admin_batch_save_permissions", { p_changes: changes });
  if (error) throw error;
}

export async function listAccessAuditLogs(clientId: string) {
  const { data, error } = await supabase
    .from("access_audit_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("changed_at", { ascending: false })
    .limit(300);
  if (error) throw error;
  return (data || []) as AccessAuditLog[];
}

export async function exportAccessMatrix({
  users,
  directories,
  permissions,
  scopes,
  clientName,
}: {
  users: AccessUser[];
  directories: AccessDirectory[];
  permissions: AccessPermission[];
  scopes: AccessScope[];
  clientName: string;
}) {
  const XLSX = await import("xlsx");
  const { ACCESS_LEVEL_LABELS, PERMISSION_STATUS_LABELS, getAccessLevel } = await import("@/lib/accessControl");
  const permissionMap = new Map(permissions.map((permission) => [`${permission.access_user_id}:${permission.directory_id}`, permission]));
  const activeUsers = users.filter((user) => user.active);
  const activeDirectories = directories.filter((directory) => directory.active && directory.parent_id);
  const matrixRows = activeDirectories.map((directory) => {
    const row: Record<string, string> = { "Diretório": directory.name };
    activeUsers.forEach((user) => {
      const permission = permissionMap.get(`${user.id}:${directory.id}`);
      row[user.name] = permission ? ACCESS_LEVEL_LABELS[getAccessLevel(permission.read_status, permission.write_status)] : ACCESS_LEVEL_LABELS.undefined;
    });
    return row;
  });
  const detailRows = activeDirectories.flatMap((directory) => activeUsers.map((user) => {
    const permission = permissionMap.get(`${user.id}:${directory.id}`);
    const permissionScopes = permission ? scopes.filter((scope) => scope.permission_id === permission.id) : [];
    return {
      "Diretório": directory.name,
      "Colaborador": user.name,
      "Leitura": PERMISSION_STATUS_LABELS[permission?.read_status || "undefined"],
      "Alteração": PERMISSION_STATUS_LABELS[permission?.write_status || "undefined"],
      "Nível": permission ? ACCESS_LEVEL_LABELS[getAccessLevel(permission.read_status, permission.write_status)] : ACCESS_LEVEL_LABELS.undefined,
      "Pastas/subpastas limitadas": permissionScopes.map((scope) => scope.path).join("\n"),
      "Observações do escopo": permissionScopes[0]?.notes || "",
    };
  }));
  const notes = directories.find((directory) => !directory.parent_id && directory.notes)?.notes || "";
  const workbook = XLSX.utils.book_new();
  const matrixSheet = XLSX.utils.json_to_sheet(matrixRows);
  matrixSheet["!cols"] = [{ wch: 38 }, ...activeUsers.map(() => ({ wch: 23 }))];
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  detailSheet["!cols"] = [{ wch: 38 }, { wch: 22 }, { wch: 18 }, { wch: 18 }, { wch: 24 }, { wch: 45 }, { wch: 45 }];
  const notesSheet = XLSX.utils.aoa_to_sheet([["Observações da planilha original"], [notes]]);
  notesSheet["!cols"] = [{ wch: 120 }];
  XLSX.utils.book_append_sheet(workbook, matrixSheet, "Matriz");
  XLSX.utils.book_append_sheet(workbook, detailSheet, "Detalhamento");
  XLSX.utils.book_append_sheet(workbook, notesSheet, "Observações");
  XLSX.writeFile(workbook, `controle-acessos-${clientName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
