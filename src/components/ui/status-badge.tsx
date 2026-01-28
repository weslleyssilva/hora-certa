import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: "active" | "inactive" | "warning" | "error";
  children: React.ReactNode;
  className?: string;
}

const statusStyles = {
  active: "status-active",
  inactive: "status-inactive",
  warning: "status-warning",
  error: "status-error",
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className
      )}
    >
      {children}
    </span>
  );
}
