"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { GeoJsonObject } from "geojson";
import { AssessmentMediaRenderer } from "@/components/assessment-media-renderer";
import styles from "./assessment-runtime-results.module.css";

const AssessmentSpatialResponseMap=dynamic(
  ()=>import("./assessment-spatial-response-map").then((module)=>module.AssessmentSpatialResponseMap),
  {ssr:false,loading:()=><div className="runtime-map-shell"><div className="map-loading">Menyiapkan respons spasial…</div></div>},
);

const AssessmentLeafletMap=dynamic(
  ()=>import("./assessment-leaflet-map").then((module)=>module.AssessmentLeafletMap),
  {ssr:false,loading:()=><div className="runtime-map-shell"><div className="map-loading">Menyiapkan Leaflet…</div></div>},
);

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

type GisAnalysisResult={
  toolId:string;
  title:string;
  metric:string;
  description:string;
  geojson:GeoJsonObject|null;
};

function requiredTools(config:Record<string,unknown>):string[]{
  const actions=Array.isArray(config.requiredActions)?config.requiredActions:[];
  return actions.map((action)=>action&&typeof action==="object"&&typeof (action as {tool?:unknown}).tool==="string"?(action as {tool:string}).tool:null).filter((x):x is string=>Boolean(x));
}

function allowedTools(config:Record<string,unknown>):string[]{
  const configured=Array.isArray(config.tools)?config.tools.filter((tool):tool is string=>typeof tool==="string"):[];
  return Array.from(new Set([...configured,...requiredTools(config)]));
}

function formatDistance(value:number){
  if(value>=1000)return `${(value/1000).toFixed(value>=10000?1:2)} km`;
  return `${Math.round(value)} m`;
}

function resultFromResponse(toolId:string,body:Record<string,unknown>):GisAnalysisResult{
  const geojson=body.geojson&&typeof body.geojson==="object"?body.geojson as GeoJsonObject:null;
  if(toolId==="buffer"){
    const distance=Number(body.distanceMeters??0);
    const count=Number(body.featureCount??0);
    return {toolId,title:"Buffer",metric:`${formatDistance(distance)} · ${count} feature`,description:`Zona buffer ${formatDistance(distance)} dibuat di sekitar seluruh feature pada layer SOURCE.`,geojson};
  }
  if(toolId==="overlay"){
    const count=Number(body.intersectionCount??0);
    return {toolId,title:"Overlay",metric:`${count} irisan`,description:count===0?"Tidak ditemukan area/feature SOURCE dan TARGET yang saling beririsan.":`Ditemukan ${count} irisan antara layer SOURCE dan TARGET.`,geojson};
  }
  const distance=body.distanceMeters==null?null:Number(body.distanceMeters);
  const sourceId=body.sourceFeatureId==null?null:String(body.sourceFeatureId);
  const targetId=body.targetFeatureId==null?null:String(body.targetFeatureId);
  return {
    toolId,title:"Distance",metric:distance==null?"Tidak ada pasangan feature":formatDistance(distance),
    description:distance==null?"Jarak minimum tidak dapat dihitung karena pasangan SOURCE–TARGET tidak tersedia.":`Jarak minimum SOURCE ke TARGET${sourceId&&targetId?` adalah dari feature ${sourceId} ke ${targetId}`:""}.`,geojson,
  };
}

