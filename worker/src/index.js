// Cloudflare Worker: simple comments API backed by KV storage.
// GET  /comments   -> returns all comments (JSON array)
// POST /comments   -> adds a comment { name, text }

const KV_KEY = "comments";

// Change this to your real site origin once deployed, e.g. "https://tcbexcavation.com"
// You can leave "*" while testing, but lock it down before going live.
const ALLOWED_ORIGIN = "https://tcb-excavation.com";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders(),
    },
  });
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders() });
    }

    if (url.pathname !== "/comments") {
      return jsonResponse({ error: "Not found" }, 404);
    }

    // ---- GET: list comments ----
    if (request.method === "GET") {
      const raw = await env.COMMENTS_KV.get(KV_KEY);
      const comments = raw ? JSON.parse(raw) : [];
      return jsonResponse(comments);
    }

    // ---- POST: add a comment ----
    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return jsonResponse({ error: "Invalid JSON" }, 400);
      }

      const name = (body.name || "").toString().trim().slice(0, 60);
      const text = (body.text || "").toString().trim().slice(0, 1000);

      if (!name || !text) {
        return jsonResponse({ error: "Name and comment text are required" }, 400);
      }

      const raw = await env.COMMENTS_KV.get(KV_KEY);
      const comments = raw ? JSON.parse(raw) : [];

      const comment = {
        id: crypto.randomUUID(),
        name: escapeHtml(name),
        text: escapeHtml(text),
        createdAt: Date.now(),
      };

      comments.unshift(comment); // newest first
      // Keep it from growing forever
      const trimmed = comments.slice(0, 500);

      await env.COMMENTS_KV.put(KV_KEY, JSON.stringify(trimmed));

      return jsonResponse(comment, 201);
    }

    return jsonResponse({ error: "Method not allowed" }, 405);
  },
};
