"use client";

import {useEffect,useMemo,useState} from "react";
import type {Feature,FeatureCollection,GeoJsonObject,Geometry} from "geojson";
import styles from "./assessment-attribute-table.module.css";

export type AttributeMapLayer={
  datasetVersionId:string;
  title:string;
  role:"SOURCE"|"TARGET"|"CONTEXT";
  geojson:GeoJsonObject;
};

export type SelectedMapFeature={layerId:string;featureIndex:number}|null;

const PAGE_SIZE=25;

type Scalar=string|number|boolean|null;
type Row={feature:Feature<Geometry>;featureIndex:number;properties:Record<string,Scalar>};

function isScalar(value:unknown):value is Scalar{
  return value===null||typeof value==="string"||typeof value==="number"||typeof value==="boolean";
}

export function featuresOf(geojson:GeoJsonObject):Feature<Geometry>[] {
  if(geojson.type==="FeatureCollection"){
    const collection=geojson as FeatureCollection<Geometry>;
    return collection.features.filter((feature):feature is Feature<Geometry>=>feature.geometry!==null);
  }
  if(geojson.type==="Feature"){
    const feature=geojson as Feature<Geometry>;
    return feature.geometry?[feature]:[];
  }
  return [];
}

function valueText(value:Scalar|undefined){
  if(value===null||value===undefined)return "—";
  return typeof value==="boolean"?(value?"Ya":"Tidak"):String(value);
}

function compareScalar(a:Scalar|undefined,b:Scalar|undefined){
  if(a===null||a===undefined)return b===null||b===undefined?0:1;
  if(b===null||b===undefined)return -1;
  if(typeof a==="number"&&typeof b==="number")return a-b;
  return String(a).localeCompare(String(b),"id",{numeric:true,sensitivity:"base"});
}

export function AssessmentAttributeTable({
  layers,
  open,
  onOpenChange,
  activeLayerId,
  onActiveLayerChange,
  selected,
  onSelect,
}:{
  layers:AttributeMapLayer[];
  open:boolean;
  onOpenChange:(value:boolean)=>void;
  activeLayerId:string;
  onActiveLayerChange:(value:string)=>void;
  selected:SelectedMapFeature;
  onSelect:(value:Exclude<SelectedMapFeature,null>)=>void;
}){
  const [query,setQuery]=useState("");
  const [sortField,setSortField]=useState("");
  const [sortDirection,setSortDirection]=useState<"asc"|"desc">("asc");
  const [page,setPage]=useState(1);

  const activeLayer=layers.find((layer)=>layer.datasetVersionId===activeLayerId)??layers[0]??null;

  const rows=useMemo<Row[]>(()=>{
    if(!activeLayer)return [];
    return featuresOf(activeLayer.geojson).map((feature,featureIndex)=>({
      feature,
      featureIndex,
      properties:Object.fromEntries(Object.entries(feature.properties??{}).filter(([,value])=>isScalar(value))) as Record<string,Scalar>,
    }));
  },[activeLayer]);

  const fields=useMemo(()=>{
    const names=new Set<string>();
    for(const row of rows)for(const key of Object.keys(row.properties))names.add(key);
    return [...names].sort((a,b)=>a.localeCompare(b,"id",{sensitivity:"base"})).slice(0,18);
  },[rows]);

  const filteredRows=useMemo(()=>{
    const needle=query.trim().toLocaleLowerCase("id");
    const filtered=!needle?rows:rows.filter((row)=>fields.some((field)=>valueText(row.properties[field]).toLocaleLowerCase("id").includes(needle)));
    if(!sortField)return filtered;
    return [...filtered].sort((a,b)=>{
      const compared=compareScalar(a.properties[sortField],b.properties[sortField]);
      return sortDirection==="asc"?compared:-compared;
    });
  },[fields,query,rows,sortDirection,sortField]);

  const totalPages=Math.max(1,Math.ceil(filteredRows.length/PAGE_SIZE));
  const safePage=Math.min(page,totalPages);
  const pageRows=filteredRows.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);

  useEffect(()=>{
    if(!selected||selected.layerId!==activeLayer?.datasetVersionId)return;
    const index=filteredRows.findIndex((row)=>row.featureIndex===selected.featureIndex);
    if(index<0)return;
    const targetPage=Math.floor(index/PAGE_SIZE)+1;
    const frame=requestAnimationFrame(()=>setPage(targetPage));
    return()=>cancelAnimationFrame(frame);
  },[activeLayer?.datasetVersionId,filteredRows,selected]);

  function toggleSort(field:string){
    setPage(1);
    if(sortField===field)setSortDirection((current)=>current==="asc"?"desc":"asc");
    else{setSortField(field);setSortDirection("asc");}
  }

  if(!layers.length)return null;

  return <section className={styles.shell}>
    <button className={styles.toggle} type="button" onClick={()=>onOpenChange(!open)} aria-expanded={open}>
      <span>Attribute Table</span><small>{open?"Tutup tabel":"Buka data tabular layer"}</small>
    </button>
    {open&&<div className={styles.panel}>
      <div className={styles.controls}>
        <label>Layer<select value={activeLayer?.datasetVersionId??""} onChange={(event)=>{setPage(1);onActiveLayerChange(event.target.value);}}>{layers.map((layer)=><option value={layer.datasetVersionId} key={layer.datasetVersionId}>{layer.title} · {layer.role}</option>)}</select></label>
        <label>Cari atribut<input value={query} onChange={(event)=>{setPage(1);setQuery(event.target.value);}} placeholder="Cari nama, kelas, nilai…"/></label>
        <div className={styles.summary}><strong>{filteredRows.length}</strong><span>dari {rows.length} feature</span></div>
      </div>
      <div className={styles.tableScroller}>
        <table>
          <thead><tr><th>#</th>{fields.map((field)=><th key={field}><button type="button" onClick={()=>toggleSort(field)}>{field}{sortField===field?<span>{sortDirection==="asc"?" ↑":" ↓"}</span>:null}</button></th>)}</tr></thead>
          <tbody>{pageRows.map((row)=><tr
            key={row.featureIndex}
            className={selected?.layerId===activeLayer?.datasetVersionId&&selected.featureIndex===row.featureIndex?styles.selectedRow:""}
            onClick={()=>activeLayer&&onSelect({layerId:activeLayer.datasetVersionId,featureIndex:row.featureIndex})}
          ><td>{row.featureIndex+1}</td>{fields.map((field)=><td key={field}>{valueText(row.properties[field])}</td>)}</tr>)}</tbody>
        </table>
        {!pageRows.length&&<div className={styles.empty}>Tidak ada feature yang cocok dengan pencarian.</div>}
      </div>
      <footer className={styles.footer}><span>Halaman {safePage} dari {totalPages}</span><div><button type="button" disabled={safePage<=1} onClick={()=>setPage((current)=>Math.max(1,current-1))}>Sebelumnya</button><button type="button" disabled={safePage>=totalPages} onClick={()=>setPage((current)=>Math.min(totalPages,current+1))}>Berikutnya</button></div></footer>
      <p className={styles.note}>Tabel ini read-only. Klik baris untuk menyorot dan menuju feature pada peta. Search/sort tidak mengubah DatasetVersion atau grading.</p>
    </div>}
  </section>;
}
