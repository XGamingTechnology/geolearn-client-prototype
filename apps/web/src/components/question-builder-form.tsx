"use client";
/* eslint-disable @next/next/no-img-element -- authenticated media preview is dynamic. */

import Link from "next/link";
import {useMemo,useState,type FormEvent,type ReactNode} from "react";
import styles from "./question-builder-form.module.css";
import {
  answerIds,configurationSummary,normalizeAnswers,stimulusControls,validateForPublish,
  type AnswerId,type DatasetLabelConfig,type DatasetRole,type DatasetSelection,type ResponseType,type StimulusType,
} from "@/features/questions/builder";
import {
  mapExperienceOptions,mapInteractionOptions,plannedMapExperiences,plannedMapInteractions,
  recommendationForSpatialMode,normalizeMapExperience,normalizeMapInteractions,
  type MapExperience,type MapInteraction,
} from "@/features/questions/experience";

type Dataset={id:string;title:string;geometryType?:string|null;fields?:string[]};
type Media={id:string;title:string;mediaType:"IMAGE"|"VIDEO"|"DOCUMENT"|"ILLUSTRATION";mimeType:string|null;storageKey:string|null};

export type QuestionBuilderInitial={
  title?:string;subject?:string;topic?:string;scope?:string;spatialMode?:string;difficulty?:string;prompt?:string;stimulusType?:string;responseType?:string;
  answers?:Array<{id:string;label:string}>;correctAnswer?:string;bufferDistance?:number;
  datasetBindings?:DatasetSelection[];allowedGisTools?:string[];requiredGisTools?:string[];
  requiredGisTool?:string;sourceDatasetId?:string;targetDatasetId?:string;
  mapExperience?:string;mapInteractions?:string[];
  stimulusMediaId?:string;mediaAltText?:string;mediaCaption?:string;spatialValidationMethod?:string;maxDistanceMeters?:number;minOverlapRatio?:number;
  feedbackCorrect?:string;feedbackIncorrect?:string;
};

const modes=[
  {id:"location",label:"Location",description:"Posisi, arah, jarak, koordinat, dan relasi lokasi."},
  {id:"condition",label:"Condition",description:"Karakteristik atau kondisi suatu tempat/wilayah."},
  {id:"influence",label:"Influence",description:"Pengaruh suatu fenomena terhadap area atau objek lain."},
  {id:"region",label:"Region",description:"Batas, karakteristik, dan perbedaan antarwilayah."},
  {id:"hierarchy",label:"Hierarchy",description:"Tingkatan, jangkauan pelayanan, dan pusat–wilayah."},
  {id:"analogy",label:"Analogies",description:"Kesamaan pola atau proses antarwilayah."},
  {id:"pattern",label:"Pattern",description:"Distribusi, konsentrasi, susunan, atau pola spasial."},
  {id:"association",label:"Association",description:"Keterkaitan dua atau lebih fenomena spasial."},
] as const;
const difficulties=["Mudah","Sedang","Sulit"] as const;
const gisTools=[
  {id:"buffer",label:"Buffer",description:"Zona jarak dari layer utama (SOURCE)."},
  {id:"overlay",label:"Overlay",description:"Irisan layer utama dengan layer pembanding (TARGET)."},
  {id:"distance",label:"Distance",description:"Jarak minimum SOURCE ke TARGET secara geografis."},
] as const;
const steps=[
  {label:"Pertanyaan",short:"Pertanyaan"},
  {label:"Spatial Thinking",short:"Spatial"},
  {label:"Stimulus & Peta",short:"Stimulus"},
  {label:"Data & Layer",short:"Data"},
  {label:"Interaksi Siswa",short:"Interaksi"},
  {label:"Analisis GIS",short:"Analisis"},
  {label:"Jawaban & Feedback",short:"Jawaban"},
  {label:"Preview",short:"Preview"},
] as const;

const help:Record<string,string>={
  "Dataset Layers":"Pilih layer yang diperlukan. Satu SOURCE untuk analisis utama, maksimal satu TARGET untuk pembanding, sisanya CONTEXT.",
  "GIS Tools":"Aktifkan analisis yang boleh dijalankan siswa. Wajib berarti analisis harus selesai sebelum siswa dapat menjawab.",
  "Feature Labels":"Tentukan field yang boleh tampil sebagai label permanen ketika interaksi Feature Labels diaktifkan.",
  "Publish Immutable Version":"Setelah dipublish, QuestionVersion terkunci. Perubahan berikutnya dibuat sebagai draft versi baru.",
};

