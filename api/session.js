import { kv } from "@vercel/kv";
export const config = { runtime: "edge" };

// Support BOTH naming schemes to avoid env mismatch:
// - Vercel KV-style:   KV_REST_API_URL / KV_REST_API_TOKEN
// - Upstash-style:    UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN
const KV_URL =
  process.env.KV_REST_API_URL ||
  process.env.UPSTASH_REDIS_REST_URL;

const KV_TOKEN =
  process.env.KV_REST_API_TOKEN ||
  process.env.UPSTASH_REDIS_REST_TOKEN;

const code = () =>
  Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" +
  Math.random().toString(36).slice(2, 6).toUpperCase();

export default async function handler(req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  try {
    // Quick, explicit env check (prevents mysterious 500s)
    if (!KV_URL || !KV_TOKEN) {
      return json(
        {
          ok: false,
          error:
            "Missing env vars. Set KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN) in Vercel and redeploy.",
        },
        500
      );
    }

    const url = new URL(req.url);
    const method = req.method;

    if (method === "POST") {
      const body = await req.json().catch(() => ({}));

      // Allow both old and new frontend field names
      const topic = String(body.topic || "general");
      const classSize = Number(body.classSize || body.numStudents || 0);
      const count = Number(body.count || body.numQuestions || 5);

      const classId = code();
      const sessionKey = `session:${classId}`;

      const session = {
        classId,
        topic,
        classSize,
        count,
        createdAt: Date.now(),
        studentsJoined: 0,
        questions: [],
      };

    await kv.set(sessionKey, session);


      return json({ ok: true, classId, session });
    }

    if (method === "GET") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

    const session = await kv.get(sessionKey);
    if (!session) return json({ ok: false, error: "Not found" }, 404);


      return json({ ok: true, session });
    }

    if (method === "PUT") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const sessionKey = `session:${classId}`;
      const get = await kvFetch(`/get/${encodeURIComponent(sessionKey)}`);
      if (!get?.result) return json({ ok: false, error: "Not found" }, 404);

      const session =
        typeof get.result === "string" ? JSON.parse(get.result) : get.result;

      // Merge allowed fields from body (e.g., questions)
      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.questions)) {
        session.questions = body.questions;
      }

      // Keep old behavior if you still want to track joins
      if (body.incrementJoined) {
        session.studentsJoined = (session.studentsJoined || 0) + 1;
      }

      await kvFetch(`/set/${encodeURIComponent(sessionKey)}`, {
        method: "POST",
        body: JSON.stringify(session),
      });

      return json({ ok: true, session });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e) {
    return json(
      { ok: false, error: String(e?.message || e) },
      500
    );
  }
}

function corsHeaders() {
  return {
    "content-type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: corsHeaders(),
  });
}
