// api/generate-questions.js
export const config = { runtime: "edge" };

// --- JSON helper with CORS ---
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}

const clean = (s) => String(s ?? "").replace(/\s+/g, " ").trim();

async function callOpenAI(messages) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
  if (!apiKey) return { ok: false, error: "NO_KEY" };
  try {
    const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      return { ok: false, error: `OpenAI error ${r.status}: ${txt}` };
    }
    const data = await r.json();
    const content = data?.choices?.[0]?.message?.content || "";
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: `NET_ERROR: ${e?.message || e}` };
  }
}

export default async function handler(req) {
  // --- CORS preflight ---
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    if (req.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);

    const body = await req.json().catch(() => ({}));
    const topic = clean(body.topic);
    const level = clean(body.level);
    const count = Math.max(1, Math.min(10, parseInt(body.count || 5, 10)));

    // These come in as a single comma-separated string from the Lab form
    const mustInclude = clean(body.mustInclude || "");
    const avoid = clean(body.avoid || "");

    const sys = [
      "You are an EFL/ESL classroom question generator.",
      "Return ONLY valid JSON with this exact shape:",
      "{ \"items\": [ { \"text\": \"...\", \"followUp\": \"...\", \"grammarTag\": \"...\" } ] }",
      "Keep questions short, natural, and appropriate for speaking practice.",
    ].join("\n");

    const constraints = [
      topic && `Topic: ${topic}`,
      level && `Level: ${level}`,
      mustInclude && `Must include: ${mustInclude}`,
      avoid && `Avoid: ${avoid}`,
    ]
      .filter(Boolean)
      .join("\n");

    const user = [
      `Generate ${count} discussion questions.`,
      constraints,
      "Include for each item:",
      "- text: the main question",
      "- followUp: a short follow-up prompt",
      "- grammarTag: the key grammar/structure focus (e.g., Simple present)",
    ].join("\n");

    const res = await callOpenAI([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);
    if (!res.ok) return json({ ok: false, error: res.error }, 500);

    // Strip code fences if present, then parse
    const trimmed = res.content.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (e) {
      return json({ ok: false, error: "PARSE_ERROR: " + (e?.message || e) }, 500);
    }

    return json({ ok: true, items: parsed.items || [] });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Server error" }, 500);
  }
}