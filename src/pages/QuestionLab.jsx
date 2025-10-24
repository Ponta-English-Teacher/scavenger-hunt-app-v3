import { useState } from "react";

export default function QuestionLab() {
  const [topic, setTopic] = useState("campus life");
  const [items, setItems] = useState([]);
  const [msg, setMsg] = useState("");

  async function run() {
    setMsg("Calling /api/generate-questions…");
    setItems([]);
    try {
      const r = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level: "A2–B1", grammarFocus: ["Simple Past"], count: 3 })
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error || "Unknown error");
      setItems(j.items || []);
      setMsg("✅ OK");
    } catch (e) {
      setMsg(`❌ ${e.message}`);
    }
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-3xl font-bold mb-4">Question Lab</h1>
      <div className="space-y-2">
        <input className="border px-2 py-1" value={topic} onChange={(e)=>setTopic(e.target.value)} />
        <button onClick={run} className="border px-3 py-1 rounded">Generate 3</button>
      </div>
      {msg && <p className="mt-3">{msg}</p>}
      <ul className="mt-4 list-disc pl-6 space-y-2">
        {items.map((q, i) => <li key={i}>{q.text}</li>)}
      </ul>
    </div>
  );
}
