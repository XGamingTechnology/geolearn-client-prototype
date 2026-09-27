"use client";
/* eslint-disable @next/next/no-img-element -- teacher preview uses authenticated dynamic media. */

import dynamic from "next/dynamic";
import {useEffect,useRef,useState} from "react";
import type {GeoJsonObject} from "geojson";
import type {DatasetSelection,ResponseType,StimulusType} from "@/features/questions/builder";
import {AssessmentQuestionWorkspace} from "./assessment-question-workspace";
import styles from "./teacher-student-preview.module.css";

const TeacherLiveMapPreview=dynamic(
  ()=>import("./teacher-live-map-preview").then((module)=>module.TeacherLiveMapPreview),
  {ssr:false,loading:()=><div className={styles.placeholder}>Menyiapkan preview peta siswa…</div>},
);

type Answer={id:string;label:string};
export type PreviewAnalysisResult={id:string;toolId:string;summary:string;geojson:GeoJsonObject|null};

export function TeacherStudentPreview({
  questionId,stimulus,spatialModeLabel,bindings,mapExperience,basemap,mapInteractions,allowedTools,requiredTools,responseType,answers,
  initialTitle,initialPrompt,mediaSource,mediaCaption,
}: {
  questionId?:string;
  stimulus:StimulusType;
  spatialModeLabel:string;
  bindings:DatasetSelection[];
  mapExperience:string;
  basemap?:string;
  mapInteractions:string[];
  allowedTools:string[];
  requiredTools:string[];
  responseType:ResponseType;
  answers:Answer[];
  initialTitle?:string;
  initialPrompt?:string;
  mediaSource?:string|null;
  mediaCaption?:string;
}){
  const root=useRef<HTMLElement|null>(null);
  const [title,setTitle]=useState(initialTitle??"");
  const [prompt,setPrompt]=useState(initialPrompt??"");
  const [selected,setSelected]=useState("");
  const [running,setRunning]=useState<string|null>(null);
  const [analysisError,setAnalysisError]=useState("");
  const [analysisResults,setAnalysisResults]=useState<PreviewAnalysisResult[]>([]);

  async function runTool(toolId:string){
    if(!questionId)return;
    setRunning(toolId);setAnalysisError("");
    try{
      const response=await fetch(`/api/content/questions/${questionId}/preview/gis/execute`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({toolId})});
      const body=await response.json() as {error?:string;geojson?:GeoJsonObject|null;featureCount?:number;intersectionCount?:number;distanceMeters?:number|null};
      if(!response.ok)throw new Error(body.error??"Analisis preview gagal dijalankan.");
      const summary=toolId==="buffer"?`${body.featureCount??0} feature · ${body.distanceMeters??0} meter`:toolId==="overlay"?`${body.intersectionCount??0} irisan`:body.distanceMeters===null?"Tidak ada pasangan feature":`${Math.round(body.distanceMeters??0).toLocaleString("id-ID")} meter`;
      setAnalysisResults((current)=>[...current,{id:`${toolId}-${Date.now()}`,toolId,summary,geojson:body.geojson??null}]);
    }catch(reason){setAnalysisError(reason instanceof Error?reason.message:"Analisis preview gagal dijalankan.");}
    finally{setRunning(null);}
  }

  useEffect(()=>{
    const form=root.current?.closest("form");
    if(!form)return;
    const sync=()=>{
      const titleInput=form.querySelector<HTMLInputElement>('input[name="title"]');
      const promptInput=form.querySelector<HTMLTextAreaElement>('textarea[name="prompt"]');
      setTitle(titleInput?.value??initialTitle??"");
      setPrompt(promptInput?.value??initialPrompt??"");
    };
    sync();
    form.addEventListener("input",sync);
    form.addEventListener("change",sync);
    return()=>{form.removeEventListener("input",sync);form.removeEventListener("change",sync);};
  },[initialPrompt,initialTitle]);

  const activityConfig={mapExperience,basemap:basemap??"street",interactions:mapInteractions};
  const filledAnswers=answers.filter((answer)=>answer.label.trim());
  const question=<section className={styles.question}>
    <span className={styles.liveBadge}>Live preview</span>
    <strong>{title.trim()||"Judul soal akan tampil di sini"}</strong>
    <p>{prompt.trim()||"Prompt siswa mengikuti isi pada langkah Pertanyaan."}</p>
  </section>;
  const tools=allowedTools.length>0?<div className={styles.qa} aria-label="Analisis GIS tersedia"><div className={styles.tools}>{allowedTools.map((tool)=><button className={`${styles.tool} ${requiredTools.includes(tool)?styles.required:""}`} disabled={!questionId||Boolean(running)} type="button" key={tool} onClick={()=>runTool(tool)}>Jalankan {tool[0].toUpperCase()+tool.slice(1)}<small>{requiredTools.includes(tool)?"wajib":"opsional"}{running===tool?" · menjalankan…":""}</small></button>)}</div>{!questionId&&<p className={styles.qaNotice}>Simpan Draft terlebih dahulu untuk menguji analisis PostGIS.</p>}{analysisError&&<p className={styles.qaError} role="alert">{analysisError}</p>}{analysisResults.length>0&&<div className={styles.resultList}>{analysisResults.map((result)=><span key={result.id}><b>{result.toolId}</b> · {result.summary}</span>)}<button type="button" onClick={()=>{setAnalysisResults([]);setAnalysisError("");}}>Reset hasil preview</button></div>}</div>:null;
  const response=<section className={styles.question} aria-label="Preview respons">
    {responseType==="multiple-choice"?<div className={styles.answers}>{filledAnswers.length?filledAnswers.map((answer)=><button className={`${styles.answer} ${selected===answer.id?styles.answerSelected:""}`} type="button" key={answer.id} onClick={()=>setSelected(answer.id)}><b>{answer.id}</b><span>{answer.label}</span></button>):<p className={styles.readOnly}>Tambahkan pilihan jawaban untuk melihat tampilan siswa.</p>}</div>:<div className={styles.spatialAnswer}>Respons spasial: {responseType.replaceAll("-"," ")}</div>}
  </section>;

  return <article className={styles.card} ref={root}>
    <div className={styles.top}><span>{stimulus.toUpperCase()} · PREVIEW SISWA</span><em>{spatialModeLabel}</em></div>
    <div className={styles.body}>
      {stimulus==="webgis"&&<AssessmentQuestionWorkspace className={styles.spatialWorkspace} context={question} activity={tools} response={response} stimulus={<TeacherLiveMapPreview bindings={bindings} activityConfig={activityConfig} analysisResults={analysisResults}/>} status={<p className={styles.readOnly}>Preview sandbox guru · tidak membuat Response, Attempt, GIS Activity, atau data penilaian.</p>}/>}
      {stimulus==="image"&&(mediaSource?<figure className={styles.media}><img src={mediaSource} alt="Preview stimulus"/>{mediaCaption&&<figcaption>{mediaCaption}</figcaption>}</figure>:<div className={styles.placeholder}>Pilih gambar dari Bank Media untuk melihat stimulus sebenarnya.</div>)}
      {stimulus==="video"&&(mediaSource?<figure className={styles.media}><video src={mediaSource} controls preload="metadata"/>{mediaCaption&&<figcaption>{mediaCaption}</figcaption>}</figure>:<div className={styles.placeholder}>Pilih video dari Bank Media untuk melihat stimulus sebenarnya.</div>)}
      {stimulus==="text"&&<div className={styles.placeholder}>Soal ini menggunakan stimulus teks. Siswa langsung membaca pertanyaan di bawah.</div>}

      {stimulus!=="webgis"&&<>{question}{response}<p className={styles.readOnly}>Preview ini adalah sandbox guru. Pilihan jawaban tidak membuat Response, Attempt, atau GIS Activity.</p></>}
    </div>
  </article>;
}
