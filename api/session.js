export const config = { runtime: "edge" };

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

// Safe fetch + JSON parsing
async function kvRequest(path) {
  if (!KV_URL || !KV_TOKEN) {
    throw new Error("Missing KV_REST_API_URL / KV_REST_API_TOKEN");
  }

  const res = await fetch(`${KV_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${KV_TOKEN}`,
    },
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`KV ${res.status}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    // Should not happen, but prevents silent crashes
    return { raw: text };
  }
}

async function kvGet(key) {
  // Works with Upstash/Vercel KV REST style: /get/<key>
  const data = await kvRequest(`/get/${encodeURIComponent(key)}`);
  return data?.result ?? null; // string or null
}

async function kvSet(key, valueString) {
  // Many KV REST endpoints expect /set/<key>/<value>
  // (Your previous code used /set/<key> with JSON body, which often fails)
  return kvRequest(
    `/set/${encodeURIComponent(key)}/${encodeURIComponent(valueString)}`
  );
}

const code = () =>
  Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" +
  Math.random().toString(36).slice(2, 6).toUpperCase();

export default async function handler(req) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
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

      await kvSet(sessionKey, JSON.stringify(session));
      return json({ ok: true, classId, session });
    }

    // GET: load session
    if (method === "GET") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const sessionKey = `session:${classId}`;
      const raw = await kvGet(sessionKey);
      if (!raw) return json({ ok: false, error: "Not found" }, 404);

      const session = JSON.parse(raw);
      return json({ ok: true, session });
    }

    // PUT: update session
    if (method === "PUT") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const sessionKey = `session:${classId}`;
      const raw = await kvGet(sessionKey);
      if (!raw) return json({ ok: false, error: "Not found" }, 404);

      const session = JSON.parse(raw);

      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.questions)) session.questions = body.questions;
      if (body.incrementJoined) {
        session.studentsJoined = (session.studentsJoined || 0) + 1;
      }

      await kvSet(sessionKey, JSON.stringify(session));
      return json({ ok: true, session });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e) {
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
