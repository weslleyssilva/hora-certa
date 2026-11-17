import type { Database } from "@/integrations/supabase/types";

export type AccessPermissionStatus = Database["public"]["Enums"]["access_permission_status"];
export type AccessLevel = "denied" | "read" | "read_write" | "limited" | "undefined";

export const PERMISSION_STATUS_LABELS: Record<AccessPermissionStatus, string> = {
  granted: "Permitida",
  denied: "Negada",
  limited: "Limitada",
  undefined: "Não definida",
};

export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  denied: "Sem acesso",
  read: "Leitura",
  read_write: "Leitura e alteração",
  limited: "Limitado",
  undefined: "Não definido",
};

export const ACCESS_LEVEL_PRESETS: Record<AccessLevel, { read: AccessPermissionStatus; write: AccessPermissionStatus }> = {
  denied: { read: "denied", write: "denied" },
  read: { read: "granted", write: "denied" },
  read_write: { read: "granted", write: "granted" },
  limited: { read: "limited", write: "limited" },
  undefined: { read: "undefined", write: "undefined" },
};

export function getAccessLevel(read: AccessPermissionStatus, write: AccessPermissionStatus): AccessLevel {
  if (read === "limited" || write === "limited") return "limited";
  if (write === "granted") return "read_write";
  if (read === "granted") return "read";
  if (read === "denied" || write === "denied") return "denied";
  return "undefined";
}

export function hasDirectoryAccess(read: AccessPermissionStatus, write: AccessPermissionStatus) {
  return [read, write].some((status) => status === "granted" || status === "limited");
}

export function applyAccessLevel(level: AccessLevel) {
  return { ...ACCESS_LEVEL_PRESETS[level] };
}

export function normalizeWriteChange(
  read: AccessPermissionStatus,
  write: AccessPermissionStatus,
): { read: AccessPermissionStatus; write: AccessPermissionStatus } {
  return write === "granted" && read !== "granted" && read !== "limited"
    ? { read: "granted", write }
    : { read, write };
}

export function formatPermissionPair(read: AccessPermissionStatus, write: AccessPermissionStatus) {
  return `Leitura: ${PERMISSION_STATUS_LABELS[read]} | Alteração: ${PERMISSION_STATUS_LABELS[write]}`;
}
