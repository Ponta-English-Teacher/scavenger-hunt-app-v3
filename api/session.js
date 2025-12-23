import { Redis } from "@upstash/redis";

export const config = { runtime: "edge" };

// Works with either naming scheme you already use
const REDIS_URL =
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN =
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = new Redis({
  url: REDIS_URL,
  token: REDIS_TOKEN,
});

const code = () =>
  Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" +
  Math.random().toString(36).slice(2, 6).toUpperCase();

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    if (!REDIS_URL || !REDIS_TOKEN) {
      return json(
        {
          ok: false,
          error:
            "Missing KV_REST_API_URL/KV_REST_API_TOKEN (or UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN).",
        },
        500
      );
    }

    const url = new URL(req.url);
    const method = req.method;

    // POST: create session
    if (method === "POST") {
      const body = await req.json().catch(() => ({}));

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

      // Store as JSON string (safe + predictable)
      await redis.set(sessionKey, JSON.stringify(session));

      return json({ ok: true, classId, session });
    }

    // GET: load session
    if (method === "GET") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const sessionKey = `session:${classId}`;
      const raw = await redis.get(sessionKey);

      if (!raw) return json({ ok: false, error: "Not found" }, 404);

      const session = typeof raw === "string" ? JSON.parse(raw) : raw;
      return json({ ok: true, session });
    }

    // PUT: update session
    if (method === "PUT") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const sessionKey = `session:${classId}`;
      const raw = await redis.get(sessionKey);

      if (!raw) return json({ ok: false, error: "Not found" }, 404);

      const session = typeof raw === "string" ? JSON.parse(raw) : raw;

      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.questions)) session.questions = body.questions;
      if (body.incrementJoined) {
        session.studentsJoined = (session.studentsJoined || 0) + 1;
      }

      await redis.set(sessionKey, JSON.stringify(session));

      return json({ ok: true, session });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e) {
    console.error("api/session error:", e);
    return json({ ok: false, error: String(e?.message || e) }, 500);
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
  return new Response(JSON.stringify(obj), { status, headers: corsHeaders() });
}
