import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuestionEditor } from "@/server/content/service";
import { requireTeacherSession } from "@/server/auth/session";

const modes=["location","condition","influence","region","hierarchy","analogy","pattern","association"];
const stimuli=["text","image","video","static-map","webgis","dual-map","map-table","map-chart","composite"];

export default async function QuestionEditorPage({params,searchParams}:{params:Promise<{questionId:string}>;searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const {questionId}=await params;
  const item=await getQuestionEditor(session,questionId);
  if(!item) notFound();
  const {status}=await searchParams;
  const answers=item.responseConfig?.answers??[];
  const key=item.validationConfig?.correctAnswer??"A";
  const isDraft=item.versionStatus==="DRAFT";

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
            <div className="builder-two-col"><label>Spatial Mode<select name="spatialMode" defaultValue={item.spatialMode??"location"}>{modes.map((m)=><option key={m}>{m}</option>)}</select></label><label>Stimulus<select name="stimulusType" defaultValue={item.stimulusType??"text"}>{stimuli.map((x)=><option value={x} key={x}>{x}</option>)}</select></label></div>
          </section>
          <section className="dashboard-panel"><p className="eyebrow">Prompt & A–E</p><label>Prompt<textarea name="prompt" rows={5} defaultValue={item.prompt??""} required/></label><div className="answer-form-grid">{["A","B","C","D","E"].map((id)=><label key={id}>{id}<input name={"answer_"+id} defaultValue={answers.find((a)=>a.id===id)?.label??""} required/></label>)}</div><label>Kunci<select name="correctAnswer" defaultValue={key}>{["A","B","C","D","E"].map((id)=><option key={id}>{id}</option>)}</select></label></section>
          <section className="dashboard-panel"><p className="eyebrow">Feedback</p><label>Benar<textarea name="feedbackCorrect" rows={3} defaultValue={item.feedbackConfig?.correct??""}/></label><label>Belum tepat<textarea name="feedbackIncorrect" rows={3} defaultValue={item.feedbackConfig?.incorrect??""}/></label></section>
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
