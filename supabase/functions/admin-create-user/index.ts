 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type",
 };
 
 interface CreateUserRequest {
   email: string;
   password: string;
   role: "ADMIN" | "CLIENT_USER";
   client_id: string | null;
 }
 
 Deno.serve(async (req) => {
   // Handle CORS preflight
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
     const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
     const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
 
     // Verify the calling user is an admin
     const authHeader = req.headers.get("Authorization");
     if (!authHeader) {
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Create client with user's token to verify admin role
     const userClient = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: authHeader } },
     });
 
     const { data: { user: callingUser }, error: userError } = await userClient.auth.getUser();
     if (userError || !callingUser) {
       console.error("[admin-create-user] Auth error:", userError);
       return new Response(
         JSON.stringify({ error: "Unauthorized" }),
         { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Check if calling user is admin
     const { data: isAdmin, error: roleError } = await userClient.rpc("has_role", {
       _user_id: callingUser.id,
       _role: "ADMIN",
     });
 
     if (roleError || !isAdmin) {
       console.error("[admin-create-user] Not admin:", callingUser.id);
       return new Response(
         JSON.stringify({ error: "Forbidden - Admin access required" }),
         { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Parse and validate request body
     const body: CreateUserRequest = await req.json();
     
     // Validate input
     if (!body.email || !body.password || !body.role) {
       return new Response(
         JSON.stringify({ error: "Missing required fields: email, password, role" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Email validation
     const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
     if (!emailRegex.test(body.email) || body.email.length > 255) {
       return new Response(
         JSON.stringify({ error: "Invalid email format" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Password validation
     if (body.password.length < 6 || body.password.length > 72) {
       return new Response(
         JSON.stringify({ error: "Password must be between 6 and 72 characters" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Role validation
     if (!["ADMIN", "CLIENT_USER"].includes(body.role)) {
       return new Response(
         JSON.stringify({ error: "Invalid role" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     // Client validation for CLIENT_USER role
     if (body.role === "CLIENT_USER" && !body.client_id) {
       return new Response(
         JSON.stringify({ error: "client_id is required for CLIENT_USER role" }),
         { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
       );
     }
 
     console.log(`[admin-create-user] Creating user: ${body.email}, role: ${body.role}`);
 
     // Create admin client with service role key
     const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
       auth: { autoRefreshToken: false, persistSession: false },
     });
 
     // Create the user with admin API
     const { data: newUserData, error: createError } = await adminClient.auth.admin.createUser({
       email: body.email,
       password: body.password,
       email_confirm: true, // Skip email confirmation for admin-created users
     });
 
     if (createError) {
       console.error("[admin-create-user] Create error:", createError);
       if (createError.message?.includes("already registered") || createError.message?.includes("already been registered")) {
         return new Response(
           JSON.stringify({ error: "Este email já está cadastrado" }),
           { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
         );
       }
       throw createError;
     }
 
     const newUserId = newUserData.user?.id;
     if (!newUserId) {
       throw new Error("User creation succeeded but no user ID returned");
     }
 
     console.log(`[admin-create-user] User created: ${newUserId}`);
 
     // Update profile with correct role and client_id
     const { error: profileError } = await adminClient
       .from("profiles")
       .update({
         role: body.role,
         client_id: body.role === "CLIENT_USER" ? body.client_id : null,
       })
       .eq("id", newUserId);
 
     if (profileError) {
       console.error("[admin-create-user] Profile update error:", profileError);
       // Don't fail completely - user was created
     }
 
     // Update user_roles table
     await adminClient.from("user_roles").delete().eq("user_id", newUserId);
     const { error: rolesError } = await adminClient
       .from("user_roles")
       .insert({ user_id: newUserId, role: body.role });
 
     if (rolesError) {
       console.error("[admin-create-user] Roles insert error:", rolesError);
     }
 
     console.log(`[admin-create-user] User setup complete: ${body.email}`);
 
     return new Response(
       JSON.stringify({
         success: true,
         user_id: newUserId,
         email: body.email,
         role: body.role,
       }),
       { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   } catch (error) {
     console.error("[admin-create-user] Error:", error);
     return new Response(
       JSON.stringify({ error: String(error) }),
       { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
     );
   }
 });