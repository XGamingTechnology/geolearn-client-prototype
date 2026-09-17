import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listClasses } from "@/server/classes/service";
import { listPublishedQuestionOptions, listPublishedQuizOptions, listTeacherAssignments } from "@/server/assessment/service";
import { AssignmentScheduleFields } from "@/components/assignment-schedule-fields";
import { LocalDateTime } from "@/components/local-date-time";

export default async function AssignmentsPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const [assignments,classes,questions,quizzes,{status}]=await Promise.all([
    listTeacherAssignments(session),
    listClasses(session),
    listPublishedQuestionOptions(session),
    listPublishedQuizOptions(session),
    searchParams,
  ]);

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Assessment Management</p><h1>Penugasan</h1><p>QuizVersion immutable → Assignment → Attempt siswa.</p></div>
        <span className="status-pill">DATABASE</span>
      </header>

      {status==="quiz-created"&&<p className="account-alert">QuizVersion immutable berhasil dibuat.</p>}
      {status==="assignment-created"&&<p className="account-alert">Assignment berhasil dipublish ke kelas.</p>}
      {status==="error"&&<p className="account-alert error">Operasi assessment gagal. Periksa QuizVersion, kelas, dan jadwal.</p>}

      <section className="assessment-authoring-grid">
        <details className="dashboard-panel assessment-create-panel">
          <summary>1 · Buat QuizVersion</summary>
          <form action="/api/assessment/quizzes" method="post" className="assessment-create-form">
            <label>Judul Quiz<input name="title" required maxLength={220} placeholder="Spatial Thinking XI-A"/></label>
            <label>Deskripsi<textarea name="description" rows={3}/></label>
            <fieldset><legend>Pilih published QuestionVersion</legend>
              {questions.map((q)=><label className="assessment-check" key={q.questionVersionId}><input type="checkbox" name="questionVersionIds" value={q.questionVersionId}/><span><strong>{q.title}</strong><small>v{q.versionNumber} · {q.spatialMode} · {q.stimulusType??"text"}</small></span></label>)}
              {!questions.length&&<p>Belum ada QuestionVersion published.</p>}
            </fieldset>
            <button className="button" disabled={!questions.length} type="submit">Publish QuizVersion</button>
          </form>
        </details>

        <details className="dashboard-panel assessment-create-panel">
          <summary>2 · Assign ke Kelas</summary>
          <form action="/api/assessment/assignments" method="post" className="assessment-create-form">
            <label>Judul Tugas<input name="title" required placeholder="Analisis Pengaruh Sungai"/></label>
            <label>QuizVersion<select name="quizVersionId" required defaultValue=""><option value="" disabled>Pilih Quiz</option>{quizzes.map((q)=><option key={q.quizVersionId} value={q.quizVersionId}>{q.title} · v{q.versionNumber} · {q.itemCount} soal</option>)}</select></label>
            <label>Kelas<select name="classId" required defaultValue=""><option value="" disabled>Pilih Kelas</option>{classes.filter((c)=>c.status==="ACTIVE").map((c)=><option key={c.id} value={c.id}>{c.name} · {c.classCode}</option>)}</select></label>
            <label>Instruksi<textarea name="instructions" rows={3}/></label>
            <AssignmentScheduleFields/>
            <div className="builder-two-col"><label>Attempt Limit<input type="number" min={1} max={10} name="attemptLimit" defaultValue={1}/></label><label>Result<select name="resultVisibility" defaultValue="AFTER_SUBMIT"><option value="AFTER_SUBMIT">Setelah submit</option><option value="AFTER_CLOSE">Setelah deadline</option><option value="HIDDEN">Disembunyikan</option></select></label></div>
            <button className="button" disabled={!quizzes.length||!classes.length} type="submit">Aktifkan Assignment</button>
          </form>
        </details>
      </section>

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
      {!assignments.length&&<div className="empty-state"><strong>Belum ada Assignment.</strong><p>Buat QuizVersion lalu assign ke kelas.</p></div>}
    </main>
  );
}
