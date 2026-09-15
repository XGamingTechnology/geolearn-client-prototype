"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Question={
  quizItemId:string;
  questionVersionId:string;
  position:number;
  points:number;
  title:string;
  spatialMode:string;
  prompt:string;
  stimulusConfig:Record<string,unknown>;
  activityConfig:Record<string,unknown>;
  responseConfig:{type?:string;answers?:Array<{id:string;label:string}>};
  feedbackConfig:{correct?:string;incorrect?:string};
};

function requiredTools(config:Record<string,unknown>):string[]{
  const actions=Array.isArray(config.requiredActions)?config.requiredActions:[];
  return actions.map((action)=>action&&typeof action==="object"&&typeof (action as {tool?:unknown}).tool==="string"?(action as {tool:string}).tool:null).filter((x):x is string=>Boolean(x));
}

export function AssessmentRuntimeClient({attemptId,questions,savedResponses}:{attemptId:string;questions:Question[];savedResponses:Record<string,{answer:string;isCorrect:boolean|null;scoreAwarded:number|null}>}){
  const router=useRouter();
  const [index,setIndex]=useState(0);
  const [answers,setAnswers]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(savedResponses).map(([quizItemId,value])=>[quizItemId,value.answer])));
  const [completedTools,setCompletedTools]=useState<Record<string,string[]>>({});
  const [feedback,setFeedback]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(savedResponses).map(([quizItemId,value])=>[quizItemId,value.isCorrect===true?"Jawaban sebelumnya benar.":value.isCorrect===false?"Jawaban sebelumnya tersimpan.":"Jawaban sebelumnya tersimpan."])));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const question=questions[index];

  if(!question)return <div className="empty-state"><strong>Tidak ada soal pada QuizVersion ini.</strong></div>;

  const required=requiredTools(question.activityConfig);
  const done=new Set(completedTools[question.questionVersionId]??[]);
  const requiredComplete=required.every((tool)=>done.has(tool));
  const options=question.responseConfig.answers??[];
  const selected=answers[question.quizItemId]??"";

  async function runTool(tool:string){
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/assessment/attempts/${attemptId}/gis`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({
          questionVersionId:question.questionVersionId,
          toolId:tool,
          actionType:tool+"_run",
          parameters:{source:"assessment-runtime"},
          resultSummary:{completed:true},
        }),
      });
      if(!response.ok) throw new Error("Aktivitas GIS gagal disimpan.");
      setCompletedTools((current)=>({
        ...current,
        [question.questionVersionId]:Array.from(new Set([...(current[question.questionVersionId]??[]),tool])),
      }));
    }catch(e){setError(e instanceof Error?e.message:"Aktivitas GIS gagal.");}
    finally{setBusy(false);}
  }

  async function saveAnswer(){
    if(!selected)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/assessment/attempts/${attemptId}/responses`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({quizItemId:question.quizItemId,answer:selected,durationMs:0}),
      });
      const body=await response.json();
      if(!response.ok) throw new Error(body.error??"Jawaban gagal disimpan.");
      setFeedback((current)=>({...current,[question.quizItemId]:body.feedback|| (body.isCorrect?"Jawaban benar.":"Jawaban tersimpan.")}));
      if(index<questions.length-1)setIndex(index+1); else router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Jawaban gagal disimpan.");}
    finally{setBusy(false);}
  }

  return (
    <section className="assessment-runtime-grid">
      <article className="assessment-question-panel">
        <div className="question-meta"><span>{question.spatialMode} · {String(question.stimulusConfig.type??"text")}</span><code>Q{question.position}</code></div>
        <h2>{question.title}</h2>
        <p>{question.prompt}</p>

        {required.length>0&&<div className="required-action">
          <span className={requiredComplete?"status complete":"status"}/>
          <div><strong>{requiredComplete?"Aktivitas GIS selesai":"Aktivitas GIS wajib"}</strong><small>{required.join(", ")}</small></div>
        </div>}

        {String(question.stimulusConfig.type??"text")==="webgis"&&
          <div className="runtime-map-shell">
            <div className="runtime-map-grid"/>
            <div className="runtime-map-message"><strong>WebGIS Runtime</strong><span>Tool dikendalikan oleh activity_config QuestionVersion.</span></div>
          </div>}

        {String(question.stimulusConfig.type??"text")==="image"&&<div className="runtime-media-shell">Image stimulus · asset binding akan dirender dari MediaAsset</div>}
        {String(question.stimulusConfig.type??"text")==="video"&&<div className="runtime-media-shell">Video stimulus · asset binding akan dirender dari MediaAsset</div>}

        {required.length>0&&<div className="runtime-tool-row">{required.map((tool)=><button className={done.has(tool)?"complete":""} disabled={busy||done.has(tool)} key={tool} onClick={()=>runTool(tool)} type="button">{done.has(tool)?"✓ ":""}{tool}</button>)}</div>}

        <fieldset disabled={!requiredComplete||busy}>
          <legend>Jawaban</legend>
          {options.map((option)=><label className={"answer "+(selected===option.id?"selected":"")} key={option.id}><input type="radio" name={"answer-"+question.quizItemId} checked={selected===option.id} onChange={()=>setAnswers((current)=>({...current,[question.quizItemId]:option.id}))}/><b>{option.id}</b>{option.label}</label>)}
        </fieldset>

        {feedback[question.quizItemId]&&<div className="answer-result correct"><strong>Jawaban tersimpan</strong><p>{feedback[question.quizItemId]}</p></div>}
        {error&&<p className="auth-error">{error}</p>}

        <div className="runtime-question-actions">
          <button className="button button-secondary" disabled={index===0||busy} onClick={()=>setIndex(Math.max(0,index-1))} type="button">← Sebelumnya</button>
          <button className="button" disabled={!selected||!requiredComplete||busy} onClick={saveAnswer} type="button">{index===questions.length-1?"Simpan Jawaban":"Simpan & Lanjut"}</button>
        </div>
      </article>

      <aside className="assessment-runtime-sidebar">
        <div><p className="eyebrow">Progress</p><strong>{index+1} / {questions.length}</strong></div>
        <div className="runtime-question-nav">{questions.map((q,i)=><button className={i===index?"active":answers[q.quizItemId]?"answered":""} onClick={()=>setIndex(i)} key={q.quizItemId} type="button">{q.position}</button>)}</div>
        <form action={"/api/assessment/attempts/"+attemptId+"/submit"} method="post">
          <button className="button button-wide" type="submit">Submit Attempt</button>
        </form>
        <small>Submit hanya berhasil jika semua soal sudah mempunyai Response.</small>
      </aside>
    </section>
  );
}
