// src/pages/StudentPlay.jsx
import React, { useState } from "react";

const API_BASE = "http://localhost:3000";

export default function StudentPlay() {
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [session, setSession] = useState(null);
  const [question, setQuestion] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Handle Join Class
  async function handleJoin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setSession(null);
    setQuestion(null);

    try {
      const res = await fetch(
        `${API_BASE}/api/session?classId=${encodeURIComponent(classId)}`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.session) throw new Error("Session not found");

      const questions = data.session.questions || [];
      if (questions.length === 0) throw new Error("No questions found.");

      // Determine student number from ID (e.g., S1 -> 1)
      const num = parseInt(studentId.replace(/\D/g, ""), 10) || 1;
      const index = (num - 1) % questions.length;
      const assigned = questions[index];

      setSession(data.session);
      setQuestion(assigned);
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        padding: 20,
        fontFamily: "sans-serif",
        maxWidth: 600,
        margin: "0 auto",
        background: "#f9f9f9",
        borderRadius: 10,
        boxShadow: "0 0 10px rgba(0,0,0,0.1)",
      }}
    >
      <h2 style={{ textAlign: "center" }}>Student Page</h2>

      {!session && (
        <form
          onSubmit={handleJoin}
          style={{ display: "grid", gap: 12, marginTop: 20 }}
        >
          <label>
            Class ID:
            <input
              type="text"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              placeholder="Enter Class ID (e.g. USM4-HNWR)"
              required
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          <label>
            Student ID:
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter Student ID (e.g. S1)"
              required
              style={{ width: "100%", padding: 8 }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: 10, fontWeight: "bold" }}
          >
            {loading ? "Joining..." : "Join Class"}
          </button>

          {error && <p style={{ color: "red" }}>Error: {error}</p>}
        </form>
      )}

      {session && question && (
        <div style={{ marginTop: 30 }}>
          <h3 style={{ textAlign: "center" }}>Welcome, {studentId}</h3>
          <p>
            <strong>Class ID:</strong> <code>{classId}</code>
          </p>
          <p>
            <strong>Topic:</strong> {session.topic}
          </p>

          <div
            style={{
              background: "white",
              borderRadius: 8,
              padding: 16,
              border: "1px solid #ddd",
              marginTop: 20,
            }}
          >
            <h4>Your Assigned Question:</h4>
            <p style={{ fontSize: 18, fontWeight: 500 }}>{question.text}</p>
            {question.hint && (
              <p style={{ fontStyle: "italic", color: "gray" }}>
                Hint: {question.hint}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
