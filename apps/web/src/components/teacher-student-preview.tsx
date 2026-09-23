"use client";
/* eslint-disable @next/next/no-img-element -- teacher preview uses authenticated dynamic media. */

import dynamic from "next/dynamic";
import {useEffect,useRef,useState} from "react";
import type {DatasetSelection,ResponseType,StimulusType} from "@/features/questions/builder";
import styles from "./teacher-student-preview.module.css";

const TeacherLiveMapPreview=dynamic(
  ()=>import("./teacher-live-map-preview").then((module)=>module.TeacherLiveMapPreview),
  {ssr:false,loading:()=><div className={styles.placeholder}>Menyiapkan preview peta siswa…</div>},
);

type Answer={id:string;label:string};

export function TeacherStudentPreview({
  stimulus,spatialModeLabel,bindings,mapExperience,mapInteractions,allowedTools,requiredTools,responseType,answers,
  initialTitle,initialPrompt,mediaSource,mediaCaption,
}:{
  stimulus:StimulusType;
  spatialModeLabel:string;
  bindings:DatasetSelection[];
  mapExperience:string;
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

  const activityConfig={mapExperience,interactions:mapInteractions};
  const filledAnswers=answers.filter((answer)=>answer.label.trim());

  return <article className={styles.card} ref={root}>
    <div className={styles.top}><span>{stimulus.toUpperCase()} · PREVIEW SISWA</span><em>{spatialModeLabel}</em></div>
    <div className={styles.body}>
      <span className={styles.liveBadge}>Live preview</span>

      {stimulus==="webgis"&&<TeacherLiveMapPreview bindings={bindings} activityConfig={activityConfig}/>} 
      {stimulus==="image"&&(mediaSource?<figure className={styles.media}><img src={mediaSource} alt="Preview stimulus"/>{mediaCaption&&<figcaption>{mediaCaption}</figcaption>}</figure>:<div className={styles.placeholder}>Pilih gambar dari Bank Media untuk melihat stimulus sebenarnya.</div>)}
      {stimulus==="video"&&(mediaSource?<figure className={styles.media}><video src={mediaSource} controls preload="metadata"/>{mediaCaption&&<figcaption>{mediaCaption}</figcaption>}</figure>:<div className={styles.placeholder}>Pilih video dari Bank Media untuk melihat stimulus sebenarnya.</div>)}
      {stimulus==="text"&&<div className={styles.placeholder}>Soal ini menggunakan stimulus teks. Siswa langsung membaca pertanyaan di bawah.</div>}

      {stimulus==="webgis"&&allowedTools.length>0&&<div className={styles.tools} aria-label="Analisis GIS tersedia">{allowedTools.map((tool)=><span className={`${styles.tool} ${requiredTools.includes(tool)?styles.required:""}`} key={tool}>{tool.toUpperCase()}<small>{requiredTools.includes(tool)?"wajib":"opsional"}</small></span>)}</div>}

      <section className={styles.question}>
        <strong>{title.trim()||"Judul soal akan tampil di sini"}</strong>
        <p>{prompt.trim()||"Prompt siswa mengikuti isi pada langkah Pertanyaan."}</p>
        {responseType==="multiple-choice"?<div className={styles.answers}>{filledAnswers.length?filledAnswers.map((answer)=><button className={`${styles.answer} ${selected===answer.id?styles.answerSelected:""}`} type="button" key={answer.id} onClick={()=>setSelected(answer.id)}><b>{answer.id}</b><span>{answer.label}</span></button>):<p className={styles.readOnly}>Tambahkan pilihan jawaban untuk melihat tampilan siswa.</p>}</div>:<div className={styles.spatialAnswer}>Respons spasial: {responseType.replaceAll("-"," ")}</div>}
      </section>
      <p className={styles.readOnly}>Preview ini adalah sandbox guru. Pilihan jawaban dan interaksi peta tidak membuat Response, Attempt, atau GIS Activity.</p>
    </div>
  </article>;
}
