 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 interface Contract {
   id: string;
   client_id: string;
   start_date: string;
   end_date: string;
   contracted_hours: number;
   notes: string | null;
   is_recurring: boolean;
   recurrence_months: number;
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
 
     const supabase = createClient(supabaseUrl, supabaseServiceKey);
 
     const today = new Date();
     today.setHours(0, 0, 0, 0);
     const todayStr = today.toISOString().split("T")[0];
 
     console.log(`[renew-contracts] Running renewal check for date: ${todayStr}`);
 
     // Find expired recurring contracts that need renewal
     const { data: expiredContracts, error: fetchError } = await supabase
       .from("contracts")
       .select("*")
       .eq("is_recurring", true)
       .lt("end_date", todayStr);
 
     if (fetchError) {
       console.error("[renew-contracts] Error fetching contracts:", fetchError);
       throw fetchError;
     }
 
     console.log(`[renew-contracts] Found ${expiredContracts?.length || 0} expired recurring contracts`);
 
     const renewedContracts: string[] = [];
     const errors: { contractId: string; error: string }[] = [];
 
     for (const contract of expiredContracts || []) {
       try {
         // Check if a newer contract already exists for this client
         const { data: existingNewer, error: checkError } = await supabase
           .from("contracts")
           .select("id")
           .eq("client_id", contract.client_id)
           .gt("start_date", contract.end_date)
           .limit(1);
 
         if (checkError) {
           console.error(`[renew-contracts] Error checking existing contracts for ${contract.id}:`, checkError);
           errors.push({ contractId: contract.id, error: checkError.message });
           continue;
         }
 
         if (existingNewer && existingNewer.length > 0) {
           console.log(`[renew-contracts] Contract ${contract.id} already has a newer contract, skipping`);
           continue;
         }
 
         // Calculate new contract dates
         const oldEndDate = new Date(contract.end_date);
         const newStartDate = new Date(oldEndDate);
         newStartDate.setDate(newStartDate.getDate() + 1);
 
         const newEndDate = new Date(newStartDate);
         newEndDate.setMonth(newEndDate.getMonth() + contract.recurrence_months);
         newEndDate.setDate(newEndDate.getDate() - 1);
 
         const newContract = {
           client_id: contract.client_id,
           start_date: newStartDate.toISOString().split("T")[0],
           end_date: newEndDate.toISOString().split("T")[0],
           contracted_hours: contract.contracted_hours,
           notes: contract.notes,
           is_recurring: true,
           recurrence_months: contract.recurrence_months,
         };
 
         console.log(`[renew-contracts] Creating new contract for client ${contract.client_id}:`, newContract);
 
         const { error: insertError } = await supabase
           .from("contracts")
           .insert(newContract);
 
         if (insertError) {
           console.error(`[renew-contracts] Error creating new contract:`, insertError);
           errors.push({ contractId: contract.id, error: insertError.message });
           continue;
         }
 
         // Mark old contract as non-recurring to prevent duplicate renewals
         await supabase
           .from("contracts")
           .update({ is_recurring: false })
           .eq("id", contract.id);
 
         renewedContracts.push(contract.id);
         console.log(`[renew-contracts] Successfully renewed contract ${contract.id}`);
       } catch (err) {
         console.error(`[renew-contracts] Unexpected error for contract ${contract.id}:`, err);
         errors.push({ contractId: contract.id, error: String(err) });
       }
     }
 
     const result = {
       success: true,
       date: todayStr,
       totalExpired: expiredContracts?.length || 0,
       renewed: renewedContracts.length,
       renewedIds: renewedContracts,
       errors: errors.length > 0 ? errors : undefined,
     };
 
     console.log("[renew-contracts] Completed:", result);
 
     return new Response(JSON.stringify(result), {
       headers: { ...corsHeaders, "Content-Type": "application/json" },
       status: 200,
     });
   } catch (error) {
     console.error("[renew-contracts] Fatal error:", error);
     return new Response(
       JSON.stringify({ success: false, error: String(error) }),
       {
         headers: { ...corsHeaders, "Content-Type": "application/json" },
         status: 500,
       }
     );
   }
 });