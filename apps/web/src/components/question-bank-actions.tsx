"use client";

import {createPortal} from "react-dom";
import {useEffect,useId,useState,useSyncExternalStore} from "react";
import {ConfirmAction} from "./confirm-action";

type BulkKind="delete"|"archive"|"restore";
type Entry={questionId:string;kind:BulkKind};
type BulkResponse={requested:number;completed:number;failed:number;errors:Array<{questionId:string;message:string}>};

type Store={
  version:number;
  owner:string|null;
  registered:Map<string,Entry>;
  selected:Map<string,BulkKind>;
  selectAllFiltered:boolean;
  listeners:Set<()=>void>;
};

const store:Store={version:0,owner:null,registered:new Map(),selected:new Map(),selectAllFiltered:false,listeners:new Set()};
function emit(){store.version++;for(const listener of store.listeners)listener();}
function subscribe(listener:()=>void){store.listeners.add(listener);return()=>store.listeners.delete(listener);}
function snapshot(){return store.version;}
function register(instanceId:string,entry:Entry){store.registered.set(instanceId,entry);if(!store.owner)store.owner=instanceId;emit();}
function unregister(instanceId:string){const entry=store.registered.get(instanceId);store.registered.delete(instanceId);if(entry&&!Array.from(store.registered.values()).some(item=>item.questionId===entry.questionId))store.selected.delete(entry.questionId);if(store.owner===instanceId)store.owner=store.registered.keys().next().value??null;emit();}
function setSelected(entry:Entry,checked:boolean){store.selectAllFiltered=false;if(checked)store.selected.set(entry.questionId,entry.kind);else store.selected.delete(entry.questionId);emit();}
function selectPage(){store.selectAllFiltered=false;store.selected.clear();for(const entry of store.registered.values())store.selected.set(entry.questionId,entry.kind);emit();}
function clearSelection(){store.selected.clear();store.selectAllFiltered=false;emit();}
function selectFiltered(){store.selected.clear();store.selectAllFiltered=true;emit();}

function questionIdFromAction(action:string){return action.match(/\/questions\/([0-9a-f-]{36})\//i)?.[1]??"";}
function kindFromLabel(label:string):BulkKind{return label==="Hapus"?"delete":label==="Pulihkan"?"restore":"archive";}
function currentFilter(){
  const params=new URLSearchParams(window.location.search);
  const value=(name:string)=>params.get(name)??undefined;
  return {q:value("q"),stimulus:value("stimulus"),mode:value("mode"),response:value("response"),difficulty:value("difficulty"),versionStatus:value("versionStatus"),scope:value("scope"),groupId:value("groupId"),lifecycle:value("lifecycle")};
}

function BulkToolbar(){
  useSyncExternalStore(subscribe,snapshot,snapshot);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");
  const selected=Array.from(store.selected.entries());
  const kinds=new Set(selected.map(([,kind])=>kind));
  const count=store.selectAllFiltered?"Semua hasil filter":`${selected.length} dipilih`;
  const lifecycle=typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("lifecycle")==="ARCHIVED"?"ARCHIVED":"ACTIVE";
  const versionStatus=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("versionStatus"):null;
  const canDelete=store.selectAllFiltered?lifecycle==="ACTIVE"&&versionStatus==="DRAFT":selected.length>0&&kinds.size===1&&kinds.has("delete");
  const canArchive=store.selectAllFiltered?lifecycle==="ACTIVE"&&versionStatus==="PUBLISHED":selected.length>0&&kinds.size===1&&kinds.has("archive");
  const canRestore=store.selectAllFiltered?lifecycle==="ARCHIVED":selected.length>0&&kinds.size===1&&kinds.has("restore");

  async function run(action:BulkKind){
    const label=action==="delete"?"hapus permanen":action==="archive"?"arsipkan":"pulihkan";
    const target=store.selectAllFiltered?"semua soal yang cocok dengan filter":`${selected.length} soal`;
    const warning=action==="delete"?" Tindakan hapus permanen tidak dapat dibatalkan.":"";
    if(!window.confirm(`Yakin ingin ${label} ${target}?${warning}`))return;
    setBusy(true);setMessage("");
    try{
      const response=await fetch("/api/content/questions/bulk",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,ids:selected.map(([id])=>id),selectAllFiltered:store.selectAllFiltered,filter:currentFilter()})});
      const body=await response.json() as BulkResponse|{error:string};
      if(!response.ok||"error" in body)throw new Error("error" in body?body.error:"Bulk action gagal.");
      setMessage(body.failed?`${body.completed} berhasil, ${body.failed} gagal.`:`${body.completed} soal berhasil diproses.`);
      clearSelection();
      window.setTimeout(()=>window.location.reload(),700);
    }catch(error){setMessage(error instanceof Error?error.message:"Bulk action gagal.");}
    finally{setBusy(false);}
  }

  return createPortal(<aside aria-live="polite" style={{position:"fixed",left:"50%",bottom:"22px",transform:"translateX(-50%)",zIndex:120,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap",maxWidth:"calc(100vw - 32px)",padding:"10px 12px",border:"1px solid #dbe7f3",borderRadius:14,background:"rgba(255,255,255,.97)",boxShadow:"0 18px 48px rgba(15,35,63,.18)",fontSize:12}}>
    <strong style={{color:"#10233f"}}>{count}</strong>
    <button type="button" onClick={selectPage} disabled={busy||store.registered.size===0}>Pilih halaman</button>
    <button type="button" onClick={selectFiltered} disabled={busy}>Pilih semua hasil filter</button>
    {lifecycle==="ACTIVE"&&<button type="button" onClick={()=>run("archive")} disabled={busy||!canArchive}>Arsipkan</button>}
    {lifecycle==="ACTIVE"&&<button type="button" onClick={()=>run("delete")} disabled={busy||!canDelete} style={{color:canDelete?"#b42318":undefined}}>Hapus Draft</button>}
    {lifecycle==="ARCHIVED"&&<button type="button" onClick={()=>run("restore")} disabled={busy||!canRestore}>Pulihkan</button>}
    {(selected.length>0||store.selectAllFiltered)&&<button type="button" onClick={clearSelection} disabled={busy}>Batal</button>}
    {message&&<span>{message}</span>}
  </aside>,document.body);
}

export function QuestionBankLifecycleAction({
  action,
  label,
  confirmText,
  tone="default",
}:{
  action:string;
  label:string;
  confirmText:string;
  tone?:"default"|"danger";
}){
  const instanceId=useId();const questionId=questionIdFromAction(action);const kind=kindFromLabel(label);
  useSyncExternalStore(subscribe,snapshot,snapshot);
  useEffect(()=>{if(!questionId)return;register(instanceId,{questionId,kind});return()=>unregister(instanceId);},[instanceId,kind,questionId]);
  const title=tone==="danger"?`${label} draft?`:`${label} soal?`;
  const checked=questionId?store.selected.has(questionId):false;
  const isOwner=store.owner===instanceId;
  return <>
    {questionId&&<label title="Pilih untuk aksi massal" style={{display:"inline-flex",alignItems:"center",gap:5,fontSize:11,color:"#52647a",cursor:"pointer"}}><input type="checkbox" checked={checked} onChange={event=>setSelected({questionId,kind},event.target.checked)}/> Pilih</label>}
    <ConfirmAction
      action={action}
      triggerLabel={label}
      title={title}
      description={confirmText}
      confirmLabel={label}
      tone={tone}
      triggerClassName={tone==="danger"?"question-action danger":"question-action"}
    />
    {isOwner&&typeof document!=="undefined"&&<BulkToolbar/>}
  </>;
}
