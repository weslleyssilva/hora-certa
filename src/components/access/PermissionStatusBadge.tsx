import { Ban, BookOpen, ListFilter, Minus, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { PERMISSION_STATUS_LABELS, type AccessPermissionStatus } from "@/lib/accessControl";

const styles: Record<AccessPermissionStatus, string> = {
  granted: "border-success/30 bg-success/10 text-success",
  denied: "border-destructive/30 bg-destructive/10 text-destructive",
  limited: "border-warning/40 bg-warning/10 text-warning",
  undefined: "border-border bg-muted/30 text-muted-foreground",
};

export function PermissionStatusBadge({ status, operation, compact = false }: {
  status: AccessPermissionStatus;
  operation: "read" | "write";
  compact?: boolean;
}) {
  const Icon = status === "granted"
    ? operation === "read" ? BookOpen : Pencil
    : status === "denied" ? Ban
      : status === "limited" ? ListFilter : Minus;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center gap-1 rounded-md border text-xs font-medium",
        compact ? "h-7 min-w-7 px-1.5" : "px-2 py-1",
        styles[status],
      )}
      title={`${operation === "read" ? "Leitura" : "Alteração"}: ${PERMISSION_STATUS_LABELS[status]}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {!compact && <span>{PERMISSION_STATUS_LABELS[status]}</span>}
    </span>
  );
}
