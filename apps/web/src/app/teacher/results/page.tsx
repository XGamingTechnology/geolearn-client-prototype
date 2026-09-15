import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { getTeacherAssignmentResult, listTeacherAssignments } from "@/server/assessment/service";

export default async function ResultsPage({searchParams}:{searchParams:Promise<{assignment?:string}>}){
  const session=await requireTeacherSession();
  const {assignment}=await searchParams;
  const assignments=await listTeacherAssignments(session);
  const detail=assignment?await getTeacherAssignmentResult(session,assignment):null;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header"><div><p className="eyebrow">Assessment Results</p><h1>Hasil</h1><p>Attempt dan skor nyata dari PostgreSQL.</p></div><span className="status-pill">DATABASE</span></header>

      <section className="assignment-management-list">
        {assignments.map((item)=><article className="assignment-management-row" key={item.id}><div className="assignment-type-icon">◔</div><div className="assignment-management-main"><h2>{item.title}</h2><p>{item.className} · {item.quizTitle}</p></div><div className="assignment-progress-cell"><strong>{item.submittedCount}/{item.attemptCount}</strong><small>submitted</small></div><span className={item.status==="ACTIVE"?"assignment-status active":"assignment-status complete"}>{item.status}</span><div className="row-actions"><Link href={"/teacher/results?assignment="+item.id}>Buka</Link></div></article>)}
      </section>

      {detail&&<section className="dashboard-panel" style={{marginTop:16}}>
        <div className="panel-heading"><div><p className="eyebrow">Student Attempts</p><h2>{detail.assignment.title}</h2></div><span className="status-pill">{detail.attempts.length} attempt</span></div>
        <div className="student-table">
          <div className="student-table-head"><span>Student ID</span><span>Nama</span><span>Status</span><span>Skor</span><span>Submitted</span></div>
          {detail.attempts.map((a)=><div className="student-table-row" key={a.attemptId}><span className="student-id">{a.loginId}</span><strong>{a.studentName}</strong><span>{a.status}</span><span>{a.scoreMax?Math.round(((a.scoreRaw??0)/a.scoreMax)*100)+"%":"-"}</span><span>{a.submittedAt?new Intl.DateTimeFormat("id-ID",{dateStyle:"medium",timeStyle:"short"}).format(a.submittedAt):"-"}</span></div>)}
        </div>
      </section>}
    </main>
  );
}
