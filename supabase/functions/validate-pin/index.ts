import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { pin } = await req.json();

    if (!pin || typeof pin !== "string") {
      return new Response(
        JSON.stringify({ valid: false, error: "PIN required" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check admin PIN
    const { data: adminConfig } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "admin_pin")
      .single();

    if (adminConfig) {
      const adminPin = String(adminConfig.value).replace(/"/g, "");
      if (adminPin === pin) {
        return new Response(
          JSON.stringify({ valid: true, role: "admin", name: "Admin" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check staff PINs
    const { data: staffConfig } = await supabase
      .from("app_config")
      .select("value")
      .eq("key", "staff_pins")
      .single();

    if (staffConfig) {
      const staffPins = staffConfig.value as Array<{ pin: string; name: string }>;
      const match = staffPins.find((s) => s.pin === pin);
      if (match) {
        return new Response(
          JSON.stringify({ valid: true, role: "staff", name: match.name }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    return new Response(
      JSON.stringify({ valid: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ valid: false, error: "Server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
