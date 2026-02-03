import { supabase } from "@/integrations/supabase/client";

export interface ClientLite {
  id: string;
  name: string;
  status: string;
}

export async function listClientsLite(): Promise<ClientLite[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, status")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function listActiveClients(): Promise<ClientLite[]> {
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, status")
    .eq("status", "active")
    .order("name", { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function getClientById(id: string) {
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data;
}

export async function getClientWithContract(id: string) {
  const today = new Date().toISOString().split("T")[0];

  const [clientResult, contractResult] = await Promise.all([
    supabase.from("clients").select("*").eq("id", id).single(),
    supabase
      .from("contracts")
      .select("*")
      .eq("client_id", id)
      .lte("start_date", today)
      .gte("end_date", today)
      .order("start_date", { ascending: false })
      .limit(1),
  ]);

  if (clientResult.error) throw clientResult.error;

  return {
    client: clientResult.data,
    contract: contractResult.data?.[0] || null,
  };
}
