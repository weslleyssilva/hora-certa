import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DonutChartProps {
  title?: string;
  description?: string;
  consumed: number;
  contracted: number;
  formatValue?: (value: number) => string;
  className?: string;
}

export function DonutChart({
  title,
  description,
  consumed,
  contracted,
  formatValue = (v) => `${v}h`,
  className,
}: DonutChartProps) {
  const remaining = Math.max(0, contracted - consumed);
  const percentConsumed = contracted > 0 ? Math.round((consumed / contracted) * 100) : 0;

  const data = [
    { name: "Consumidas", value: consumed, color: "hsl(var(--primary))" },
    { name: "Restantes", value: remaining, color: "hsl(var(--muted))" },
  ];

  // Handle edge case where both are 0
  const hasData = consumed > 0 || remaining > 0;
  if (!hasData) {
    data[0].value = 0;
    data[1].value = 1; // Show empty ring
  }

  const content = (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width={200} height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-2xl font-bold text-foreground">
          {formatValue(consumed)}
        </span>
        <span className="text-xs text-muted-foreground">
          de {formatValue(contracted)}
        </span>
        <span className="mt-1 text-xs font-medium text-primary">
          {percentConsumed}%
        </span>
      </div>
    </div>
  );

  if (!title) {
    return <div className={className}>{content}</div>;
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && (
            <CardDescription className="text-sm">{description}</CardDescription>
          )}
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center pb-4">
        {content}
        <div className="mt-4 flex w-full justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-primary" />
            <span className="text-muted-foreground">
              Consumidas: {formatValue(consumed)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full bg-muted" />
            <span className="text-muted-foreground">
              Restantes: {formatValue(remaining)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
