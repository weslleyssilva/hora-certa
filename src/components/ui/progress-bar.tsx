import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number;
  max: number;
  label?: string;
  showPercentage?: boolean;
  variant?: "default" | "success" | "warning" | "destructive";
  className?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  showPercentage = true,
  variant = "default",
  className,
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  
  // Determine variant based on percentage if not explicitly set
  const computedVariant = variant === "default" 
    ? percentage >= 90 
      ? "destructive" 
      : percentage >= 75 
        ? "warning" 
        : "success"
    : variant;

  const barColors = {
    default: "bg-primary",
    success: "bg-success",
    warning: "bg-warning",
    destructive: "bg-destructive",
  };

  return (
    <div className={cn("space-y-2", className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && (
            <span className="font-medium">{Math.round(percentage)}%</span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColors[computedVariant]
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{value} consumido</span>
        <span>{max} total</span>
      </div>
    </div>
  );
}
