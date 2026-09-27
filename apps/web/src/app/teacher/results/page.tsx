import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { getTeacherAssignmentResult, listTeacherAssignments } from "@/server/assessment/service";
import { getTeacherAttemptReview } from "@/server/assessment/teacher-review";
import { getAssignmentAnalytics, getQuestionAnalytics, getStudentSkillProfiles, spatialModes } from "@/server/analytics/service";

function pct(value:number|null){return value===null?"-":Math.round(value)+"%";}
function secs(value:number|null){if(value===null)return "-";const m=Math.floor(value/60);const s=Math.round(value%60);return m?m+"m "+s+"s":s+"s";}
function answerText(value:Record<string,unknown>){const answer=value.answer;return typeof answer==="string"?answer:JSON.stringify(value);}

type Params={assignment?:string;student?:string;attempt?:string;reviewStatus?:string;message?:string};

export default async function ResultsPage({searchParams}:{searchParams:Promise<Params>}){
  const session=await requireTeacherSession();
  const {assignment,student,attempt,reviewStatus,message}=await searchParams;
  const [assignments,assignmentAnalytics,questionAnalytics,profiles]=await Promise.all([
    listTeacherAssignments(session),
    getAssignmentAnalytics(session),
    getQuestionAnalytics(session),
    getStudentSkillProfiles(session),
  ]);
  const detail=assignment?await getTeacherAssignmentResult(session,assignment):null;
  const studentProfile=student?profiles.find((item)=>item.studentId===student):null;
  const attemptReview=attempt?await getTeacherAttemptReview(session,attempt):null;

  const totalSubmitted=assignmentAnalytics.reduce((sum,item)=>sum+item.submittedCount,0);
  const weightedScore=assignmentAnalytics.filter((item)=>item.averageScore!==null);
  const overallScore=weightedScore.length?weightedScore.reduce((sum,item)=>sum+(item.averageScore??0),0)/weightedScore.length:null;
  const gisRows=assignmentAnalytics.filter((item)=>item.gisCompletionRate!==null);
  const gisCompletion=gisRows.length?gisRows.reduce((sum,item)=>sum+(item.gisCompletionRate??0),0)/gisRows.length:null;

  return (
    <main className="dashboard catalog-page analytics-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Spatial Thinking Analytics</p><h1>Hasil & Analitik</h1><p>Nilai otomatis, aktivitas GIS, dan review guru tetap terhubung ke Response asli siswa.</p></div>
        <span className="status-pill">REVIEW READY</span>
      </header>

      {reviewStatus==="saved"&&<p className="account-alert success">Review guru berhasil disimpan dan nilai attempt sudah dihitung ulang.</p>}
      {reviewStatus==="error"&&<p className="account-alert error">Review belum berhasil disimpan. {message??"Periksa nilai dan akses attempt."}</p>}

      <section className="analytics-kpi-grid">
        <article><small>Assignment</small><strong>{assignmentAnalytics.length}</strong><span>terpantau</span></article>
        <article><small>Submitted</small><strong>{totalSubmitted}</strong><span>attempt selesai</span></article>
        <article><small>Rata-rata skor</small><strong>{pct(overallScore)}</strong><span>submitted attempts</span></article>
        <article><small>GIS completion</small><strong>{pct(gisCompletion)}</strong><span>required action</span></article>
      </section>

      <section className="dashboard-panel analytics-section">
        <div className="panel-heading"><div><p className="eyebrow">Assignment Analytics</p><h2>Completion, skor, durasi, GIS</h2></div></div>
        <div className="analytics-table">
          <div className="analytics-table-head"><span>Assignment</span><span>Completion</span><span>Avg score</span><span>Avg duration</span><span>GIS</span><span/></div>
          {assignmentAnalytics.map((item)=><div className="analytics-table-row" key={item.assignmentId}>
            <span><strong>{item.title}</strong><small>{item.className}</small></span>
            <span>{pct(item.completionRate)}<small>{item.submittedCount}/{item.enrolledCount} siswa</small></span>
            <span>{pct(item.averageScore)}</span>
            <span>{secs(item.averageDurationSeconds)}</span>
            <span>{pct(item.gisCompletionRate)}<small>{item.gisCompletedCount}/{item.gisRequiredCount}</small></span>
            <Link href={"/teacher/results?assignment="+item.assignmentId+"#assignment-detail"}>Detail</Link>
          </div>)}
        </div>
      </section>

      <section className="dashboard-panel analytics-section">
        <div className="panel-heading"><div><p className="eyebrow">Question Accuracy</p><h2>Per QuestionVersion</h2></div><span className="status-pill">{questionAnalytics.length} question</span></div>
        <div className="question-analytics-grid">
          {questionAnalytics.map((item)=><article key={item.questionVersionId}>
            <div className="question-tags"><span>{item.spatialMode}</span><span>{item.responseCount} response</span></div>
            <h3>{item.title}</h3>
            <div className="question-analytics-metrics"><span><b>{pct(item.accuracy)}</b><small>Accuracy</small></span><span><b>{secs(item.averageDurationSeconds)}</b><small>Avg duration</small></span></div>
          </article>)}
        </div>
      </section>

      <section className="dashboard-panel analytics-section">
        <div className="panel-heading"><div><p className="eyebrow">Spatial Thinking Profile</p><h2>8 mode</h2></div><span className="status-pill">{profiles.length} siswa</span></div>
        <div className="skill-profile-table">
          <div className="skill-profile-head"><span>Siswa</span>{spatialModes.map((mode)=><span key={mode}>{mode}</span>)}</div>
          {profiles.map((profile)=><div className="skill-profile-row" key={profile.studentId}>
            <span><Link href={"/teacher/results?student="+profile.studentId}>{profile.studentName}</Link><small>{profile.loginId}</small></span>
            {spatialModes.map((mode)=>{const value=profile.modes.find((x)=>x.mode===mode);return <span key={mode}>{value?Math.round(value.score):"-"}</span>;})}
          </div>)}
        </div>
      </section>

      {studentProfile&&<section className="dashboard-panel analytics-section student-drilldown">
        <div className="panel-heading"><div><p className="eyebrow">Student Drill-down</p><h2>{studentProfile.studentName}</h2><p>{studentProfile.loginId}</p></div><Link href="/teacher/results">Tutup</Link></div>
        <div className="student-mode-grid">
          {spatialModes.map((mode)=>{const value=studentProfile.modes.find((x)=>x.mode===mode);return <article key={mode}><small>{mode}</small><strong>{value?Math.round(value.score):"-"}</strong><span>{value?value.correctCount+"/"+value.answeredCount+" benar":"Belum ada data"}</span></article>;})}
        </div>
      </section>}

      {detail&&<section id="assignment-detail" className="dashboard-panel analytics-section">
        <div className="panel-heading"><div><p className="eyebrow">Student Attempts</p><h2>{detail.assignment.title}</h2></div><Link href="/teacher/results">Tutup</Link></div>
        <div className="student-table">
          <div className="student-table-head"><span>Student ID</span><span>Nama</span><span>Status</span><span>Skor</span><span>Submitted / Review</span></div>
          {detail.attempts.map((a)=><div className="student-table-row" key={a.attemptId}>
            <span className="student-id">{a.loginId}</span><strong>{a.studentName}</strong><span>{a.status}</span><span>{a.scoreMax?Math.round(((a.scoreRaw??0)/a.scoreMax)*100)+"%":"-"}</span>
            <span>{a.submittedAt?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(a.submittedAt):"-"}{a.status==="SUBMITTED"&&<><br/><Link href={`/teacher/results?assignment=${detail.assignment.id}&attempt=${a.attemptId}#attempt-review`}>Review jawaban</Link></>}</span>
          </div>)}
        </div>
      </section>}

      {attemptReview&&<section id="attempt-review" className="dashboard-panel analytics-section">
        <div className="panel-heading"><div><p className="eyebrow">Teacher Review</p><h2>{attemptReview.studentName}</h2><p>{attemptReview.assignmentTitle} · {attemptReview.loginId}</p></div><span className="status-pill">{attemptReview.responses.length} RESPONSE</span></div>
        <div className="assignment-summary-grid"><article><small>Status</small><strong>{attemptReview.status}</strong><span>attempt</span></article><article><small>Nilai Saat Ini</small><strong>{attemptReview.scoreMax?Math.round(((attemptReview.scoreRaw??0)/attemptReview.scoreMax)*100):0}</strong><span>/ 100</span></article><article><small>Reviewed</small><strong>{attemptReview.responses.filter(item=>item.reviewedAt).length}</strong><span>dari {attemptReview.responses.length}</span></article><article><small>Spatial Artifact</small><strong>{attemptReview.responses.reduce((sum,item)=>sum+item.artifactCount,0)}</strong><span>tersimpan</span></article></div>
        <div className="question-analytics-grid">
          {attemptReview.responses.map((response,index)=><article key={response.responseId}>
            <div className="question-tags"><span>Soal {index+1}</span><span>{response.spatialMode}</span><span>{response.responseType??"response"}</span>{response.artifactCount>0&&<span>{response.artifactCount} artifact spasial</span>}</div>
            <h3>{response.title}</h3>
            <p><strong>Jawaban siswa:</strong> {answerText(response.responseJson)}</p>
            <div className="question-analytics-metrics"><span><b>{response.autoScore??0}/{response.points}</b><small>Auto score</small></span><span><b>{response.finalScore??response.autoScore??0}/{response.points}</b><small>Final score</small></span></div>
            <form action={`/api/assessment/responses/${response.responseId}/review`} method="post" className="assessment-create-form">
              <input type="hidden" name="assignmentId" value={attemptReview.assignmentId}/><input type="hidden" name="attemptId" value={attemptReview.attemptId}/>
              <label>Nilai final<input name="finalScore" type="number" min={0} max={response.points} step="0.01" defaultValue={response.finalScore??response.autoScore??0}/></label>
              <label>Feedback guru<textarea name="feedback" rows={3} defaultValue={response.feedback??""} placeholder="Tuliskan koreksi atau arahan singkat untuk siswa…"/></label>
              <button className="button" type="submit">{response.reviewedAt?"Perbarui Review":"Simpan Review"}</button>
            </form>
          </article>)}
        </div>
      </section>}

      {!assignments.length&&<div className="empty-state"><strong>Belum ada hasil assessment.</strong><p>Analytics akan muncul setelah assignment dan submitted attempt tersedia.</p></div>}
    </main>
  );
}
