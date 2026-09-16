"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const GisStudioLeafletMap=dynamic(()=>import("./gis-studio-leaflet-map").then((m)=>m.GisStudioLeafletMap),{ssr:false});

type Dataset = {
  id:string; title:string; versionId:string|null; geometryType:string|null; featureCount:number|null; scope:string;
};
type Layer = {
  id:string; datasetId:string; datasetVersionId:string; title:string; geometryType:string|null;
  featureCount:number|null; visible:boolean; opacity:number;
};

export function GisStudioReal({
  projectId,
  projectTitle,
  datasets,
  initialLayers,
  autoDatasetId,
}:{
  projectId:string;
  projectTitle:string;
  datasets:Dataset[];
  initialLayers:Layer[];
  autoDatasetId?:string;
}){
  const router=useRouter();
  const [layers,setLayers]=useState(initialLayers);
  const autoAddedRef=useRef(false);
  useEffect(()=>setLayers(initialLayers),[initialLayers]);
  const [selectedDataset,setSelectedDataset]=useState(autoDatasetId??datasets[0]?.id??"");
  const [activeTool,setActiveTool]=useState<"buffer"|"overlay"|"distance">("buffer");
  const [distance,setDistance]=useState(500);
  const [result,setResult]=useState("");
  const [busy,setBusy]=useState(false);

  const available=useMemo(()=>datasets.filter((d)=>!layers.some((l)=>l.datasetId===d.id)),[datasets,layers]);

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
    if(response.ok) router.refresh(); else setResult("Gagal menambahkan layer.");
  }

  async function toggle(layer:Layer){
    setBusy(true);
    const response=await fetch(`/api/gis/projects/${projectId}/layers/${layer.id}`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({visible:!layer.visible}),
    });
    setBusy(false);
    if(response.ok){
      setLayers((current)=>current.map((x)=>x.id===layer.id?{...x,visible:!x.visible}:x));
    }else setResult("Gagal mengubah visibilitas.");
  }

  async function runAnalysis(){
    const first=layers[0],second=layers[1];
    if(!first){setResult("Tambahkan minimal satu layer.");return;}
    if((activeTool==="overlay"||activeTool==="distance")&&!second){setResult("Overlay/Distance membutuhkan dua layer.");return;}
    setBusy(true);setResult("");
    let body:Record<string,unknown>;
    if(activeTool==="buffer") body={datasetVersionId:first.datasetVersionId,distanceMeters:distance};
    else body={aVersionId:first.datasetVersionId,bVersionId:second.datasetVersionId};
    const response=await fetch(`/api/gis/projects/${projectId}/${activeTool}`,{
      method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),
    });
    const payload=await response.json();
    setBusy(false);
    if(!response.ok){setResult(payload.error??"Analisis gagal.");return;}
    if(activeTool==="buffer") setResult(`Buffer selesai · ${payload.featureCount} feature diproses`);
    if(activeTool==="overlay") setResult(`Overlay selesai · ${payload.intersectionCount} pasangan berpotongan`);
    if(activeTool==="distance") setResult(payload.distanceMeters==null?"Tidak ada jarak yang dapat dihitung":`Jarak minimum · ${Math.round(payload.distanceMeters)} m`);
  }

  return (
    <main className="gis-studio-page">
      <header className="gis-project-bar">
        <div><p className="eyebrow">GIS Studio · PostgreSQL/PostGIS</p><h1>{projectTitle}</h1><span>Project state dan layer binding tersimpan di database.</span></div>
        <div><span className="status-pill">DRAFT</span></div>
      </header>

      <section className="gis-studio-layout">
        <aside className="gis-layer-panel">
          <div className="gis-panel-tabs"><span className="active">Layers</span><span>PostGIS</span></div>
          <div className="gis-real-add">
            <select value={selectedDataset} onChange={(e)=>setSelectedDataset(e.target.value)}>
              <option value="">Pilih dataset</option>
              {available.map((d)=><option value={d.id} key={d.id}>{d.title}</option>)}
            </select>
            <button className="add-layer-button" disabled={busy||!selectedDataset} onClick={addLayer} type="button">+ Add Layer</button>
          </div>

          <div className="gis-layer-list">
            {layers.map((layer)=>(
              <article className={"gis-layer-card "+(!layer.visible?"muted":"")} key={layer.id}>
                <button className="layer-visibility" onClick={()=>toggle(layer)} type="button">{layer.visible?"●":"○"}</button>
                <div className={"layer-swatch "+(layer.geometryType?.includes("Line")?"river":layer.geometryType?.includes("Polygon")?"polygon":"point")} />
                <div><strong>{layer.title}</strong><small>{layer.geometryType??"Geometry"} · {layer.featureCount??0} feature</small></div>
                <span>{Math.round(layer.opacity*100)}%</span>
              </article>
            ))}
          </div>
          {!layers.length&&<div className="gis-empty-layer">Belum ada layer. Pilih dataset dari Bank Data.</div>}
        </aside>

        <div className="gis-map-workspace">
          <div className="gis-tool-dock">
            {(["buffer","overlay","distance"] as const).map((tool)=><button className={activeTool===tool?"active":""} onClick={()=>setActiveTool(tool)} key={tool} type="button">{tool}</button>)}
            {activeTool==="buffer"&&<label className="gis-distance-input">Radius <input type="number" min={1} max={100000} value={distance} onChange={(e)=>setDistance(Number(e.target.value))}/> m</label>}
            <button className="button" disabled={busy} onClick={runAnalysis} type="button">{busy?"Running...":"Run PostGIS"}</button>
          </div>

          <GisStudioLeafletMap projectId={projectId} refreshKey={layers.map((layer)=>layer.id+":"+layer.visible+":"+layer.opacity).join("|")}/>
          <div className="gis-map-note"><strong>Authoritative analysis</strong><span>{result||"Layer ditampilkan dengan Leaflet; Buffer, Overlay, dan Distance dihitung server-side oleh PostGIS."}</span></div>

          <div className="gis-statusbar"><span>{layers.length} layer terikat</span><span>{activeTool}</span><span>EPSG:4326</span></div>
        </div>
      </section>
      <p className="preview-banner gis-preview-note">Layer GeoJSON dirender dengan Leaflet; analisis tetap authoritative di PostgreSQL/PostGIS.</p>
    </main>
  );
}
