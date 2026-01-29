import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Criar usuário admin
    const { data: adminUser, error: adminError } = await supabase.auth.admin.createUser({
      email: "admin@horasit.com",
      password: "admin123",
      email_confirm: true,
    });

    if (adminError && !adminError.message.includes("already been registered")) {
      throw adminError;
    }

    const adminId = adminUser?.user?.id;

    if (adminId) {
      // Atualizar profile para ADMIN
      await supabase.from("profiles").update({ role: "ADMIN" }).eq("id", adminId);
      // Atualizar user_roles
      await supabase.from("user_roles").delete().eq("user_id", adminId);
      await supabase.from("user_roles").insert({ user_id: adminId, role: "ADMIN" });
    }

    // Criar usuário cliente TechCorp
    const { data: client1User } = await supabase.auth.admin.createUser({
      email: "joao@techcorp.com",
      password: "cliente123",
      email_confirm: true,
    });

    if (client1User?.user?.id) {
      await supabase.from("profiles").update({
        role: "CLIENT_USER",
        client_id: "11111111-1111-1111-1111-111111111111",
      }).eq("id", client1User.user.id);
    }

    // Criar usuário cliente Startup
    const { data: client2User } = await supabase.auth.admin.createUser({
      email: "pedro@startup.com",
      password: "cliente123",
      email_confirm: true,
    });

    if (client2User?.user?.id) {
      await supabase.from("profiles").update({
        role: "CLIENT_USER",
        client_id: "22222222-2222-2222-2222-222222222222",
      }).eq("id", client2User.user.id);
    }

    return new Response(JSON.stringify({
      success: true,
      admin_id: adminId,
      client1_id: client1User?.user?.id,
      client2_id: client2User?.user?.id,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
