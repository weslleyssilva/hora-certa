import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TICKET_CATEGORIES, TICKET_CATEGORY_COLORS, TicketCategory } from "@/lib/constants";

const CATEGORY_CHART_COLORS: Record<string, string> = {
  suporte: "#3b82f6",
  desenvolvimento: "#a855f7",
  reuniao: "#eab308",
  consultoria: "#22c55e",
  infraestrutura: "#f97316",
  outro: "#6b7280",
};

interface CategoryDonutChartProps {
  title?: string;
  description?: string;
  data: { category: string; hours: number }[];
  className?: string;
}

export function CategoryDonutChart({
  title,
  description,
  data,
  className,
}: CategoryDonutChartProps) {
  const chartData = data
    .filter((d) => d.hours > 0)
    .map((d) => ({
      name: TICKET_CATEGORIES[d.category as TicketCategory] || d.category,
      value: d.hours,
      color: CATEGORY_CHART_COLORS[d.category] || "#6b7280",
    }));

  const totalHours = chartData.reduce((sum, d) => sum + d.value, 0);

  if (chartData.length === 0) {
    return (
      <Card className={className}>
        {title && (
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-medium">{title}</CardTitle>
            {description && <CardDescription className="text-sm">{description}</CardDescription>}
          </CardHeader>
        )}
        <CardContent className="flex items-center justify-center py-8">
          <p className="text-sm text-muted-foreground">Sem dados no período</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">{title}</CardTitle>
          {description && <CardDescription className="text-sm">{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center pb-4">
        <div className="relative flex items-center justify-center">
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}h`, ""]}
                contentStyle={{ fontSize: "12px" }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-bold text-foreground">{totalHours}h</span>
            <span className="text-xs text-muted-foreground">total</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
          {chartData.map((d, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-muted-foreground text-xs">
                {d.name}: {d.value}h
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
