import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentRuntimeClient } from "@/components/assessment-runtime-client";
import { requireStudentSession } from "@/server/auth/session";
import { getAttemptRuntime } from "@/server/assessment/service";

export default async function AssessmentAttemptPage({params,searchParams}:{params:Promise<{attemptId:string}>;searchParams:Promise<{status?:string}>}){
  const session=await requireStudentSession();
  const {attemptId}=await params;
  const runtime=await getAttemptRuntime(session,attemptId);
  if(!runtime)notFound();
  const {status}=await searchParams;

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <div className="assessment-brand"><span className="brand-mark">G</span><div><strong>{runtime.assignmentTitle}</strong><small>{runtime.quizTitle} · Attempt {runtime.attemptNumber}</small></div></div>
        <div className="assessment-progress"><span>{runtime.questions.length} soal</span><div><i style={{width:"25%"}}/></div></div>
        <Link className="assessment-exit" href="/student/tasks">Keluar</Link>
      </header>
      {status==="error"&&<p className="account-alert error">Attempt belum dapat disubmit. Pastikan semua soal sudah dijawab.</p>}
      <AssessmentRuntimeClient attemptId={attemptId} questions={runtime.questions} savedResponses={runtime.savedResponses}/>
    </main>
  );
}
