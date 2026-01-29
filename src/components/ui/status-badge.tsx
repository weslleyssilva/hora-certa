import { cn } from "@/lib/utils";

type StatusBadgeVariant = 
  | "active" 
  | "inactive" 
  | "warning" 
  | "error" 
  | "success" 
  | "default" 
  | "destructive" 
  | "secondary"
  | "primary";

interface StatusBadgeProps {
  status?: StatusBadgeVariant;
  variant?: StatusBadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const statusStyles: Record<StatusBadgeVariant, string> = {
  active: "bg-success/15 text-success border border-success/30",
  inactive: "bg-muted text-muted-foreground border border-border",
  warning: "bg-warning/15 text-warning border border-warning/30",
  error: "bg-destructive/15 text-destructive border border-destructive/30",
  success: "bg-success/15 text-success border border-success/30",
  default: "bg-muted text-muted-foreground border border-border",
  destructive: "bg-destructive/15 text-destructive border border-destructive/30",
  secondary: "bg-secondary text-secondary-foreground border border-secondary",
  primary: "bg-primary/15 text-primary border border-primary/30",
};

export function StatusBadge({ status, variant, children, className }: StatusBadgeProps) {
  const badgeVariant = variant || status || "default";
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[badgeVariant],
        className
      )}
    >
      {children}
    </span>
  );
}
