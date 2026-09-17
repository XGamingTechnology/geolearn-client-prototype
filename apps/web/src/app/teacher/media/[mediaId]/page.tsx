/* eslint-disable @next/next/no-img-element -- authenticated media URLs require native previews. */
import Link from "next/link";
import {notFound} from "next/navigation";
import {getMediaAsset} from "@/server/content/service";
import {requireTeacherSession} from "@/server/auth/session";
import {mediaDeliveryUrl} from "@/server/media/storage";
export default async function MediaDetailPage({params}:{params:Promise<{mediaId:string}>}){
 const session=await requireTeacherSession();const {mediaId}=await params;const item=await getMediaAsset(session,mediaId);if(!item)notFound();const source=mediaDeliveryUrl(item.id,item.storageKey);
 return <main className="dashboard media-detail-page"><div className="breadcrumb"><Link href="/teacher/media">Media</Link><span>/</span><strong>{item.title}</strong></div><header className="dataset-detail-header"><div><div className="dataset-badges"><span>{item.mediaType}</span><span>{item.scope}</span><span>{source?"SIAP":"RUSAK"}</span></div><h1>{item.title}</h1><p>{item.mimeType??"MIME belum tersedia"} · {item.sizeBytes!=null?`${(item.sizeBytes/1048576).toFixed(2)} MB`:"Ukuran tidak tersedia"}</p></div><Link className="button" href="/teacher/questions/new">Gunakan di Soal</Link></header><section className="media-detail-grid"><article className="media-stage"><div className={`media-stage-preview ${item.mediaType.toLowerCase()}`}>{source?(item.mediaType==="IMAGE"?<img src={source} alt={item.title}/>:<video src={source} controls preload="metadata"/>):<p>File media tidak ditemukan.</p>}</div></article><aside className="dashboard-panel dataset-metadata"><p className="eyebrow">Asset Metadata</p><h2>Informasi media</h2><dl><div><dt>Tipe</dt><dd>{item.mediaType}</dd></div><div><dt>Scope</dt><dd>{item.scope}</dd></div><div><dt>MIME</dt><dd>{item.mimeType??"-"}</dd></div><div><dt>Status</dt><dd>{source?"Siap":"File media tidak ditemukan."}</dd></div></dl></aside></section></main>;
}
