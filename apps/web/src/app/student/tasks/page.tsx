import Link from "next/link";
import { requireStudentSession } from "@/server/auth/session";

const tasks=[
  {title:"Pengaruh Sungai terhadap Akses Sekolah",mode:"Influence",stimulus:"WebGIS",status:"Belum dikerjakan",due:"18 Sep 2026",href:"/student/assessment/demo"},
  {title:"Pola Permukiman Wilayah Pesisir",mode:"Pattern",stimulus:"Static Map",status:"Selesai",due:"20 Sep 2026",href:"/student/result"},
  {title:"Banjir Rob Semarang–Demak",mode:"Association",stimulus:"Composite",status:"Belum dikerjakan",due:"21 Sep 2026",href:"/student/assessment/demo"},
];

export default async function StudentTasksPage(){
  const session = await requireStudentSession();
  return (
    <main className="student-home">
      <header className="student-header">
        <Link className="brand" href="/student"><span className="brand-mark">G</span><span>GeoLearn<small>Tugas</small></span></Link>
        <div className="student-identity"><span>{session.className}</span><strong>{session.fullName}</strong></div>
      </header>

      <section className="student-section student-tasks-section">
        <div className="section-heading-row"><div><p className="eyebrow">Assignment List</p><h1>Tugas saya</h1><p>Lihat tugas aktif, deadline, dan status pengerjaan.</p></div><span className="status-pill">PREVIEW</span></div>
        <div className="student-task-list">
          {tasks.map((task)=>(
            <article className="student-task-row" key={task.title}>
              <div className="assignment-icon">{task.stimulus==="WebGIS"?"◎":task.stimulus==="Composite"?"◫":"▣"}</div>
              <div><span className="assignment-kicker">{task.mode} · {task.stimulus}</span><h2>{task.title}</h2><p>Deadline {task.due}</p></div>
              <span className={task.status==="Selesai"?"student-task-status complete":"student-task-status"}>{task.status}</span>
              <Link className="button button-secondary" href={task.href}>{task.status==="Selesai"?"Lihat Hasil":"Mulai"}</Link>
            </article>
          ))}
        </div>
        <p className="preview-banner">Daftar tugas masih UI preview dan belum berasal dari enrollment / assignment database.</p>
      </section>

      <nav className="student-bottom-nav" aria-label="Navigasi siswa">
        <Link href="/student"><span>⌂</span><small>Beranda</small></Link>
        <Link className="active" href="/student/tasks"><span>▣</span><small>Tugas</small></Link>
        <Link href="/student/result"><span>◔</span><small>Hasil Saya</small></Link>
      </nav>
    </main>
  );
}
