// Minimal Cloudflare Worker CORS proxy for OpenMHz (or any public API)
// Deploy: npx wrangler deploy (or paste into Cloudflare Workers dashboard)
// Then set PROXY_URL in the Trace app (or hardcode the workers.dev URL).

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Max-Age": "86400",
        },
      });
    }

    // Expected: /calls?shortName=mpscs81  or  /?shortName=mpscs81
    const shortName = url.searchParams.get("shortName") || url.pathname.split("/").filter(Boolean)[0];
    if (!shortName) {
      return new Response(JSON.stringify({
        error: "Missing shortName. Usage: /?shortName=mpscs81 or /mpscs81/calls",
        example: "https://your-worker.workers.dev/?shortName=mpscs81"
      }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }

    const target = `https://api.openmhz.com/${encodeURIComponent(shortName)}/calls`;

    try {
      const upstream = await fetch(target, {
        headers: { "User-Agent": "TraceApp-Proxy/1.0" },
      });

      const body = await upstream.text();
      return new Response(body, {
        status: upstream.status,
        headers: {
          "Content-Type": upstream.headers.get("Content-Type") || "application/json",
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
          "Cache-Control": "public, max-age=30",
        },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, target }), {
        status: 502,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
  },
};
