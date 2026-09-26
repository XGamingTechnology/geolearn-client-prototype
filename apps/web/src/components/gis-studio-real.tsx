"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./gis-studio-real.module.css";

const GisStudioLeafletMap=dynamic(()=>import("./gis-studio-leaflet-map").then((m)=>m.GisStudioLeafletMap),{ssr:false});

type Dataset={id:string;title:string;versionId:string|null;geometryType:string|null;featureCount:number|null;scope:string};
type LayerStyle={
  color?:string;fillColor?:string;weight?:number;fillOpacity?:number;radius?:number;
  markerShape?:"circle"|"square"|"diamond";dashArray?:""|"8 6"|"2 6";
};
type Layer={
  id:string;datasetId:string;datasetVersionId:string;title:string;geometryType:string|null;
  featureCount:number|null;visible:boolean;opacity:number;style:LayerStyle;
};
type DigitizeMode="point"|"line"|"polygon"|null;
type DigitizeVertex=[number,number];

function defaultStyle(layer:Layer):LayerStyle{
  if(layer.geometryType?.includes("Line"))return {color:"#2563eb",weight:4,dashArray:""};
  if(layer.geometryType?.includes("Polygon"))return {color:"#0f766e",fillColor:"#2dd4bf",weight:2,fillOpacity:.25};
  return {color:"#dc2626",fillColor:"#ef4444",weight:2,radius:7,markerShape:"circle"};
}

