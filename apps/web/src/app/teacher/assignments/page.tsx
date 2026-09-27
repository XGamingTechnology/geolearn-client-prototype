import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listClasses } from "@/server/classes/service";
import { listPublishedQuizOptions, listTeacherAssignments } from "@/server/assessment/service";
import { listQuizQuestionOptions } from "@/server/assessment/quiz-authoring";
import { AssignmentScheduleFields } from "@/components/assignment-schedule-fields";
import { QuizQuestionSelector } from "@/components/quiz-question-selector";
import { GuidedAssignmentBuilder } from "@/components/guided-assignment-builder";
import { LocalDateTime } from "@/components/local-date-time";
import styles from "./assignments.module.css";

type Params={status?:string;qv?:string|string[]};

export default async function AssignmentsPage({searchParams}:{searchParams:Promise<Params>}){
  const session=await requireTeacherSession();
  const params=await searchParams;
  const requested=Array.isArray(params.qv)?params.qv:params.qv?[params.qv]:[];
  const [assignments,classes,questions,quizzes]=await Promise.all([
    listTeacherAssignments(session),
    listClasses(session),
    listQuizQuestionOptions(session),
    listPublishedQuizOptions(session),
  ]);
  const allowedIds=new Set(questions.map(item=>item.questionVersionId));
  const initialSelected=[...new Set(requested.filter(id=>allowedIds.has(id)))];
  const status=params.status;

  return (
    <main className="dashboard catalog-page">
      <header className={styles.hero}>
        <div className={styles.heroCopy}><p className={styles.kicker}>Assessment Management</p><h1>Penugasan</h1><p>Susun pengalaman belajar yang terarah dari soal terpublikasi, atur kelas dan jadwal, lalu periksa kembali sebelum diberikan kepada siswa.</p></div>
        <div className={styles.heroStatus}><span className={styles.statusDot}/><div><strong>Siap digunakan</strong><small>Alur penugasan aktif</small></div></div>
      </header>

      {initialSelected.length>0&&<p className="account-alert success"><strong>{initialSelected.length} soal dari Bank Soal sudah dipilih.</strong><span> Lanjutkan pengaturan tugas di bawah.</span></p>}
      {status==="guided-created"&&<p className="account-alert success">Penugasan berhasil dipublish dan sudah diberikan ke kelas.</p>}
      {status==="quiz-created"&&<p className="account-alert">Quiz reusable berhasil dibuat.</p>}
      {status==="assignment-created"&&<p className="account-alert">Quiz reusable berhasil diberikan ke kelas.</p>}
      {(status==="error"||status==="guided-error")&&<p className="account-alert error">Operasi assessment gagal. Periksa pilihan soal, kelas, dan jadwal.</p>}

      <section className={styles.builderShell}>
        <div className={styles.builderHeading}>
          <div><p className={styles.kicker}>Guided Flow</p><h2>Buat penugasan baru</h2><p>Ikuti tiga langkah singkat untuk menyiapkan penugasan yang siap dibagikan.</p></div>
          <span className={styles.timeHint}>± 3 menit</span>
        </div>
        <GuidedAssignmentBuilder questions={questions} classes={classes} initialSelected={initialSelected}/>
      </section>

      <details className="dashboard-panel assessment-create-panel">
        <summary>Opsi lanjutan · Quiz reusable</summary>
        <p className="form-note">Gunakan bagian ini jika kumpulan soal yang sama akan dipakai ulang untuk beberapa kelas atau periode. Flow utama di atas tetap menyimpan versi soal yang digunakan agar isi tugas tidak berubah setelah dipublish.</p>
        <section className="assessment-authoring-grid">
          <details className="dashboard-panel assessment-create-panel">
            <summary>A · Buat Quiz reusable</summary>
            <form action="/api/assessment/quizzes" method="post" className="assessment-create-form">
              <label>Judul Quiz<input name="title" required maxLength={220} placeholder="Spatial Thinking XI-A"/></label>
              <label>Deskripsi<textarea name="description" rows={3}/></label>
              <QuizQuestionSelector questions={questions}/>
              <button className="button" disabled={!questions.length} type="submit">Simpan Quiz reusable</button>
            </form>
          </details>

          <details className="dashboard-panel assessment-create-panel">
            <summary>B · Gunakan Quiz existing</summary>
            <form action="/api/assessment/assignments" method="post" className="assessment-create-form">
              <label>Judul Tugas<input name="title" required placeholder="Analisis Pengaruh Sungai"/></label>
              <label>Quiz<select name="quizVersionId" required defaultValue=""><option value="" disabled>Pilih Quiz</option>{quizzes.map((q)=><option key={q.quizVersionId} value={q.quizVersionId}>{q.title} · v{q.versionNumber} · {q.itemCount} soal</option>)}</select></label>
              <label>Kelas<select name="classId" required defaultValue=""><option value="" disabled>Pilih Kelas</option>{classes.filter((c)=>c.status==="ACTIVE").map((c)=><option key={c.id} value={c.id}>{c.name} · {c.classCode}</option>)}</select></label>
              <label>Instruksi<textarea name="instructions" rows={3}/></label>
              <AssignmentScheduleFields/>
              <div className="builder-two-col"><label>Batas Percobaan<input type="number" min={1} max={10} name="attemptLimit" defaultValue={1}/></label><label>Hasil Siswa<select name="resultVisibility" defaultValue="AFTER_SUBMIT"><option value="AFTER_SUBMIT">Setelah submit</option><option value="AFTER_CLOSE">Setelah deadline</option><option value="HIDDEN">Jangan tampilkan</option></select></label></div>
              <button className="button" disabled={!quizzes.length||!classes.length} type="submit">Berikan ke Kelas</button>
            </form>
          </details>
        </section>
      </details>

      <section className="assignment-summary-grid">
        <article><small>Total</small><strong>{assignments.length}</strong><span>penugasan</span></article>
        <article><small>Aktif</small><strong>{assignments.filter((a)=>a.status==="ACTIVE").length}</strong><span>sedang berjalan</span></article>
        <article><small>Submitted</small><strong>{assignments.reduce((sum,a)=>sum+a.submittedCount,0)}</strong><span>attempt selesai</span></article>
        <article><small>Quiz</small><strong>{quizzes.length}</strong><span>reusable</span></article>
      </section>

      <section className="assignment-management-list">
        {assignments.map((item)=>(
          <article className="assignment-management-row" key={item.id}>
            <div className="assignment-type-icon">✓</div>
            <div className="assignment-management-main">
              <div className="question-tags"><span>{item.className}</span><span>Quiz v{item.quizVersion}</span><span>{item.status}</span></div>
              <h2>{item.title}</h2>
              <p>{item.quizTitle} · deadline {item.closesAt?<LocalDateTime value={item.closesAt}/>:"tanpa batas"}</p>
            </div>
            <div className="assignment-progress-cell"><strong>{item.submittedCount}/{item.attemptCount}</strong><small>submitted / attempt</small></div>
            <span className={item.status==="ACTIVE"?"assignment-status active":"assignment-status complete"}>{item.status}</span>
            <div className="row-actions"><Link href={"/teacher/results?assignment="+item.id}>Hasil</Link></div>
          </article>
        ))}
      </section>
      {!assignments.length&&<div className="empty-state"><strong>Belum ada Penugasan.</strong><p>Gunakan flow di atas untuk membuat penugasan pertama.</p></div>}
    </main>
  );
}
