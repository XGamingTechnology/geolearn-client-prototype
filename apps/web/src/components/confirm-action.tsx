"use client";

import {useEffect,useState} from "react";
import {createPortal} from "react-dom";
import styles from "./confirm-action.module.css";

type Tone="default"|"danger";

type Props={
  action:string;
  triggerLabel:string;
  title:string;
  description:string;
  confirmLabel?:string;
  cancelLabel?:string;
  tone?:Tone;
  triggerClassName?:string;
};

function Icon({tone}:{tone:Tone}){
  return tone==="danger"
    ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4 3.5 19h17L12 4Z"/><path d="M12 9v4M12 16h.01"/></svg>
    : <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>;
}

export function ConfirmAction({action,triggerLabel,title,description,confirmLabel=triggerLabel,cancelLabel="Batalkan",tone="default",triggerClassName}:Props){
  const [open,setOpen]=useState(false);

  useEffect(()=>{
    if(!open)return;
    const onKey=(event:KeyboardEvent)=>{if(event.key==="Escape")setOpen(false);};
    window.addEventListener("keydown",onKey);
    const previous=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return ()=>{window.removeEventListener("keydown",onKey);document.body.style.overflow=previous;};
  },[open]);

  const dialog=open?createPortal(
    <div className={styles.backdrop} role="presentation" onMouseDown={(event)=>{if(event.target===event.currentTarget)setOpen(false);}}>
      <section className={`${styles.dialog} ${tone==="danger"?styles.danger:""}`} role="alertdialog" aria-modal="true" aria-labelledby="geolearn-confirm-title" aria-describedby="geolearn-confirm-description">
        <div className={styles.icon}><Icon tone={tone}/></div>
        <div className={styles.copy}>
          <span className={styles.eyebrow}>Konfirmasi tindakan</span>
          <h2 id="geolearn-confirm-title">{title}</h2>
          <p id="geolearn-confirm-description">{description}</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.cancel} type="button" onClick={()=>setOpen(false)} autoFocus>{cancelLabel}</button>
          <form action={action} method="post"><button className={tone==="danger"?styles.confirmDanger:styles.confirm} type="submit">{confirmLabel}</button></form>
        </div>
      </section>
    </div>,
    document.body,
  ):null;

  return <>
    <button className={triggerClassName} type="button" onClick={()=>setOpen(true)}>{triggerLabel}</button>
    {dialog}
  </>;
}
