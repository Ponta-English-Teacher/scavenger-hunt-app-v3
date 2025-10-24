import React from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";
import TeacherSetup from "./pages/TeacherSetup.jsx";
import StudentPlay from "./pages/StudentPlay.jsx";
import QuestionLab from "./pages/QuestionLab.jsx";

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ padding: 16 }}>
        <h1>Scavenger Hunt v3</h1>
        <nav style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <Link to="/teacher">Teacher</Link>
          <Link to="/student">Student</Link>
          <Link to="/lab">Question Lab</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Navigate to="/teacher" replace />} />
          <Route path="/teacher" element={<TeacherSetup />} />
          <Route path="/student" element={<StudentPlay />} />
          <Route path="/lab" element={<QuestionLab />} />
          <Route path="*" element={<div>Not found</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
