import { Link, Routes, Route } from "react-router-dom";

// If your real pages exist, import them; otherwise keep these fallbacks:
import TeacherSetup from "./pages/TeacherSetup.jsx";
import QuestionLab from "./pages/QuestionLab.jsx";
import StudentPlay from "./pages/StudentPlay.jsx";

export default function App() {
  return (
    <div style={{padding:16, fontFamily:"sans-serif"}}>
      <h1>Scavenger Hunt v3</h1>
      <nav style={{display:"flex", gap:12, marginBottom:12}}>
        <Link to="/">Home</Link>
        <Link to="/teacher">Teacher</Link>
        <Link to="/lab">Question Lab</Link>
        <Link to="/student">Student</Link>
      </nav>
      <Routes>
        <Route path="/" element={<div>Welcome. Use the links above.</div>} />
        <Route path="/teacher" element={<TeacherSetup />} />
        <Route path="/lab" element={<QuestionLab />} />
        <Route path="/student" element={<StudentPlay />} />
        <Route path="*" element={<div>Not found.</div>} />
      </Routes>
    </div>
  );
}
