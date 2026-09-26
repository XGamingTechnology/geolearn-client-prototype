import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listClasses } from "@/server/classes/service";
import { listPublishedQuizOptions, listTeacherAssignments } from "@/server/assessment/service";
import { listQuizQuestionOptions } from "@/server/assessment/quiz-authoring";
import { AssignmentScheduleFields } from "@/components/assignment-schedule-fields";
import { QuizQuestionSelector } from "@/components/quiz-question-selector";
import { GuidedAssignmentBuilder } from "@/components/guided-assignment-builder";
import { LocalDateTime } from "@/components/local-date-time";

export default async function AssignmentsPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const [assignments,classes,questions,quizzes,{status}]=await Promise.all([
    listTeacherAssignments(session),
    listClasses(session),
    listQuizQuestionOptions(session),
    listPublishedQuizOptions(session),
    searchParams,
  ]);

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Assessment Management</p><h1>Penugasan</h1><p>Pilih soal, atur kelas dan jadwal, lalu publish. GeoLearn membuat QuizVersion immutable secara otomatis di belakang layar.</p></div>
        <span className="status-pill">DATABASE</span>
      </header>

      {status==="guided-created"&&<p className="account-alert success">Penugasan berhasil dipublish. QuizVersion immutable dibuat otomatis.</p>}
      {status==="quiz-created"&&<p className="account-alert">QuizVersion reusable berhasil dibuat.</p>}
      {status==="assignment-created"&&<p className="account-alert">Quiz reusable berhasil di-assign ke kelas.</p>}
      {(status==="error"||status==="guided-error")&&<p className="account-alert error">Operasi assessment gagal. Periksa pilihan soal, kelas, dan jadwal.</p>}

      <section className="dashboard-panel">
        <div className="catalog-header">
          <div><p className="eyebrow">Quick Flow</p><h2>Buat Penugasan</h2><p>Dua langkah saja: pilih soal, lalu atur kelas dan jadwal.</p></div>
        </div>
        <GuidedAssignmentBuilder questions={questions} classes={classes}/>
      </section>

      <details className="dashboard-panel assessment-create-panel">
        <summary>Opsi lanjutan · gunakan Quiz reusable</summary>
        <p className="form-note">Gunakan bagian ini bila satu Quiz ingin disimpan dan dipakai ulang untuk beberapa kelas atau periode. Flow cepat di atas tetap membuat QuizVersion immutable, tetapi langsung memasangnya ke satu Assignment.</p>
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
            <summary>B · Assign Quiz existing</summary>
            <form action="/api/assessment/assignments" method="post" className="assessment-create-form">
              <label>Judul Tugas<input name="title" required placeholder="Analisis Pengaruh Sungai"/></label>
              <label>QuizVersion<select name="quizVersionId" required defaultValue=""><option value="" disabled>Pilih Quiz</option>{quizzes.map((q)=><option key={q.quizVersionId} value={q.quizVersionId}>{q.title} · v{q.versionNumber} · {q.itemCount} soal</option>)}</select></label>
              <label>Kelas<select name="classId" required defaultValue=""><option value="" disabled>Pilih Kelas</option>{classes.filter((c)=>c.status==="ACTIVE").map((c)=><option key={c.id} value={c.id}>{c.name} · {c.classCode}</option>)}</select></label>
              <label>Instruksi<textarea name="instructions" rows={3}/></label>
              <AssignmentScheduleFields/>
              <div className="builder-two-col"><label>Attempt Limit<input type="number" min={1} max={10} name="attemptLimit" defaultValue={1}/></label><label>Result<select name="resultVisibility" defaultValue="AFTER_SUBMIT"><option value="AFTER_SUBMIT">Setelah submit</option><option value="AFTER_CLOSE">Setelah deadline</option><option value="HIDDEN">Disembunyikan</option></select></label></div>
              <button className="button" disabled={!quizzes.length||!classes.length} type="submit">Assign Quiz ke Kelas</button>
            </form>
          </details>
        </section>
      </details>

      <section className="assignment-summary-grid">
        <article><small>Total</small><strong>{assignments.length}</strong><span>assignment database</span></article>
        <article><small>Aktif</small><strong>{assignments.filter((a)=>a.status==="ACTIVE").length}</strong><span>sedang berjalan</span></article>
        <article><small>Submitted</small><strong>{assignments.reduce((sum,a)=>sum+a.submittedCount,0)}</strong><span>attempt selesai</span></article>
        <article><small>QuizVersion</small><strong>{quizzes.length}</strong><span>immutable</span></article>
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
      {!assignments.length&&<div className="empty-state"><strong>Belum ada Assignment.</strong><p>Gunakan flow cepat di atas untuk membuat penugasan pertama.</p></div>}
    </main>
  );
}
