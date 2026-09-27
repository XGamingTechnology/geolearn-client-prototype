import Link from "next/link";
import {notFound} from "next/navigation";
import {TeacherStudentPreview} from "@/components/teacher-student-preview";
import {requireTeacherSession} from "@/server/auth/session";
import {getExactQuestionPreview} from "@/server/content/question-version-preview";
import {mapInteractionsForActivityConfig,normalizeBasemap,normalizeMapExperience} from "@/features/questions/experience";
import type {ResponseType,StimulusType} from "@/features/questions/builder";
import styles from "../question-view.module.css";

export default async function ExactPreviewPage({params,searchParams}:{params:Promise<{questionId:string}>;searchParams:Promise<{versionId?:string}>}){
  const actor=await requireTeacherSession();const {questionId}=await params;const {versionId}=await searchParams;if(!versionId)notFound();
  const item=await getExactQuestionPreview(actor,questionId,versionId);if(!item)notFound();const activity=item.activityConfig??{};
  const requiredActions=Array.isArray(activity.requiredActions)?activity.requiredActions:[];const requiredTools=requiredActions.map(value=>value&&typeof value==="object"&&typeof (value as {tool?:unknown}).tool==="string"?(value as {tool:string}).tool:null).filter((value):value is string=>Boolean(value));const configured=Array.isArray(activity.tools)?activity.tools.filter((value):value is string=>typeof value==="string"):[];const tools=Array.from(new Set([...configured,...requiredTools]));
  return <main className={styles.page}><nav className={styles.breadcrumb}><Link href="/teacher/questions">Bank Soal</Link><span>/</span><Link href={`/teacher/questions/${questionId}`}>{item.title}</Link><span>/</span><strong>Preview versi {item.versionNumber}</strong></nav><header className={styles.hero}><div className={styles.heroCopy}><span className={styles.kicker}>Preview {item.versionStatus}</span><h1>{item.title}</h1><p className={styles.heroSub}>Preview read-only untuk QuestionVersion {item.versionNumber}. Tidak membuat Attempt, Response, GIS Activity, atau status penilaian.</p></div></header><section className={styles.draftShell}><TeacherStudentPreview questionId={questionId} questionVersionId={item.versionId} stimulus={item.stimulusType as StimulusType} spatialModeLabel={item.spatialMode} bindings={item.bindings} mapExperience={normalizeMapExperience(activity.mapExperience)} basemap={normalizeBasemap(activity.basemap)} mapInteractions={mapInteractionsForActivityConfig(activity)} allowedTools={tools} requiredTools={requiredTools} responseType={(item.responseConfig.type??"multiple-choice") as ResponseType} answers={item.responseConfig.answers??[]} initialTitle={item.title} initialPrompt={item.prompt} mediaSource={item.media?.source} mediaAltText={item.media?.altText??item.media?.title} mediaCaption={item.media?.caption??undefined}/></section></main>;
}
