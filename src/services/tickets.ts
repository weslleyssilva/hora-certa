import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type TicketRow = Database["public"]["Tables"]["tickets"]["Row"];
type TicketInsert = Database["public"]["Tables"]["tickets"]["Insert"];
type TicketUpdate = Database["public"]["Tables"]["tickets"]["Update"];

export interface TicketFilters {
  clientId?: string;
  from?: string;
  to?: string;
  search?: string;
  status?: string;
}

export async function listTickets(filters: TicketFilters = {}) {
  let query = supabase
    .from("tickets")
    .select("*, clients(name)")
    .order("service_date", { ascending: false });

  if (filters.clientId) {
    query = query.eq("client_id", filters.clientId);
  }
  if (filters.from) {
    query = query.gte("service_date", filters.from);
  }
  if (filters.to) {
    query = query.lte("service_date", filters.to);
  }
  if (filters.status && (filters.status === "open" || filters.status === "in_progress" || filters.status === "completed")) {
    query = query.eq("status", filters.status);
  }
  if (filters.search) {
    query = query.or(
      `requester_name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getTicketById(id: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("*, clients(name)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function upsertTicket(ticket: TicketInsert | (TicketUpdate & { id: string })) {
  if ("id" in ticket && ticket.id) {
    // Update
    const { id, ...updateData } = ticket;
    const { data, error } = await supabase
      .from("tickets")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data;
  } else {
    // Insert
    const { data, error } = await supabase
      .from("tickets")
      .insert(ticket as TicketInsert)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function deleteTicket(id: string) {
  const { error } = await supabase.from("tickets").delete().eq("id", id);
  if (error) throw error;
}

export async function getClientName(clientId: string): Promise<string> {
  const { data, error } = await supabase
    .from("clients")
    .select("name")
    .eq("id", clientId)
    .single();

  if (error) throw error;
  return data?.name || "";
}

export async function getActiveContract(clientId: string) {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("contracts")
    .select("*")
    .eq("client_id", clientId)
    .lte("start_date", today)
    .gte("end_date", today)
    .order("start_date", { ascending: false })
    .limit(1);

  if (error) throw error;
  return data?.[0] || null;
}

export async function getTicketStats(clientId: string, from: string, to: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("billed_hours, service_date")
    .eq("client_id", clientId)
    .gte("service_date", from)
    .lte("service_date", to);

  if (error) throw error;

  const totalTickets = data?.length || 0;
  const totalHours = data?.reduce((sum, t) => sum + t.billed_hours, 0) || 0;

  return { totalTickets, totalHours };
}

export async function getHoursByDay(clientId: string, from: string, to: string) {
  const { data, error } = await supabase
    .from("tickets")
    .select("service_date, billed_hours")
    .eq("client_id", clientId)
    .gte("service_date", from)
    .lte("service_date", to)
    .order("service_date", { ascending: true });

  if (error) throw error;

  // Aggregate by day
  const byDay: Record<string, number> = {};
  data?.forEach((t) => {
    byDay[t.service_date] = (byDay[t.service_date] || 0) + t.billed_hours;
  });

  return Object.entries(byDay).map(([date, hours]) => ({ date, hours }));
}

export async function getTopRequesters(clientId: string, from: string, to: string, limit = 5) {
  const { data, error } = await supabase
    .from("tickets")
    .select("requester_name, billed_hours")
    .eq("client_id", clientId)
    .gte("service_date", from)
    .lte("service_date", to);

  if (error) throw error;

  // Aggregate by requester
  const byRequester: Record<string, number> = {};
  data?.forEach((t) => {
    byRequester[t.requester_name] = (byRequester[t.requester_name] || 0) + t.billed_hours;
  });

  return Object.entries(byRequester)
    .map(([name, hours]) => ({ name, hours }))
    .sort((a, b) => b.hours - a.hours)
    .slice(0, limit);
}
