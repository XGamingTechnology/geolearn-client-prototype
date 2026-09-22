"use client";

import {useMemo,useState} from "react";
import type {QuizQuestionOption} from "@/server/assessment/quiz-authoring";

type ClassOption={id:string;name:string;classCode:string;status:string};
type GroupBucket={id:string;title:string;description:string|null;items:QuizQuestionOption[]};

function sample<T>(items:T[],count:number){
  const pool=[...items];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,count);
}
function toUtc(value:string){
  if(!value)return "";
  const parsed=new Date(value);
  return Number.isNaN(parsed.getTime())?"":parsed.toISOString();
}

export function GuidedAssignmentBuilder({questions,classes}:{questions:QuizQuestionOption[];classes:ClassOption[]}){
  const [step,setStep]=useState<1|2>(1);
  const [title,setTitle]=useState("");
  const [instructions,setInstructions]=useState("");
  const [selected,setSelected]=useState<string[]>([]);
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
    for(const item of questions){
      const id=item.groupId??"standalone";
      const bucket=map.get(id)??{id,title:item.groupTitle??"Standalone",description:item.groupDescription??null,items:[]};
      bucket.items.push(item);map.set(id,bucket);
    }
    const needle=query.trim().toLowerCase();
    return Array.from(map.values()).map(bucket=>({...bucket,items:bucket.items.filter(item=>{
      const haystack=`${item.title} ${item.groupTitle??""} ${item.spatialMode} ${item.stimulusType??""} ${item.responseType??""}`.toLowerCase();
      return haystack.includes(needle);
    })})).filter(bucket=>bucket.items.length>0);
  },[questions,query]);

  const selectedSet=new Set(selected);
  const toggle=(id:string,checked:boolean)=>setSelected(current=>checked?Array.from(new Set([...current,id])):current.filter(item=>item!==id));
  const selectWhole=(bucket:GroupBucket)=>setSelected(current=>Array.from(new Set([...current,...bucket.items.map(item=>item.questionVersionId)])));
  const clearGroup=(bucket:GroupBucket)=>setSelected(current=>current.filter(id=>!bucket.items.some(item=>item.questionVersionId===id)));
  const randomize=(bucket:GroupBucket)=>{
    const count=Math.min(Math.max(randomCount[bucket.id]??1,1),bucket.items.length);
    const chosen=sample(bucket.items,count).map(item=>item.questionVersionId);
    setRandomPreview(current=>({...current,[bucket.id]:chosen}));
    setSelected(current=>Array.from(new Set([...current.filter(id=>!bucket.items.some(item=>item.questionVersionId===id)),...chosen])));
  };

  const canContinue=title.trim().length>0&&selected.length>0;
  const canPublish=canContinue&&classId.length>0;
  const selectedClass=classes.find(item=>item.id===classId);

  return <form
    action="/api/assessment/guided-assignment"
    method="post"
    className="assessment-create-form"
    onSubmit={(event)=>{if(!canPublish)event.preventDefault();}}
  >
    <input type="hidden" name="title" value={title}/>
    <input type="hidden" name="instructions" value={instructions}/>
    {selected.map(id=><input key={id} type="hidden" name="questionVersionIds" value={id}/>)}
    <input type="hidden" name="opensAt" value={toUtc(opensAt)}/>
    <input type="hidden" name="closesAt" value={toUtc(closesAt)}/>

    <div className="scope-tabs" aria-label="Langkah membuat penugasan">
      <button className={step===1?"active":""} type="button" onClick={()=>setStep(1)}>1 · Pilih Soal</button>
      <button className={step===2?"active":""} type="button" disabled={!canContinue} onClick={()=>canContinue&&setStep(2)}>2 · Atur Penugasan</button>
    </div>

    {step===1&&<>
      <div className="builder-two-col">
        <label>Judul Penugasan<input required maxLength={220} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Analisis Pengaruh Sungai"/></label>
        <label>Instruksi<textarea rows={3} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Petunjuk singkat untuk siswa…"/></label>
      </div>
      <label>Cari soal<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Judul, set, spatial mode, stimulus…"/></label>
      <div className="account-alert"><strong>{selected.length} soal dipilih</strong><span> · pilihan konkret ini akan dibekukan otomatis ke QuizVersion.</span></div>
      {buckets.map(bucket=>{
        const selectedCount=bucket.items.filter(item=>selectedSet.has(item.questionVersionId)).length;
        const previewIds=new Set(randomPreview[bucket.id]??[]);
        return <details className="dashboard-panel" key={bucket.id} open>
          <summary>{bucket.title} · {selectedCount}/{bucket.items.length} dipilih</summary>
          {bucket.description&&<p>{bucket.description}</p>}
          <div className="row-actions">
            <button className="question-action" type="button" onClick={()=>selectWhole(bucket)}>Whole Group</button>
            <button className="question-action" type="button" onClick={()=>clearGroup(bucket)}>Clear</button>
            {bucket.id!=="standalone"&&<><label>Random N <input style={{width:72}} type="number" min={1} max={bucket.items.length} value={randomCount[bucket.id]??1} onChange={e=>setRandomCount(current=>({...current,[bucket.id]:Number(e.target.value)}))}/></label><button className="question-action" type="button" onClick={()=>randomize(bucket)}>Preview Random</button></>}
          </div>
          <fieldset><legend>Specific Questions</legend>{bucket.items.map(item=><label className="assessment-check" key={item.questionVersionId}><input type="checkbox" checked={selectedSet.has(item.questionVersionId)} onChange={e=>toggle(item.questionVersionId,e.target.checked)}/><span><strong>{item.title}{previewIds.has(item.questionVersionId)?" · RANDOM":""}</strong><small>v{item.versionNumber} · {item.spatialMode} · {item.stimulusType??"text"} · {item.responseType??"-"}</small></span></label>)}</fieldset>
        </details>;
      })}
      <button className="button" type="button" disabled={!canContinue} onClick={()=>setStep(2)}>Lanjut → Atur Penugasan</button>
    </>}

    {step===2&&<>
      <section className="dashboard-panel">
        <h2>Atur Penugasan</h2>
        <div className="builder-two-col">
          <label>Kelas<select name="classId" required value={classId} onChange={e=>setClassId(e.target.value)}><option value="" disabled>Pilih Kelas</option>{classes.filter(item=>item.status==="ACTIVE").map(item=><option key={item.id} value={item.id}>{item.name} · {item.classCode}</option>)}</select></label>
          <label>Result<select name="resultVisibility" value={resultVisibility} onChange={e=>setResultVisibility(e.target.value)}><option value="AFTER_SUBMIT">Setelah submit</option><option value="AFTER_CLOSE">Setelah deadline</option><option value="HIDDEN">Disembunyikan</option></select></label>
        </div>
        <div className="builder-two-col">
          <label>Buka<input type="datetime-local" value={opensAt} onChange={e=>setOpensAt(e.target.value)}/></label>
          <label>Tutup<input type="datetime-local" value={closesAt} onChange={e=>setClosesAt(e.target.value)}/></label>
        </div>
        <label>Attempt Limit<input name="attemptLimit" type="number" min={1} max={10} value={attemptLimit} onChange={e=>setAttemptLimit(Number(e.target.value))}/></label>
      </section>

      <section className="dashboard-panel">
        <h2>Ringkasan</h2>
        <p><strong>{title}</strong></p>
        <p>{selected.length} soal · {selectedClass?`${selectedClass.name} (${selectedClass.classCode})`:"kelas belum dipilih"}</p>
        <p>{opensAt||closesAt?`${opensAt||"langsung"} → ${closesAt||"tanpa batas"}`:"Tersedia langsung tanpa deadline"}</p>
        <p className="form-note">Saat dipublish, GeoLearn otomatis membuat QuizVersion immutable lalu menghubungkannya ke Assignment. Guru tidak perlu membuat QuizVersion secara terpisah.</p>
      </section>

      <div className="row-actions">
        <button className="button button-secondary" type="button" onClick={()=>setStep(1)}>← Kembali</button>
        <button className="button" type="submit" disabled={!canPublish}>Publish & Assign</button>
      </div>
    </>}
  </form>;
}
