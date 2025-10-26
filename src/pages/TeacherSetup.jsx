// src/pages/TeacherSetup.jsx
import React, { useEffect, useState } from "react";

const API_BASE = ""; // same-origin (works on localhost and Vercel)

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

      {/* Create Session Form */}
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

      {/* Active Session Info */}
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

          {/* Student Join Link */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Student Join Link</div>
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <code
                style={{
                  background: "#f2f2f2",
                  padding: "6px 8px",
                  borderRadius: 6,
                }}
              >
                {`${window.location.origin}/student?classId=${encodeURIComponent(
                  classId
                )}`}
              </code>
              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/student?classId=${encodeURIComponent(
                    classId
                  )}`;
                  try {
                    await navigator.clipboard.writeText(url);
                    alert("Join link copied!");
                  } catch {
                    alert("Copy failed. Long-press or select the link to copy.");
                  }
                }}
                style={{ padding: "6px 10px" }}
              >
                Copy Join Link
              </button>
            </div>
          </div>

          {/* Saved Questions */}
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

          {/* Start New Class Button */}
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