"use client";

import {createPortal} from "react-dom";
import {useEffect,useMemo,useRef,useState} from "react";
import {QuestionBuilderForm,type QuestionBuilderInitial} from "./question-builder-form";
import {TeacherStudentPreview} from "./teacher-student-preview";
import type {DatasetSelection,ResponseType,StimulusType} from "@/features/questions/builder";

type Dataset={id:string;title:string;geometryType?:string|null;fields?:string[]};
type Media={id:string;title:string;mediaType:"IMAGE"|"VIDEO"|"DOCUMENT"|"ILLUSTRATION";mimeType:string|null;storageKey:string|null};
type PreviewState={
  title:string;prompt:string;spatialMode:string;stimulus:StimulusType;bindings:DatasetSelection[];mapExperience:string;mapInteractions:string[];
  allowedTools:string[];requiredTools:string[];responseType:ResponseType;answers:Array<{id:string;label:string}>;mediaId:string;mediaCaption:string;
};

const EMPTY:PreviewState={title:"",prompt:"",spatialMode:"location",stimulus:"text",bindings:[],mapExperience:"standard",mapInteractions:[],allowedTools:[],requiredTools:[],responseType:"multiple-choice",answers:[],mediaId:"",mediaCaption:""};

function checkedValue(form:HTMLFormElement,name:string,fallback:string){
  const input=form.querySelector<HTMLInputElement>(`input[name="${name}"]:checked`);
  return input?.value??String(new FormData(form).get(name)??fallback);
}
function parseBindings(raw:string):DatasetSelection[]{
  try{
    const value=JSON.parse(raw) as unknown;
    if(!Array.isArray(value))return [];
    return value.filter((item):item is DatasetSelection=>Boolean(item&&typeof item==="object"&&typeof (item as {datasetId?:unknown}).datasetId==="string"));
  }catch{return [];}
}
function readState(form:HTMLFormElement):PreviewState{
  const data=new FormData(form);
  const answerIds=["A","B","C","D","E"];
  return {
    title:String(data.get("title")??""),
    prompt:String(data.get("prompt")??""),
    spatialMode:checkedValue(form,"spatialMode","location"),
    stimulus:checkedValue(form,"stimulusType","text") as StimulusType,
    bindings:parseBindings(String(data.get("datasetBindingsJson")??"[]")),
    mapExperience:checkedValue(form,"mapExperience","standard"),
    mapInteractions:data.getAll("mapInteraction").map(String),
    allowedTools:data.getAll("allowedGisTool").map(String),
    requiredTools:data.getAll("requiredGisTool").map(String),
    responseType:String(data.get("responseType")??"multiple-choice") as ResponseType,
    answers:answerIds.map((id)=>({id,label:String(data.get(`answer_${id}`)??"").trim()})).filter((answer)=>answer.label),
    mediaId:String(data.get("stimulusMediaId")??""),
    mediaCaption:String(data.get("mediaCaption")??""),
  };
}
function findPreviewHost(root:HTMLElement):HTMLElement|null{
  for(const section of Array.from(root.querySelectorAll<HTMLElement>("section"))){
    const heading=section.querySelector("h3");
    if(heading?.textContent?.trim()!=="Preview pengalaman siswa")continue;
    return section.querySelector<HTMLElement>("article");
  }
  return null;
}
function modeLabel(mode:string){const labels:Record<string,string>={location:"Location",condition:"Condition",influence:"Influence",region:"Region",hierarchy:"Hierarchy",analogy:"Analogies",pattern:"Pattern",association:"Association"};return labels[mode]??mode;}

function LivePreviewBridge({root,media}:{root:HTMLElement|null;media:Media[]}){
  const [host,setHost]=useState<HTMLElement|null>(null);
  const [state,setState]=useState<PreviewState>(EMPTY);

  useEffect(()=>{
    if(!root)return;
    const form=root.querySelector<HTMLFormElement>("form")??root.closest("form");
    if(!form)return;
    const sync=()=>setState(readState(form));
    const resolve=()=>setHost(findPreviewHost(root));
    sync();resolve();
    form.addEventListener("input",sync);form.addEventListener("change",sync);form.addEventListener("click",sync);
    const observer=new MutationObserver(()=>{resolve();sync();});
    observer.observe(root,{subtree:true,attributes:true,attributeFilter:["hidden","checked","value"]});
    return()=>{form.removeEventListener("input",sync);form.removeEventListener("change",sync);form.removeEventListener("click",sync);observer.disconnect();};
  },[root]);

  useEffect(()=>{
    if(!host)return;
    const children=Array.from(host.children) as HTMLElement[];
    children.forEach((child)=>{child.dataset.previewOriginalDisplay=child.style.display;child.style.display="none";});
    return()=>children.forEach((child)=>{child.style.display=child.dataset.previewOriginalDisplay??"";delete child.dataset.previewOriginalDisplay;});
  },[host]);

  const mediaAsset=useMemo(()=>media.find((item)=>item.id===state.mediaId),[media,state.mediaId]);
  const mediaSource=mediaAsset?.storageKey&&(mediaAsset.storageKey.startsWith("http://")||mediaAsset.storageKey.startsWith("https://")||mediaAsset.storageKey.startsWith("/"))?mediaAsset.storageKey:(mediaAsset?`/api/media/${mediaAsset.id}`:null);

  if(!host)return null;
  return createPortal(<TeacherStudentPreview
    stimulus={state.stimulus}
    spatialModeLabel={modeLabel(state.spatialMode)}
    bindings={state.bindings}
    mapExperience={state.mapExperience}
    mapInteractions={state.mapInteractions}
    allowedTools={state.allowedTools}
    requiredTools={state.requiredTools}
    responseType={state.responseType}
    answers={state.answers}
    initialTitle={state.title}
    initialPrompt={state.prompt}
    mediaSource={mediaSource}
    mediaType={mediaAsset?.mediaType}
    mediaCaption={state.mediaCaption}
  />,host);
}

export function QuestionBuilderLiveForm(props:{action:string;publishAction?:string;datasets:Dataset[];media:Media[];initial?:QuestionBuilderInitial;isNew?:boolean}){
  const wrapperRef=useRef<HTMLDivElement>(null);
  const [root,setRoot]=useState<HTMLElement|null>(null);
  useEffect(()=>{setRoot(wrapperRef.current);},[]);
  return <div ref={wrapperRef}>
    <QuestionBuilderForm {...props}/>
    <LivePreviewBridge root={root} media={props.media}/>
  </div>;
}
