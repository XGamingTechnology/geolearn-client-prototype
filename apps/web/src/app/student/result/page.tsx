import Link from "next/link";
import { requireStudentSession } from "@/server/auth/session";
import { getStudentVisibleResult, listStudentVisibleResults } from "@/server/assessment/student-results";

function scorePct(scoreRaw:number|null,scoreMax:number|null){return scoreMax?Math.round(((scoreRaw??0)/scoreMax)*100):null;}
function visibilityCopy(value:string){
  if(value==="AFTER_CLOSE")return "Nilai tersedia setelah deadline.";
  if(value==="HIDDEN")return "Nilai tidak ditampilkan untuk penugasan ini.";
  return "Nilai tersedia setelah submit.";
}

export default async function StudentResultPage({searchParams}:{searchParams:Promise<{attempt?:string}>}) {
  const session=await requireStudentSession();
  const {attempt}=await searchParams;
  const [results,selected]=await Promise.all([
    listStudentVisibleResults(session),
    attempt?getStudentVisibleResult(session,attempt):Promise.resolve(null),
  ]);
  const score=selected?.scoreVisible?scorePct(selected.scoreRaw,selected.scoreMax):null;

  return (
    <main className="student-result-page">
      <header className="student-header">
        <Link className="brand" href="/student"><span className="brand-mark">G</span><span>GeoLearn<small>Hasil Saya</small></span></Link>
        <span className="status-pill">HASIL</span>
      </header>

      {selected&&<section className="result-hero">
        <div><p className="eyebrow">Penugasan selesai</p><h1>{selected.assignmentTitle}</h1><p>{selected.quizTitle} · {visibilityCopy(selected.resultVisibility)}</p></div>
        <div className="score-orb"><span>{selected.scoreVisible?"Skor":"Status"}</span><strong>{selected.scoreVisible?(score??0):"✓"}</strong><small>{selected.scoreVisible?"/ 100":"Terkirim"}</small></div>
      </section>}

      <section className="student-skill-panel">
        <div className="panel-heading"><div><p className="eyebrow">Riwayat</p><h2>Hasil penugasan</h2></div><span className="status-pill">{results.length} selesai</span></div>
        <div className="student-task-list">
          {results.map((item)=>{const pct=item.scoreVisible?scorePct(item.scoreRaw,item.scoreMax):null;return <article className="student-task-row" key={item.attemptId}><div className="assignment-icon">✓</div><div><h2>{item.assignmentTitle}</h2><p>{item.quizTitle} · {item.submittedAt?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(item.submittedAt):"-"}</p></div><span className={item.scoreVisible?"student-task-status complete":"student-task-status"}>{item.scoreVisible?`${pct??0}%`:item.resultVisibility==="AFTER_CLOSE"?"Menunggu":"Terkirim"}</span><Link className="button button-secondary" href={"/student/result?attempt="+item.attemptId}>Detail</Link></article>;})}
        </div>
        {!results.length&&<div className="empty-state"><strong>Belum ada hasil.</strong><p>Penugasan yang sudah Anda kirim akan muncul di sini.</p></div>}
      </section>

      <nav className="student-bottom-nav" aria-label="Navigasi siswa">
        <Link href="/student"><span>⌂</span><small>Beranda</small></Link>
        <Link href="/student/tasks"><span>▣</span><small>Tugas</small></Link>
        <Link className="active" href="/student/result"><span>◔</span><small>Hasil Saya</small></Link>
      </nav>
    </main>
  );
}
