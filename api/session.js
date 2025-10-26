export const config = { runtime: "edge" };

const KV_URL   = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

async function kvFetch(path, init) {
  const res = await fetch(`${KV_URL}${path}`, {
    ...init,
    headers: {
      "Authorization": `Bearer ${KV_TOKEN}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  return res.json();
}

const code = () =>
  Math.random().toString(36).slice(2, 6).toUpperCase() + "-" +
  Math.random().toString(36).slice(2, 6).toUpperCase();

export default async function handler(req) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }
  try {
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

      await kvFetch(`/set/${encodeURIComponent(sessionKey)}`, {
        method: "POST",
        body: JSON.stringify(session),
      });

      return json({ ok: true, classId, session });
    }

    if (method === "GET") {
      const classId = url.searchParams.get("classId");
      if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

      const sessionKey = `session:${classId}`;
      const data = await kvFetch(`/get/${encodeURIComponent(sessionKey)}`);
      if (!data || !data.result) return json({ ok: false, error: "Not found" }, 404);

      const session = JSON.parse(data.result);
      return json({ ok: true, session });
    }

   if (method === "PUT") {
  const classId = url.searchParams.get("classId");
  if (!classId) return json({ ok: false, error: "Missing classId" }, 400);

  const sessionKey = `session:${classId}`;
  const get = await kvFetch(`/get/${encodeURIComponent(sessionKey)}`);
  if (!get?.result) return json({ ok: false, error: "Not found" }, 404);

  const session = JSON.parse(get.result);

  // NEW: merge allowed fields from body (e.g., questions)
  const body = await req.json().catch(() => ({}));
  if (Array.isArray(body.questions)) {
    session.questions = body.questions;
  }

  // keep old behavior if you still want to track joins
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
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