function Help({term}:{term:string}){
  return <span className={styles.help} tabIndex={0} role="button" aria-label={`Bantuan: ${term}`}><span aria-hidden="true">i</span><span role="tooltip">{help[term]}</span></span>;
}
function FieldLabel({children,helpTerm}:{children:ReactNode;helpTerm?:string}){
  return <span className={styles.fieldLabel}>{children}{helpTerm&&<Help term={helpTerm}/>}</span>;
}
function seededBindings(initial:QuestionBuilderInitial):DatasetSelection[]{
  if(initial.datasetBindings?.length)return initial.datasetBindings;
  const bindings:DatasetSelection[]=[];
  if(initial.sourceDatasetId)bindings.push({datasetId:initial.sourceDatasetId,role:"SOURCE"});
  if(initial.targetDatasetId)bindings.push({datasetId:initial.targetDatasetId,role:"TARGET"});
  return bindings;
}
function roleLabel(role:DatasetRole){
  if(role==="SOURCE")return "Utama (SOURCE)";
  if(role==="TARGET")return "Pembanding (TARGET)";
  return "Konteks (CONTEXT)";
}

export function QuestionBuilderForm({action,publishAction,datasets,media,initial={},isNew=false}:{action:string;publishAction?:string;datasets:Dataset[];media:Media[];initial?:QuestionBuilderInitial;isNew?:boolean}){
  const [step,setStep]=useState(0);
  const [spatialMode,setSpatialMode]=useState(initial.spatialMode??"location");
  const [stimulus,setStimulus]=useState<StimulusType>((["text","image","video","webgis"].includes(initial.stimulusType??"")?initial.stimulusType:"text") as StimulusType);
  const [response,setResponse]=useState<ResponseType>((initial.responseType??"multiple-choice") as ResponseType);
  const seeded=[...(initial.answers??[])].sort((a,b)=>a.id.localeCompare(b.id)).map((a)=>a.label);
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
  const [mapExperience,setMapExperience]=useState<MapExperience>(()=>normalizeMapExperience(initial.mapExperience));
  const [mapInteractions,setMapInteractions]=useState<MapInteraction[]>(()=>normalizeMapInteractions(initial.mapInteractions));
  const [datasetSearch,setDatasetSearch]=useState("");
  const [errors,setErrors]=useState<string[]>([]);

  const selectedMedia=media.find((item)=>item.id===mediaId);
  const controls=stimulusControls(stimulus);
  const filteredMedia=media.filter((item)=>item.mediaType===stimulus.toUpperCase());
  const selectedMediaSource=selectedMedia?.storageKey&&(selectedMedia.storageKey.startsWith("http://")||selectedMedia.storageKey.startsWith("https://")||selectedMedia.storageKey.startsWith("/"))?selectedMedia.storageKey:(selectedMedia?`/api/media/${selectedMedia.id}`:null);
  const selectedDatasets=bindings.map((binding)=>({binding,dataset:datasets.find((dataset)=>dataset.id===binding.datasetId)})).filter((item)=>item.dataset);
  const availableDatasets=useMemo(()=>datasets.filter((dataset)=>!bindings.some((binding)=>binding.datasetId===dataset.id)&&dataset.title.toLowerCase().includes(datasetSearch.trim().toLowerCase())),[datasets,bindings,datasetSearch]);
  const needsTarget=allowedTools.some((tool)=>tool==="overlay"||tool==="distance");
  const hasTarget=bindings.some((binding)=>binding.role==="TARGET");
  const recommendation=recommendationForSpatialMode(spatialMode);
  const snapshot={stimulusType:stimulus,responseType:response,answers:normalizeAnswers(options),correctAnswer:correct,mediaAssetId:mediaId,selectedMediaType:selectedMedia?.mediaType,datasetBindings:bindings,allowedGisTools:allowedTools,requiredGisTools:requiredTools,bufferDistance:distance,mapExperience,mapInteractions};

  function chooseStimulus(value:StimulusType){
    setStimulus(value);setMediaId("");
    if(value!=="webgis"){
      setBindings([]);setAllowedTools([]);setRequiredTools([]);setMapInteractions([]);setMapExperience("standard");
    }
  }
  function remove(index:number){
    const next=options.filter((_,i)=>i!==index);setOptions(next);
    if(answerIds.indexOf(correct as AnswerId)>=next.length)setCorrect("A");
  }
  function addDataset(datasetId:string){
    setBindings((current)=>[...current,{datasetId,role:current.some((item)=>item.role==="SOURCE")?"CONTEXT":"SOURCE"}]);
  }
  function removeDataset(datasetId:string){setBindings((current)=>current.filter((item)=>item.datasetId!==datasetId));}
  function setDatasetRole(datasetId:string,role:DatasetRole){
    setBindings((current)=>current.map((item)=>{
      if(item.datasetId===datasetId)return {...item,role};
      if((role==="SOURCE"||role==="TARGET")&&item.role===role)return {...item,role:"CONTEXT"};
      return item;
    }));
  }
  function setDatasetLabel(datasetId:string,patch:Partial<DatasetLabelConfig>){
    setBindings((current)=>current.map((item)=>item.datasetId===datasetId?{...item,label:{enabled:item.label?.enabled??false,field:item.label?.field??null,minZoom:item.label?.minZoom??11,...patch}}:item));
  }
  function toggleTool(tool:string,checked:boolean){
    setAllowedTools((current)=>checked?Array.from(new Set([...current,tool])):current.filter((item)=>item!==tool));
    if(!checked)setRequiredTools((current)=>current.filter((item)=>item!==tool));
  }
  function toggleRequired(tool:string,checked:boolean){
    setRequiredTools((current)=>checked?Array.from(new Set([...current,tool])):current.filter((item)=>item!==tool));
    if(checked)setAllowedTools((current)=>Array.from(new Set([...current,tool])));
  }
  function toggleInteraction(interaction:MapInteraction,checked:boolean){
    setMapInteractions((current)=>checked?Array.from(new Set([...current,interaction])):current.filter((item)=>item!==interaction));
  }
  function applyRecommendation(){
    setMapExperience(recommendation.experience);
    setMapInteractions(recommendation.interactions);
    setAllowedTools(recommendation.analysis);
    setRequiredTools([]);
    if(recommendation.analysis.length)setStimulus("webgis");
  }
  function submit(event:FormEvent<HTMLFormElement>){
    const submitter=(event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement|null;
    if(submitter?.dataset.intent!=="publish")return;
    const next=validateForPublish(snapshot);setErrors(next);
    if(next.length){event.preventDefault();setStep(7);requestAnimationFrame(()=>document.querySelector(".builder-errors")?.scrollIntoView({behavior:"smooth",block:"center"}));}
  }

  return <form action={action} method="post" className={styles.form} onSubmit={submit}>
    <div className={styles.builderShell}>
      <aside className={styles.stepRail} aria-label="Langkah Question Builder">
        <div className={styles.railIntro}><span>QUESTION BUILDER</span><strong>{isNew?"Buat soal baru":"Edit draft"}</strong><small>{step+1} dari {steps.length} langkah</small></div>
        <div className={styles.stepList}>{steps.map((item,index)=><button className={`${styles.stepButton} ${index===step?styles.stepActive:""} ${index<step?styles.stepDone:""}`} type="button" onClick={()=>setStep(index)} key={item.label}><b>{index<step?"✓":index+1}</b><span><strong>{item.label}</strong><small>{item.short}</small></span></button>)}</div>
        <div className={styles.railSummary}><small>Konfigurasi saat ini</small><strong>{configurationSummary(snapshot)}</strong></div>
      </aside>

      <div className={styles.editor}>
        <header className={styles.editorHeader}><div><span>LANGKAH {step+1}</span><h2>{steps[step].label}</h2></div><span className={styles.draftPill}>DRAFT</span></header>

        <section className={styles.stepPanel} hidden={step!==0}>
          <div className={styles.sectionIntro}><h3>Susun pertanyaannya</h3><p>Mulai dari konteks akademik dan prompt yang akan dibaca siswa. Detail spasial dipilih pada langkah berikutnya.</p></div>
          <div className={styles.twoCol}><label><FieldLabel>Judul soal</FieldLabel><input name="title" required maxLength={220} defaultValue={initial.title} placeholder="Contoh: Akses sekolah di sekitar Sungai Siak"/></label>{isNew?<label><FieldLabel>Lokasi penyimpanan</FieldLabel><select name="scope" defaultValue={initial.scope??"PRIVATE"}><option value="PRIVATE">Milik Saya</option><option value="SCHOOL">Bank Sekolah</option></select></label>:<label><FieldLabel>Mata pelajaran</FieldLabel><input name="subject" defaultValue={initial.subject}/></label>}</div>
          <div className={styles.twoCol}>{isNew&&<label><FieldLabel>Mata pelajaran</FieldLabel><input name="subject" defaultValue={initial.subject??"Geografi"}/></label>}<label><FieldLabel>Topik</FieldLabel><input name="topic" defaultValue={initial.topic} placeholder="Contoh: Aksesibilitas dan wilayah pengaruh"/></label></div>
          <label><FieldLabel>Pertanyaan / prompt</FieldLabel><textarea name="prompt" required rows={6} defaultValue={initial.prompt} placeholder="Tuliskan apa yang harus diamati, dibandingkan, atau diputuskan siswa…"/></label>
          <fieldset className={styles.difficultyGrid}><legend><FieldLabel>Tingkat kesulitan</FieldLabel></legend>{difficulties.map((value)=><label key={value} className={`${styles.choiceCard} ${difficulty===value?styles.selected:""}`}><input type="radio" name="difficulty" value={value} checked={difficulty===value} onChange={()=>setDifficulty(value)}/><strong>{value}</strong><small>{value==="Mudah"?"Observasi langsung":value==="Sedang"?"Interpretasi beberapa informasi":"Analisis lebih kompleks"}</small></label>)}</fieldset>
        </section>

        <section className={styles.stepPanel} hidden={step!==1}>
          <div className={styles.sectionIntro}><h3>Pilih cara berpikir spasial</h3><p>Spatial Thinking menentukan kemampuan utama yang ingin diukur. GeoLearn akan memberikan rekomendasi pengalaman peta, tetapi guru tetap memegang kendali.</p></div>
          <div className={styles.modeGrid}>{modes.map((mode)=><label className={`${styles.modeCard} ${spatialMode===mode.id?styles.selected:""}`} key={mode.id}><input type="radio" name="spatialMode" value={mode.id} checked={spatialMode===mode.id} onChange={()=>setSpatialMode(mode.id)}/><span className={styles.modeIcon} aria-hidden="true">{mode.id==="location"?"⌖":mode.id==="condition"?"◫":mode.id==="influence"?"◎":mode.id==="region"?"◇":mode.id==="hierarchy"?"≡":mode.id==="analogy"?"⇄":mode.id==="pattern"?"⠿":"∩"}</span><strong>{mode.label}</strong><small>{mode.description}</small></label>)}</div>
          <div className={styles.recommendation}><div><span>SMART RECOMMENDATION</span><strong>{modes.find((mode)=>mode.id===spatialMode)?.label}</strong><p>{recommendation.note}</p><small>Peta: {mapExperienceOptions.find((item)=>item.id===recommendation.experience)?.label} · {recommendation.interactions.length} interaksi{recommendation.analysis.length?` · ${recommendation.analysis.join(", ")}`:" · tanpa analisis wajib"}</small>{recommendation.futureExperience&&<em>Renderer ideal berikutnya: {recommendation.futureExperience}</em>}</div><button type="button" onClick={applyRecommendation}>Terapkan rekomendasi</button></div>
        </section>

        <section className={styles.stepPanel} hidden={step!==2}>
          <div className={styles.sectionIntro}><h3>Pilih stimulus dan pengalaman peta</h3><p>Kompleksitas GIS hanya muncul ketika soal memang membutuhkan peta interaktif.</p></div>
          <fieldset className={styles.stimulusGrid}><legend className={styles.srOnly}>Jenis stimulus</legend>{([['text','Teks','Pertanyaan berbasis teks tanpa peta interaktif.'],['image','Gambar','Gunakan gambar, peta statis, atau ilustrasi.'],['video','Video','Gunakan video sebagai stimulus utama.'],['webgis','WebGIS','Peta interaktif dengan layer, kontrol, dan analisis terpilih.']] as const).map(([value,label,description])=><label key={value} className={`${styles.stimulusCard} ${stimulus===value?styles.selected:""}`}><input type="radio" name="stimulusType" value={value} checked={stimulus===value} onChange={()=>chooseStimulus(value)}/><span aria-hidden="true">{value==="text"?"T":value==="image"?"▣":value==="video"?"▶":"◎"}</span><strong>{label}</strong><small>{description}</small></label>)}</fieldset>

          {controls.media&&<div className={styles.conditionalCard}><label><FieldLabel>Media dari Bank Media</FieldLabel><select name="stimulusMediaId" value={mediaId} onChange={e=>setMediaId(e.target.value)}><option value="">Pilih media…</option>{filteredMedia.map(m=><option value={m.id} key={m.id}>{m.title}</option>)}</select></label>{selectedMedia&&<div className={styles.selectedAsset}><div><strong>{selectedMedia.title}</strong><span>{selectedMedia.mediaType} · {selectedMedia.mimeType??"tipe file belum tersedia"}</span></div>{selectedMedia.mediaType==="IMAGE"?<img src={selectedMediaSource!} alt="Pratinjau media terpilih"/>:<video src={selectedMediaSource!} controls preload="metadata"/>}</div>}<div className={styles.twoCol}><label><FieldLabel>Alt text</FieldLabel><input name="mediaAltText" defaultValue={initial.mediaAltText}/></label><label><FieldLabel>Caption</FieldLabel><input name="mediaCaption" defaultValue={initial.mediaCaption}/></label></div></div>}

          {stimulus==="webgis"&&<div className={styles.conditionalCard}><div className={styles.subhead}><div><strong>Pengalaman Peta</strong><p>Pilih kerangka layout. Kontrol siswa ditentukan terpisah pada langkah Interaksi.</p></div></div><div className={styles.experienceGrid}>{mapExperienceOptions.map((option)=><label key={option.id} className={`${styles.experienceCard} ${mapExperience===option.id?styles.selected:""}`}><input type="radio" name="mapExperience" value={option.id} checked={mapExperience===option.id} onChange={()=>setMapExperience(option.id)}/><span className={styles.experienceVisual} data-kind={option.id}><i/><i/></span><strong>{option.label}</strong><small>{option.description}</small></label>)}</div><div className={styles.plannedRow}>{plannedMapExperiences.map((option)=><div className={styles.plannedCard} key={option.id}><span>RENCANA</span><strong>{option.label}</strong><small>{option.description}</small></div>)}</div></div>}
        </section>

        <section className={styles.stepPanel} hidden={step!==3}>
          <div className={styles.sectionIntro}><h3>Hubungkan data dan tentukan peran layer</h3><p>{stimulus==="webgis"?"SOURCE adalah layer utama untuk analisis, TARGET adalah pembanding, dan CONTEXT memberi konteks visual tambahan.":"Langkah ini hanya digunakan untuk stimulus WebGIS."}</p></div>
          {stimulus!=="webgis"?<div className={styles.notNeeded}><span>✓</span><div><strong>Tidak membutuhkan dataset WebGIS</strong><p>Stimulus {stimulus} dapat dilanjutkan langsung ke konfigurasi jawaban.</p></div></div>:<>
            <input type="hidden" name="datasetBindingsJson" value={JSON.stringify(bindings)}/>
            <div className={styles.datasetBlock}><div className={styles.datasetHeader}><div><strong><FieldLabel helpTerm="Dataset Layers">Layer terpilih</FieldLabel></strong><p>Tambahkan dataset lalu tetapkan perannya.</p></div><span>{bindings.length} layer</span></div><div className={styles.selectedLayers}>{selectedDatasets.length===0?<div className={styles.emptySelection}>Belum ada layer. Tambahkan dataset dari daftar di bawah.</div>:selectedDatasets.map(({binding,dataset})=><div className={styles.selectedLayer} key={binding.datasetId}><div className={styles.layerInfo}><strong>{dataset!.title}</strong><span>{dataset!.geometryType??"Geometry"} · {(dataset!.fields??[]).length} field</span></div><select className={styles.roleSelect} aria-label={`Peran ${dataset!.title}`} value={binding.role} onChange={(event)=>setDatasetRole(binding.datasetId,event.target.value as DatasetRole)}><option value="SOURCE">Utama (SOURCE)</option><option value="TARGET">Pembanding (TARGET)</option><option value="CONTEXT">Konteks (CONTEXT)</option></select><button className={styles.removeLayer} type="button" onClick={()=>removeDataset(binding.datasetId)}>Hapus</button></div>)}</div><div className={styles.datasetSearch}><input type="search" placeholder="Cari dataset…" value={datasetSearch} onChange={(event)=>setDatasetSearch(event.target.value)}/><span>{availableDatasets.length} tersedia</span></div><div className={styles.availableList}>{availableDatasets.slice(0,20).map((dataset)=><div className={styles.availableItem} key={dataset.id}><div><strong>{dataset.title}</strong><span>{dataset.geometryType??"Geometry"} · {(dataset.fields??[]).length} field</span></div><button type="button" onClick={()=>addDataset(dataset.id)}>+ Tambah</button></div>)}{availableDatasets.length===0&&<div className={styles.noResults}>Tidak ada dataset lain yang cocok.</div>}</div></div>
          </>}
        </section>

        <section className={styles.stepPanel} hidden={step!==4}>
          <div className={styles.sectionIntro}><h3>Pilih apa yang boleh dilakukan siswa</h3><p>Ini adalah inti Adaptive Spatial Runtime. Aktifkan hanya kemampuan yang memang dibutuhkan pertanyaan.</p></div>
          {stimulus!=="webgis"?<div className={styles.notNeeded}><span>✓</span><div><strong>Tidak ada interaksi peta</strong><p>Stimulus non-WebGIS tidak menampilkan kontrol GIS.</p></div></div>:<>
            <div className={styles.interactionGroups}>{(["explore","data","orientation"] as const).map((group)=><section key={group}><div className={styles.interactionHeading}><strong>{group==="explore"?"Eksplorasi Peta":group==="data"?"Informasi & Data":"Navigasi & Orientasi"}</strong><small>{group==="explore"?"Atur layer dan konteks visual.":group==="data"?"Atur bagaimana atribut feature dibaca.":"Atur bantuan pencarian dan koordinat."}</small></div><div className={styles.interactionGrid}>{mapInteractionOptions.filter((item)=>item.group===group).map((interaction)=>{const enabled=mapInteractions.includes(interaction.id);return <label className={`${styles.interactionCard} ${enabled?styles.selected:""}`} key={interaction.id}><input type="checkbox" name="mapInteraction" value={interaction.id} checked={enabled} onChange={(event)=>toggleInteraction(interaction.id,event.target.checked)}/><span className={styles.toggleVisual} aria-hidden="true"/><div><strong>{interaction.label}</strong><small>{interaction.description}</small></div></label>})}</div></section>)}</div>
            {mapInteractions.includes("feature-labels")&&<div className={styles.labelConfigurator}><div className={styles.subhead}><div><strong><FieldLabel helpTerm="Feature Labels">Konfigurasi Feature Labels</FieldLabel></strong><p>Pilih field label per layer. Runtime hanya menampilkannya ketika Feature Labels aktif.</p></div></div>{selectedDatasets.length===0?<div className={styles.emptySelection}>Tambahkan dataset terlebih dahulu.</div>:selectedDatasets.map(({binding,dataset})=>{const fields=dataset!.fields??[];const labelEnabled=binding.label?.enabled===true;return <div className={styles.labelRow} key={binding.datasetId}><div><strong>{dataset!.title}</strong><small>{roleLabel(binding.role)}</small></div><label><input type="checkbox" checked={labelEnabled} disabled={!fields.length} onChange={(event)=>setDatasetLabel(binding.datasetId,{enabled:event.target.checked,field:event.target.checked?(binding.label?.field||fields[0]||null):binding.label?.field})}/> Aktifkan label layer</label>{labelEnabled&&<><select value={binding.label?.field??""} onChange={(event)=>setDatasetLabel(binding.datasetId,{field:event.target.value})}><option value="">Pilih field…</option>{fields.map((field)=><option value={field} key={field}>{field}</option>)}</select><label>Min zoom <input type="number" min={0} max={22} value={binding.label?.minZoom??11} onChange={(event)=>setDatasetLabel(binding.datasetId,{minZoom:Number(event.target.value)})}/></label></>}</div>})}</div>}
            <div className={styles.plannedRow}>{plannedMapInteractions.map((item)=><div className={styles.plannedCard} key={item.id}><span>RENCANA</span><strong>{item.label}</strong><small>{item.description}</small></div>)}</div>
          </>}
        </section>

        <section className={styles.stepPanel} hidden={step!==5}>
          <div className={styles.sectionIntro}><h3>Analisis GIS</h3><p>Bedakan kemampuan eksplorasi peta dari analisis authoritative. Saat ini GeoLearn mengeksekusi Buffer, Overlay, dan Distance melalui PostGIS.</p></div>
          {stimulus!=="webgis"?<div className={styles.notNeeded}><span>✓</span><div><strong>Tanpa analisis GIS</strong><p>Analisis hanya tersedia pada stimulus WebGIS.</p></div></div>:<div className={styles.toolSection}>{needsTarget&&!hasTarget&&<div className={styles.warning}>Overlay atau Distance memerlukan satu layer Pembanding (TARGET).</div>}<div className={styles.toolGrid}>{gisTools.map((tool)=>{const enabled=allowedTools.includes(tool.id);const required=requiredTools.includes(tool.id);return <article className={`${styles.toolCard} ${enabled?styles.selected:""}`} key={tool.id}><label className={styles.toolMain}><input type="checkbox" name="allowedGisTool" value={tool.id} checked={enabled} onChange={(event)=>toggleTool(tool.id,event.target.checked)}/><span><strong>{tool.label}</strong><small>{tool.description}</small></span></label>{enabled&&<label className={styles.requiredToggle}><input type="checkbox" name="requiredGisTool" value={tool.id} checked={required} onChange={(event)=>toggleRequired(tool.id,event.target.checked)}/><span><strong>{required?"Wajib sebelum menjawab":"Opsional"}</strong><small>{required?"Jawaban terkunci sampai analisis selesai.":"Siswa boleh menggunakan analisis ini bila diperlukan."}</small></span></label>}</article>})}</div>{allowedTools.includes("buffer")&&<label className={styles.bufferField}><FieldLabel>Jarak Buffer</FieldLabel><div><input name="bufferDistance" type="number" min={1} max={100000} value={distance} onChange={e=>setDistance(Number(e.target.value))}/><span>meter</span></div></label>}<div className={styles.futureAnalysis}><span>FITUR LANJUTAN</span><strong>Multi-ring Buffer & Network / Route</strong><p>Disimpan sebagai roadmap lintas-stack dan belum ditawarkan sebagai fungsi aktif sampai executor authoritative tersedia.</p></div></div>}
        </section>

        <section className={styles.stepPanel} hidden={step!==6}>
          <div className={styles.sectionIntro}><h3>Tentukan bentuk jawaban</h3><p>Jawaban dapat berupa pilihan ganda atau respons langsung pada peta. Feedback bersifat opsional.</p></div>
          <input type="hidden" name="responseType" value={response}/>
          <div className={styles.responseGrid}><button className={`${styles.responseCard} ${response==="multiple-choice"?styles.selected:""}`} type="button" onClick={()=>setResponse("multiple-choice")}><span>A</span><strong>Pilihan Ganda</strong><small>Siswa memilih satu jawaban.</small></button><button className={`${styles.responseCard} ${response!=="multiple-choice"?styles.selected:""}`} type="button" onClick={()=>setResponse("draw-point")} disabled={stimulus!=="webgis"}><span>⌖</span><strong>Jawaban Spasial</strong><small>Gambar atau pilih feature pada peta.</small></button></div>
          {response==="multiple-choice"?<div className={styles.answerEditor}><div className={styles.subhead}><div><strong>Pilihan jawaban</strong><p>Tambahkan 2–5 pilihan. Pilih satu sebagai kunci.</p></div></div>{options.map((value,index)=><div key={index} className={styles.answerRow}><label className={correct===answerIds[index]?styles.correctChoice:""}><input type="radio" name="correctAnswer" value={answerIds[index]} checked={correct===answerIds[index]} onChange={()=>setCorrect(answerIds[index])}/><b>{answerIds[index]}</b></label><input name={`answer_${answerIds[index]}`} value={value} aria-label={`Pilihan ${answerIds[index]}`} onChange={e=>setOptions(options.map((x,i)=>i===index?e.target.value:x))} placeholder={`Pilihan ${answerIds[index]}`}/><button type="button" onClick={()=>remove(index)} disabled={options.length<=2}>Hapus</button></div>)}{options.length<5&&<button className={styles.inlineAction} type="button" onClick={()=>setOptions([...options,""])}>+ Tambah pilihan</button>}</div>:<div className={styles.spatialAnswer}><label><FieldLabel>Jenis respons spasial</FieldLabel><select value={response} onChange={e=>setResponse(e.target.value as ResponseType)}><option value="draw-point">Titik di peta</option><option value="draw-line">Garis di peta</option><option value="draw-polygon">Area / polygon di peta</option><option value="feature-select">Pilih feature</option></select></label><div className={styles.twoCol}><label><FieldLabel>Validasi spasial</FieldLabel><select name="spatialValidationMethod" defaultValue={initial.spatialValidationMethod??"manual-review"}><option value="manual-review">Review manual</option><option value="geometry-distance">Toleransi jarak</option><option value="geometry-overlap">Minimum overlap</option><option value="selected-feature-rule">Aturan feature terpilih</option></select></label><label><FieldLabel>Max distance (m)</FieldLabel><input name="maxDistanceMeters" type="number" min={0} defaultValue={initial.maxDistanceMeters??100}/></label></div><label><FieldLabel>Minimum overlap ratio (0–1)</FieldLabel><input name="minOverlapRatio" type="number" min={0} max={1} step={.05} defaultValue={initial.minOverlapRatio??.5}/></label></div>}
          <div className={styles.feedbackBox}><div className={styles.subhead}><div><strong>Feedback opsional</strong><p>Berikan arahan singkat setelah jawaban dinilai.</p></div></div><label>Jika benar<textarea name="feedbackCorrect" rows={3} defaultValue={initial.feedbackCorrect}/></label><label>Jika belum tepat<textarea name="feedbackIncorrect" rows={3} defaultValue={initial.feedbackIncorrect}/></label></div>
        </section>

        <section className={styles.stepPanel} hidden={step!==7}>
          <div className={styles.sectionIntro}><h3>Preview pengalaman siswa</h3><p>Periksa konfigurasi sebelum menyimpan atau publish. Renderer siswa adaptif akan membaca pilihan yang sama dari QuestionVersion.</p></div>
          <div className={styles.previewGrid}><article className={styles.studentPreview}><div className={styles.previewTop}><span>{stimulus.toUpperCase()}</span><em>{modes.find((mode)=>mode.id===spatialMode)?.label}</em></div><div className={styles.previewMap}>{stimulus==="webgis"?<><div className={styles.fakeMap}><i/><i/><i/><span>{mapExperienceOptions.find((item)=>item.id===mapExperience)?.label}</span></div><div className={styles.previewControls}>{mapInteractions.length?mapInteractions.slice(0,6).map((item)=><span key={item}>{mapInteractionOptions.find((option)=>option.id===item)?.label??item}</span>):<span>Tanpa kontrol tambahan</span>}</div></>:stimulus==="image"?<div className={styles.mediaPlaceholder}>GAMBAR</div>:stimulus==="video"?<div className={styles.mediaPlaceholder}>VIDEO</div>:<div className={styles.textPlaceholder}>STIMULUS TEKS</div>}</div><div className={styles.previewQuestion}><strong>{initial.title||"Judul soal akan tampil di sini"}</strong><p>{initial.prompt||"Prompt siswa mengikuti isi pada langkah Pertanyaan."}</p><small>{response==="multiple-choice"?`${normalizeAnswers(options).length} pilihan jawaban`:response.replaceAll("-"," ")}</small></div></article><aside className={styles.reviewPanel}><div><small>Spatial Thinking</small><strong>{modes.find((mode)=>mode.id===spatialMode)?.label}</strong></div><div><small>Pengalaman Peta</small><strong>{stimulus==="webgis"?(mapExperienceOptions.find((item)=>item.id===mapExperience)?.label??mapExperience):"Tidak digunakan"}</strong></div><div><small>Layer</small><strong>{stimulus==="webgis"?bindings.length:0}</strong></div><div><small>Interaksi</small><strong>{stimulus==="webgis"?mapInteractions.length:0}</strong></div><div><small>Analisis GIS</small><strong>{allowedTools.length?allowedTools.join(", "):"Tidak ada"}</strong></div><div><small>Jawaban</small><strong>{response.replaceAll("-"," ")}</strong></div></aside></div>
          <section className={styles.configurationSummary} aria-live="polite"><small>Konfigurasi yang akan disimpan</small><strong>{configurationSummary(snapshot)}</strong></section>
          {errors.length>0&&<div className="builder-errors"><strong>Belum dapat dipublish:</strong><ul>{errors.map(error=><li key={error}>{error}</li>)}</ul></div>}
        </section>

        <footer className={styles.footer}><button className={styles.secondaryButton} type="button" disabled={step===0} onClick={()=>setStep((current)=>Math.max(0,current-1))}>← Sebelumnya</button><div className={styles.footerCenter}><button className={styles.saveButton} type="submit">Simpan Draft</button>{step===7&&publishAction&&<button className={styles.publishButton} formAction={publishAction} data-intent="publish" type="submit">Publish</button>}</div>{step<steps.length-1?<button className={styles.nextButton} type="button" onClick={()=>setStep((current)=>Math.min(steps.length-1,current+1))}>Berikutnya →</button>:isNew?<span className={styles.finishNote}>Simpan draft dulu untuk mendapatkan QuestionVersion.</span>:<Link className={styles.bankLink} href="/teacher/questions">Kembali ke Bank Soal</Link>}</footer>
      </div>
    </div>
  </form>;
}
