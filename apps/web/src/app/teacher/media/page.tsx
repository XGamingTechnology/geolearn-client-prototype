/* eslint-disable @next/next/no-img-element -- authenticated media URLs require native previews. */
import Link from "next/link";
import { listMediaBank } from "@/server/content/service";
import { requireTeacherSession } from "@/server/auth/session";
import {ExternalMediaForm,MediaUploadForm} from "@/components/media-upload-form";
import {isInternalMediaKey,mediaDeliveryUrl,mediaStorage} from "@/server/media/storage";
const icon:Record<string,string>={IMAGE:"▣",VIDEO:"▶"};
export default async function MediaPage({searchParams}:{searchParams:Promise<{status?:string;message?:string}>}) {
 const session=await requireTeacherSession();const media=await listMediaBank(session);const readiness=new Map(await Promise.all(media.map(async m=>[m.id,!isInternalMediaKey(m.storageKey)||await mediaStorage.exists(m.storageKey)] as const)));const {status,message}=await searchParams;
 return <main className="dashboard catalog-page"><header className="catalog-header"><div><p className="eyebrow">Media Bank</p><h1>Media</h1><p>Unggah gambar dan video yang siap digunakan di Question Builder.</p></div></header>
 {status==="created"&&<p className="account-alert">Media berhasil diunggah.</p>}{status==="error"&&<p className="account-alert error">{message||"MediaAsset gagal dibuat."}</p>}
 <details className="class-create-panel"><summary>+ Unggah Media</summary><MediaUploadForm/><ExternalMediaForm/></details>
 <section className="media-grid">{media.map(m=>{const source=mediaDeliveryUrl(m.id,m.storageKey);const ready=Boolean(source&&readiness.get(m.id));return <article className="media-card" key={m.id}><div className="media-preview">{ready?(m.mediaType==="IMAGE"?<img src={source!} alt=""/>:<video src={source!} muted preload="metadata"/>):<span>{icon[m.mediaType]??"◇"}</span>}<small>{m.mediaType}</small></div><div className="media-body"><div className="dataset-badges"><span>{m.mediaType}</span><span>{m.scope}</span><span>{ready?"SIAP":"RUSAK"}</span></div><h2>{m.title}</h2><p>{m.sizeBytes!=null?`${(m.sizeBytes/1048576).toFixed(2)} MB`:"Ukuran tidak tersedia"}</p><div className="dataset-actions"><Link href={`/teacher/media/${m.id}`}>Preview</Link><Link href="/teacher/questions/new">Gunakan di Soal</Link></div></div></article>})}</section>
 {!media.length&&<div className="empty-state"><strong>Media Bank masih kosong.</strong><p>Unggah gambar atau video pertama untuk stimulus soal.</p></div>}</main>;
}
