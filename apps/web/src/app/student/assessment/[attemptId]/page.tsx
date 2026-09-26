import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentRuntimeClient } from "@/components/assessment-runtime-client";
import { requireStudentSession } from "@/server/auth/session";
import { getAttemptRuntime } from "@/server/assessment/service";
import { completedAssessmentGisTools } from "@/server/assessment/gis";
import { getSavedSpatialResponses } from "@/server/assessment/spatial-response";
import styles from "./assessment-experience.module.css";

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

  return (
    <main className={`${styles.page} assessment-page`}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <span className={styles.brandMark}>G</span>
          <div className={styles.brandText}>
            <strong>{runtime.assignmentTitle}</strong>
            <small>{runtime.quizTitle} · Attempt {runtime.attemptNumber}</small>
          </div>
        </div>
        <div className={styles.progress} aria-label={`${runtime.questions.length} soal dalam penugasan ini`}>
          <span className={styles.progressDot}/>
          <span>{runtime.questions.length} soal · progres mengikuti respons tersimpan</span>
        </div>
        <Link className={styles.exit} href="/student/tasks">Keluar</Link>
      </header>
      {status==="error"&&<p className="account-alert error">Attempt belum dapat disubmit. Pastikan semua soal sudah dijawab.</p>}
      <AssessmentRuntimeClient attemptId={attemptId} questions={runtime.questions} savedResponses={runtime.savedResponses} initialCompletedTools={initialCompletedTools} initialSpatialResponses={initialSpatialResponses}/>
    </main>
  );
}
