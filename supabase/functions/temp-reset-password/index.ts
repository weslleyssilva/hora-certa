import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const userId = "835950dc-d958-446d-b6b1-d5e0d03367b5";
  const { data, error } = await admin.auth.admin.updateUserById(userId, {
    password: "AlvO@123",
    email_confirm: true,
  });

  return new Response(
    JSON.stringify({ ok: !error, error: error?.message, email: data?.user?.email }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
