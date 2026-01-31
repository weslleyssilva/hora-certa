import { useState, useMemo } from "react";
import { format, startOfMonth, endOfMonth, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar as CalendarIcon, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type PeriodType = "contract" | "month" | "last30" | "custom";

export interface Period {
  startDate: Date;
  endDate: Date;
}

interface PeriodFilterProps {
  value: Period;
  onChange: (period: Period) => void;
  contractPeriod?: { startDate: Date; endDate: Date };
  showContractOption?: boolean;
  className?: string;
}

export function PeriodFilter({
  value,
  onChange,
  contractPeriod,
  showContractOption = false,
  className,
}: PeriodFilterProps) {
  const [periodType, setPeriodType] = useState<PeriodType>(
    showContractOption && contractPeriod ? "contract" : "month"
  );

  const presetPeriods = useMemo(() => {
    const now = new Date();
    return {
      contract: contractPeriod || { startDate: now, endDate: now },
      month: {
        startDate: startOfMonth(now),
        endDate: endOfMonth(now),
      },
      last30: {
        startDate: subDays(now, 30),
        endDate: now,
      },
    };
  }, [contractPeriod]);

  const handlePeriodTypeChange = (type: PeriodType) => {
    setPeriodType(type);
    if (type !== "custom") {
      onChange(presetPeriods[type]);
    }
  };

  const formatDateRange = () => {
    return `${format(value.startDate, "dd/MM/yy")} - ${format(value.endDate, "dd/MM/yy")}`;
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Select value={periodType} onValueChange={(v) => handlePeriodTypeChange(v as PeriodType)}>
        <SelectTrigger className="h-9 w-[160px] bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {showContractOption && contractPeriod && (
            <SelectItem value="contract">Contrato atual</SelectItem>
          )}
          <SelectItem value="month">Mês atual</SelectItem>
          <SelectItem value="last30">Últimos 30 dias</SelectItem>
          <SelectItem value="custom">Personalizado</SelectItem>
        </SelectContent>
      </Select>

      {periodType === "custom" && (
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 justify-start text-left font-normal",
                  !value.startDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(value.startDate, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.startDate}
                onSelect={(date) =>
                  date && onChange({ ...value, startDate: date })
                }
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <span className="text-sm text-muted-foreground">até</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 justify-start text-left font-normal",
                  !value.endDate && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(value.endDate, "dd/MM/yy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={value.endDate}
                onSelect={(date) =>
                  date && onChange({ ...value, endDate: date })
                }
                locale={ptBR}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {periodType !== "custom" && (
        <span className="text-sm text-muted-foreground">
          {formatDateRange()}
        </span>
      )}
    </div>
  );
}
