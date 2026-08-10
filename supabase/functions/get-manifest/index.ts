import { createClient } from "https://esm.sh/@supabase/supabase-js@2.48.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/manifest+json",
};

const DEFAULT_MANIFEST = {
  name: "FitResults",
  short_name: "FitResults",
  description: "Seu app de saúde e bem-estar - Acompanhe dietas, treinos e progresso",
  theme_color: "#14b8a6",
  background_color: "#fefdfb",
  display: "standalone",
  orientation: "portrait",
  scope: "/",
  start_url: "/",
  categories: ["health", "fitness", "lifestyle"],
  icons: [
    {
      src: "/pwa-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any",
    },
    {
      src: "/pwa-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "maskable",
    },
    {
      src: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  ],
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get branding settings from database
    const { data: branding } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["app_name", "app_logo_url", "primary_color"]);

    const settings: Record<string, string> = {};
    branding?.forEach((item) => {
      settings[item.key] = item.value;
    });

    // Build dynamic manifest
    const manifest = {
      ...DEFAULT_MANIFEST,
      name: settings.app_name || DEFAULT_MANIFEST.name,
      short_name: settings.app_name || DEFAULT_MANIFEST.short_name,
      theme_color: settings.primary_color
        ? `hsl(${settings.primary_color})`
        : DEFAULT_MANIFEST.theme_color,
    };

    // If custom logo is set, update icons
    if (settings.app_logo_url) {
      manifest.icons = [
        {
          src: settings.app_logo_url,
          sizes: "192x192",
          type: "image/png",
          purpose: "any",
        },
        {
          src: settings.app_logo_url,
          sizes: "512x512",
          type: "image/png",
          purpose: "any",
        },
        {
          src: settings.app_logo_url,
          sizes: "512x512",
          type: "image/png",
          purpose: "maskable",
        },
        {
          src: settings.app_logo_url,
          sizes: "180x180",
          type: "image/png",
        },
      ];
    }

    return new Response(JSON.stringify(manifest, null, 2), {
      headers: corsHeaders,
    });
  } catch (error) {
    console.error("Error generating manifest:", error);

    // Return default manifest on error
    return new Response(JSON.stringify(DEFAULT_MANIFEST, null, 2), {
      headers: corsHeaders,
    });
  }
});
