"use client";

import {useMemo,useState} from "react";
import type {QuizQuestionOption} from "@/server/assessment/quiz-authoring";

type ClassOption={id:string;name:string;classCode:string;status:string};
type GroupBucket={id:string;title:string;description:string|null;items:QuizQuestionOption[]};

function sample<T>(items:T[],count:number){const pool=[...items];for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}return pool.slice(0,count);}
function toUtc(value:string){if(!value)return "";const parsed=new Date(value);return Number.isNaN(parsed.getTime())?"":parsed.toISOString();}
function modeLabel(mode:string){return ({location:"Location",condition:"Condition",influence:"Influence",region:"Region",hierarchy:"Hierarchy",analogy:"Analogies",pattern:"Pattern",association:"Association"} as Record<string,string>)[mode]??mode;}

export function GuidedAssignmentBuilder({questions,classes,initialSelected=[]}:{questions:QuizQuestionOption[];classes:ClassOption[];initialSelected?:string[]}){
  const validIds=useMemo(()=>new Set(questions.map(item=>item.questionVersionId)),[questions]);
  const [step,setStep]=useState<1|2|3>(initialSelected.length?2:1);
  const [title,setTitle]=useState("");
  const [instructions,setInstructions]=useState("");
  const [selected,setSelected]=useState<string[]>(()=>[...new Set(initialSelected.filter(id=>validIds.has(id)))]);
  const [query,setQuery]=useState("");
  const [randomCount,setRandomCount]=useState<Record<string,number>>({});
  const [randomPreview,setRandomPreview]=useState<Record<string,string[]>>({});
  const [classId,setClassId]=useState("");
  const [opensAt,setOpensAt]=useState("");
  const [closesAt,setClosesAt]=useState("");
  const [attemptLimit,setAttemptLimit]=useState(1);
  const [resultVisibility,setResultVisibility]=useState("AFTER_SUBMIT");

  const buckets=useMemo(()=>{
    const map=new Map<string,GroupBucket>();
    for(const item of questions){const id=item.groupId??"standalone";const bucket=map.get(id)??{id,title:item.groupTitle??"Tanpa Kelompok",description:item.groupDescription??null,items:[]};bucket.items.push(item);map.set(id,bucket);}
    const needle=query.trim().toLowerCase();
    return Array.from(map.values()).map(bucket=>({...bucket,items:bucket.items.filter(item=>`${item.title} ${item.groupTitle??""} ${item.spatialMode} ${item.stimulusType??""} ${item.responseType??""}`.toLowerCase().includes(needle))})).filter(bucket=>bucket.items.length>0);
  },[questions,query]);
  const selectedSet=new Set(selected);
  const selectedItems=questions.filter(item=>selectedSet.has(item.questionVersionId));
  const selectedClass=classes.find(item=>item.id===classId);
  const modeCounts=selectedItems.reduce<Record<string,number>>((acc,item)=>{acc[item.spatialMode]=(acc[item.spatialMode]??0)+1;return acc;},{});
  const toggle=(id:string,checked:boolean)=>setSelected(current=>checked?Array.from(new Set([...current,id])):current.filter(item=>item!==id));
  const selectWhole=(bucket:GroupBucket)=>setSelected(current=>Array.from(new Set([...current,...bucket.items.map(item=>item.questionVersionId)])));
  const clearGroup=(bucket:GroupBucket)=>setSelected(current=>current.filter(id=>!bucket.items.some(item=>item.questionVersionId===id)));
  const randomize=(bucket:GroupBucket)=>{const count=Math.min(Math.max(randomCount[bucket.id]??1,1),bucket.items.length);const chosen=sample(bucket.items,count).map(item=>item.questionVersionId);setRandomPreview(current=>({...current,[bucket.id]:chosen}));setSelected(current=>Array.from(new Set([...current.filter(id=>!bucket.items.some(item=>item.questionVersionId===id)),...chosen])));};
  const canContinue=selected.length>0;
  const canReview=canContinue&&title.trim().length>0&&classId.length>0;
  const canPublish=canReview;

  return <form action="/api/assessment/guided-assignment" method="post" className="assessment-create-form" onSubmit={(event)=>{if(!canPublish)event.preventDefault();}}>
    <input type="hidden" name="title" value={title}/><input type="hidden" name="instructions" value={instructions}/>{selected.map(id=><input key={id} type="hidden" name="questionVersionIds" value={id}/>)}<input type="hidden" name="opensAt" value={toUtc(opensAt)}/><input type="hidden" name="closesAt" value={toUtc(closesAt)}/>

    <div className="scope-tabs" aria-label="Langkah membuat penugasan">
      <button className={step===1?"active":""} type="button" onClick={()=>setStep(1)}>1 · Soal</button>
      <button className={step===2?"active":""} type="button" disabled={!canContinue} onClick={()=>canContinue&&setStep(2)}>2 · Pengaturan</button>
      <button className={step===3?"active":""} type="button" disabled={!canReview} onClick={()=>canReview&&setStep(3)}>3 · Review & Publish</button>
    </div>

    {step===1&&<>
      <label>Cari soal<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Judul, Spatial Thinking, stimulus…"/></label>
      <div className="account-alert"><strong>{selected.length} soal dipilih</strong><span> · hanya QuestionVersion published yang tersedia untuk penugasan.</span></div>
      {buckets.map(bucket=>{const selectedCount=bucket.items.filter(item=>selectedSet.has(item.questionVersionId)).length;const previewIds=new Set(randomPreview[bucket.id]??[]);return <details className="dashboard-panel" key={bucket.id} open>
        <summary>{bucket.title} · {selectedCount}/{bucket.items.length} dipilih</summary>
        {bucket.description&&<p>{bucket.description}</p>}
        <div className="row-actions"><button className="question-action" type="button" onClick={()=>selectWhole(bucket)}>Pilih semua</button><button className="question-action" type="button" onClick={()=>clearGroup(bucket)}>Kosongkan</button>{bucket.id!=="standalone"&&<><label>Ambil acak <input style={{width:72}} type="number" min={1} max={bucket.items.length} value={randomCount[bucket.id]??1} onChange={e=>setRandomCount(current=>({...current,[bucket.id]:Number(e.target.value)}))}/></label><button className="question-action" type="button" onClick={()=>randomize(bucket)}>Pilih acak</button></>}</div>
        <fieldset><legend>Daftar Soal</legend>{bucket.items.map(item=><label className="assessment-check" key={item.questionVersionId}><input type="checkbox" checked={selectedSet.has(item.questionVersionId)} onChange={e=>toggle(item.questionVersionId,e.target.checked)}/><span><strong>{item.title}{previewIds.has(item.questionVersionId)?" · ACAK":""}</strong><small>v{item.versionNumber} · {modeLabel(item.spatialMode)} · {item.stimulusType??"text"} · {item.responseType??"-"}</small></span></label>)}</fieldset>
      </details>;})}
      <button className="button" type="button" disabled={!canContinue} onClick={()=>setStep(2)}>Lanjut → Pengaturan</button>
    </>}

    {step===2&&<>
      <section className="dashboard-panel">
        <h2>Atur Penugasan</h2>
        <div className="builder-two-col"><label>Judul Penugasan<input required maxLength={220} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Analisis Spatial Thinking"/></label><label>Kelas<select name="classId" required value={classId} onChange={e=>setClassId(e.target.value)}><option value="" disabled>Pilih Kelas</option>{classes.filter(item=>item.status==="ACTIVE").map(item=><option key={item.id} value={item.id}>{item.name} · {item.classCode}</option>)}</select></label></div>
        <label>Instruksi<textarea rows={3} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Petunjuk singkat untuk siswa…"/></label>
        <div className="builder-two-col"><label>Dibuka<input type="datetime-local" value={opensAt} onChange={e=>setOpensAt(e.target.value)}/></label><label>Deadline<input type="datetime-local" value={closesAt} onChange={e=>setClosesAt(e.target.value)}/></label></div>
        <div className="builder-two-col"><label>Batas Percobaan<input name="attemptLimit" type="number" min={1} max={10} value={attemptLimit} onChange={e=>setAttemptLimit(Number(e.target.value))}/></label><label>Hasil Siswa<select name="resultVisibility" value={resultVisibility} onChange={e=>setResultVisibility(e.target.value)}><option value="AFTER_SUBMIT">Setelah submit</option><option value="AFTER_CLOSE">Setelah deadline</option><option value="HIDDEN">Jangan tampilkan</option></select></label></div>
      </section>
      <div className="row-actions"><button className="button button-secondary" type="button" onClick={()=>setStep(1)}>← Kembali</button><button className="button" type="button" disabled={!canReview} onClick={()=>setStep(3)}>Lanjut → Review</button></div>
    </>}

    {step===3&&<>
      <section className="dashboard-panel">
        <div className="panel-heading"><div><p className="eyebrow">Review Sebelum Publish</p><h2>{title||"Penugasan baru"}</h2><p>{selectedClass?`${selectedClass.name} (${selectedClass.classCode})`:"Kelas belum dipilih"}</p></div><span className="status-pill">{selected.length} SOAL</span></div>
        <div className="assignment-summary-grid"><article><small>Soal</small><strong>{selected.length}</strong><span>QuestionVersion published</span></article><article><small>Attempt</small><strong>{attemptLimit}</strong><span>batas percobaan</span></article><article><small>Dibuka</small><strong>{opensAt?"Terjadwal":"Langsung"}</strong><span>{opensAt||"setelah publish"}</span></article><article><small>Deadline</small><strong>{closesAt?"Ada":"Tanpa batas"}</strong><span>{closesAt||"-"}</span></article></div>
        <div className="question-analytics-grid">{Object.entries(modeCounts).map(([mode,count])=><article key={mode}><div className="question-tags"><span>Spatial Thinking</span></div><h3>{modeLabel(mode)}</h3><div className="question-analytics-metrics"><span><b>{count}</b><small>soal</small></span></div></article>)}</div>
        {instructions&&<div className="account-alert"><strong>Instruksi siswa</strong><span> · {instructions}</span></div>}
        <div className="dashboard-panel"><p className="eyebrow">Preview Pengalaman Siswa</p><h3>{selectedItems[0]?.title??"Belum ada soal"}</h3><p className="form-note">Preview ini memeriksa susunan tugas sebelum publish. Setelah dipublish, siswa akan membuka setiap soal dalam Spatial Question Workspace yang sama dengan QuestionVersion terpilih.</p>{selectedItems.slice(0,5).map((item,index)=><p key={item.questionVersionId}><strong>{index+1}. {item.title}</strong> · {modeLabel(item.spatialMode)} · {item.stimulusType??"text"}</p>)}{selectedItems.length>5&&<p>+ {selectedItems.length-5} soal lainnya</p>}</div>
        <p className="form-note">Saat dipublish, versi soal yang dipilih dibekukan ke penugasan sehingga perubahan Bank Soal berikutnya tidak mengubah tugas siswa yang sudah berjalan.</p>
      </section>
      <div className="row-actions"><button className="button button-secondary" type="button" onClick={()=>setStep(2)}>← Kembali</button><button className="button" type="submit" disabled={!canPublish}>Publish & Assign</button></div>
    </>}
  </form>;
}
