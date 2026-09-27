"use client";

import {type ReactNode,useState} from "react";

import styles from "./map-workspace.module.css";

type ToolIconName="layers"|"basemap"|"search"|"coordinates"|"data"|"table";
export type MapWorkspaceTool={id:string;label:string;icon:ToolIconName;content:ReactNode};
export type MapWorkspaceDrawer={id:string;label:string;icon:ToolIconName;content:ReactNode;open:boolean;onOpenChange:(open:boolean)=>void};

function ToolIcon({name}:{name:MapWorkspaceTool["icon"]}){
  if(name==="layers")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5"/></svg>;
  if(name==="basemap")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/></svg>;
  if(name==="search")return <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5"/></svg>;
  if(name==="coordinates")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>;
  if(name==="data")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v14H4zM8 9h8M8 13h8M8 17h5"/></svg>;
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3zM3 10h18M9 5v14M15 5v14"/></svg>;
}

/** Shared chrome for student maps and the teacher's real DatasetVersion preview. */
export function MapWorkspace({children,tools,drawer,label,className}:{children:ReactNode;tools:MapWorkspaceTool[];drawer?:MapWorkspaceDrawer;label:string;className?:string}){
  const [activeId,setActiveId]=useState<string|null>(null);
  const active=tools.find((tool)=>tool.id===activeId)??null;
  return <section className={`${styles.workspace} ${className??""}`} aria-label={label}>
    <div className={styles.canvas}>{children}</div>
    {(tools.length>0||drawer)&&<nav className={styles.rail} aria-label="Alat peta">
      {tools.map((tool)=><button key={tool.id} type="button" className={activeId===tool.id?styles.active:""} aria-label={tool.label} aria-expanded={activeId===tool.id} onClick={()=>setActiveId((current)=>current===tool.id?null:tool.id)}><ToolIcon name={tool.icon}/><span>{tool.label}</span></button>)}
      {drawer&&<button type="button" className={drawer.open?styles.active:""} aria-label={drawer.label} aria-expanded={drawer.open} aria-controls={`${drawer.id}-drawer`} onClick={()=>drawer.onOpenChange(!drawer.open)}><ToolIcon name={drawer.icon}/><span>{drawer.label}</span></button>}
    </nav>}
    {active&&<aside className={styles.panel} aria-label={active.label}>
      <header><div><small>Alat peta</small><strong>{active.label}</strong></div><button type="button" aria-label={`Tutup ${active.label}`} onClick={()=>setActiveId(null)}>×</button></header>
      <div className={styles.panelBody}>{active.content}</div>
    </aside>}
    {drawer?.open&&<aside id={`${drawer.id}-drawer`} className={styles.drawer} aria-label={drawer.label}>
      <header><div><small>Data layer</small><strong>{drawer.label}</strong></div><button type="button" aria-label={`Tutup ${drawer.label}`} onClick={()=>drawer.onOpenChange(false)}>×</button></header>
      <div className={styles.drawerBody}>{drawer.content}</div>
    </aside>}
  </section>;
}
