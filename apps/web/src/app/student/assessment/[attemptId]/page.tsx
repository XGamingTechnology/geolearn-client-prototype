import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentRuntimeClient } from "@/components/assessment-runtime-client";
import { requireStudentSession } from "@/server/auth/session";
import { getAttemptRuntime } from "@/server/assessment/service";
import { completedAssessmentGisTools } from "@/server/assessment/gis";
import { getSavedSpatialResponses } from "@/server/assessment/spatial-response";

export default async function AssessmentAttemptPage({params,searchParams}:{params:Promise<{attemptId:string}>;searchParams:Promise<{status?:string}>}){
  const session=await requireStudentSession();
  const {attemptId}=await params;
  const runtime=await getAttemptRuntime(session,attemptId);
  if(!runtime)notFound();
  const {status}=await searchParams;
  const completedEntries=await Promise.all(runtime.questions.map(async(question)=>[
    question.questionVersionId,await completedAssessmentGisTools(session,attemptId,question.questionVersionId),
  ] as const));
  const initialCompletedTools=Object.fromEntries(completedEntries);
  const initialSpatialResponses=await getSavedSpatialResponses(session,attemptId);
  // Never serialize grading signals into the active student runtime. The
  // student needs their saved answer only; correctness and awarded score stay
  // server-side until the assignment's result-visibility policy allows them.
  const safeSavedResponses=Object.fromEntries(Object.entries(runtime.savedResponses).map(([quizItemId,value])=>[
    quizItemId,{answer:value.answer},
  ]));

  return (
    <main className="assessment-page">
      <header className="assessment-header">
        <div className="assessment-brand"><span className="brand-mark">G</span><div><strong>{runtime.assignmentTitle}</strong><small>{runtime.quizTitle} · Percobaan {runtime.attemptNumber}</small></div></div>
        <Link className="assessment-exit" href="/student/tasks">Keluar</Link>
      </header>
      {status==="error"&&<p className="account-alert error">Belum dapat dikirim. Pastikan semua soal sudah mempunyai jawaban yang tersimpan.</p>}
      <AssessmentRuntimeClient attemptId={attemptId} questions={runtime.questions} savedResponses={safeSavedResponses} initialCompletedTools={initialCompletedTools} initialSpatialResponses={initialSpatialResponses}/>
    </main>
  );
}
