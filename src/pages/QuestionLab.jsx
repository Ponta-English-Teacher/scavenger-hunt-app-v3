// src/pages/QuestionLab.jsx
import { useEffect, useState } from "react";
import { loadSession } from "../lib/sessionBus.js";

const GRAMMAR_OPTIONS = [
  "Simple Present",
  "Present Continuous",
  "Simple Past",
  "Past Continuous",
  "Present Perfect",
  "Present Perfect Continuous",
  "Past Perfect",
  "Future (will)",
  "Be going to",
  "Modal Verbs (can/could/should/must/have to/may/might)",
  "Comparatives & Superlatives",
  "Articles (a/an/the)",
  "Prepositions",
  "Subject–Verb Agreement",
  "Count & Noncount Nouns",
  "Gerunds & Infinitives",
  "Conditionals: Zero",
  "Conditionals: First",
  "Conditionals: Second",
  "Conditionals: Third",
  "Passive Voice",
  "Reported Speech",
  "Questions & Question Tags",
  "Relative Clauses",
  "Phrasal Verbs",
  "Quantifiers",
  "Time Expressions",
  "Adverbs of Frequency",
  "Pronouns",
  "Possessives",
];

export default function QuestionLab() {
  // Grammar selection: multiple or none (free)
  const [grammarFocus, setGrammarFocus] = useState([]);
  const [noSpecificGrammar, setNoSpecificGrammar] = useState(true);

  // Session awareness
  const [classCode, setClassCode] = useState(null);

  // Generation controls
  const [topic, setTopic] = useState("campus life");
  const [count, setCount] = useState(5);

  // Output & status
  const [items, setItems] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Load current class (if teacher created one) and sync Count from KV
  useEffect(() => {
    const sess = loadSession() || {};
    const code = sess.classCode || null;
    setClassCode(code);

    if (!code) return;
    (async () => {
      try {
        const res = await fetch(`/api/session?code=${encodeURIComponent(code)}`);
        const data = await res.json();
        if (data && data.ok && Array.isArray(data.session?.questions)) {
          setCount(data.session.questions.length); // mirror teacher’s generated count
        }
      } catch {
        // ignore; UI can still generate locally
      }
    })();
  }, []);

  // UI helpers
  function toggleGrammar(g) {
    if (noSpecificGrammar) setNoSpecificGrammar(false);
    setGrammarFocus((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  }
  function handleNoSpecific(toggle) {
    setNoSpecificGrammar(toggle);
    if (toggle) setGrammarFocus([]);
  }

  // Generate via API with safe fallback
  async function handleGenerate() {
    setBusy(true);
    setError("");
    try {
      const payload = {
        topic,
        level: "A2–B1",
        grammarFocus: noSpecificGrammar ? [] : grammarFocus,
        count,
      };
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data && data.ok && Array.isArray(data.items)) {
        setItems(
          data.items.map((it, i) => ({
            text: it.text || it.question || `Item ${i + 1}`,
            followUp: it.followUp || "",
            grammarTag:
              it.grammarTag ||
              (noSpecificGrammar ? "free" : grammarFocus.join(", ")),
          }))
        );
      } else {
        setError(String((data && data.error) || "Generator unavailable; using demo."));
        setItems(
          Array.from({ length: count }, (_, i) => ({
            text: `[${noSpecificGrammar ? "free" : grammarFocus.join(
              ", "
            )}] question about ${topic} (#${i + 1})`,
            followUp: "",
            grammarTag: noSpecificGrammar ? "free" : grammarFocus.join(", "),
          }))
        );
      }
    } catch (e) {
      setError(String(e && e.message ? e.message : e));
      setItems(
        Array.from({ length: count }, (_, i) => ({
          text: `[${noSpecificGrammar ? "free" : grammarFocus.join(
            ", "
          )}] question about ${topic} (#${i + 1})`,
          followUp: "",
          grammarTag: noSpecificGrammar ? "free" : grammarFocus.join(", "),
        }))
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section style={{ padding: 20 }}>
      <h2>Question Lab (API-powered)</h2>
      <p>
        Choose <em>multiple</em> grammar targets—or check “No specific grammar”
        for free grammar.
      </p>

      {classCode && (
        <div style={{ marginBottom: 8, fontSize: 14, color: "#444" }}>
          Using class code: <code>{classCode}</code> (Count syncs from session if available)
        </div>
      )}

      <div style={{ display: "grid", gap: 10, maxWidth: 820 }}>
        <label>
          Topic&nbsp;
          <input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>

        <label>
          Count&nbsp;
          <input
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(+e.target.value || 1)}
          />
        </label>

        <div style={{ marginTop: 4 }}>
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <input
              type="checkbox"
              checked={noSpecificGrammar}
              onChange={(e) => handleNoSpecific(e.target.checked)}
            />
            No specific grammar (free)
          </label>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
            gap: 6,
            opacity: noSpecificGrammar ? 0.5 : 1,
            pointerEvents: noSpecificGrammar ? "none" : "auto",
            border: "1px solid #ddd",
            padding: 8,
            borderRadius: 8,
          }}
        >
          {GRAMMAR_OPTIONS.map((g) => (
            <label
              key={g}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 6px",
                borderRadius: 6,
              }}
            >
              <input
                type="checkbox"
                checked={grammarFocus.includes(g)}
                onChange={() => toggleGrammar(g)}
              />
              {g}
            </label>
          ))}
        </div>

        <button onClick={handleGenerate} disabled={busy}>
          {busy ? "Generating..." : "Generate"}
        </button>

        {error && (
          <div style={{ color: "#b00", marginTop: 8 }}>
            <strong>Note:</strong> {error}
          </div>
        )}
      </div>

      <ol style={{ marginTop: 12 }}>
        {items.map((q, i) => (
          <li key={i} style={{ marginTop: 6 }}>
            <div>
              <strong>Q:</strong> {q.text}
            </div>
            {q.followUp && (
              <div>
                <em>Follow-up:</em> {q.followUp}
              </div>
            )}
            {q.grammarTag && (
              <div>
                <small>Grammar:</small> {q.grammarTag}
              </div>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
