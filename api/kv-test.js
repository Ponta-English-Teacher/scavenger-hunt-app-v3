import { kvSet, kvGet } from "../src/lib/kv.js";
export const config = { runtime: "edge" };

export default async function handler() {
  await kvSet("demo:key", { hello: "world", time: Date.now() });
  const data = await kvGet("demo:key");
  return new Response(JSON.stringify({ ok: true, data }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
