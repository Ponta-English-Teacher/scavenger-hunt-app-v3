export const config = { runtime: "edge" };

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

function validateKV() {
  if (!KV_URL || !KV_TOKEN) {
    return "Missing KV_REST_API_URL or KV_REST_API_TOKEN";
  }
  if (!/^https?:\/\//i.test(KV_URL)) {
    return `KV_REST_API_URL must start with https:// (current: ${String(KV_URL).slice(0, 40)}...)`;
  }
  return null;
}

async function kvRequest(path) {
  const bad = validateKV();
  if (bad) throw new Error(bad);

  const full = `${KV_URL}${path}`;

  let res;
  try {
    res = await fetch(full, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` },
    });
  } catch (e) {
    // fetch failed before any outgoing request (invalid URL etc.)
    throw new Error(`fetch() failed for ${full}: ${String(e?.message || e)}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`KV ${res.status} from ${path}: ${text.slice(0, 300)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`KV returned non-JSON for ${path}: ${text.slice(0, 120)}`);
  }
}

async function kvGet(key) {
  const data = await kvRequest(`/get/${encodeURIComponent(key)}`);
  return data?.result ?? null;
}

// NOTE: /set/<key>/<value> is required by many Upstash REST endpoints.
// If your KV expects POST body instead, the error message will tell us.
async function kvSet(key, valueString) {
  return kvRequest(
    `/set/${encodeURIComponent(key)}/${encodeURIComponent(valueString)}`
  );
}

const code = () =>
  Math.random().toString(36).slice(2, 6).toUpperCase() +
  "-" +
  Math.random().toString(36).slice(2, 6).toUpperCase();

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  try {
    const url = new URL(req.url);
    const method = req.method;

    if (method === "POST") {
      const bad = validateKV();
      if (bad) return json({ ok: false, error: bad }, 500);

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

    if (method === "GET") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const bad = validateKV();
      if (bad) return json({ ok: false, error: bad }, 500);

      const sessionKey = `session:${classId}`;
      const raw = await kvGet(sessionKey);
      if (!raw) return json({ ok: false, error: "Not found" }, 404);

      return json({ ok: true, session: JSON.parse(raw) });
    }

    if (method === "PUT") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const bad = validateKV();
      if (bad) return json({ ok: false, error: bad }, 500);

      const sessionKey = `session:${classId}`;
      const raw = await kvGet(sessionKey);
      if (!raw) return json({ ok: false, error: "Not found" }, 404);

      const session = JSON.parse(raw);

      const body = await req.json().catch(() => ({}));
      if (Array.isArray(body.questions)) session.questions = body.questions;
      if (body.incrementJoined) session.studentsJoined = (session.studentsJoined || 0) + 1;

      await kvSet(sessionKey, JSON.stringify(session));
      return json({ ok: true, session });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e) {
    // IMPORTANT: this will appear in Vercel Logs “Messages”
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
