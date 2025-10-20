// api/session.js
import { kvGet, kvSet } from "../src/lib/kv.js";
export const config = { runtime: "edge" };

// ---------------------------------------------------------------------------
// Helper: key builder
const keyFor = (code) => `class:${(code || "").trim()}`;

// Helper: request generator via internal API call
async function generateQuestionsViaLocalAPI(payload) {
  const base = process.env.LOCAL_BASE_URL || "http://localhost:3000";
  const r = await fetch(`${base}/api/generate-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error("Generator failed " + r.status);
  const data = await r.json();
  if (!data?.ok || !Array.isArray(data.items)) {
    throw new Error("Generator returned invalid data");
  }
  return data.items;
}

// ---------------------------------------------------------------------------
// Main handler
export default async function handler(req) {
  try {
    // Handle POST actions (create, join)
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      const action = String(body.action || "create");

      // ------------------------------------------------ CREATE CLASS
      if (action === "create") {
        const classCode = String(body.classCode || "").trim();
        const topic = String(body.topic || "general").trim();
        const level = String(body.level || "A2–B1").trim();
        const grammarFocus = Array.isArray(body.grammarFocus)
          ? body.grammarFocus
          : [];
        const count = Math.max(1, Math.min(200, parseInt(body.count || 10, 10)));

        if (!classCode)
          return json({ ok: false, error: "Missing classCode" }, 400);

        const questions = await generateQuestionsViaLocalAPI({
          topic,
          level,
          grammarFocus,
          count,
        });

        const session = {
          classCode,
          topic,
          level,
          grammarFocus,
          createdAt: Date.now(),
          questions, // array of { text, followUp?, grammarTag? }
          assignments: {}, // studentId -> index
          roster: [], // list of studentIds
        };

        await kvSet(keyFor(classCode), session);
        return json({ ok: true, session });
      }

      // ------------------------------------------------ JOIN CLASS
      if (action === "join") {
        const classCode = String(body.classCode || "").trim();
        const studentId = String(body.studentId || "").trim();

        if (!classCode || !studentId)
          return json(
            { ok: false, error: "Missing classCode or studentId" },
            400
          );
        if (!/^\d+$/.test(studentId))
          return json(
            { ok: false, error: "studentId must be numeric" },
            400
          );

        const session = await kvGet(keyFor(classCode));
        if (
          !session ||
          !Array.isArray(session.questions) ||
          session.questions.length === 0
        ) {
          return json(
            {
              ok: false,
              error: "Class not ready. Ask teacher to Create Class.",
            },
            404
          );
        }

        // ✅ V2 LOGIC: assign question by studentId % totalQuestions
        const total = session.questions.length;
        const n = parseInt(studentId, 10);
        const idx = (n - 1) % total;

        // Save mapping and roster
        const assignments = { ...(session.assignments || {}), [studentId]: idx };
        const roster = Array.isArray(session.roster)
          ? session.roster.slice()
          : [];
        if (!roster.includes(studentId)) roster.push(studentId);

        await kvSet(keyFor(classCode), { ...session, assignments, roster });

        const question = session.questions[idx];
        return json({ ok: true, question, index: idx });
      }

      return json({ ok: false, error: "Unknown action" }, 400);
    }

    // ------------------------------------------------ READ SESSION (GET)
    if (req.method === "GET") {
      const { searchParams } = new URL(req.url);
      const classCode = String(searchParams.get("code") || "").trim();
      if (!classCode)
        return json({ ok: false, error: "Missing code" }, 400);
      const session = await kvGet(keyFor(classCode));
      if (!session)
        return json({ ok: false, error: "Not found" }, 404);
      return json({ ok: true, session });
    }

    return json({ ok: false, error: "Method not allowed" }, 405);
  } catch (e) {
    return json({ ok: false, error: String(e?.message || e) }, 500);
  }
}

// ---------------------------------------------------------------------------
// Simple JSON Response Helper
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
}
