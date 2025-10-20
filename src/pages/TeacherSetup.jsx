import React, { useState, useEffect } from "react";

export default function TeacherSetup() {
  const [classCode, setClassCode] = useState("HGU-1234");
  const [topic, setTopic] = useState("campus life");
  const [count, setCount] = useState(10); // teacher decides how many to generate
  const [creating, setCreating] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null); // live info from KV

  // Create class + generate questions
  async function handleCreate() {
    setCreating(true);
    try {
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          classCode,
          topic,
          level: "A2–B1",
          grammarFocus: [],   // you can wire multi-select later
          count,              // number of questions to generate
        }),
      });
      const data = await res.json();
      if (!data?.ok) throw new Error(data?.error || "Create failed");
      setSessionInfo(data.session);
      alert(`Class ${classCode} is ready with ${count} question(s).`);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setCreating(false);
    }
  }

  // Poll session every 3s to keep counts live
  useEffect(() => {
    if (!classCode) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch(`/api/session?code=${encodeURIComponent(classCode)}`);
        const data = await res.json();
        if (data?.ok) setSessionInfo(data.session);
      } catch {}
    }, 3000);
    return () => clearInterval(t);
  }, [classCode]);

  const studentsJoined = sessionInfo?.roster?.length ?? 0;
  const questionsGenerated = sessionInfo?.questions?.length ?? 0;
  const showWrapWarning =
    studentsJoined > 0 && questionsGenerated > 0 && studentsJoined > questionsGenerated;

  return (
    <section style={{ padding: 20 }}>
      <h2>Teacher Setup</h2>
      <p>Create a class and share questions with students.</p>

      <label>
        Class Code&nbsp;
        <input value={classCode} onChange={(e) => setClassCode(e.target.value)} />
      </label>
      <br />
      <label>
        Topic&nbsp;
        <input value={topic} onChange={(e) => setTopic(e.target.value)} />
      </label>
      <br />
      <label>
        Questions to generate&nbsp;
        <input
          type="number"
          min={1}
          max={200}
          value={count}
          onChange={(e) => setCount(+e.target.value || 1)}
        />
      </label>
      <br />
      <button onClick={handleCreate} disabled={creating}>
        {creating ? "Generating..." : "Create Class (generate & share)"}
      </button>

      <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Live Status (auto refresh)</div>
        <div>👥 Students joined: <b>{studentsJoined}</b></div>
        <div>📝 Questions generated: <b>{questionsGenerated || count}</b></div>
        {showWrapWarning && (
          <div style={{ color: "#b00", marginTop: 6 }}>
            Note: More students than questions — IDs will wrap (some students share a question).
          </div>
        )}
      </div>

      <p style={{ marginTop: 8 }}>
        After creating, tell students the code <strong>{classCode}</strong>.
      </p>
    </section>
  );
}
