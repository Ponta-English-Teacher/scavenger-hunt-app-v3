import { Link, Routes, Route, Navigate } from "react-router-dom";
import TeacherSetup from "./pages/TeacherSetup.jsx";
import StudentPlay from "./pages/StudentPlay.jsx";
import QuestionLab from "./pages/QuestionLab.jsx";

export default function App() {
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <header style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Scavenger Hunt v3</h1>
        <nav style={{ display: "flex", gap: 10 }}>
          <Link to="/teacher">Teacher</Link>
          <Link to="/student">Student</Link>
          <Link to="/lab">Question Lab</Link>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/teacher" replace />} />
        <Route path="/teacher" element={<TeacherSetup />} />
        <Route path="/student" element={<StudentPlay />} />
        <Route path="/lab" element={<QuestionLab />} />
        <Route path="*" element={<div>404</div>} />
      </Routes>
    </div>
  );
}
