// Constantes do sistema

export const APP_NAME = "Alvo Ticket";
export const APP_DESCRIPTION = "Sistema de Controle de Atendimentos de TI";

// Timezone e locale
export const TIMEZONE = "America/Sao_Paulo";
export const LOCALE = "pt-BR";

// Formatos de data/hora
export const DATE_FORMAT = "dd/MM/yyyy";
export const TIME_FORMAT = "HH:mm";
export const DATETIME_FORMAT = "dd/MM/yyyy HH:mm";
export const MONTH_FORMAT = "MMMM yyyy";
export const COMPETENCE_FORMAT = "yyyy-MM";

// Regras de negócio
export const MIN_BILLED_HOURS = 1;

// Status de cliente
export const CLIENT_STATUS = {
  ACTIVE: "active",
  INACTIVE: "inactive",
} as const;

// Status de ticket
export const TICKET_STATUS = {
  OPEN: "open",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
} as const;

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em Atendimento",
  completed: "Concluído",
};

export const TICKET_STATUS_VARIANTS: Record<string, "default" | "warning" | "success" | "destructive" | "secondary"> = {
  open: "warning",
  in_progress: "secondary",
  completed: "success",
};

// Roles
export const USER_ROLES = {
  ADMIN: "ADMIN",
  CLIENT_USER: "CLIENT_USER",
} as const;

export type AppRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type ClientStatus = typeof CLIENT_STATUS[keyof typeof CLIENT_STATUS];
export type TicketStatus = typeof TICKET_STATUS[keyof typeof TICKET_STATUS];

// Categorias de ticket
export const TICKET_CATEGORIES = {
  suporte: 'Suporte',
  desenvolvimento: 'Desenvolvimento',
  reuniao: 'Reunião',
  consultoria: 'Consultoria',
  infraestrutura: 'Infraestrutura',
  outro: 'Outro',
} as const;

export type TicketCategory = keyof typeof TICKET_CATEGORIES;

export const TICKET_CATEGORY_COLORS: Record<TicketCategory, string> = {
  suporte: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  desenvolvimento: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  reuniao: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  consultoria: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  infraestrutura: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  outro: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
};
