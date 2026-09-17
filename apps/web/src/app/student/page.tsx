import Link from "next/link";
import { requireStudentSession } from "@/server/auth/session";
import { listStudentAssignments } from "@/server/assessment/service";

export default async function StudentPage() {
  const session = await requireStudentSession();
  const tasks = await listStudentAssignments(session);
  const activeTasks = tasks.filter((task) => task.status === "ACTIVE");
  const featuredTask = activeTasks.find((task) => task.isOpen && task.attemptStatus !== "SUBMITTED")
    ?? activeTasks.find((task) => task.isOpen)
    ?? activeTasks[0];
  const submittedCount = tasks.filter((task) => task.attemptStatus === "SUBMITTED").length;
  return (
    <main className="student-home">
      <header className="student-header">
        <Link className="brand" href="/"><span className="brand-mark">G</span><span>GeoLearn<small>Ruang Siswa</small></span></Link>
        <div className="student-identity"><span>{session.className}</span><strong>{session.fullName}</strong><form action="/api/auth/logout" method="post"><button className="logout-button" type="submit">Keluar</button></form></div>
      </header>

      <section className="student-hero">
        <div>
          <p className="eyebrow">Selamat datang</p>
          <h1>Siap melihat geografi dari sudut pandang spasial?</h1>
          <p>Anda masuk melalui enrollment aktif untuk kelas ini. Tugas dari guru siap dikerjakan melalui assessment GeoLearn.</p>
        </div>
        <div className="student-progress">
          <span>Progress tugas</span><strong>{submittedCount}/{tasks.length}</strong><small>Tugas selesai dari assignment kelas</small>
        </div>
      </section>

      <section className="student-section">
        <div className="section-heading-row">
          <div><p className="eyebrow">Tugas</p><h2>Tugas yang tersedia</h2></div>
          <span className="status-pill">AKTIF</span>
        </div>
        {featuredTask ? (() => {
          const submitted = featuredTask.attemptStatus === "SUBMITTED";
          const unavailable = featuredTask.isExpired || featuredTask.isScheduled;
          const state = submitted ? "Selesai" : featuredTask.attemptStatus === "IN_PROGRESS" ? "Sedang dikerjakan" : featuredTask.isScheduled ? "Belum buka" : featuredTask.isExpired ? "Ditutup" : "Belum dikerjakan";
          const deadline = featuredTask.closesAt
            ? `Deadline ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(featuredTask.closesAt)}`
            : "Tanpa deadline";
          return <article className="assignment-card">
            <div className="assignment-icon">◫</div>
            <div className="assignment-copy">
              <span className="assignment-kicker">{featuredTask.quizTitle} · {featuredTask.itemCount} soal · {state}</span>
              <h3>{featuredTask.title}</h3>
              <p>{deadline}</p>
            </div>
            {submitted
              ? <Link className="button" href={`/student/result?attempt=${featuredTask.attemptId}`}>Lihat Hasil</Link>
              : <form action={`/api/assessment/assignments/${featuredTask.id}/start`} method="post"><button className="button" disabled={unavailable} type="submit">{featuredTask.attemptStatus === "IN_PROGRESS" ? "Lanjutkan" : "Mulai Tugas"}</button></form>}
          </article>;
        })() : <div className="empty-state"><strong>Belum ada tugas aktif.</strong><p>Assignment aktif dari guru akan muncul di sini.</p></div>}
      </section>

      <nav className="student-bottom-nav" aria-label="Navigasi siswa">
        <Link className="active" href="/student"><span>⌂</span><small>Beranda</small></Link>
        <Link href="/student/tasks"><span>▣</span><small>Tugas</small></Link>
        <Link href="/student/result"><span>◔</span><small>Hasil Saya</small></Link>
      </nav>
    </main>
  );
}
