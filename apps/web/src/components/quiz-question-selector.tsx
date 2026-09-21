"use client";

import {useMemo,useState} from "react";
import type {QuizQuestionOption} from "@/server/assessment/quiz-authoring";

type GroupBucket={id:string;title:string;description:string|null;items:QuizQuestionOption[]};

function sample<T>(items:T[],count:number){
  const pool=[...items];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  return pool.slice(0,count);
}

export function QuizQuestionSelector({questions}:{questions:QuizQuestionOption[]}){
  const [selected,setSelected]=useState<string[]>([]);
  const [query,setQuery]=useState("");
  const [randomCount,setRandomCount]=useState<Record<string,number>>({});
  const [randomPreview,setRandomPreview]=useState<Record<string,string[]>>({});

  const allBuckets=useMemo(()=>{
    const map=new Map<string,GroupBucket>();
    for(const item of questions){
      const id=item.groupId??"standalone";
      const bucket=map.get(id)??{id,title:item.groupTitle??"Standalone",description:item.groupDescription??null,items:[]};
      bucket.items.push(item);map.set(id,bucket);
    }
    return Array.from(map.values());
  },[questions]);

  const buckets=useMemo(()=>{
    const needle=query.trim().toLowerCase();
    if(!needle)return allBuckets;
    return allBuckets.map(bucket=>({...bucket,items:bucket.items.filter(item=>{
      const haystack=`${bucket.title} ${bucket.description??""} ${item.title} ${item.spatialMode} ${item.stimulusType??""} ${item.responseType??""}`.toLowerCase();
      return haystack.includes(needle);
    })})).filter(bucket=>bucket.items.length>0);
  },[allBuckets,query]);

  const selectedSet=new Set(selected);
  const fullBucket=(id:string)=>allBuckets.find(bucket=>bucket.id===id)!;
  const toggle=(id:string,checked:boolean)=>setSelected(current=>checked?Array.from(new Set([...current,id])):current.filter(item=>item!==id));
  const selectWhole=(bucketId:string)=>{const bucket=fullBucket(bucketId);setSelected(current=>Array.from(new Set([...current,...bucket.items.map(item=>item.questionVersionId)])));};
  const clearGroup=(bucketId:string)=>{const bucket=fullBucket(bucketId);setSelected(current=>current.filter(id=>!bucket.items.some(item=>item.questionVersionId===id)));setRandomPreview(current=>({...current,[bucketId]:[]}));};
  const randomize=(bucketId:string)=>{
    const bucket=fullBucket(bucketId);
    const count=Math.min(Math.max(randomCount[bucket.id]??1,1),bucket.items.length);
    const chosen=sample(bucket.items,count).map(item=>item.questionVersionId);
    setRandomPreview(current=>({...current,[bucket.id]:chosen}));
    setSelected(current=>Array.from(new Set([...current.filter(id=>!bucket.items.some(item=>item.questionVersionId===id)),...chosen])));
  };

  return <div className="assessment-create-form">
    {selected.map(id=><input type="hidden" name="questionVersionIds" value={id} key={id}/>)}
    <label>Cari soal<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Judul, set, spatial mode, stimulus…"/></label>
    <div className="account-alert"><strong>{selected.length} soal dipilih</strong><span> · pilihan konkret ini yang akan dibekukan ke QuizVersion.</span></div>
    {buckets.map(bucket=>{
      const source=fullBucket(bucket.id);
      const selectedCount=source.items.filter(item=>selectedSet.has(item.questionVersionId)).length;
      const previewIds=new Set(randomPreview[bucket.id]??[]);
      return <details className="dashboard-panel" key={bucket.id} open>
        <summary>{bucket.title} · {selectedCount}/{source.items.length} dipilih</summary>
        {bucket.description&&<p>{bucket.description}</p>}
        <div className="row-actions">
          <button className="question-action" type="button" onClick={()=>selectWhole(bucket.id)}>Whole Group</button>
          <button className="question-action" type="button" onClick={()=>clearGroup(bucket.id)}>Clear</button>
          {bucket.id!=="standalone"&&<><label>Random N <input style={{width:72}} type="number" min={1} max={source.items.length} value={randomCount[bucket.id]??1} onChange={e=>setRandomCount(current=>({...current,[bucket.id]:Number(e.target.value)}))}/></label><button className="question-action" type="button" onClick={()=>randomize(bucket.id)}>Preview Random</button></>}
        </div>
        {bucket.id!=="standalone"&&previewIds.size>0&&<p className="form-note">Random preview sudah di-resolve sekarang. Jika quiz dipublish, QuestionVersion terpilih ini yang dibekukan; tidak diacak ulang per siswa.</p>}
        <fieldset><legend>Specific Questions</legend>{bucket.items.map(item=><label className="assessment-check" key={item.questionVersionId}><input type="checkbox" checked={selectedSet.has(item.questionVersionId)} onChange={e=>toggle(item.questionVersionId,e.target.checked)}/><span><strong>{item.title}{previewIds.has(item.questionVersionId)?" · RANDOM":""}</strong><small>v{item.versionNumber} · {item.spatialMode} · {item.stimulusType??"text"} · {item.responseType??"-"}</small></span></label>)}</fieldset>
      </details>;
    })}
    {!buckets.length&&<p>Tidak ada soal published yang cocok.</p>}
  </div>;
}
