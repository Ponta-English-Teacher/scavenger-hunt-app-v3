import { useState } from "react";

export default function StudentPlay() {
  const [classCode, setClassCode] = useState("");
  const [studentId, setStudentId] = useState("");

  function handleJoin(e) {
    e.preventDefault();
    alert(`Joined class ${classCode} as ID ${studentId}`);
  }

  return (
    <div className="p-6 max-w-xl">
      <h1 className="text-3xl font-bold mb-4">Student</h1>
      <form onSubmit={handleJoin} className="space-y-3">
        <div>
          <label className="block text-sm">Class Code</label>
          <input className="border px-2 py-1 w-full" value={classCode}
                 onChange={(e)=>setClassCode(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">Student ID (number)</label>
          <input className="border px-2 py-1 w-full" value={studentId}
                 onChange={(e)=>setStudentId(e.target.value)} />
        </div>
        <button className="border px-3 py-1 rounded">Join</button>
      </form>
    </div>
  );
}
