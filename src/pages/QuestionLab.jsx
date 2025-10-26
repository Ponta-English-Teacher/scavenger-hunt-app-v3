// src/pages/QuestionLab.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = ""; // same-origin (works on localhost & Vercel)

export default function QuestionLab() {
  // --- classId detection ---
  const classIdFromUrl = useMemo(() => {
    const usp = new URLSearchParams(window.location.search);
    return usp.get("classId") || "";
  }, []);
  const [classId, setClassId] = useState(
    classIdFromUrl || localStorage.getItem("sh_v3_classId") || ""
  );

  // --- session (from Teacher) ---
  const [topic, setTopic] = useState("");
  const [plannedCount, setPlannedCount] = useState(null);
  const [sessionError, setSessionError] = useState("");

  // --- Lab form state ---
  const [level, setLevel] = useState("Starter");
  const [mustInclude, setMustInclude] = useState("");
  const [avoid, setAvoid] = useState("");

  // --- Generated items (editable) ---
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  // --- options ---
  const LEVELS = [
    "Starter",
    "Beginner",
    "Low Intermediate",
    "Intermediate",
    "High Intermediate",
    "English Majors",
  ];
  const PICKS_MUST = [
    "Simple present",
    "Present continuous",
    "Past simple",
    "Present perfect",
    "Comparatives",
    "Superlatives",
    "Modal can",
    "Modal would",
    "Wh-questions",
    "Yes/No questions",
    "Past experiences",
    "Future plans",
  ];
  const PICKS_AVOID = [
    "Passive voice",
    "Conditionals",
    "Relative clauses",
    "Reported speech",
    "Complex noun phrases",
    "Subjunctive",
  ];

  // Persist classId from URL to localStorage
  useEffect(() => {
    if (classId && classId !== localStorage.getItem("sh_v3_classId")) {
      localStorage.setItem("sh_v3_classId", classId);
    }
  }, [classId]);

  // Load session (topic, planned count)
  useEffect(() => {
    async function loadSession() {
      try {
        setSessionError("");
        setSaveMsg("");
        if (!classId) return;
        const res = await fetch(
          `${API_BASE}/api/session?classId=${encodeURIComponent(classId)}`
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data?.session) throw new Error("No session in response");
        setTopic(String(data.session.topic || ""));
        setPlannedCount(Number(data.session.count ?? 0));
        // If there are already saved questions, show them for editing
        if (Array.isArray(data.session.questions) && data.session.questions.length) {
          setItems(
            data.session.questions.map((q) => ({
              text: q.text || "",
              hint: q.hint || q.followUp || "",
              grammarTag: q.grammarTag || "",
            }))
          );
        }
      } catch (err) {
        setSessionError(err.message || String(err));
      }
    }
    loadSession();
  }, [classId]);

  // helpers
  function appendPick(current, setFn, pick) {
    const list = current
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!list.includes(pick)) {
      list.push(pick);
      setFn(list.join(", ") + ", ");
    }
  }
  function updateItem(idx, field, value) {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    );
  }

  // Generate via API
  async function handleGenerate() {
    setSaveMsg("");
    if (!topic) {
      alert("Topic is missing from the session. Please create a session on the Teacher page.");
      return;
    }
    try {
      setBusy(true);
      const body = {
        topic,
        level,
        count: plannedCount || 3,
        mustInclude,
        avoid,
      };
      const res = await fetch(`${API_BASE}/api/generate-questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.items) throw new Error("No items returned");

      const mapped = data.items.map((q) => ({
        text: q.text || "",
        hint: q.followUp || q.hint || "",
        grammarTag: q.grammarTag || "",
      }));

      // Respect plannedCount if set
      setItems(mapped.slice(0, plannedCount || mapped.length || 3));
    } catch (err) {
      alert("Failed to generate questions: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  // Save to session (PUT)
  async function handleSendToTeacher() {
    setSaveMsg("");
    if (!classId) return setSaveMsg("No classId.");
    try {
      setBusy(true);
      const res = await fetch(
        `${API_BASE}/api/session?classId=${encodeURIComponent(classId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ questions: items }),
        }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!data?.ok) throw new Error("Server returned not ok");
      setSaveMsg("✅ Saved to Teacher (session updated).");
    } catch (err) {
      setSaveMsg("❌ Failed to save: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 820 }}>
      <h2>Question Lab</h2>

      <div style={{ marginBottom: 10 }}>
        <strong>Class ID:</strong>{" "}
        {classId ? <code>{classId}</code> : <em style={{ color: "crimson" }}>No classId detected</em>}
      </div>
      <div style={{ marginBottom: 10 }}>
        <strong>Topic:</strong> {topic ? <code>{topic}</code> : <em>(loading or not set)</em>}
        {"  "}•{"  "}
        <strong>Planned questions:</strong> {plannedCount ?? <em>(loading)</em>}
      </div>
      {sessionError && (
        <p style={{ color: "crimson" }}>Session load error: {sessionError}</p>
      )}

      {/* Level */}
      <label style={{ display: "block", marginTop: 12 }}>
        Level:
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          style={{ display: "block", padding: 6, marginTop: 6 }}
        >
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
      </label>

      {/* Must include */}
      <label style={{ display: "block", marginTop: 12 }}>
        Must include (comma-separated):
        <input
          type="text"
          placeholder="e.g., Simple present, Wh-questions"
          value={mustInclude}
          onChange={(e) => setMustInclude(e.target.value)}
          style={{ display: "block", width: "100%", padding: 6, marginTop: 6 }}
        />
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 12px" }}>
        {PICKS_MUST.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => appendPick(mustInclude, setMustInclude, p)}
            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ccc", background: "#f5f5f5" }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Avoid */}
      <label style={{ display: "block", marginTop: 12 }}>
        Avoid (comma-separated):
        <input
          type="text"
          placeholder="e.g., Passive voice, Conditionals"
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
          style={{ display: "block", width: "100%", padding: 6, marginTop: 6 }}
        />
      </label>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "6px 0 12px" }}>
        {PICKS_AVOID.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => appendPick(avoid, setAvoid, p)}
            style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #ccc", background: "#f5f5f5" }}
          >
            {p}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button type="button" onClick={handleGenerate} disabled={busy}>
          {busy ? "Generating…" : "Generate (API)"}
        </button>
        <button type="button" onClick={handleSendToTeacher} disabled={busy || items.length === 0}>
          {busy ? "Saving…" : "Save & Send to Teacher"}
        </button>
        {saveMsg && <span style={{ marginLeft: 8 }}>{saveMsg}</span>}
      </div>

      {/* Editable Questions */}
      <div style={{ marginTop: 18 }}>
        <h3>Editable Questions</h3>
        {items.length === 0 && <p style={{ opacity: 0.7 }}>No items yet. Click “Generate (API)”.</p>}
        {items.map((it, i) => (
          <div
            key={i}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, marginBottom: 10 }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>#{i + 1}</div>
            <label style={{ display: "block", marginBottom: 6 }}>
              Question:
              <textarea
                value={it.text}
                onChange={(e) => updateItem(i, "text", e.target.value)}
                style={{ width: "100%", minHeight: 60, padding: 6, marginTop: 4 }}
              />
            </label>
            <label style={{ display: "block", marginBottom: 6 }}>
              Hint (editable):
              <textarea
                value={it.hint}
                onChange={(e) => updateItem(i, "hint", e.target.value)}
                style={{ width: "100%", minHeight: 50, padding: 6, marginTop: 4 }}
              />
            </label>
            <label style={{ display: "block" }}>
              Grammar tag (optional):
              <input
                type="text"
                value={it.grammarTag}
                onChange={(e) => updateItem(i, "grammarTag", e.target.value)}
                style={{ width: "100%", padding: 6, marginTop: 4 }}
              />
            </label>
          </div>
        ))}
      </div>
    </div>
  );
}