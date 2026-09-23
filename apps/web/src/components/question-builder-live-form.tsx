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
    const oldPreview=section.querySelector<HTMLElement>("article");
    return oldPreview?.parentElement??oldPreview;
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
    const hideLegacy=()=>{
      for(const child of Array.from(host.children) as HTMLElement[]){
        if(child.dataset.geolearnLivePreview==="true")continue;
        if(child.dataset.previewOriginalDisplay===undefined)child.dataset.previewOriginalDisplay=child.style.display;
        child.style.display="none";
      }
    };
    hideLegacy();
    const observer=new MutationObserver(hideLegacy);
    observer.observe(host,{childList:true});
    return()=>{
      observer.disconnect();
      for(const child of Array.from(host.children) as HTMLElement[]){
        if(child.dataset.geolearnLivePreview==="true")continue;
        child.style.display=child.dataset.previewOriginalDisplay??"";
        delete child.dataset.previewOriginalDisplay;
      }
    };
  },[host]);

  const mediaAsset=useMemo(()=>media.find((item)=>item.id===state.mediaId),[media,state.mediaId]);
  const mediaSource=mediaAsset?.storageKey&&(mediaAsset.storageKey.startsWith("http://")||mediaAsset.storageKey.startsWith("https://")||mediaAsset.storageKey.startsWith("/"))?mediaAsset.storageKey:(mediaAsset?`/api/media/${mediaAsset.id}`:null);

  if(!host)return null;
  return createPortal(<div data-geolearn-live-preview="true" style={{gridColumn:"1 / -1",minWidth:0}}><TeacherStudentPreview
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
    mediaCaption={state.mediaCaption}
  /></div>,host);
}

const responsiveCss=`
.geolearn-builder-live-root [hidden]{display:none!important}
@media(max-width:1180px){
  .geolearn-builder-live-root>form>div{grid-template-columns:1fr!important;gap:14px!important}
  .geolearn-builder-live-root>form>div>aside{position:sticky!important;top:76px!important;z-index:24!important;display:grid!important;grid-template-columns:auto minmax(0,1fr)!important;align-items:center!important;gap:10px!important;padding:10px 12px!important;border-radius:16px!important}
  .geolearn-builder-live-root>form>div>aside>div:first-child{min-width:124px!important;padding:0!important}
  .geolearn-builder-live-root>form>div>aside>div:first-child>span{display:none!important}
  .geolearn-builder-live-root>form>div>aside>div:first-child>strong{font-size:12px!important;white-space:nowrap!important}
  .geolearn-builder-live-root>form>div>aside>div:first-child>small{font-size:9px!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2){display:flex!important;gap:5px!important;overflow-x:auto!important;scrollbar-width:thin;padding:1px 0 3px!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2)>button{flex:0 0 132px!important;min-height:43px!important;padding:6px!important;grid-template-columns:27px minmax(0,1fr)!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2)>button b{width:26px!important;height:26px!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2)>button strong{font-size:9.5px!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2)>button small{display:none!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(3){display:none!important}
}
@media(max-width:860px){
  .geolearn-builder-live-root>form>div>aside{top:68px!important;grid-template-columns:1fr!important;padding:9px 10px!important;border-radius:14px!important}
  .geolearn-builder-live-root>form>div>aside>div:first-child{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:8px!important;min-width:0!important}
  .geolearn-builder-live-root>form>div>aside>div:first-child>strong{font-size:11px!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2)>button{flex-basis:112px!important}
}
@media(max-width:560px){
  .geolearn-builder-live-root>form>div>aside>div:first-child>strong{display:none!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2)>button{flex-basis:88px!important;grid-template-columns:24px minmax(0,1fr)!important}
  .geolearn-builder-live-root>form>div>aside>div:nth-child(2)>button strong{font-size:8.5px!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
}
`;

export function QuestionBuilderLiveForm(props:{action:string;publishAction?:string;datasets:Dataset[];media:Media[];initial?:QuestionBuilderInitial;isNew?:boolean}){
  const wrapperRef=useRef<HTMLDivElement>(null);
  const [root,setRoot]=useState<HTMLElement|null>(null);
  useEffect(()=>{setRoot(wrapperRef.current);},[]);
  return <div ref={wrapperRef} className="geolearn-builder-live-root">
    <style>{responsiveCss}</style>
    <QuestionBuilderForm {...props}/>
    <LivePreviewBridge root={root} media={props.media}/>
  </div>;
}
