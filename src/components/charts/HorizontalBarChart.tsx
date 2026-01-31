import {
  Bar,
  BarChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPoint {
  name: string;
  value: number;
}

interface HorizontalBarChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
  maxItems?: number;
}

export function HorizontalBarChart({
  title,
  description,
  data,
  color = "hsl(var(--primary))",
  height = 300,
  formatValue = (v) => String(v),
  maxItems = 10,
}: HorizontalBarChartProps) {
  const displayData = data.slice(0, maxItems);
  const barHeight = Math.min(32, (height - 40) / displayData.length);

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{title}</CardTitle>
        {description && (
          <CardDescription className="text-sm">{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={displayData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={formatValue}
              />
              <YAxis
                dataKey="name"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--foreground))", fontSize: 12 }}
                width={120}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload as DataPoint;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="text-sm font-medium text-foreground">{data.name}</p>
                      <p className="text-lg font-semibold text-primary">
                        {formatValue(data.value)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="value"
                radius={[0, 4, 4, 0]}
                barSize={barHeight}
              >
                {displayData.map((_, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={color}
                    opacity={1 - index * 0.08}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
