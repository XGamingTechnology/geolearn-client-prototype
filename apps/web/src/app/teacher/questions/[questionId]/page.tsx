import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuestionEditor } from "@/server/content/service";
import { listQuestionDatasetBindings } from "@/server/content/question-datasets";
import { listDatasets } from "@/server/data/service";
import { listMediaBank } from "@/server/content/service";
import { listQuestionMediaBindings } from "@/server/content/question-media";
import { requireTeacherSession } from "@/server/auth/session";

const modes=["location","condition","influence","region","hierarchy","analogy","pattern","association"];
const stimuli=["text","image","video","static-map","webgis","dual-map","map-table","map-chart","composite"];

export default async function QuestionEditorPage({params,searchParams}:{params:Promise<{questionId:string}>;searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const {questionId}=await params;
  const [item,datasets,bindings,media,mediaBindings,{status}]=await Promise.all([
    getQuestionEditor(session,questionId),listDatasets(session),listQuestionDatasetBindings(session,questionId),listMediaBank(session),listQuestionMediaBindings(session,questionId),searchParams,
  ]);
  if(!item) notFound();
  const answers=item.responseConfig?.answers??[];
  const key=item.validationConfig?.correctAnswer??"A";
  const spatialValidationMethod=item.validationConfig?.method??"manual-review";
  const maxDistanceMeters=Number((item.validationConfig as {maxDistanceMeters?:number}|null)?.maxDistanceMeters??100);
  const minOverlapRatio=Number((item.validationConfig as {minOverlapRatio?:number}|null)?.minOverlapRatio??0.5);
  const isDraft=item.versionStatus==="DRAFT";
  const requiredActions=Array.isArray(item.activityConfig?.requiredActions)?item.activityConfig.requiredActions:[];
  const firstRequired=(requiredActions[0]??{}) as {tool?:string;parameters?:{distanceMeters?:number}};
  const sourceDatasetId=bindings.find((binding)=>binding.role==="SOURCE")?.datasetId??"";
  const targetDatasetId=bindings.find((binding)=>binding.role==="TARGET")?.datasetId??"";
  const stimulusMedia=mediaBindings.find((binding)=>binding.role==="STIMULUS");

  return (
    <main className="dashboard builder-page">
      <div className="breadcrumb"><Link href="/teacher/questions">Bank Soal</Link><span>/</span><strong>{item.title}</strong></div>
      <header className="catalog-header">
        <div><p className="eyebrow">Question Version</p><h1>{item.title}</h1><p>{item.scope} · {item.versionNumber?"v"+item.versionNumber:"-"} · {item.versionStatus}</p></div>
        <span className={item.versionStatus==="PUBLISHED"?"status-pill":"status-pill"}>{item.versionStatus}</span>
      </header>
      {status==="updated"&&<p className="account-alert">Draft berhasil disimpan.</p>}
      {status==="published"&&<p className="account-alert">Version berhasil dipublish dan sekarang immutable.</p>}
      {status==="draft-created"&&<p className="account-alert">Draft version baru dibuat dari published version.</p>}
      {status==="error"&&<p className="account-alert error">Operasi gagal.</p>}

      {isDraft ? (
        <form action={"/api/content/questions/"+item.id} method="post" className="real-question-form">
          <section className="dashboard-panel"><p className="eyebrow">Information</p>
            <div className="builder-two-col"><label>Judul<input name="title" defaultValue={item.title} required/></label><label>Subject<input name="subject" defaultValue={item.subject??""}/></label></div>
            <div className="builder-two-col"><label>Topik<input name="topic" defaultValue={item.topic??""}/></label><label>Difficulty<input name="difficulty" defaultValue={item.difficulty??""}/></label></div>
            <div className="builder-two-col"><label>Spatial Mode<select name="spatialMode" defaultValue={item.spatialMode??"location"}>{modes.map((m)=><option key={m}>{m}</option>)}</select></label><label>Stimulus<select name="stimulusType" defaultValue={item.stimulusType??"text"}>{stimuli.map((x)=><option value={x} key={x}>{x}</option>)}</select></label></div><div className="builder-two-col"><label>Required GIS Tool<select name="requiredGisTool" defaultValue={firstRequired.tool??""}><option value="">Tidak wajib</option><option value="buffer">Buffer</option><option value="overlay">Overlay</option><option value="distance">Distance</option></select></label><label>Buffer Distance (m)<input name="bufferDistance" type="number" min={1} max={100000} defaultValue={firstRequired.parameters?.distanceMeters??500}/></label></div><div className="builder-two-col"><label>Source Dataset<select name="sourceDatasetId" defaultValue={sourceDatasetId}><option value="">Tidak ada</option>{datasets.filter((d)=>d.versionStatus==="PUBLISHED"&&d.dataKind==="VECTOR").map((d)=><option value={d.id} key={d.id}>{d.title}</option>)}</select></label><label>Target Dataset<select name="targetDatasetId" defaultValue={targetDatasetId}><option value="">Tidak ada</option>{datasets.filter((d)=>d.versionStatus==="PUBLISHED"&&d.dataKind==="VECTOR").map((d)=><option value={d.id} key={d.id}>{d.title}</option>)}</select></label></div><div className="builder-two-col"><label>Stimulus Media<select name="stimulusMediaId" defaultValue={stimulusMedia?.mediaAssetId??""}><option value="">Tidak ada</option>{media.filter((m)=>m.mediaType==="IMAGE"||m.mediaType==="VIDEO").map((m)=><option value={m.id} key={m.id}>{m.title} · {m.mediaType}</option>)}</select></label><label>Media Alt Text<input name="mediaAltText" defaultValue={stimulusMedia?.altText??""}/></label></div><label>Media Caption<input name="mediaCaption" defaultValue={stimulusMedia?.caption??""}/></label>
          </section>
          <section className="dashboard-panel"><p className="eyebrow">Prompt & Response</p><label>Prompt<textarea name="prompt" rows={5} defaultValue={item.prompt??""} required/></label><label>Response Type<select name="responseType" defaultValue={item.responseConfig?.type??"multiple-choice"}><option value="multiple-choice">A–E</option><option value="draw-point">Draw Point</option><option value="draw-line">Draw Line</option><option value="draw-polygon">Draw Polygon</option><option value="feature-select">Select Map Feature</option></select></label><div className="answer-form-grid">{["A","B","C","D","E"].map((id)=><label key={id}>{id}<input name={"answer_"+id} defaultValue={answers.find((a)=>a.id===id)?.label??""}/></label>)}</div><label>Kunci A–E<select name="correctAnswer" defaultValue={key}>{["A","B","C","D","E"].map((id)=><option key={id}>{id}</option>)}</select></label></section>
          <section className="dashboard-panel"><p className="eyebrow">Validation & Feedback</p><div className="builder-two-col"><label>Spatial Validation<select name="spatialValidationMethod" defaultValue={spatialValidationMethod}><option value="manual-review">Manual Review</option><option value="geometry-distance">Geometry Distance</option><option value="geometry-overlap">Geometry Overlap</option></select></label><label>Max Distance (m)<input name="maxDistanceMeters" type="number" min={0} defaultValue={maxDistanceMeters}/></label></div><label>Min Overlap Ratio (0–1)<input name="minOverlapRatio" type="number" min={0} max={1} step={0.05} defaultValue={minOverlapRatio}/></label><label>Benar<textarea name="feedbackCorrect" rows={3} defaultValue={item.feedbackConfig?.correct??""}/></label><label>Belum tepat<textarea name="feedbackIncorrect" rows={3} defaultValue={item.feedbackConfig?.incorrect??""}/></label></section>
          <div className="builder-footer"><button className="button button-secondary" formAction={"/api/content/questions/"+item.id+"/publish"} type="submit">Publish Immutable Version</button><button className="button" type="submit">Simpan Draft</button></div>
        </form>
      ) : (
        <section className="published-question-view">
          <article className="dashboard-panel"><p className="eyebrow">Published Snapshot</p><h2>{item.prompt}</h2><div className="question-tags"><span>{item.spatialMode}</span><span>{item.stimulusType}</span><span>{item.responseType}</span></div><div className="published-answer-list">{answers.map((a)=><div key={a.id}><b>{a.id}</b><span>{a.label}</span>{a.id===key&&<em>Correct</em>}</div>)}</div></article>
          <div className="builder-footer"><form action={"/api/content/questions/"+item.id+"/duplicate"} method="post"><button className="button button-secondary" type="submit">Duplicate / Fork</button></form><form action={"/api/content/questions/"+item.id+"/new-version"} method="post"><button className="button" type="submit">Buat Draft Version Baru</button></form></div>
        </section>
      )}
    </main>
  );
}
