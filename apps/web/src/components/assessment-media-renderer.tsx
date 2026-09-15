"use client";
/* eslint-disable @next/next/no-img-element -- MediaAsset URLs are user-managed and may use arbitrary approved storage hosts. */

import { useEffect, useState } from "react";

type MediaBinding={
  id:string;
  mediaAssetId:string;
  title:string;
  mediaType:"IMAGE"|"VIDEO"|"DOCUMENT"|"ILLUSTRATION";
  storageKey:string|null;
  mimeType:string|null;
  role:"STIMULUS"|"SUPPORTING";
  position:number;
  altText:string|null;
  caption:string|null;
};

function usableSource(value:string|null){
  if(!value)return null;
  if(value.startsWith("/")||value.startsWith("https://")||value.startsWith("http://"))return value;
  return null;
}

export function AssessmentMediaRenderer({
  attemptId,
  questionVersionId,
  preferredType,
}:{
  attemptId:string;
  questionVersionId:string;
  preferredType:"image"|"video";
}){
  const [media,setMedia]=useState<MediaBinding[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");

  useEffect(()=>{
    let active=true;
    fetch(`/api/assessment/attempts/${attemptId}/questions/${questionVersionId}/media`,{cache:"no-store"})
      .then(async(response)=>{
        const body=await response.json();
        if(!response.ok)throw new Error(body.error??"Media tidak tersedia");
        if(active)setMedia(Array.isArray(body.media)?body.media:[]);
      })
      .catch((reason)=>{if(active)setError(reason instanceof Error?reason.message:"Media tidak tersedia");})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[attemptId,questionVersionId]);

  if(loading)return <div className="runtime-media-shell">Memuat MediaAsset…</div>;
  if(error)return <div className="runtime-media-shell">{error}</div>;

  const expected=preferredType==="image"?"IMAGE":"VIDEO";
  const item=media.find((entry)=>entry.role==="STIMULUS"&&entry.mediaType===expected)
    ??media.find((entry)=>entry.mediaType===expected);
  if(!item)return <div className="runtime-media-shell">Belum ada MediaAsset {preferredType} yang dibind ke QuestionVersion ini.</div>;

  const source=usableSource(item.storageKey);
  if(!source)return (
    <div className="runtime-media-shell">
      <strong>{item.title}</strong>
      <span>MediaAsset sudah dibind, tetapi storage URL belum siap.</span>
    </div>
  );

  if(item.mediaType==="IMAGE")return (
    <figure className="assessment-media-figure">
      <img src={source} alt={item.altText??item.title}/>
      {(item.caption||item.title)&&<figcaption>{item.caption??item.title}</figcaption>}
    </figure>
  );

  return (
    <figure className="assessment-media-figure">
      <video controls preload="metadata" aria-label={item.altText??item.title}>
        <source src={source} type={item.mimeType??undefined}/>
      </video>
      {(item.caption||item.title)&&<figcaption>{item.caption??item.title}</figcaption>}
    </figure>
  );
}
