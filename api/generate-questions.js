export const config = { runtime: "edge" };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
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
      body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 800 }),
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
  try {
    if (req.method !== "POST") return json({ ok: false, error: "Use POST" }, 405);

    const body = await req.json().catch(() => ({}));
    const topic = clean(body.topic);
    const level = clean(body.level);
    const grammarFocus = Array.isArray(body.grammarFocus) ? body.grammarFocus.slice(0, 6) : [];
    const count = Math.max(1, Math.min(10, parseInt(body.count || 5, 10)));

    const sys = [
      "You are an EFL/ESL classroom question generator.",
      `Topic: ${topic || "general conversation"}`,
      `Level: ${level || "A2–B1"}`,
      "Return valid JSON: { items: [ { text, followUp, grammarTag } ] }",
      "Keep questions short and natural.",
    ].join("\n");

    const user = `Generate ${count} classroom discussion questions.`;

    const res = await callOpenAI([
      { role: "system", content: sys },
      { role: "user", content: user },
    ]);

    if (!res.ok) return json({ ok: false, error: res.error });

    const trimmed = res.content.trim().replace(/^```json/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(trimmed);
    return json({ ok: true, items: parsed.items || [] });
  } catch (e) {
    return json({ ok: false, error: e?.message || "Server error" }, 500);
  }
}
