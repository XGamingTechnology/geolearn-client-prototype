import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuestionEditor } from "@/server/content/service";
import { listQuestionDatasetBindings } from "@/server/content/question-datasets";
import { listDatasets } from "@/server/data/service";
import { listMediaBank } from "@/server/content/service";
import { listQuestionMediaBindings } from "@/server/content/question-media";
import { requireTeacherSession } from "@/server/auth/session";
import {QuestionBuilderForm} from "@/components/question-builder-form";

export default async function QuestionEditorPage({params,searchParams}:{params:Promise<{questionId:string}>;searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const {questionId}=await params;
  const [item,datasets,bindings,media,mediaBindings,{status}]=await Promise.all([
    getQuestionEditor(session,questionId),listDatasets(session),listQuestionDatasetBindings(session,questionId),listMediaBank(session),listQuestionMediaBindings(session,questionId),searchParams,
  ]);
  if(!item) notFound();
  const answers=(item.responseConfig?.answers??[]).filter(answer=>answer.label.trim());
  const key=item.validationConfig?.correctAnswer??"A";
  const spatialValidationMethod=item.validationConfig?.method??"manual-review";
  const maxDistanceMeters=Number((item.validationConfig as {maxDistanceMeters?:number}|null)?.maxDistanceMeters??100);
  const minOverlapRatio=Number((item.validationConfig as {minOverlapRatio?:number}|null)?.minOverlapRatio??0.5);
  const isDraft=item.versionStatus==="DRAFT";
  const activity=item.activityConfig??{};
  const requiredActions=Array.isArray(activity.requiredActions)?activity.requiredActions:[];
  const requiredGisTools=requiredActions.map((action)=>action&&typeof action==="object"&&typeof (action as {tool?:unknown}).tool==="string"?(action as {tool:string}).tool:null).filter((tool):tool is string=>Boolean(tool));
  const configuredTools=Array.isArray(activity.tools)?activity.tools.filter((tool):tool is string=>typeof tool==="string"):[];
  const allowedGisTools=Array.from(new Set([...configuredTools,...requiredGisTools]));
  const bufferAction=requiredActions.find((action)=>action&&typeof action==="object"&&(action as {tool?:unknown}).tool==="buffer") as {parameters?:{distanceMeters?:number}}|undefined;
  const toolParameters=activity.toolParameters&&typeof activity.toolParameters==="object"?activity.toolParameters as {buffer?:{distanceMeters?:number}}:{};
  const bufferDistance=bufferAction?.parameters?.distanceMeters??toolParameters.buffer?.distanceMeters??500;
  const datasetBindings=bindings.map((binding)=>({datasetId:binding.datasetId,role:binding.role}));
  const stimulusMedia=mediaBindings.find((binding)=>binding.role==="STIMULUS");

  return (
    <main className="dashboard builder-page">
      <div className="breadcrumb"><Link href="/teacher/questions">Bank Soal</Link><span>/</span><strong>{item.title}</strong></div>
      <header className="catalog-header">
        <div><p className="eyebrow">Question Version</p><h1>{item.title}</h1><p>{item.scope} · {item.versionNumber?"v"+item.versionNumber:"-"} · {item.versionStatus}</p></div>
        <span className="status-pill">{item.versionStatus}</span>
      </header>
      {status==="updated"&&<p className="account-alert">Draft berhasil disimpan.</p>}
      {status==="published"&&<p className="account-alert">Version berhasil dipublish dan sekarang immutable.</p>}
      {status==="draft-created"&&<p className="account-alert">Draft version baru dibuat dari published version.</p>}
      {status==="error"&&<p className="account-alert error">Operasi gagal.</p>}

      {isDraft ? (
        <QuestionBuilderForm action={"/api/content/questions/"+item.id} publishAction={"/api/content/questions/"+item.id+"/publish"} datasets={datasets.filter(d=>d.versionStatus==="PUBLISHED"&&d.dataKind==="VECTOR")} media={media} initial={{
          title:item.title,subject:item.subject??"",topic:item.topic??"",spatialMode:item.spatialMode??"location",difficulty:item.difficulty??"Sedang",prompt:item.prompt??"",
          stimulusType:item.stimulusType??"text",responseType:item.responseConfig?.type??"multiple-choice",answers,correctAnswer:key,
          datasetBindings,allowedGisTools,requiredGisTools,bufferDistance,
          stimulusMediaId:stimulusMedia?.mediaAssetId,mediaAltText:stimulusMedia?.altText??"",mediaCaption:stimulusMedia?.caption??"",
          spatialValidationMethod,maxDistanceMeters,minOverlapRatio,feedbackCorrect:item.feedbackConfig?.correct??"",feedbackIncorrect:item.feedbackConfig?.incorrect??""
        }}/>
      ) : (
        <section className="published-question-view">
          <article className="dashboard-panel"><p className="eyebrow">Published Snapshot</p><h2>{item.prompt}</h2><div className="question-tags"><span>{item.spatialMode}</span><span>{item.stimulusType}</span><span>{item.responseType}</span></div><div className="published-answer-list">{answers.map((a)=><div key={a.id}><b>{a.id}</b><span>{a.label}</span>{a.id===key&&<em>Correct</em>}</div>)}</div></article>
          <div className="builder-footer"><form action={"/api/content/questions/"+item.id+"/duplicate"} method="post"><button className="button button-secondary" type="submit">Duplicate / Fork</button></form><form action={"/api/content/questions/"+item.id+"/new-version"} method="post"><button className="button" type="submit">Buat Draft Version Baru</button></form></div>
        </section>
      )}
    </main>
  );
}