export function AssessmentRuntimeClient({
  attemptId,questions,savedResponses,initialCompletedTools,initialSpatialResponses,
}:{
  attemptId:string;
  questions:Question[];
  savedResponses:Record<string,{answer:string;isCorrect:boolean|null;scoreAwarded:number|null}>;
  initialCompletedTools:Record<string,string[]>;
  initialSpatialResponses:Record<string,{responseType:string;geometry:GeoJsonObject|null;selectedFeatureIds:string[]}>;
}){
  const router=useRouter();
  const [index,setIndex]=useState(0);
  const [answers,setAnswers]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(savedResponses).map(([quizItemId,value])=>[quizItemId,value.answer])));
  const [completedTools,setCompletedTools]=useState<Record<string,string[]>>(initialCompletedTools);
  const [persisted,setPersisted]=useState<Record<string,boolean>>(()=>Object.fromEntries([
    ...Object.keys(savedResponses),...Object.keys(initialSpatialResponses),
  ].map((key)=>[key,true])));
  const [spatialDirty,setSpatialDirty]=useState<Record<string,boolean>>({});
  const [spatialResponses,setSpatialResponses]=useState(initialSpatialResponses);
  const [analysisResults,setAnalysisResults]=useState<Record<string,Record<string,GisAnalysisResult>>>({});
  const [feedback,setFeedback]=useState<Record<string,string>>(()=>Object.fromEntries(Object.entries(savedResponses).map(([quizItemId,value])=>[quizItemId,value.isCorrect===true?"Jawaban sebelumnya benar.":"Jawaban sebelumnya tersimpan."])));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const elapsedByQuestion=useRef<Record<string,number>>({});
  const enteredAt=useRef<number|null>(null);
  const question=questions[index];

  useEffect(()=>{enteredAt.current=Date.now();},[]);
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{if(Object.values(spatialDirty).some(Boolean)){event.preventDefault();event.returnValue="";}};
    window.addEventListener("beforeunload",warn);
    return()=>{window.removeEventListener("beforeunload",warn);};
  },[spatialDirty]);

  if(!question)return <div className="empty-state"><strong>Tidak ada soal pada QuizVersion ini.</strong></div>;

  const required=requiredTools(question.activityConfig);
  const allowed=allowedTools(question.activityConfig);
  const done=new Set(completedTools[question.questionVersionId]??[]);
  const requiredComplete=required.every((tool)=>done.has(tool));
  const options=(question.responseConfig.answers??[]).filter((option)=>option.label.trim());
  const selected=answers[question.quizItemId]??"";
  const stimulusType=String(question.stimulusConfig.type??"text");
  const responseType=String(question.responseConfig.type??"multiple-choice");
  const isSpatialResponse=["draw-point","draw-line","draw-polygon","feature-select"].includes(responseType);
  const savedSpatial=spatialResponses[question.quizItemId];
  const completedCount=questions.filter((item)=>persisted[item.quizItemId]).length;
  const allPersisted=completedCount===questions.length;
  const currentResults=analysisResults[question.questionVersionId]??{};

  function elapsedSinceEntry(){return enteredAt.current===null?0:Math.max(0,Date.now()-enteredAt.current);}
  function durationMs(){return Math.max(0,Math.round((elapsedByQuestion.current[question.quizItemId]??0)+elapsedSinceEntry()));}
  function navigate(next:number){
    if(spatialDirty[question.quizItemId]&&!window.confirm("Respons spasial belum disimpan. Tinggalkan perubahan ini?"))return;
    elapsedByQuestion.current[question.quizItemId]=(elapsedByQuestion.current[question.quizItemId]??0)+elapsedSinceEntry();
    enteredAt.current=Date.now();setIndex(next);
  }

  async function runTool(tool:string){
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/assessment/attempts/${attemptId}/questions/${question.questionVersionId}/gis/execute`,{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({toolId:tool}),
      });
      const body=await response.json() as Record<string,unknown>;
      if(!response.ok)throw new Error(typeof body.error==="string"?body.error:"Analisis PostGIS gagal.");
      setCompletedTools((current)=>({...current,[question.questionVersionId]:Array.from(new Set([...(current[question.questionVersionId]??[]),tool]))}));
      const result=resultFromResponse(tool,body);
      setAnalysisResults((current)=>({...current,[question.questionVersionId]:{...(current[question.questionVersionId]??{}),[tool]:result}}));
    }catch(e){setError(e instanceof Error?e.message:"Analisis PostGIS gagal.");}
    finally{setBusy(false);}
  }

  async function saveAnswer(){
    if(!selected)return;
    setBusy(true);setError("");
    try{
      const response=await fetch(`/api/assessment/attempts/${attemptId}/responses`,{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({quizItemId:question.quizItemId,answer:selected,durationMs:durationMs()}),
      });
      const body=await response.json();
      if(!response.ok)throw new Error(body.error??"Jawaban gagal disimpan.");
      setFeedback((current)=>({...current,[question.quizItemId]:body.feedback||(body.isCorrect?"Jawaban benar.":"Jawaban tersimpan.")}));
      setPersisted((current)=>({...current,[question.quizItemId]:true}));
      if(index<questions.length-1)navigate(index+1);else router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Jawaban gagal disimpan.");}
    finally{setBusy(false);}
  }

  return (
    <section className="assessment-runtime-grid">
      <article className="assessment-question-panel">
        <div className="question-meta"><span>{question.spatialMode} · {stimulusType}</span><code>Q{question.position}</code></div>
        <h2>{question.title}</h2><p>{question.prompt}</p>

        {required.length>0&&<div className="required-action">
          <span className={requiredComplete?"status complete":"status"}/>
          <div><strong>{requiredComplete?"Aktivitas GIS wajib selesai":"Aktivitas GIS wajib"}</strong><small>{required.join(", ")}</small></div>
        </div>}

        {stimulusType==="webgis"&&<AssessmentLeafletMap attemptId={attemptId} questionVersionId={question.questionVersionId} activityConfig={question.activityConfig} analyses={Object.values(currentResults).map((result)=>({toolId:result.toolId,title:result.title,geojson:result.geojson}))}/>}        
        {stimulusType==="image"&&<AssessmentMediaRenderer attemptId={attemptId} questionVersionId={question.questionVersionId} preferredType="image"/>}
        {stimulusType==="video"&&<AssessmentMediaRenderer attemptId={attemptId} questionVersionId={question.questionVersionId} preferredType="video"/>}

        {allowed.length>0&&<>
          <div className="runtime-tool-row">{allowed.map((tool)=>{
            const isRequired=required.includes(tool);const result=currentResults[tool];
            return <button className={done.has(tool)?"complete":""} disabled={busy} key={tool} onClick={()=>runTool(tool)} type="button" title={result?.description??(isRequired?"Wajib":"Opsional")}>{done.has(tool)?"✓ ":""}{tool} · PostGIS {isRequired?"(wajib)":"(opsional)"}</button>;
          })}</div>
          <section className={styles.resultsPanel} aria-live="polite">
            <div className={styles.resultsHeading}><div><strong>Hasil Analisis GIS</strong><span>Hasil setiap fungsi ditampilkan terpisah dan tetap terlihat di peta.</span></div><small>{Object.keys(currentResults).length}/{allowed.length} tool dijalankan</small></div>
            {Object.keys(currentResults).length===0
              ? <div className={styles.emptyResult}>Jalankan Buffer, Overlay, atau Distance untuk melihat hasil analisis di sini.</div>
              : <div className={styles.resultGrid}>{allowed.filter((tool)=>currentResults[tool]).map((tool)=>{const result=currentResults[tool];return <article className={styles.resultCard} data-tool={tool} key={tool}><div className={styles.resultCardTop}><span>{result.title}</span><em>SELESAI</em></div><strong className={styles.resultMetric}>{result.metric}</strong><p>{result.description}</p><small>{result.geojson?"Geometri hasil ditampilkan sebagai layer di peta.":"Hasil berupa nilai/summary tanpa geometri peta."}</small></article>;})}</div>}
          </section>
        </>}

        {!isSpatialResponse&&<fieldset disabled={!requiredComplete||busy}>
          <legend>Jawaban</legend>
          {options.map((option)=><label className={"answer "+(selected===option.id?"selected":"")} key={option.id}><input type="radio" name={"answer-"+question.quizItemId} checked={selected===option.id} onChange={()=>{setAnswers((current)=>({...current,[question.quizItemId]:option.id}));setPersisted((current)=>({...current,[question.quizItemId]:false}));setFeedback((current)=>({...current,[question.quizItemId]:""}));}}/><b>{option.id}</b>{option.label}</label>)}
        </fieldset>}

        {isSpatialResponse&&requiredComplete&&<AssessmentSpatialResponseMap key={question.quizItemId}
          attemptId={attemptId} questionVersionId={question.questionVersionId} quizItemId={question.quizItemId}
          responseType={responseType as "draw-point"|"draw-line"|"draw-polygon"|"feature-select"}
          initialGeometry={(savedSpatial?.geometry as never)??null} initialSelectedFeatureIds={savedSpatial?.selectedFeatureIds??[]}
          durationMs={durationMs}
          onDirtyChange={(dirty)=>{setSpatialDirty((current)=>({...current,[question.quizItemId]:dirty}));if(dirty)setPersisted((current)=>({...current,[question.quizItemId]:false}));}}
          onSaved={(value)=>{setSpatialResponses((current)=>({...current,[question.quizItemId]:value}));setSpatialDirty((current)=>({...current,[question.quizItemId]:false}));setPersisted((current)=>({...current,[question.quizItemId]:true}));}}
        />}
        {isSpatialResponse&&!requiredComplete&&<div className="runtime-media-shell">Selesaikan aktivitas GIS wajib sebelum menyimpan respons spasial.</div>}

        {feedback[question.quizItemId]&&<div className="answer-result correct"><strong>Jawaban tersimpan</strong><p>{feedback[question.quizItemId]}</p></div>}
        {isSpatialResponse&&spatialDirty[question.quizItemId]&&<div className="answer-result pending" role="status"><strong>Perubahan belum disimpan</strong><p>Simpan respons spasial sebelum melanjutkan atau submit.</p></div>}
        {isSpatialResponse&&persisted[question.quizItemId]&&!spatialDirty[question.quizItemId]&&<div className="answer-result correct"><strong>Respons spasial tersimpan</strong><p>Geometry/selection disimpan sebagai ResponseSpatialArtifact.</p></div>}
        {error&&<p className="auth-error">{error}</p>}

        <div className="runtime-question-actions">
          <button className="button button-secondary" disabled={index===0||busy} onClick={()=>navigate(Math.max(0,index-1))} type="button">← Sebelumnya</button>
          {!isSpatialResponse
            ? <button className="button" disabled={!selected||!requiredComplete||busy} onClick={saveAnswer} type="button">{index===questions.length-1?"Simpan Jawaban":"Simpan & Lanjut"}</button>
            : <button className="button" disabled={!persisted[question.quizItemId]||spatialDirty[question.quizItemId]||busy} onClick={()=>navigate(Math.min(questions.length-1,index+1))} type="button">{index===questions.length-1?"Respons tersimpan":"Lanjut →"}</button>}
        </div>
      </article>

      <aside className="assessment-runtime-sidebar">
        <div><p className="eyebrow">Respons tersimpan</p><strong>{completedCount} / {questions.length}</strong></div>
        <div className="runtime-question-nav">{questions.map((q,i)=><button className={i===index?"active":persisted[q.quizItemId]?"answered":""} onClick={()=>navigate(i)} key={q.quizItemId} type="button" aria-label={`Soal ${q.position}${persisted[q.quizItemId]?", tersimpan":""}`}>{q.position}</button>)}</div>
        <form action={"/api/assessment/attempts/"+attemptId+"/submit"} method="post" onSubmit={(event:FormEvent<HTMLFormElement>)=>{if(!window.confirm("Submit attempt sekarang? Jawaban tidak dapat diubah setelah dikirim."))event.preventDefault();}}><button className="button button-wide" disabled={!allPersisted||busy} type="submit">Submit Attempt</button></form>
        <small>{allPersisted?"Semua respons tersimpan. Attempt siap disubmit.":`${questions.length-completedCount} soal belum mempunyai respons tersimpan.`}</small>
      </aside>
    </section>
  );
}
