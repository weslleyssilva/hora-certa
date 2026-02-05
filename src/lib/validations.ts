 import { z } from "zod";
 import { USER_ROLES, CLIENT_STATUS } from "./constants";
 
 // Limites de caracteres
 const MAX_NAME = 255;
 const MAX_EMAIL = 255;
 const MAX_TITLE = 200;
 const MAX_DESCRIPTION = 5000;
 const MAX_NOTES = 2000;
 const MAX_PRODUCT_NAME = 255;
 const MIN_PASSWORD = 6;
 const MAX_PASSWORD = 72; // bcrypt limit
 
 // Regex patterns
 const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
 // === User schemas ===
 export const userCreateSchema = z.object({
   email: z
     .string()
     .trim()
     .min(1, "Email é obrigatório")
     .max(MAX_EMAIL, `Email deve ter no máximo ${MAX_EMAIL} caracteres`)
     .regex(EMAIL_REGEX, "Email inválido"),
   password: z
     .string()
     .min(MIN_PASSWORD, `Senha deve ter no mínimo ${MIN_PASSWORD} caracteres`)
     .max(MAX_PASSWORD, `Senha deve ter no máximo ${MAX_PASSWORD} caracteres`),
   role: z.enum([USER_ROLES.ADMIN, USER_ROLES.CLIENT_USER]),
   client_id: z.string().uuid().nullable(),
 }).refine(
   (data) => data.role !== USER_ROLES.CLIENT_USER || data.client_id !== null,
   { message: "Usuário cliente deve estar vinculado a um cliente", path: ["client_id"] }
 );
 
 export const userUpdateSchema = z.object({
   role: z.enum([USER_ROLES.ADMIN, USER_ROLES.CLIENT_USER]),
   client_id: z.string().uuid().nullable(),
 }).refine(
   (data) => data.role !== USER_ROLES.CLIENT_USER || data.client_id !== null,
   { message: "Usuário cliente deve estar vinculado a um cliente", path: ["client_id"] }
 );
 
 // === Client schemas ===
 export const clientSchema = z.object({
   name: z
     .string()
     .trim()
     .min(1, "Nome é obrigatório")
     .max(MAX_NAME, `Nome deve ter no máximo ${MAX_NAME} caracteres`),
   status: z.enum([CLIENT_STATUS.ACTIVE, CLIENT_STATUS.INACTIVE]),
 });
 
 // === Contract schemas ===
 export const contractSchema = z.object({
   client_id: z.string().uuid("Cliente é obrigatório"),
   start_date: z.string().min(1, "Data início é obrigatória"),
   end_date: z.string().min(1, "Data fim é obrigatória"),
   contracted_hours: z
     .number({ invalid_type_error: "Horas contratadas inválidas" })
     .int("Horas devem ser um número inteiro")
     .min(0, "Horas não podem ser negativas")
     .max(99999, "Horas contratadas excede o limite"),
   notes: z
     .string()
     .max(MAX_NOTES, `Observações devem ter no máximo ${MAX_NOTES} caracteres`)
     .nullable(),
   is_recurring: z.boolean(),
   recurrence_months: z.number().int().min(1).max(12),
 }).refine(
   (data) => data.end_date >= data.start_date,
   { message: "Data fim deve ser maior ou igual à data início", path: ["end_date"] }
 );
 
 // === Product schemas ===
 export const productSchema = z.object({
   client_id: z.string().uuid("Cliente é obrigatório"),
   competence_month: z.string().min(1, "Competência é obrigatória"),
   product_name: z
     .string()
     .trim()
     .min(1, "Nome do produto é obrigatório")
     .max(MAX_PRODUCT_NAME, `Nome deve ter no máximo ${MAX_PRODUCT_NAME} caracteres`),
   quantity: z
     .number({ invalid_type_error: "Quantidade inválida" })
     .positive("Quantidade deve ser maior que zero")
     .max(999999, "Quantidade excede o limite"),
   notes: z
     .string()
     .max(MAX_NOTES, `Observações devem ter no máximo ${MAX_NOTES} caracteres`)
     .nullable(),
 });
 
 // === Ticket schemas (client-side creation) ===
 export const clientTicketSchema = z.object({
   title: z
     .string()
     .trim()
     .min(1, "Título é obrigatório")
     .max(MAX_TITLE, `Título deve ter no máximo ${MAX_TITLE} caracteres`),
   description: z
     .string()
     .trim()
     .min(1, "Descrição é obrigatória")
     .max(MAX_DESCRIPTION, `Descrição deve ter no máximo ${MAX_DESCRIPTION} caracteres`),
 });
 
 // === Ticket schemas (admin creation/update) ===
 export const adminTicketSchema = z.object({
   client_id: z.string().uuid("Cliente é obrigatório"),
   requester_name: z
     .string()
     .trim()
     .min(1, "Solicitante é obrigatório")
     .max(MAX_NAME, `Nome deve ter no máximo ${MAX_NAME} caracteres`),
   title: z
     .string()
     .trim()
     .max(MAX_TITLE, `Título deve ter no máximo ${MAX_TITLE} caracteres`)
     .nullable(),
   description: z
     .string()
     .trim()
     .min(1, "Descrição é obrigatória")
     .max(MAX_DESCRIPTION, `Descrição deve ter no máximo ${MAX_DESCRIPTION} caracteres`),
   service_date: z.string().min(1, "Data é obrigatória"),
   start_time: z.string().nullable(),
   end_time: z.string().nullable(),
   duration_minutes: z.number().int().min(0).nullable(),
   billed_hours: z
     .number({ invalid_type_error: "Horas faturadas inválidas" })
     .int("Horas devem ser um número inteiro")
     .min(0, "Horas não podem ser negativas"),
   status: z.enum(["open", "in_progress", "completed"]),
 });
 
 // Helper to get first error message
 export function getValidationError(result: z.SafeParseReturnType<any, any>): string | null {
   if (result.success) return null;
   const firstError = result.error.errors[0];
   return firstError?.message || "Erro de validação";
 }