"use client";
/* eslint-disable @next/next/no-img-element -- authenticated media preview is dynamic. */

import {useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import styles from "./question-builder-form.module.css";
import {
  answerIds,configurationSummary,normalizeAnswers,stimulusControls,validateForPublish,
  type AnswerId,type DatasetRole,type DatasetSelection,type ResponseType,type StimulusType,
} from "@/features/questions/builder";

type Dataset={id:string;title:string;geometryType?:string|null};
type Media={id:string;title:string;mediaType:"IMAGE"|"VIDEO"|"DOCUMENT"|"ILLUSTRATION";mimeType:string|null;storageKey:string|null};
export type QuestionBuilderInitial={
  title?:string;subject?:string;topic?:string;scope?:string;spatialMode?:string;difficulty?:string;prompt?:string;stimulusType?:string;responseType?:string;
  answers?:Array<{id:string;label:string}>;correctAnswer?:string;bufferDistance?:number;
  datasetBindings?:DatasetSelection[];allowedGisTools?:string[];requiredGisTools?:string[];
  requiredGisTool?:string;sourceDatasetId?:string;targetDatasetId?:string;
  stimulusMediaId?:string;mediaAltText?:string;mediaCaption?:string;spatialValidationMethod?:string;maxDistanceMeters?:number;minOverlapRatio?:number;
  feedbackCorrect?:string;feedbackIncorrect?:string;
};
const modes=["location","condition","influence","region","hierarchy","analogy","pattern","association"];
const difficulties=["Mudah","Sedang","Sulit"] as const;
const gisTools=[
  {id:"buffer",label:"Buffer",description:"Zona jarak dari SOURCE."},
  {id:"overlay",label:"Overlay",description:"Irisan SOURCE dengan TARGET."},
  {id:"distance",label:"Distance",description:"Jarak minimum SOURCE ke TARGET."},
] as const;
const help:Record<string,string>={
  "Spatial Mode":"Cara berpikir spasial yang dilatih oleh soal ini.",Stimulus:"Bentuk informasi yang dilihat siswa sebelum menjawab.",
  "Dataset Layers":"Pilih layer yang diperlukan. Satu SOURCE untuk analisis utama, maksimal satu TARGET untuk pembanding, sisanya CONTEXT.",
  "GIS Tools":"Aktifkan beberapa tool. Wajib berarti tool harus selesai sebelum siswa dapat menjawab.",
  "Buffer Distance":"Jarak area Buffer dalam meter.",Buffer:"Membuat area dalam jarak tertentu dari feature menggunakan PostGIS.",
  "Multiple Choice":"Siswa memilih satu jawaban dari pilihan yang tersedia.","Spatial Response":"Siswa menggambar atau memilih objek langsung pada peta.","Correct Answer":"Pilihan yang dinilai benar secara otomatis.",
  "Alt Text":"Deskripsi singkat media untuk pengguna pembaca layar.",Caption:"Keterangan tambahan yang tampil bersama media.","Publish Immutable Version":"Setelah dipublish, versi ini terkunci. Perubahan berikutnya harus dibuat sebagai versi baru.",
};
function Help({term}:{term:string}){return <span className="context-help" tabIndex={0} role="button" aria-label={`Bantuan: ${term}`}><span aria-hidden="true">i</span><span role="tooltip">{help[term]}</span></span>}
function Label({children,helpTerm}:{children:React.ReactNode;helpTerm?:string}){return <span className="field-label">{children}{helpTerm&&<Help term={helpTerm}/>}</span>}
function seededBindings(initial:QuestionBuilderInitial):DatasetSelection[]{
  if(initial.datasetBindings?.length)return initial.datasetBindings;
  const bindings:DatasetSelection[]=[];
  if(initial.sourceDatasetId)bindings.push({datasetId:initial.sourceDatasetId,role:"SOURCE"});
  if(initial.targetDatasetId)bindings.push({datasetId:initial.targetDatasetId,role:"TARGET"});
  return bindings;
}

export function QuestionBuilderForm({action,publishAction,datasets,media,initial={},isNew=false}:{action:string;publishAction?:string;datasets:Dataset[];media:Media[];initial?:QuestionBuilderInitial;isNew?:boolean}){
  const [stimulus,setStimulus]=useState<StimulusType>((["text","image","video","webgis"].includes(initial.stimulusType??"")?initial.stimulusType:"text") as StimulusType);
  const [response,setResponse]=useState<ResponseType>((initial.responseType??"multiple-choice") as ResponseType);
  const seeded=(initial.answers??[]).sort((a,b)=>a.id.localeCompare(b.id)).map((a)=>a.label);
  const [options,setOptions]=useState<string[]>(seeded.length>=2?seeded.slice(0,5):["",""]);
  const [correct,setCorrect]=useState(initial.correctAnswer??"A");
  const [difficulty,setDifficulty]=useState((initial.difficulty??"Sedang").toLowerCase()==="mudah"?"Mudah":(initial.difficulty??"Sedang").toLowerCase()==="sulit"?"Sulit":"Sedang");
  const [mediaId,setMediaId]=useState(initial.stimulusMediaId??"");
  const [bindings,setBindings]=useState<DatasetSelection[]>(()=>seededBindings(initial));
  const initialAllowed=initial.allowedGisTools?.length?initial.allowedGisTools:(initial.requiredGisTool?[initial.requiredGisTool]:initial.requiredGisTools??[]);
  const initialRequired=initial.requiredGisTools?.length?initial.requiredGisTools:(initial.requiredGisTool?[initial.requiredGisTool]:[]);
  const [allowedTools,setAllowedTools]=useState<string[]>(Array.from(new Set(initialAllowed)));
  const [requiredTools,setRequiredTools]=useState<string[]>(Array.from(new Set(initialRequired)));
  const [distance,setDistance]=useState(initial.bufferDistance??500);
  const [datasetSearch,setDatasetSearch]=useState("");
  const [errors,setErrors]=useState<string[]>([]);
  const selectedMedia=media.find((item)=>item.id===mediaId); const controls=stimulusControls(stimulus); const filteredMedia=media.filter((item)=>item.mediaType===stimulus.toUpperCase());
  const selectedMediaSource=selectedMedia?.storageKey&&(selectedMedia.storageKey.startsWith("http://")||selectedMedia.storageKey.startsWith("https://")||selectedMedia.storageKey.startsWith("/"))?selectedMedia.storageKey:(selectedMedia?`/api/media/${selectedMedia.id}`:null);
  const snapshot={stimulusType:stimulus,responseType:response,answers:normalizeAnswers(options),correctAnswer:correct,mediaAssetId:mediaId,selectedMediaType:selectedMedia?.mediaType,datasetBindings:bindings,allowedGisTools:allowedTools,requiredGisTools:requiredTools,bufferDistance:distance};
  const selectedDatasets=bindings.map((binding)=>({binding,dataset:datasets.find((dataset)=>dataset.id===binding.datasetId)})).filter((item)=>item.dataset);
  const availableDatasets=useMemo(()=>datasets.filter((dataset)=>!bindings.some((binding)=>binding.datasetId===dataset.id)&&dataset.title.toLowerCase().includes(datasetSearch.trim().toLowerCase())),[datasets,bindings,datasetSearch]);
  const needsTarget=allowedTools.some((tool)=>tool==="overlay"||tool==="distance");
  const hasTarget=bindings.some((binding)=>binding.role==="TARGET");

  function chooseStimulus(value:StimulusType){setStimulus(value);setMediaId("");if(value!=="webgis"){setBindings([]);setAllowedTools([]);setRequiredTools([]);}}
  function remove(index:number){const next=options.filter((_,i)=>i!==index);setOptions(next);if(answerIds.indexOf(correct as AnswerId)>=next.length)setCorrect("A");}
  function addDataset(datasetId:string){setBindings((current)=>[...current,{datasetId,role:current.some((item)=>item.role==="SOURCE")?"CONTEXT":"SOURCE"}]);}
  function removeDataset(datasetId:string){setBindings((current)=>current.filter((item)=>item.datasetId!==datasetId));}
  function setDatasetRole(datasetId:string,role:DatasetRole){
    setBindings((current)=>current.map((item)=>{
      if(item.datasetId===datasetId)return {...item,role};
      if((role==="SOURCE"||role==="TARGET")&&item.role===role)return {...item,role:"CONTEXT"};
      return item;
    }));
  }
  function toggleTool(tool:string,checked:boolean){
    setAllowedTools((current)=>checked?Array.from(new Set([...current,tool])):current.filter((item)=>item!==tool));
    if(!checked)setRequiredTools((current)=>current.filter((item)=>item!==tool));
  }
  function toggleRequired(tool:string,checked:boolean){
    setRequiredTools((current)=>checked?Array.from(new Set([...current,tool])):current.filter((item)=>item!==tool));
    if(checked)setAllowedTools((current)=>Array.from(new Set([...current,tool])));
  }
  function submit(event:FormEvent<HTMLFormElement>){const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;if(submitter?.dataset.intent!=="publish")return;const next=validateForPublish(snapshot);setErrors(next);if(next.length){event.preventDefault();document.querySelector(".builder-errors")?.scrollIntoView({behavior:"smooth",block:"center"});}}

  return <form action={action} method="post" className="real-question-form" onSubmit={submit}>
    <section className="dashboard-panel"><p className="eyebrow">1 · Informasi</p><div className="builder-two-col"><label><Label>Judul</Label><input name="title" required maxLength={220} defaultValue={initial.title}/></label>{isNew?<label><Label>Scope</Label><select name="scope" defaultValue={initial.scope??"PRIVATE"}><option value="PRIVATE">My Bank</option><option value="SCHOOL">School Bank</option></select></label>:<label><Label>Subject</Label><input name="subject" defaultValue={initial.subject}/></label>}</div><div className="builder-two-col">{isNew&&<label><Label>Subject</Label><input name="subject" defaultValue={initial.subject??"Geografi"}/></label>}<label><Label>Topik</Label><input name="topic" defaultValue={initial.topic}/></label></div><div className="builder-two-col"><label><Label helpTerm="Spatial Mode">Spatial Mode</Label><select name="spatialMode" defaultValue={initial.spatialMode??"influence"}>{modes.map(m=><option key={m}>{m}</option>)}</select></label><fieldset className={styles.difficultyGrid}><legend><Label>Tingkat Kesulitan</Label></legend>{difficulties.map((value)=><label key={value} className={difficulty===value?"decision-card selected":"decision-card"}><input type="radio" name="difficulty" value={value} checked={difficulty===value} onChange={()=>setDifficulty(value)}/><strong>{value}</strong></label>)}</fieldset></div></section>

    <section className="dashboard-panel"><p className="eyebrow">2 · Stimulus</p><fieldset className="decision-grid"><legend><Label helpTerm="Stimulus">Stimulus</Label></legend>{([['text','Text'],['image','Image'],['video','Video'],['webgis','WebGIS']] as const).map(([value,label])=><label key={value} className={stimulus===value?"decision-card selected":"decision-card"}><input type="radio" name="stimulusType" value={value} checked={stimulus===value} onChange={()=>chooseStimulus(value)}/><strong>{label}</strong></label>)}</fieldset>
      {controls.media&&<div className="conditional-fields"><label><Label>MediaAsset {stimulus.toUpperCase()}</Label><select name="stimulusMediaId" value={mediaId} onChange={e=>setMediaId(e.target.value)}><option value="">Pilih media…</option>{filteredMedia.map(m=><option value={m.id} key={m.id}>{m.title}</option>)}</select></label>{selectedMedia&&<div className="selected-asset"><strong>{selectedMedia.title}</strong><span>{selectedMedia.mediaType} · {selectedMedia.mimeType??"tipe file belum tersedia"}</span>{selectedMedia.mediaType==="IMAGE"?<img src={selectedMediaSource!} alt="Pratinjau media terpilih"/>:<video src={selectedMediaSource!} controls preload="metadata"/>}</div>}<div className="builder-two-col"><label><Label helpTerm="Alt Text">Alt Text</Label><input name="mediaAltText" defaultValue={initial.mediaAltText}/></label><label><Label helpTerm="Caption">Caption</Label><input name="mediaCaption" defaultValue={initial.mediaCaption}/></label></div></div>}

      {stimulus==="webgis"&&<div className="conditional-fields">
        <input type="hidden" name="datasetBindingsJson" value={JSON.stringify(bindings)}/>
        <div className={styles.datasetBlock}>
          <div className={styles.datasetHeader}><div><span className={styles.sectionTitle}><Label helpTerm="Dataset Layers">Dataset Layers</Label></span><p className={styles.hint}>Tambahkan layer yang dibutuhkan, lalu tentukan perannya. Role SOURCE/TARGET dibuat unik otomatis.</p></div><span className={styles.datasetCount}>{bindings.length} layer</span></div>
          <div className={styles.selectedLayers}>{selectedDatasets.length===0?<div className={styles.emptySelection}>Belum ada layer. Tambahkan dataset dari daftar di bawah.</div>:selectedDatasets.map(({binding,dataset})=><div className={styles.selectedLayer} key={binding.datasetId}><div className={styles.layerInfo}><strong>{dataset!.title}</strong><span>{dataset!.geometryType??"Geometry"}</span></div><select className={styles.roleSelect} aria-label={`Role ${dataset!.title}`} value={binding.role} onChange={(event)=>setDatasetRole(binding.datasetId,event.target.value as DatasetRole)}><option value="SOURCE">SOURCE</option><option value="TARGET">TARGET</option><option value="CONTEXT">CONTEXT</option></select><button className={styles.removeLayer} type="button" onClick={()=>removeDataset(binding.datasetId)}>Hapus</button></div>)}</div>
          <div className={styles.datasetSearch}><input type="search" placeholder="Cari dataset…" value={datasetSearch} onChange={(event)=>setDatasetSearch(event.target.value)}/><span className={styles.hint}>{availableDatasets.length} tersedia</span></div>
          <div className={styles.availableList}>{availableDatasets.slice(0,20).map((dataset)=><div className={styles.availableItem} key={dataset.id}><div><strong>{dataset.title}</strong><span>{dataset.geometryType??"Geometry"}</span></div><button className={styles.addLayer} type="button" onClick={()=>addDataset(dataset.id)}>+ Tambah</button></div>)}{availableDatasets.length===0&&<div className={styles.noResults}>Tidak ada dataset lain yang cocok.</div>}</div>
        </div>

        <div className={styles.toolSection}><div><span className={styles.sectionTitle}><Label helpTerm="GIS Tools">GIS Tools</Label></span><p className={styles.hint}>Aktifkan tool yang boleh digunakan siswa. Pilih “Wajib” hanya untuk tool yang menjadi syarat sebelum menjawab.</p></div>{needsTarget&&!hasTarget&&<div className={styles.warning}>Overlay atau Distance membutuhkan satu layer dengan role TARGET.</div>}<div className={styles.toolGrid}>{gisTools.map((tool)=>{const enabled=allowedTools.includes(tool.id);const required=requiredTools.includes(tool.id);return <div className={`${styles.toolCard} ${enabled?styles.toolCardEnabled:""}`} key={tool.id}><label className={styles.toolMain}><input type="checkbox" name="allowedGisTool" value={tool.id} checked={enabled} onChange={(event)=>toggleTool(tool.id,event.target.checked)}/><span className={styles.toolText}><strong>{tool.label}</strong><span>{tool.description}</span></span></label>{enabled&&<label className={styles.requiredToggle}><input type="checkbox" name="requiredGisTool" value={tool.id} checked={required} onChange={(event)=>toggleRequired(tool.id,event.target.checked)}/> Jadikan wajib</label>}</div>})}</div>{allowedTools.includes("buffer")&&<label className={styles.bufferField}><Label helpTerm="Buffer Distance">Buffer Distance (m)</Label><input name="bufferDistance" type="number" min={1} max={100000} value={distance} onChange={e=>setDistance(Number(e.target.value))}/><small className="form-note">{help.Buffer}</small></label>}</div>
      </div>}
    </section>

    <section className="dashboard-panel"><p className="eyebrow">3 · Prompt & Answer Mode</p><label><Label>Prompt</Label><textarea name="prompt" required rows={5} defaultValue={initial.prompt}/></label><fieldset className="decision-grid"><legend>Answer Mode</legend><label className={response==="multiple-choice"?"decision-card selected":"decision-card"}><input type="radio" name="responseType" value="multiple-choice" checked={response==="multiple-choice"} onChange={()=>setResponse("multiple-choice")}/><strong>Multiple Choice</strong><Help term="Multiple Choice"/></label><label className={response!=="multiple-choice"?"decision-card selected":"decision-card"}><input type="radio" name="answerMode" value="spatial-response" checked={response!=="multiple-choice"} onChange={()=>setResponse("draw-point")}/><strong>Spatial Response</strong><Help term="Spatial Response"/></label></fieldset>
      {response==="multiple-choice"?<div className="conditional-fields"><p className="form-note">Tambahkan 2–5 pilihan. Hanya pilihan yang terisi akan tampil ke siswa.</p><div className="dynamic-options">{options.map((value,index)=><div key={index} className="dynamic-option"><b>{answerIds[index]}</b><input name={`answer_${answerIds[index]}`} value={value} aria-label={`Pilihan ${answerIds[index]}`} onChange={e=>setOptions(options.map((x,i)=>i===index?e.target.value:x))}/><button type="button" onClick={()=>remove(index)} disabled={options.length<=2} aria-label={`Hapus pilihan ${answerIds[index]}`}>Hapus</button></div>)}</div>{options.length<5&&<button className="button button-secondary add-option" type="button" onClick={()=>setOptions([...options,""])}>+ Tambah pilihan</button>}<label><Label helpTerm="Correct Answer">Correct Answer</Label><select name="correctAnswer" value={correct} onChange={e=>setCorrect(e.target.value)}>{options.map((_,i)=><option value={answerIds[i]} key={answerIds[i]}>{answerIds[i]}</option>)}</select></label></div>:<div className="conditional-fields"><label><Label>Spatial Response</Label><select name="responseType" value={response} onChange={e=>setResponse(e.target.value as ResponseType)}><option value="draw-point">Draw Point</option><option value="draw-line">Draw Line</option><option value="draw-polygon">Draw Polygon</option><option value="feature-select">Select Map Feature</option></select></label><div className="builder-two-col"><label>Spatial Validation<select name="spatialValidationMethod" defaultValue={initial.spatialValidationMethod??"manual-review"}><option value="manual-review">Manual Review</option><option value="geometry-distance">Geometry Distance</option><option value="geometry-overlap">Geometry Overlap</option><option value="selected-feature-rule">Selected Feature Rule</option></select></label><label>Max Distance (m)<input name="maxDistanceMeters" type="number" min={0} defaultValue={initial.maxDistanceMeters??100}/></label></div><label>Min Overlap Ratio (0–1)<input name="minOverlapRatio" type="number" min={0} max={1} step={.05} defaultValue={initial.minOverlapRatio??.5}/></label></div>}
    </section>
    <section className="dashboard-panel"><p className="eyebrow">4 · Feedback</p><label>Benar<textarea name="feedbackCorrect" rows={3} defaultValue={initial.feedbackCorrect}/></label><label>Belum tepat<textarea name="feedbackIncorrect" rows={3} defaultValue={initial.feedbackIncorrect}/></label></section>
    <section className="configuration-summary" aria-live="polite"><small>Konfigurasi yang akan disimpan</small><strong>{configurationSummary(snapshot)}</strong></section>
    {errors.length>0&&<div className="builder-errors" role="alert"><strong>Belum dapat dipublish:</strong><ul>{errors.map(error=><li key={error}>{error}</li>)}</ul></div>}
    <div className="builder-footer">{isNew?<Link className="button button-secondary" href="/teacher/questions">← Bank Soal</Link>:publishAction&&<button className="button button-secondary" formAction={publishAction} data-intent="publish" type="submit"><span>Publish Immutable Version</span> <Help term="Publish Immutable Version"/></button>}<button className="button" type="submit">Simpan Draft</button></div>
  </form>;
}
