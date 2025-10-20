export const config = { runtime: "edge" };

export default function handler() {
  const hasKey = !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY);
  return new Response(JSON.stringify({ ok: true, hasKey }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