export function GisStudioReal({projectId,projectTitle,datasets,initialLayers,autoDatasetId}:{
  projectId:string;projectTitle:string;datasets:Dataset[];initialLayers:Layer[];autoDatasetId?:string;
}){
  const router=useRouter();
  const [visibilityOverrides,setVisibilityOverrides]=useState<Record<string,boolean>>({});
  const [styleOverrides,setStyleOverrides]=useState<Record<string,LayerStyle>>({});
  const [openStyleId,setOpenStyleId]=useState<string|null>(null);
  const autoAddedRef=useRef(false);
  const layers=useMemo(()=>initialLayers.map((layer)=>({
    ...layer,
    visible:visibilityOverrides[layer.id]??layer.visible,
    style:styleOverrides[layer.id]??layer.style??{},
  })),[initialLayers,visibilityOverrides,styleOverrides]);
  const [selectedDataset,setSelectedDataset]=useState(autoDatasetId??datasets[0]?.id??"");
  const [activeTool,setActiveTool]=useState<"buffer"|"overlay"|"distance">("buffer");
  const [distance,setDistance]=useState(500);
  const [result,setResult]=useState("");
  const [digitizeError,setDigitizeError]=useState("");
  const [busy,setBusy]=useState(false);
  const [digitizeMode,setDigitizeMode]=useState<DigitizeMode>(null);
  const [digitizeVertices,setDigitizeVertices]=useState<DigitizeVertex[]>([]);
  const [digitizeTitle,setDigitizeTitle]=useState("");

  const available=useMemo(()=>datasets.filter((d)=>!layers.some((l)=>l.datasetId===d.id)),[datasets,layers]);
  const minVertices=digitizeMode==="point"?1:digitizeMode==="line"?2:digitizeMode==="polygon"?3:0;
  const canSaveDigitize=Boolean(digitizeMode&&digitizeTitle.trim()&&digitizeVertices.length>=minVertices);
  const modeLabel=digitizeMode==="point"?"Point":digitizeMode==="line"?"Line":digitizeMode==="polygon"?"Polygon":"";
  const countLabel=digitizeMode==="point"?`${digitizeVertices.length} feature point`:`${digitizeVertices.length} vertex · min ${minVertices}`;

  useEffect(()=>{
    if(!autoDatasetId||autoAddedRef.current||layers.some((layer)=>layer.datasetId===autoDatasetId))return;
    autoAddedRef.current=true;
    fetch(`/api/gis/projects/${projectId}/layers`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({datasetId:autoDatasetId}),
    }).then((response)=>{if(response.ok)router.refresh();});
  },[autoDatasetId,layers,projectId,router]);

  async function addLayer(){
    if(!selectedDataset)return;
    setBusy(true);setResult("");
    const response=await fetch(`/api/gis/projects/${projectId}/layers`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({datasetId:selectedDataset}),
    });
    setBusy(false);
    if(response.ok)router.refresh();else setResult("Gagal menambahkan layer.");
  }

  async function toggle(layer:Layer){
    setBusy(true);
    const response=await fetch(`/api/gis/projects/${projectId}/layers/${layer.id}`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visible:!layer.visible}),
    });
    setBusy(false);
    if(response.ok)setVisibilityOverrides((current)=>({...current,[layer.id]:!layer.visible}));
    else setResult("Gagal mengubah visibilitas.");
  }

  async function saveStyle(layer:Layer,style:LayerStyle){
    setBusy(true);setResult("");
    const response=await fetch(`/api/gis/projects/${projectId}/layers/${layer.id}`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({style}),
    });
    const payload=await response.json().catch(()=>({}));
    setBusy(false);
    if(!response.ok){setResult(payload.error??"Gagal menyimpan style layer.");return;}
    setStyleOverrides((current)=>({...current,[layer.id]:style}));
    setResult(`Style ${layer.title} disimpan.`);
  }

  async function runAnalysis(){
    const first=layers[0],second=layers[1];
    if(!first){setResult("Tambahkan minimal satu layer.");return;}
    if((activeTool==="overlay"||activeTool==="distance")&&!second){setResult("Overlay/Distance membutuhkan dua layer.");return;}
    setBusy(true);setResult("");
    const body=activeTool==="buffer"
      ?{datasetVersionId:first.datasetVersionId,distanceMeters:distance}
      :{aVersionId:first.datasetVersionId,bVersionId:second.datasetVersionId};
    const response=await fetch(`/api/gis/projects/${projectId}/${activeTool}`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
    });
    const payload=await response.json();
    setBusy(false);
    if(!response.ok){setResult(payload.error??"Analisis gagal.");return;}
    if(activeTool==="buffer")setResult(`Buffer selesai · ${payload.featureCount} feature diproses`);
    if(activeTool==="overlay")setResult(`Overlay selesai · ${payload.intersectionCount} pasangan berpotongan`);
    if(activeTool==="distance")setResult(payload.distanceMeters==null?"Tidak ada jarak yang dapat dihitung":`Jarak minimum · ${Math.round(payload.distanceMeters)} m`);
  }

  function beginDigitize(mode:Exclude<DigitizeMode,null>){
    setDigitizeMode(mode);setDigitizeVertices([]);setDigitizeError("");
    setDigitizeTitle(mode==="point"?"Titik baru":mode==="line"?"Garis baru":"Wilayah baru");
    setResult(`Mode digitize ${mode} aktif. Klik peta untuk menambah ${mode==="point"?"feature":"vertex"}.`);
  }

  function addDigitizeVertex(vertex:DigitizeVertex){
    if(!digitizeMode)return;
    setDigitizeError("");
    setDigitizeVertices((current)=>current.length>=2000?current:[...current,vertex]);
  }

  function cancelDigitize(){
    setDigitizeMode(null);setDigitizeVertices([]);setDigitizeTitle("");setDigitizeError("");setResult("");
  }

  function digitizeGeometries(){
    if(digitizeMode==="point")return digitizeVertices.map((coordinates)=>({type:"Point",coordinates}));
    if(digitizeMode==="line")return [{type:"LineString",coordinates:digitizeVertices}];
    return [{type:"Polygon",coordinates:[digitizeVertices]}];
  }

  async function saveDigitize(){
    if(!canSaveDigitize||!digitizeMode)return;
    setBusy(true);setDigitizeError("");setResult("Menyimpan geometry ke PostGIS…");
    try{
      const response=await fetch(`/api/gis/projects/${projectId}/digitize`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({title:digitizeTitle,geometries:digitizeGeometries()}),
      });
      const payload=await response.json().catch(()=>({}));
      if(!response.ok){
        const message=typeof payload.error==="string"?payload.error:"Digitize gagal disimpan.";
        setDigitizeError(message);setResult(message);return;
      }
      const savedCount=digitizeMode==="point"?digitizeVertices.length:1;
      setDigitizeMode(null);setDigitizeVertices([]);setDigitizeTitle("");
      setResult(`Layer digitize tersimpan · ${savedCount} feature · DatasetVersion published.`);
      router.refresh();
    }finally{setBusy(false);}
  }

  return <main className="gis-studio-page">
    <header className="gis-project-bar">
      <div><p className="eyebrow">GIS Studio · PostgreSQL/PostGIS</p><h1>{projectTitle}</h1><span>Project state dan layer binding tersimpan di database.</span></div>
      <div><span className="status-pill">DRAFT</span></div>
    </header>

    <section className="gis-studio-layout">
      <aside className="gis-layer-panel">
        <div className="gis-panel-tabs"><span className="active">Layers</span><span>PostGIS</span></div>
        <div className="gis-real-add">
          <select value={selectedDataset} onChange={(e)=>setSelectedDataset(e.target.value)}>
            <option value="">Pilih dataset</option>{available.map((d)=><option value={d.id} key={d.id}>{d.title}</option>)}
          </select>
          <button className="add-layer-button" disabled={busy||!selectedDataset} onClick={addLayer} type="button">+ Add Layer</button>
        </div>

        <section className={styles.digitizePanel}>
          <div className={styles.digitizeHeader}>
            <div className={styles.digitizeTitle}><span className={styles.digitizeBadge}>✦</span><span>Buat Layer Baru</span></div>
            <p className={styles.digitizeDescription}>Gambar langsung di peta. Satu layer Point dapat berisi banyak feature.</p>
          </div>
          <div className={styles.modeGrid}>{(["point","line","polygon"] as const).map((mode)=><button
            type="button" key={mode} className={`${styles.modeButton} ${digitizeMode===mode?styles.modeActive:""}`}
            onClick={()=>beginDigitize(mode)}>{mode==="point"?"Point":mode==="line"?"Line":"Polygon"}</button>)}</div>
          {digitizeMode&&<div className={styles.editor}>
            <label className={styles.field}>Nama layer<input className={styles.input} value={digitizeTitle} maxLength={220} onChange={(e)=>setDigitizeTitle(e.target.value)}/></label>
            <div className={styles.vertexMeta}><span>{modeLabel} aktif</span><strong>{countLabel}</strong></div>
            <p className={styles.helpText}>{digitizeMode==="point"?"Klik beberapa lokasi; setiap klik menjadi satu feature point dalam dataset yang sama.":"Klik peta untuk menambah vertex. Titik terakhir diberi label agar drawing mudah dilacak."}</p>
            {digitizeError&&<div className={styles.errorBox}>{digitizeError}</div>}
            <div className={styles.actions}>
              <button className={styles.secondaryButton} type="button" disabled={!digitizeVertices.length||busy} onClick={()=>setDigitizeVertices((current)=>current.slice(0,-1))}>{digitizeMode==="point"?"Undo point":"Undo vertex"}</button>
              <button className={styles.secondaryButton} type="button" disabled={!digitizeVertices.length||busy} onClick={()=>setDigitizeVertices([])}>Reset</button>
              <button className={`${styles.secondaryButton} ${styles.cancelButton}`} type="button" disabled={busy} onClick={cancelDigitize}>Batal</button>
              <button className={`button ${styles.saveButton}`} type="button" disabled={!canSaveDigitize||busy} onClick={saveDigitize}>{busy?"Menyimpan…":"Simpan Layer"}</button>
            </div>
          </div>}
        </section>

        <div className="gis-layer-list">{layers.map((layer)=>{
          const style={...defaultStyle(layer),...layer.style};
          const open=openStyleId===layer.id;
          return <article className={"gis-layer-card "+(!layer.visible?"muted":"")} key={layer.id}>
            <div className={styles.layerRow}>
              <button className="layer-visibility" onClick={()=>toggle(layer)} type="button">{layer.visible?"●":"○"}</button>
              <div className={"layer-swatch "+(layer.geometryType?.includes("Line")?"river":layer.geometryType?.includes("Polygon")?"polygon":"point")} />
              <div className={styles.layerIdentity}><strong>{layer.title}</strong><small>{layer.geometryType??"Geometry"} · {layer.featureCount??0} feature</small></div>
              <button className={styles.styleToggle} type="button" onClick={()=>setOpenStyleId(open?null:layer.id)}>Style</button>
            </div>
            {open&&<div className={styles.styleEditor}>
              <label>Warna <input type="color" value={style.color??"#2563eb"} onChange={(e)=>setStyleOverrides((current)=>({...current,[layer.id]:{...style,color:e.target.value}}))}/></label>
              {layer.geometryType?.includes("Polygon")&&<label>Fill <input type="color" value={style.fillColor??"#2dd4bf"} onChange={(e)=>setStyleOverrides((current)=>({...current,[layer.id]:{...style,fillColor:e.target.value}}))}/></label>}
              {!layer.geometryType?.includes("Polygon")&&!layer.geometryType?.includes("Line")&&<>
                <label>Shape <select value={style.markerShape??"circle"} onChange={(e)=>setStyleOverrides((current)=>({...current,[layer.id]:{...style,markerShape:e.target.value as LayerStyle["markerShape"]}}))}><option value="circle">Circle</option><option value="square">Square</option><option value="diamond">Diamond</option></select></label>
                <label>Size <input type="range" min="3" max="24" value={style.radius??7} onChange={(e)=>setStyleOverrides((current)=>({...current,[layer.id]:{...style,radius:Number(e.target.value)}}))}/></label>
              </>}
              {(layer.geometryType?.includes("Line")||layer.geometryType?.includes("Polygon"))&&<label>Width <input type="range" min="1" max="12" value={style.weight??2} onChange={(e)=>setStyleOverrides((current)=>({...current,[layer.id]:{...style,weight:Number(e.target.value)}}))}/></label>}
              {layer.geometryType?.includes("Line")&&<label>Pattern <select value={style.dashArray??""} onChange={(e)=>setStyleOverrides((current)=>({...current,[layer.id]:{...style,dashArray:e.target.value as LayerStyle["dashArray"]}}))}><option value="">Solid</option><option value="8 6">Dashed</option><option value="2 6">Dotted</option></select></label>}
              {layer.geometryType?.includes("Polygon")&&<label>Fill opacity <input type="range" min="0" max="1" step="0.05" value={style.fillOpacity??.25} onChange={(e)=>setStyleOverrides((current)=>({...current,[layer.id]:{...style,fillOpacity:Number(e.target.value)}}))}/></label>}
              <button className={styles.saveStyleButton} type="button" disabled={busy} onClick={()=>saveStyle(layer,{...defaultStyle(layer),...(styleOverrides[layer.id]??layer.style)})}>Simpan Style</button>
            </div>}
          </article>;
        })}</div>
        {!layers.length&&<div className="gis-empty-layer">Belum ada layer. Pilih dataset dari Bank Data atau buat layer baru.</div>}
      </aside>

      <div className="gis-map-workspace">
        <div className="gis-tool-dock">
          {(["buffer","overlay","distance"] as const).map((tool)=><button className={activeTool===tool?"active":""} onClick={()=>setActiveTool(tool)} key={tool} type="button">{tool}</button>)}
          {activeTool==="buffer"&&<label className="gis-distance-input">Radius <input type="number" min={1} max={100000} value={distance} onChange={(e)=>setDistance(Number(e.target.value))}/> m</label>}
          <button className="button" disabled={busy||Boolean(digitizeMode)} onClick={runAnalysis} type="button">{busy?"Running...":"Run PostGIS"}</button>
        </div>

        <GisStudioLeafletMap
          projectId={projectId}
          refreshKey={layers.map((layer)=>layer.id+":"+layer.visible+":"+layer.opacity+":"+JSON.stringify(layer.style)).join("|")}
          digitizeMode={digitizeMode} digitizeVertices={digitizeVertices} onAddDigitizeVertex={addDigitizeVertex}
        />
        <div className="gis-map-note"><strong>{digitizeMode?"Digitize mode":"Authoritative analysis"}</strong><span>{result||"Layer ditampilkan dengan Leaflet; Buffer, Overlay, dan Distance dihitung server-side oleh PostGIS."}</span></div>
        <div className="gis-statusbar"><span>{layers.length} layer terikat</span><span>{digitizeMode?`digitize ${digitizeMode}`:activeTool}</span><span>EPSG:4326</span></div>
      </div>
    </section>
    <p className="preview-banner gis-preview-note">Digitized geometry dan uploaded dataset sama-sama disimpan sebagai DatasetVersion; analisis tetap authoritative di PostgreSQL/PostGIS.</p>
  </main>;
}
