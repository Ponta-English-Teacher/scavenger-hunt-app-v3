export const config = { runtime: "edge" };

export default function handler() {
  return new Response(JSON.stringify({ ok: true, message: "pong" }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
