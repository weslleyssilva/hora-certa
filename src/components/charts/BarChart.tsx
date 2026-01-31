import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DataPoint {
  name: string;
  value: number;
}

interface BarChartProps {
  title: string;
  description?: string;
  data: DataPoint[];
  dataKey?: string;
  xAxisKey?: string;
  color?: string;
  height?: number;
  formatValue?: (value: number) => string;
  formatXAxis?: (value: string) => string;
}

export function BarChart({
  title,
  description,
  data,
  dataKey = "value",
  xAxisKey = "name",
  color = "hsl(var(--primary))",
  height = 300,
  formatValue = (v) => String(v),
  formatXAxis = (v) => v,
}: BarChartProps) {
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
            <RechartsBarChart
              data={data}
              margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
              />
              <XAxis
                dataKey={xAxisKey}
                tickFormatter={formatXAxis}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickFormatter={formatValue}
                dx={-10}
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-md">
                      <p className="text-sm text-muted-foreground">{formatXAxis(label)}</p>
                      <p className="text-lg font-semibold text-foreground">
                        {formatValue(payload[0].value as number)}
                      </p>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey={dataKey}
                fill={color}
                radius={[4, 4, 0, 0]}
              />
            </RechartsBarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
