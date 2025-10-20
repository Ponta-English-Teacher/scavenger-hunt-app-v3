// src/pages/StudentPlay.jsx
import React, { useState } from "react";

export default function StudentPlay() {
  const [code, setCode] = useState("HGU-1234");
  const [studentId, setStudentId] = useState(""); // numeric ID, not name
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [question, setQuestion] = useState(null);
  const [index, setIndex] = useState(null);

  async function handleJoin() {
    setBusy(true);
    setError("");
    setQuestion(null);
    try {
      // require numeric studentId
      if (!/^\d+$/.test(String(studentId))) {
        setError("Student ID must be a number (e.g., 1, 2, 3).");
        setBusy(false);
        return;
      }
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "join",
          classCode: code.trim(),
          studentId: String(studentId).trim(),
        }),
      });
      const data = await res.json();

      if (!data.ok) {
        setError(data.error || "Join failed.");
        return;
      }
      setQuestion(data.question || null);
      setIndex(typeof data.index === "number" ? data.index : null);
      // optional: remember for refresh
      localStorage.setItem(
        "sh_v3_student",
        JSON.stringify({ classCode: code.trim(), studentId: String(studentId).trim() })
      );
      alert(`Joined class ${code} as ID ${studentId}`);
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ padding: 20 }}>
      <h2>Student</h2>
      <p>Enter class code and your <b>Student ID</b> to get your question.</p>

      <label>
        Class Code&nbsp;
        <input value={code} onChange={(e) => setCode(e.target.value)} />
      </label>
      <br />
      <label>
        Your ID&nbsp;
        <input
          type="number"
          min="1"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        />
      </label>
      <br />
      <button disabled={!code || !studentId || busy} onClick={handleJoin}>
        {busy ? "Joining..." : "Join & Get Question"}
      </button>

      {error && (
        <div style={{ color: "#b00", marginTop: 10 }}>
          <strong>Note:</strong> {error}
        </div>
      )}

      {question && (
        <div style={{ marginTop: 16, padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
          <div>
            <small>Assigned index:</small> <b>{index}</b>
          </div>
          <div style={{ marginTop: 8 }}>
            <strong>Q:</strong> {question.text}
          </div>
          {question.followUp && (
            <div>
              <em>Follow-up:</em> {question.followUp}
            </div>
          )}
          {question.grammarTag && (
            <div>
              <small>Grammar:</small> {question.grammarTag}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
