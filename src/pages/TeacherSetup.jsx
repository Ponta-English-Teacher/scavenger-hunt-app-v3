// src/pages/TeacherSetup.jsx
import React, { useEffect, useState } from "react";

const API_BASE = "http://localhost:3000";

export default function TeacherSetup() {
  const [topic, setTopic] = useState("");
  const [numStudents, setNumStudents] = useState("");
  const [numQuestions, setNumQuestions] = useState("");
  const [classId, setClassId] = useState(
    localStorage.getItem("sh_v3_classId") || ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);

  // --- Create session ---
  async function handleCreateSession(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/api/session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          numStudents: Number(numStudents),
          numQuestions: Number(numQuestions),
        }),
      });

      if (!res.ok) throw new Error("Failed to create session");
      const data = await res.json();
      if (!data?.classId) throw new Error("No classId in response");

      setClassId(data.classId);
      localStorage.setItem("sh_v3_classId", data.classId);
      setSession(data.session);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  // --- Load session from KV if classId exists ---
  useEffect(() => {
    async function loadSession() {
      if (!classId) return;
      try {
        const res = await fetch(
          `${API_BASE}/api/session?classId=${encodeURIComponent(classId)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setSession(data.session);
        setTopic(data.session?.topic || "");
        setNumStudents(data.session?.classSize || "");
        setNumQuestions(data.session?.count || "");
      } catch (err) {
        console.error("Session load error:", err);
      }
    }
    loadSession();
  }, [classId]);

  // --- Start a new class ---
  function handleNewClass() {
    localStorage.removeItem("sh_v3_classId");
    setClassId("");
    setSession(null);
    setTopic("");
    setNumStudents("");
    setNumQuestions("");
    setError("");
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h2>Teacher Setup</h2>

      {!session && (
        <form
          onSubmit={handleCreateSession}
          style={{ display: "grid", gap: 10, maxWidth: 360 }}
        >
          <label>
            Topic:
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
              style={{ width: "100%", padding: 6 }}
            />
          </label>

          <label>
            Number of Students:
            <input
              type="number"
              value={numStudents}
              onChange={(e) => setNumStudents(e.target.value)}
              required
              style={{ width: "100%", padding: 6 }}
            />
          </label>

          <label>
            Number of Questions:
            <input
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(e.target.value)}
              required
              style={{ width: "100%", padding: 6 }}
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Session"}
          </button>

          {error && <p style={{ color: "red" }}>Error: {error}</p>}
        </form>
      )}

      {classId && (
        <div style={{ marginTop: 20 }}>
          <strong>Class ID:</strong> <code>{classId}</code>
          <br />
          <a
            href={`/lab?classId=${encodeURIComponent(classId)}`}
            style={{ textDecoration: "underline" }}
          >
            Go to Question Lab →
          </a>

          {session?.questions?.length > 0 && (
            <div
              style={{
                marginTop: 20,
                padding: 10,
                border: "1px solid #ccc",
                borderRadius: 6,
                background: "#fafafa",
              }}
            >
              <h3>Saved Questions</h3>
              <ol>
                {session.questions.map((q, i) => (
                  <li key={i}>
                    <strong>Q:</strong> {q.text}
                    {q.hint && (
                      <>
                        <br />
                        <em>Hint:</em> {q.hint}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <button
            onClick={handleNewClass}
            style={{
              marginTop: 20,
              padding: "8px 16px",
              fontWeight: "bold",
              background: "#f44336",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
            }}
          >
            🆕 Start New Class
          </button>
        </div>
      )}
    </div>
  );
}
