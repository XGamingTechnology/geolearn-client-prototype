"use client";
/* eslint-disable @next/next/no-img-element -- local object URLs require native previews. */
import {useEffect,useState} from "react";
const accepted="image/jpeg,image/png,image/webp,video/mp4";
function humanSize(size:number){return size>=1048576?`${(size/1048576).toFixed(1)} MB`:`${Math.ceil(size/1024)} KB`;}
export function MediaUploadForm(){
 const [file,setFile]=useState<File|null>(null);const [preview,setPreview]=useState("");
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 function chooseFile(next:File|null){setFile(next);setPreview(next?URL.createObjectURL(next):"");}
 return <form action="/api/content/media" method="post" encType="multipart/form-data" className="media-create-form"><label>Judul<input name="title" required maxLength={220}/></label><label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">Media Saya</option><option value="SCHOOL">Media Sekolah</option></select></label><label className="media-dropzone">Pilih atau jatuhkan file<input name="file" type="file" required accept={accepted} onChange={e=>chooseFile(e.target.files?.[0]??null)}/><span>JPEG, PNG, WebP (maks. 10 MB) atau MP4 (maks. 100 MB)</span></label>{file&&<div className="upload-inspection"><strong>{file.name}</strong><span>{file.type||"Tipe tidak dikenali"} · {humanSize(file.size)}</span>{preview&&(file.type.startsWith("image/")?<img src={preview} alt="Pratinjau file terpilih"/>:<video src={preview} controls preload="metadata"/>)}</div>}<button className="button">Unggah Media</button></form>;
}
export function ExternalMediaForm(){return <details className="advanced-media"><summary>Opsi lanjutan: gunakan URL eksternal</summary><form action="/api/content/media" method="post" className="media-create-form"><label>Judul<input name="title" required/></label><label>Tipe<select name="mediaType"><option value="IMAGE">IMAGE</option><option value="VIDEO">VIDEO</option></select></label><label>Scope<select name="scope"><option value="PRIVATE">Media Saya</option><option value="SCHOOL">Media Sekolah</option></select></label><label>URL<input name="externalUrl" type="url" required placeholder="https://…"/></label><label>MIME<input name="mimeType" placeholder="image/jpeg"/></label><button className="button">Simpan URL</button></form></details>}
