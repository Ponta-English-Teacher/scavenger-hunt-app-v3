// src/pages/StudentPlay.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = ""; // same-origin (works on localhost & Vercel)

function parseStudentIndex(studentId, classSize) {
  if (!studentId) return 1;
  const s = String(studentId).trim();
  // Allow formats: "S1", "s12", "12"
  const m = s.match(/^[sS]?(\d+)$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (Number.isFinite(n) && n >= 1) return n;
  }
  // Fallback: hash any string to [1..classSize]
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return (sum % Math.max(1, classSize || 1)) + 1;
}

export default function StudentPlay() {
  const usp = useMemo(() => new URLSearchParams(window.location.search), []);
  const classIdFromUrl = usp.get("classId") || "";
  const studentIdFromUrl = usp.get("studentId") || "";

  const [classId, setClassId] = useState(
    classIdFromUrl || localStorage.getItem("sh_v3_classId") || ""
  );
  const [studentId, setStudentId] = useState(
    studentIdFromUrl || localStorage.getItem("sh_v3_studentId") || ""
  );
  const [error, setError] = useState("");
  const [session, setSession] = useState(null);
  const [myQuestion, setMyQuestion] = useState(null);

  // Persist params if present
  useEffect(() => {
    if (classIdFromUrl) localStorage.setItem("sh_v3_classId", classIdFromUrl);
    if (studentIdFromUrl) localStorage.setItem("sh_v3_studentId", studentIdFromUrl);
  }, [classIdFromUrl, studentIdFromUrl]);

  // Load session
  useEffect(() => {
    async function load() {
      try {
        setError("");
        setMyQuestion(null);
        if (!classId) return;
        const res = await fetch(
          `${API_BASE}/api/session?classId=${encodeURIComponent(classId)}`
        );
     if (!res.ok) {
  const txt = await res.text();
  throw new Error(`HTTP ${res.status} – ${txt}`);
}
const data = await res.json();
console.log("Loaded session:", data);
if (!data?.session) throw new Error("No session");
setSession(data.session);
      } catch (e) {
        setError(e?.message || String(e));
      }
    }
    load();
  }, [classId]);

  // Assign question once we have session + studentId
  useEffect(() => {
    if (!session) return;
    const questions = Array.isArray(session.questions) ? session.questions : [];
    const classSize = Number(session.classSize || 0);
    if (!questions.length) {
      setMyQuestion({ text: "(Questions not ready yet)", hint: "" });
      return;
    }
    const idxBase = parseStudentIndex(studentId || "1", classSize) - 1;
    const qIdx = ((idxBase % questions.length) + questions.length) % questions.length;
    setMyQuestion(questions[qIdx]);
  }, [session, studentId]);

  function handleJoin(e) {
    e.preventDefault();
    localStorage.setItem("sh_v3_classId", classId.trim());
    localStorage.setItem("sh_v3_studentId", String(studentId).trim());
    // Recompute assignment after saving
    if (session) {
      const questions = Array.isArray(session.questions) ? session.questions : [];
      const classSize = Number(session.classSize || 0);
      const idxBase = parseStudentIndex(studentId || "1", classSize) - 1;
      const qIdx = questions.length ? ((idxBase % questions.length) + questions.length) % questions.length : 0;
      setMyQuestion(questions[qIdx] || null);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 720 }}>
      <h2>Student</h2>

      <form onSubmit={handleJoin} style={{ display: "grid", gap: 10, maxWidth: 420 }}>
        <label>
          Class ID:
          <input
            type="text"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            placeholder="e.g., ABCD-1234"
            required
            style={{ width: "100%", padding: 6 }}
          />
        </label>

        <label>
          Student ID (S1, S2… or 1, 2…):
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="e.g., S5 or 5"
            required
            style={{ width: "100%", padding: 6 }}
          />
        </label>

        <button type="submit">Join</button>
      </form>

      {error && <p style={{ color: "crimson", marginTop: 10 }}>Error: {error}</p>}

      {/* Session info */}
      {session && (
        <div style={{ marginTop: 18 }}>
          <div>
            <strong>Class ID:</strong> <code>{session.classId}</code>
            {"  "}•{"  "}
            <strong>Topic:</strong> <code>{session.topic}</code>
            {"  "}•{"  "}
            <strong>Questions:</strong> {Array.isArray(session.questions) ? session.questions.length : 0}
          </div>
        </div>
      )}

      {/* Assigned question */}
      <div style={{ marginTop: 18 }}>
        <h3>Your Question</h3>
        {!myQuestion && <p style={{ opacity: 0.7 }}>Enter Class ID and Student ID, then press Join.</p>}
        {myQuestion && (
          <div
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 14,
              background: "#fafafa",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>
              {myQuestion.text || "(No question text)"}
            </div>
            {myQuestion.hint && (
              <div style={{ marginTop: 6 }}>
                <em>Hint:</em> {myQuestion.hint}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Note about seat mapping */}
      <p style={{ marginTop: 16, fontSize: 13, opacity: 0.7 }}>
        Mapping rule: S1→Q1, S2→Q2, … S6→Q6, S7→Q1 (wrap). This keeps neighbors on different questions
        when class size ≤ number of questions.
      </p>
    </div>
  );
}