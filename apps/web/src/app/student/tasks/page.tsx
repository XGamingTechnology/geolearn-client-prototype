import Link from "next/link";
import { requireStudentSession } from "@/server/auth/session";
import { listStudentAssignments } from "@/server/assessment/service";

export default async function StudentTasksPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const session=await requireStudentSession();
  const [tasks,{status}]=await Promise.all([listStudentAssignments(session),searchParams]);
  const now=Date.now();

  return (
    <main className="student-home">
      <header className="student-header">
        <Link className="brand" href="/student"><span className="brand-mark">G</span><span>GeoLearn<small>Tugas</small></span></Link>
        <div className="student-identity"><span>{session.className}</span><strong>{session.fullName}</strong></div>
      </header>

      <section className="student-section student-tasks-section">
        <div className="section-heading-row"><div><p className="eyebrow">Assignment List</p><h1>Tugas saya</h1><p>Assignment diambil langsung dari enrollment kelas aktif.</p></div><span className="status-pill">DATABASE</span></div>
        {status==="error"&&<p className="account-alert error">Tugas belum dapat dimulai. Bisa jadi belum masuk jadwal atau attempt limit sudah tercapai.</p>}
        <div className="student-task-list">
          {tasks.map((task)=>{
            const closed=task.status!=="ACTIVE"||(task.closesAt&&task.closesAt.getTime()<now);
            const notOpen=Boolean(task.opensAt&&task.opensAt.getTime()>now);
            const submitted=task.attemptStatus==="SUBMITTED";
            return <article className="student-task-row" key={task.id}>
              <div className="assignment-icon">▣</div>
              <div><span className="assignment-kicker">{task.quizTitle} · {task.itemCount} soal</span><h2>{task.title}</h2><p>{task.closesAt?"Deadline "+new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(task.closesAt):"Tanpa deadline"}</p></div>
              <span className={submitted?"student-task-status complete":"student-task-status"}>{submitted?"Selesai":notOpen?"Belum buka":closed?"Ditutup":task.attemptStatus==="IN_PROGRESS"?"Sedang dikerjakan":"Belum dikerjakan"}</span>
              {submitted
                ? <Link className="button button-secondary" href={"/student/result?attempt="+task.attemptId}>Lihat Hasil</Link>
                : <form action={"/api/assessment/assignments/"+task.id+"/start"} method="post"><button className="button button-secondary" disabled={closed||notOpen} type="submit">{task.attemptStatus==="IN_PROGRESS"?"Lanjutkan":"Mulai"}</button></form>}
            </article>;
          })}
        </div>
        {!tasks.length&&<div className="empty-state"><strong>Belum ada tugas.</strong><p>Assignment dari guru akan muncul di sini.</p></div>}
      </section>

      <nav className="student-bottom-nav" aria-label="Navigasi siswa">
        <Link href="/student"><span>⌂</span><small>Beranda</small></Link>
        <Link className="active" href="/student/tasks"><span>▣</span><small>Tugas</small></Link>
        <Link href="/student/result"><span>◔</span><small>Hasil Saya</small></Link>
      </nav>
    </main>
  );
}
