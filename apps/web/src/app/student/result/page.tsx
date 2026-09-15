import Link from "next/link";
import { requireStudentSession } from "@/server/auth/session";
import { getStudentAttemptResult, listStudentResults } from "@/server/assessment/service";

export default async function StudentResultPage({searchParams}:{searchParams:Promise<{attempt?:string}>}) {
  const session=await requireStudentSession();
  const {attempt}=await searchParams;
  const selected=attempt?await getStudentAttemptResult(session,attempt):null;
  const results=await listStudentResults(session);
  const score=selected?.scoreMax?Math.round(((selected.scoreRaw??0)/selected.scoreMax)*100):null;

  return (
    <main className="student-result-page">
      <header className="student-header">
        <Link className="brand" href="/student"><span className="brand-mark">G</span><span>GeoLearn<small>Hasil Saya</small></span></Link>
        <span className="status-pill">DATABASE</span>
      </header>

      {selected&&<section className="result-hero">
        <div><p className="eyebrow">Submitted Attempt</p><h1>{selected.assignmentTitle}</h1><p>{selected.quizTitle} · tersimpan di PostgreSQL.</p></div>
        <div className="score-orb"><span>Skor</span><strong>{score??0}</strong><small>/ 100</small></div>
      </section>}

      <section className="student-skill-panel">
        <div className="panel-heading"><div><p className="eyebrow">Attempt History</p><h2>Riwayat hasil</h2></div><span className="status-pill">{results.length} attempt</span></div>
        <div className="student-task-list">
          {results.map((item)=>{const pct=item.scoreMax?Math.round(((item.scoreRaw??0)/item.scoreMax)*100):0;return <article className="student-task-row" key={item.attemptId}><div className="assignment-icon">✓</div><div><h2>{item.assignmentTitle}</h2><p>{item.quizTitle} · {item.submittedAt?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(item.submittedAt):"-"}</p></div><span className="student-task-status complete">{pct}%</span><Link className="button button-secondary" href={"/student/result?attempt="+item.attemptId}>Detail</Link></article>;})}
        </div>
        {!results.length&&<div className="empty-state"><strong>Belum ada hasil.</strong><p>Hasil akan muncul setelah attempt disubmit.</p></div>}
      </section>

      <nav className="student-bottom-nav" aria-label="Navigasi siswa">
        <Link href="/student"><span>⌂</span><small>Beranda</small></Link>
        <Link href="/student/tasks"><span>▣</span><small>Tugas</small></Link>
        <Link className="active" href="/student/result"><span>◔</span><small>Hasil Saya</small></Link>
      </nav>
    </main>
  );
}
