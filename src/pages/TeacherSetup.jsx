// src/pages/TeacherSetup.jsx
import { useState } from "react";
import { Link } from "react-router-dom";

export default function TeacherSetup() {
  const [classCode, setClassCode] = useState("HGU-1234");
  const [topic, setTopic] = useState("campus life");
  const [count, setCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState([]);

  async function handleGenerate(e) {
    e.preventDefault();
    setError("");
    setItems([]);
    setLoading(true);

    try {
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classCode,
          topic,
          level: "A2–B1",
          grammarFocus: ["Simple Past"],
          count: Number(count) || 5,
        }),
      });

      // If the function fails or a rewrite caught the route, give a clear message.
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(
          `API error ${res.status}${
            text ? `: ${text.slice(0, 300)}` : ""
          }`.trim()
        );
      }

      // Safer JSON parse
      let data;
      try {
        data = await res.json();
      } catch {
        const text = await res.text().catch(() => "");
        throw new Error(
          `Failed to parse JSON. Raw response: ${text.slice(0, 300)}`
        );
      }

      if (!data?.ok) {
        throw new Error(
          data?.error || "The API responded without ok:true."
        );
      }

      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "2rem", maxWidth: 900 }}>
      <h1>Scavenger Hunt v3</h1>
      <p>
        <Link to="/teacher">Teacher</Link> ·{" "}
        <Link to="/student">Student</Link> ·{" "}
        <Link to="/lab">Question Lab</Link>
      </p>

      <h2>Teacher Setup</h2>

      <form onSubmit={handleGenerate} style={{ marginTop: "1rem" }}>
        <div style={{ marginBottom: 8 }}>
          <label>
            Class Code{" "}
            <input
              value={classCode}
              onChange={(e) => setClassCode(e.target.value)}
              style={{ width: 200 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>
            Topic{" "}
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: 240 }}
            />
          </label>
        </div>

        <div style={{ marginBottom: 8 }}>
          <label>
            Questions to generate{" "}
            <input
              type="number"
              value={count}
              min={1}
              max={25}
              onChange={(e) => setCount(e.target.value)}
              style={{ width: 80 }}
            />
          </label>
        </div>

        <button disabled={loading} type="submit">
          {loading ? "Generating…" : "Generate"}
        </button>
      </form>

      {/* Status / errors */}
      {error && (
        <p style={{ color: "crimson", marginTop: 16 }}>
          ❌ {error}
        </p>
      )}

      {/* Show results */}
      {items.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <h3>Generated Questions</h3>
          <ol>
            {items.map((q, i) => (
              <li key={i} style={{ marginBottom: 8 }}>
                <div><strong>Q:</strong> {q.text}</div>
                {q.followUp && (
                  <div><em>Follow-up:</em> {q.followUp}</div>
                )}
                {q.grammarTag && (
                  <div style={{ opacity: 0.7 }}>
                    <small>Tag: {q.grammarTag}</small>
                  </div>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
