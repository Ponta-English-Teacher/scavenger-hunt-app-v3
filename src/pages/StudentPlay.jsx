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
  const [session, setSession] = useState(null);
  const [myQuestion, setMyQuestion] = useState(null);

  // Persist params if present in URL
  useEffect(() => {
    if (classIdFromUrl) localStorage.setItem("sh_v3_classId", classIdFromUrl);
    if (studentIdFromUrl) localStorage.setItem("sh_v3_studentId", studentIdFromUrl);
  }, [classIdFromUrl, studentIdFromUrl]);

  // Persist whenever user edits fields (no Join button needed)
  useEffect(() => {
    if (classId !== undefined) localStorage.setItem("sh_v3_classId", String(classId).trim());
  }, [classId]);
  useEffect(() => {
    if (studentId !== undefined) localStorage.setItem("sh_v3_studentId", String(studentId).trim());
  }, [studentId]);

  // Load session whenever classId changes
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setMyQuestion(null);
      if (!classId) {
        setSession(null);
        return;
      }
      try {
        const res = await fetch(
          `${API_BASE}/api/session?classId=${encodeURIComponent(classId)}`
        );
        if (!res.ok) {
          // Suppress error display for students; just clear session
          console.warn("Session fetch failed:", res.status, await res.text());
          if (!cancelled) setSession(null);
          return;
        }
        const data = await res.json();
        if (!cancelled) setSession(data?.session || null);
      } catch (e) {
        console.warn("Session fetch error:", e);
        if (!cancelled) setSession(null);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [classId]);

  // Assign question once we have session + studentId
  useEffect(() => {
    if (!session) {
      setMyQuestion(null);
      return;
    }
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

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 720 }}>
      <h2>Student</h2>

      {/* Inputs only (auto-save & auto-assign) */}
      <div style={{ display: "grid", gap: 10, maxWidth: 420 }}>
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
      </div>

      {/* Session info — show ONLY Topic for students */}
      {session && (
        <div style={{ marginTop: 18 }}>
          {session.topic ? (
            <div>
              <strong>Topic:</strong> <code>{session.topic}</code>
            </div>
          ) : null}
        </div>
      )}

      {/* Assigned question */}
      <div style={{ marginTop: 18 }}>
        <h3>Your Question</h3>
        {!myQuestion && (
          <p style={{ opacity: 0.7 }}>
            Enter <em>Class ID</em> and <em>Student ID</em> above.
          </p>
        )}
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
    </div>
  );
}