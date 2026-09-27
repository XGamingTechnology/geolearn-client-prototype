"use client";

import {createPortal} from "react-dom";
import {useEffect,useId,useState,useSyncExternalStore} from "react";
import {ConfirmAction} from "./confirm-action";
import styles from "./question-bank-actions.module.css";

type BulkKind="delete"|"archive"|"restore";
type Entry={questionId:string;kind:BulkKind;questionVersionId?:string};
type BulkResponse={requested:number;completed:number;failed:number;errors:Array<{questionId:string;message:string}>};
type Store={version:number;owner:string|null;registered:Map<string,Entry>;selected:Map<string,Entry>;selectAllFiltered:boolean;listeners:Set<()=>void>};
const store:Store={version:0,owner:null,registered:new Map(),selected:new Map(),selectAllFiltered:false,listeners:new Set()};
function emit(){store.version++;for(const listener of store.listeners)listener();}
function subscribe(listener:()=>void){store.listeners.add(listener);return()=>store.listeners.delete(listener);}
function snapshot(){return store.version;}
function register(instanceId:string,entry:Entry){store.registered.set(instanceId,entry);if(!store.owner)store.owner=instanceId;emit();}
function unregister(instanceId:string){const entry=store.registered.get(instanceId);store.registered.delete(instanceId);if(entry&&!Array.from(store.registered.values()).some(item=>item.questionId===entry.questionId))store.selected.delete(entry.questionId);if(store.owner===instanceId)store.owner=store.registered.keys().next().value??null;emit();}
function setSelected(entry:Entry,checked:boolean){store.selectAllFiltered=false;if(checked)store.selected.set(entry.questionId,entry);else store.selected.delete(entry.questionId);emit();}
function selectPage(){store.selectAllFiltered=false;store.selected.clear();for(const entry of store.registered.values())store.selected.set(entry.questionId,entry);emit();}
function clearSelection(){store.selected.clear();store.selectAllFiltered=false;emit();}
function selectFiltered(){store.selected.clear();store.selectAllFiltered=true;emit();}
function questionIdFromAction(action:string){return action.match(/\/questions\/([0-9a-f-]{36})\//i)?.[1]??"";}
function kindFromLabel(label:string):BulkKind{return label==="Hapus"?"delete":label==="Pulihkan"?"restore":"archive";}
function currentFilter(){const params=new URLSearchParams(window.location.search);const value=(name:string)=>params.get(name)??undefined;return {q:value("q"),stimulus:value("stimulus"),mode:value("mode"),response:value("response"),difficulty:value("difficulty"),versionStatus:value("versionStatus"),scope:value("scope"),groupId:value("groupId"),lifecycle:value("lifecycle")};}
function join(...names:Array<string|false|undefined>){return names.filter(Boolean).join(" ");}
function discoverPublishedVersion(questionId:string){
  if(typeof document==="undefined")return undefined;
  const anchor=document.querySelector<HTMLAnchorElement>(`a[href^="/teacher/questions/${questionId}/preview?versionId="]`);
  const card=anchor?.closest("article");
  if(!anchor||!card||!card.textContent?.includes("Published"))return undefined;
  const url=new URL(anchor.href,window.location.origin);
  return url.searchParams.get("versionId")??undefined;
}

function BulkToolbar(){
  useSyncExternalStore(subscribe,snapshot,snapshot);
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState("");const [isError,setIsError]=useState(false);
  const selected=Array.from(store.selected.values());
  const kinds=new Set(selected.map(item=>item.kind));
  const lifecycle=typeof window!=="undefined"&&new URLSearchParams(window.location.search).get("lifecycle")==="ARCHIVED"?"ARCHIVED":"ACTIVE";
  const versionStatus=typeof window!=="undefined"?new URLSearchParams(window.location.search).get("versionStatus"):null;
  const canDelete=store.selectAllFiltered?lifecycle==="ACTIVE"&&versionStatus==="DRAFT":selected.length>0&&kinds.size===1&&kinds.has("delete");
  const canArchive=store.selectAllFiltered?lifecycle==="ACTIVE"&&versionStatus==="PUBLISHED":selected.length>0&&kinds.size===1&&kinds.has("archive");
  const canRestore=store.selectAllFiltered?lifecycle==="ARCHIVED":selected.length>0&&kinds.size===1&&kinds.has("restore");
  const assignVersions=selected.map(item=>item.questionVersionId).filter((id):id is string=>Boolean(id));
  const canAssign=!store.selectAllFiltered&&selected.length>0&&assignVersions.length===selected.length&&lifecycle==="ACTIVE";
  const countLabel=store.selectAllFiltered?"Semua hasil filter":`${selected.length} soal`;
  const modeLabel=store.selectAllFiltered?"Mode filter aktif":"Terpilih untuk aksi massal";
  async function run(action:BulkKind){
    const label=action==="delete"?"hapus permanen":action==="archive"?"arsipkan":"pulihkan";const target=store.selectAllFiltered?"semua soal yang cocok dengan filter":`${selected.length} soal`;const warning=action==="delete"?" Tindakan hapus permanen tidak dapat dibatalkan.":"";
    if(!window.confirm(`Yakin ingin ${label} ${target}?${warning}`))return;
    setBusy(true);setMessage("");setIsError(false);
    try{const response=await fetch("/api/content/questions/bulk",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({action,ids:selected.map(item=>item.questionId),selectAllFiltered:store.selectAllFiltered,filter:currentFilter()})});const body=await response.json() as BulkResponse|{error:string};if(!response.ok||"error" in body)throw new Error("error" in body?body.error:"Bulk action gagal.");setMessage(body.failed?`${body.completed} berhasil, ${body.failed} gagal.`:`${body.completed} soal berhasil diproses.`);setIsError(body.failed>0);clearSelection();window.setTimeout(()=>window.location.reload(),800);}catch(error){setMessage(error instanceof Error?error.message:"Bulk action gagal.");setIsError(true);}finally{setBusy(false);}
  }
  function useInAssignment(){if(!canAssign)return;const query=new URLSearchParams();for(const id of assignVersions)query.append("qv",id);window.location.href=`/teacher/assignments?${query.toString()}`;}
  if(!(selected.length>0||store.selectAllFiltered))return null;
  return createPortal(<aside className={styles.toolbar} aria-live="polite">
    <div className={styles.summary}><span className={styles.summaryIcon}>✓</span><span className={styles.summaryText}><strong>{countLabel}</strong><span>{modeLabel}</span></span></div>
    <div className={styles.selectionActions}><button className={styles.button} type="button" onClick={selectPage} disabled={busy||store.registered.size===0}>Pilih halaman</button><button className={join(styles.button,store.selectAllFiltered&&styles.primary)} type="button" onClick={selectFiltered} disabled={busy}>Pilih semua hasil filter</button></div>
    <div className={styles.lifecycleActions}>
      {lifecycle==="ACTIVE"&&<button className={join(styles.button,styles.primary)} type="button" onClick={useInAssignment} disabled={busy||!canAssign}>Gunakan di Penugasan</button>}
      {lifecycle==="ACTIVE"&&<button className={join(styles.button,styles.archive)} type="button" onClick={()=>run("archive")} disabled={busy||!canArchive}>Arsipkan</button>}
      {lifecycle==="ACTIVE"&&<button className={join(styles.button,styles.danger)} type="button" onClick={()=>run("delete")} disabled={busy||!canDelete}>Hapus Draft</button>}
      {lifecycle==="ARCHIVED"&&<button className={join(styles.button,styles.primary)} type="button" onClick={()=>run("restore")} disabled={busy||!canRestore}>Pulihkan</button>}
      <button className={join(styles.button,styles.ghost)} type="button" onClick={clearSelection} disabled={busy}>Batal</button>
    </div>{message&&<span className={styles.message} data-error={isError}>{message}</span>}
  </aside>,document.body);
}

export function QuestionBankLifecycleAction({action,label,confirmText,tone="default",questionVersionId}:{action:string;label:string;confirmText:string;tone?:"default"|"danger";questionVersionId?:string}){
  const instanceId=useId();const questionId=questionIdFromAction(action);const kind=kindFromLabel(label);
  const [resolvedVersionId,setResolvedVersionId]=useState(questionVersionId);
  useSyncExternalStore(subscribe,snapshot,snapshot);
  useEffect(()=>{if(!questionId)return;setResolvedVersionId(questionVersionId??discoverPublishedVersion(questionId));},[questionId,questionVersionId]);
  useEffect(()=>{if(!questionId)return;const entry={questionId,kind,questionVersionId:resolvedVersionId};register(instanceId,entry);return()=>unregister(instanceId);},[instanceId,kind,questionId,resolvedVersionId]);
  const entry={questionId,kind,questionVersionId:resolvedVersionId};const title=tone==="danger"?`${label} draft?`:`${label} soal?`;const checked=questionId?store.selected.has(questionId):false;const isOwner=store.owner===instanceId;
  return <>{questionId&&<label className={styles.selectControl} data-selected={checked} title="Pilih untuk aksi massal"><input type="checkbox" checked={checked} onChange={event=>setSelected(entry,event.target.checked)}/><span className={styles.box} aria-hidden="true"/><span>{checked?"Dipilih":"Pilih"}</span></label>}<ConfirmAction action={action} triggerLabel={label} title={title} description={confirmText} confirmLabel={label} tone={tone} triggerClassName={tone==="danger"?"question-action danger":"question-action"}/>{isOwner&&typeof document!=="undefined"&&<BulkToolbar/>}</>;
}
