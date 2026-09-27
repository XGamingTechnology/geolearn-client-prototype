"use client";

import {useMemo,useState} from "react";
import type {QuizQuestionOption} from "@/server/assessment/quiz-authoring";
import styles from "./guided-assignment-builder.module.css";

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

  const steps=[{number:1,label:"Soal",hint:"Pilih materi"},{number:2,label:"Pengaturan",hint:"Kelas & jadwal"},{number:3,label:"Review & Publish",hint:"Periksa & bagikan"}] as const;

  return <form action="/api/assessment/guided-assignment" method="post" className={`${styles.form} assessment-create-form`} onSubmit={(event)=>{if(!canPublish)event.preventDefault();}}>
    <input type="hidden" name="title" value={title}/><input type="hidden" name="instructions" value={instructions}/>{selected.map(id=><input key={id} type="hidden" name="questionVersionIds" value={id}/>)}<input type="hidden" name="opensAt" value={toUtc(opensAt)}/><input type="hidden" name="closesAt" value={toUtc(closesAt)}/>

    <nav className={styles.stepper} aria-label="Langkah membuat penugasan">
      {steps.map(item=>{const completed=step>item.number;const available=item.number===1||(item.number===2?canContinue:canReview);return <button key={item.number} className={`${styles.step} ${step===item.number?styles.active:""} ${completed?styles.completed:""}`} type="button" disabled={!available} aria-current={step===item.number?"step":undefined} onClick={()=>available&&setStep(item.number)}><span className={styles.stepNumber}>{completed?"✓":item.number}</span><span><strong>{item.label}</strong><small>{item.hint}</small></span></button>;})}
    </nav>

    {step===1&&<div className={styles.selectionLayout}>
      <div className={styles.questionBrowser}>
        <div className={styles.searchBlock}><label htmlFor="assignment-question-search">Cari soal</label><div className={styles.searchBox}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="m16 16 4 4"/></svg><input id="assignment-question-search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Cari judul, kelompok, atau tipe soal…"/><span>{buckets.reduce((sum,bucket)=>sum+bucket.items.length,0)} hasil</span></div></div>
        <div className={styles.infoBar}><span className={styles.infoIcon}>i</span><div><strong>{selected.length} soal dipilih</strong><p>Hanya versi soal yang sudah dipublikasikan yang tersedia untuk penugasan.</p></div></div>
        <div className={styles.groupList}>
          {buckets.map(bucket=>{const selectedCount=bucket.items.filter(item=>selectedSet.has(item.questionVersionId)).length;const previewIds=new Set(randomPreview[bucket.id]??[]);return <details className={styles.groupCard} key={bucket.id} open>
            <summary><span className={styles.chevron}>›</span><span className={styles.groupTitle}><strong>{bucket.title}</strong><small>{bucket.description??`${bucket.items.length} soal terpublikasi dalam kelompok ini`}</small></span><span className={selectedCount?styles.countBadgeActive:styles.countBadge}>{selectedCount}/{bucket.items.length} dipilih</span></summary>
            <div className={styles.groupBody}>
              <div className={styles.groupActions}><div><button type="button" onClick={()=>selectWhole(bucket)}>Pilih semua</button><button type="button" onClick={()=>clearGroup(bucket)} disabled={!selectedCount}>Kosongkan</button></div>{bucket.id!=="standalone"&&<div className={styles.randomControl}><label htmlFor={`random-${bucket.id}`}>Ambil acak</label><input id={`random-${bucket.id}`} type="number" min={1} max={bucket.items.length} value={randomCount[bucket.id]??1} onChange={e=>setRandomCount(current=>({...current,[bucket.id]:Number(e.target.value)}))}/><span>dari {bucket.items.length}</span><button type="button" onClick={()=>randomize(bucket)}>Terapkan</button></div>}</div>
              <fieldset className={styles.questionList}><legend className={styles.srOnly}>Daftar soal {bucket.title}</legend>{bucket.items.map(item=>{const checked=selectedSet.has(item.questionVersionId);return <label className={`${styles.questionRow} ${checked?styles.questionSelected:""}`} key={item.questionVersionId}><span className={styles.checkboxArea}><input type="checkbox" checked={checked} onChange={e=>toggle(item.questionVersionId,e.target.checked)}/><span className={styles.customCheck} aria-hidden="true">✓</span></span><span className={styles.questionContent}><span className={styles.questionTitle}>{item.title}{previewIds.has(item.questionVersionId)&&<em>Terpilih acak</em>}</span><span className={styles.metaChips}><span>v{item.versionNumber}</span><span>{modeLabel(item.spatialMode)}</span><span>{item.stimulusType??"text"}</span><span>{item.responseType??"-"}</span></span></span></label>;})}</fieldset>
            </div>
          </details>;})}
          {!buckets.length&&<div className={styles.emptySearch}><strong>Tidak ada soal yang cocok.</strong><span>Coba gunakan kata kunci yang lebih umum.</span></div>}
        </div>
      </div>
      <aside className={styles.selectionSummary} aria-label="Ringkasan pilihan soal"><p className={styles.summaryEyebrow}>Ringkasan Pilihan</p><div className={styles.totalSelected}><strong>{selected.length}</strong><span>soal dipilih</span></div><div className={styles.summaryDivider}/><h3>Spatial Thinking</h3>{Object.keys(modeCounts).length?<div className={styles.breakdown}>{Object.entries(modeCounts).map(([mode,count])=><div key={mode}><span>{modeLabel(mode)}</span><strong>{count}</strong></div>)}</div>:<p className={styles.summaryEmpty}>Pilih soal untuk melihat komposisi kemampuan spatial thinking.</p>}<button className={styles.continueButton} type="button" disabled={!canContinue} onClick={()=>setStep(2)}>Lanjut ke Pengaturan <span>→</span></button><small className={styles.selectionHint}>{canContinue?"Pilihan dapat diubah kembali sebelum publish.":"Pilih minimal satu soal untuk melanjutkan."}</small></aside>
    </div>}

    {step===2&&<>
      <section className={styles.settingsCard}>
        <div className={styles.sectionHeading}><span>2</span><div><h2>Atur penugasan</h2><p>Tentukan identitas tugas, kelas tujuan, dan waktu pengerjaan siswa.</p></div></div>
        <div className="builder-two-col"><label>Judul Penugasan<input required maxLength={220} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Analisis Spatial Thinking"/></label><label>Kelas<select name="classId" required value={classId} onChange={e=>setClassId(e.target.value)}><option value="" disabled>Pilih Kelas</option>{classes.filter(item=>item.status==="ACTIVE").map(item=><option key={item.id} value={item.id}>{item.name} · {item.classCode}</option>)}</select></label></div>
        <label>Instruksi<textarea rows={3} value={instructions} onChange={e=>setInstructions(e.target.value)} placeholder="Petunjuk singkat untuk siswa…"/></label>
        <div className="builder-two-col"><label>Dibuka<input type="datetime-local" value={opensAt} onChange={e=>setOpensAt(e.target.value)}/></label><label>Deadline<input type="datetime-local" value={closesAt} onChange={e=>setClosesAt(e.target.value)}/></label></div>
        <div className="builder-two-col"><label>Batas Percobaan<input name="attemptLimit" type="number" min={1} max={10} value={attemptLimit} onChange={e=>setAttemptLimit(Number(e.target.value))}/></label><label>Hasil Siswa<select name="resultVisibility" value={resultVisibility} onChange={e=>setResultVisibility(e.target.value)}><option value="AFTER_SUBMIT">Setelah submit</option><option value="AFTER_CLOSE">Setelah deadline</option><option value="HIDDEN">Jangan tampilkan</option></select></label></div>
      </section>
      <div className={styles.footerActions}><button className="button button-secondary" type="button" onClick={()=>setStep(1)}>← Kembali</button><button className="button" type="button" disabled={!canReview} onClick={()=>setStep(3)}>Lanjut ke Review →</button></div>
    </>}

    {step===3&&<>
      <section className={styles.settingsCard}>
        <div className="panel-heading"><div><p className="eyebrow">Review Sebelum Publish</p><h2>{title||"Penugasan baru"}</h2><p>{selectedClass?`${selectedClass.name} (${selectedClass.classCode})`:"Kelas belum dipilih"}</p></div><span className="status-pill">{selected.length} SOAL</span></div>
        <div className="assignment-summary-grid"><article><small>Soal</small><strong>{selected.length}</strong><span>QuestionVersion published</span></article><article><small>Attempt</small><strong>{attemptLimit}</strong><span>batas percobaan</span></article><article><small>Dibuka</small><strong>{opensAt?"Terjadwal":"Langsung"}</strong><span>{opensAt||"setelah publish"}</span></article><article><small>Deadline</small><strong>{closesAt?"Ada":"Tanpa batas"}</strong><span>{closesAt||"-"}</span></article></div>
        <div className="question-analytics-grid">{Object.entries(modeCounts).map(([mode,count])=><article key={mode}><div className="question-tags"><span>Spatial Thinking</span></div><h3>{modeLabel(mode)}</h3><div className="question-analytics-metrics"><span><b>{count}</b><small>soal</small></span></div></article>)}</div>
        {instructions&&<div className="account-alert"><strong>Instruksi siswa</strong><span> · {instructions}</span></div>}
        <div className="dashboard-panel"><p className="eyebrow">Preview Pengalaman Siswa</p><h3>{selectedItems[0]?.title??"Belum ada soal"}</h3><p className="form-note">Preview ini memeriksa susunan tugas sebelum publish. Setelah dipublish, siswa akan membuka setiap soal dalam Spatial Question Workspace yang sama dengan QuestionVersion terpilih.</p>{selectedItems.slice(0,5).map((item,index)=><p key={item.questionVersionId}><strong>{index+1}. {item.title}</strong> · {modeLabel(item.spatialMode)} · {item.stimulusType??"text"}</p>)}{selectedItems.length>5&&<p>+ {selectedItems.length-5} soal lainnya</p>}</div>
        <p className="form-note">Saat dipublish, versi soal yang dipilih dibekukan ke penugasan sehingga perubahan Bank Soal berikutnya tidak mengubah tugas siswa yang sudah berjalan.</p>
      </section>
      <div className={styles.footerActions}><button className="button button-secondary" type="button" onClick={()=>setStep(2)}>← Kembali</button><button className="button" type="submit" disabled={!canPublish}>Publish & Assign</button></div>
    </>}
  </form>;
}
