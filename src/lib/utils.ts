import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, parseISO, differenceInMinutes } from "date-fns"
import { ptBR } from "date-fns/locale"
import { MIN_BILLED_HOURS, DATE_FORMAT, TIME_FORMAT, DATETIME_FORMAT, MONTH_FORMAT, COMPETENCE_FORMAT } from "./constants"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para calcular horas faturadas (sempre inteiro, mínimo 1)
export function calculateBilledHours(durationMinutes: number): number {
  if (durationMinutes <= 0) return MIN_BILLED_HOURS;
  return Math.max(MIN_BILLED_HOURS, Math.ceil(durationMinutes / 60));
}

// Calcular duração em minutos entre dois horários
export function calculateDurationMinutes(startTime: string, endTime: string): number {
  const today = new Date().toISOString().split('T')[0];
  const start = new Date(`${today}T${startTime}`);
  const end = new Date(`${today}T${endTime}`);
  
  const diff = differenceInMinutes(end, start);
  return diff > 0 ? diff : 0;
}

// Formatação de datas
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATE_FORMAT, { locale: ptBR });
}

export function formatTime(time: string): string {
  // time vem como "HH:mm:ss" do banco
  return time.substring(0, 5);
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, DATETIME_FORMAT, { locale: ptBR });
}

export function formatMonth(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, MONTH_FORMAT, { locale: ptBR });
}

export function formatCompetence(competence: string): string {
  // competence vem como "YYYY-MM"
  const [year, month] = competence.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return format(date, MONTH_FORMAT, { locale: ptBR });
}

export function getCurrentCompetence(): string {
  return format(new Date(), COMPETENCE_FORMAT);
}

export function getCompetenceOptions(months: number = 12): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const now = new Date();
  
  for (let i = 0; i < months; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: format(date, COMPETENCE_FORMAT),
      label: format(date, MONTH_FORMAT, { locale: ptBR }),
    });
  }
  
  return options;
}

// Status helpers
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: "Ativo",
    inactive: "Inativo",
  };
  return labels[status] || status;
}

export function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    ADMIN: "Administrador",
    CLIENT_USER: "Usuário Cliente",
  };
  return labels[role] || role;
}

// Truncar texto
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}

// Formatar horas para exibição
export function formatHours(hours: number): string {
  return `${hours}h`;
}

// Calcular percentual consumido
export function calculatePercentage(consumed: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((consumed / total) * 100);
}

// Verificar se contrato está ativo
export function isContractActive(startDate: string, endDate: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return today >= start && today <= end;
}

// Verificar se contrato vence em X dias
export function contractExpiresInDays(endDate: string, days: number): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  const diffTime = end.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= days;
}
