import Link from "next/link";
import { requireStudentSession } from "@/server/auth/session";
import { getStudentVisibleResult, listStudentVisibleResults } from "@/server/assessment/student-results";
import styles from "./student-result.module.css";

function scorePct(scoreRaw:number|null,scoreMax:number|null){return scoreMax?Math.round(((scoreRaw??0)/scoreMax)*100):null;}
function visibilityCopy(value:string){
  if(value==="AFTER_CLOSE")return "Nilai tersedia setelah deadline.";
  if(value==="HIDDEN")return "Nilai tidak ditampilkan untuk penugasan ini.";
  return "Nilai tersedia setelah submit.";
}
function formatSubmitted(value:Date|null){return value?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(value):"-";}

export default async function StudentResultPage({searchParams}:{searchParams:Promise<{attempt?:string}>}) {
  const session=await requireStudentSession();
  const {attempt}=await searchParams;
  const [results,selected]=await Promise.all([
    listStudentVisibleResults(session),
    attempt?getStudentVisibleResult(session,attempt):Promise.resolve(null),
  ]);
  const score=selected?.scoreVisible?scorePct(selected.scoreRaw,selected.scoreMax):null;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link className="brand" href="/student"><span className="brand-mark">G</span><span>GeoThink<small>Hasil Saya</small></span></Link>
        <span className="status-pill">HASIL</span>
      </header>

      {selected&&<>
        <section className={styles.hero}>
          <div><p className="eyebrow">Penugasan berhasil dikirim</p><h1>{selected.assignmentTitle}</h1><p>{selected.quizTitle}. Jawaban Anda sudah diterima oleh sistem. {visibilityCopy(selected.resultVisibility)}</p></div>
          <div className={styles.scoreCard}><span>{selected.scoreVisible?"Skor sementara/final":"Status"}</span><strong>{selected.scoreVisible?(score??0):"✓"}</strong><small>{selected.scoreVisible?"dari 100":"Terkirim"}</small></div>
        </section>
        <section className={styles.receiptGrid} aria-label="Ringkasan pengiriman">
          <article><small>Dikirim</small><strong>{formatSubmitted(selected.submittedAt)}</strong></article>
          <article><small>Status hasil</small><strong>{selected.scoreVisible?"Nilai tersedia":selected.resultVisibility==="AFTER_CLOSE"?"Menunggu deadline":"Terkirim"}</strong></article>
          <article><small>Ketentuan hasil</small><strong>{visibilityCopy(selected.resultVisibility)}</strong></article>
        </section>
      </>}

      <section className={styles.history}>
        <div className={styles.historyHead}><div><p className="eyebrow">Riwayat</p><h2>Hasil penugasan</h2></div><span className="status-pill">{results.length} SELESAI</span></div>
        <div className={styles.historyList}>
          {results.map((item)=>{const pct=item.scoreVisible?scorePct(item.scoreRaw,item.scoreMax):null;return <article className={styles.historyRow} key={item.attemptId}><div className={styles.icon}>✓</div><div><h3>{item.assignmentTitle}</h3><p>{item.quizTitle} · dikirim {formatSubmitted(item.submittedAt)}</p></div><span className={`${styles.status} ${item.scoreVisible?styles.statusComplete:""}`}>{item.scoreVisible?`${pct??0}%`:item.resultVisibility==="AFTER_CLOSE"?"Menunggu":"Terkirim"}</span><Link className={styles.detailButton} href={"/student/result?attempt="+item.attemptId}>Lihat detail</Link></article>;})}
        </div>
        {!results.length&&<div className={styles.empty}><strong>Belum ada hasil.</strong><p>Penugasan yang sudah Anda kirim akan muncul di sini.</p></div>}
      </section>

      <nav className={styles.bottomNav} aria-label="Navigasi siswa">
        <Link href="/student"><span>⌂</span>Beranda</Link>
        <Link href="/student/tasks"><span>▣</span>Tugas</Link>
        <Link data-active="true" href="/student/result"><span>◔</span>Hasil Saya</Link>
      </nav>
    </main>
  );
}
