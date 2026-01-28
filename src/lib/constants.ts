// Constantes do sistema

export const APP_NAME = "HorasTI";
export const APP_DESCRIPTION = "Sistema de Controle de Horas de Atendimentos de TI";

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

// Roles
export const USER_ROLES = {
  ADMIN: "ADMIN",
  CLIENT_USER: "CLIENT_USER",
} as const;

export type AppRole = typeof USER_ROLES[keyof typeof USER_ROLES];
export type ClientStatus = typeof CLIENT_STATUS[keyof typeof CLIENT_STATUS];
