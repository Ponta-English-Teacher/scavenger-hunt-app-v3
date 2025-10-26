// src/pages/QuestionLab.jsx
import React, { useEffect, useMemo, useState } from "react";

const API_BASE = "http://localhost:3000";

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

  // persist classId from URL
  useEffect(() => {
    if (classId && classId !== localStorage.getItem("sh_v3_classId")) {
      localStorage.setItem("sh_v3_classId", classId);
    }
  }, [classId]);

  // load session
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
    setItems([]);
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
      setItems(mapped.slice(0, plannedCount || mapped.length || 3));
    } catch (err) {
      alert("Failed to generate questions: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  // Send to Teacher (PUT session) — backend will be patched next to store questions
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
      setSaveMsg("✅ Sent to Teacher (server responded OK).");
    } catch (err) {
      setSaveMsg("❌ Failed to send: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif", maxWidth: 760 }}>
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
          value={mustInclude}
          onChange={(e) => setMustInclude(e.target.value)}
          placeholder="e.g., Simple present, Wh-questions"
          style={{ width: "100%", padding: 6, marginTop: 6 }}
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {PICKS_MUST.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => appendPick(mustInclude, setMustInclude, p)}
            style={{
              padding: "4px 8px",
              border: "1px solid #ccc",
              borderRadius: 6,
              background: "#fafafa",
              cursor: "pointer",
            }}
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
          value={avoid}
          onChange={(e) => setAvoid(e.target.value)}
          placeholder="e.g., Passive voice, Conditionals"
          style={{ width: "100%", padding: 6, marginTop: 6 }}
        />
      </label>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {PICKS_AVOID.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => appendPick(avoid, setAvoid, p)}
            style={{
              padding: "4px 8px",
              border: "1px solid #ccc",
              borderRadius: 6,
              background: "#fafafa",
              cursor: "pointer",
            }}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 10, marginTop: 16, alignItems: "center" }}>
        <button type="button" onClick={handleGenerate} disabled={busy} style={{ padding: "8px 12px" }}>
          {busy ? "Generating..." : "Generate"}
        </button>
        <button
          type="button"
          onClick={handleSendToTeacher}
          disabled={busy || items.length === 0 || !classId}
          title={!classId ? "Create a session first" : items.length === 0 ? "Generate questions first" : ""}
          style={{ padding: "8px 12px", opacity: busy || items.length === 0 || !classId ? 0.6 : 1 }}
        >
          {busy ? "Saving..." : "Send to Teacher"}
        </button>
        {saveMsg && <span style={{ marginLeft: 8 }}>{saveMsg}</span>}
      </div>

      {/* Results (editable) */}
      {items.length > 0 && (
        <div style={{ marginTop: 18 }}>
          <h3>Generated Items (Editable)</h3>
          {items.map((it, idx) => (
            <div
              key={idx}
              style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, marginBottom: 10 }}
            >
              <label>
                Question:
                <textarea
                  value={it.text}
                  onChange={(e) => updateItem(idx, "text", e.target.value)}
                  style={{ width: "100%", padding: 6, marginTop: 6 }}
                  rows={2}
                />
              </label>
              <label style={{ display: "block", marginTop: 8 }}>
                Hint:
                <textarea
                  value={it.hint}
                  onChange={(e) => updateItem(idx, "hint", e.target.value)}
                  style={{ width: "100%", padding: 6, marginTop: 6 }}
                  rows={2}
                />
              </label>
              {it.grammarTag && (
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.8 }}>
                  <strong>Grammar:</strong> {it.grammarTag}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
