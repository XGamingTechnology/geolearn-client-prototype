import Link from "next/link";
import { notFound } from "next/navigation";

const media={
 "video-banjir-rob":{title:"Video Banjir Rob Pesisir",type:"Video",meta:"02:14 · 1080p",icon:"▶"},
 "citra-tutupan-lahan":{title:"Citra Perubahan Tutupan Lahan",type:"Image",meta:"2400 × 1600",icon:"▣"},
 "infografik-siklus-hidrologi":{title:"Infografik Siklus Hidrologi",type:"Illustration",meta:"SVG · 1.8 MB",icon:"◇"},
 "tabel-curah-hujan":{title:"Tabel Curah Hujan Bulanan",type:"Document",meta:"PDF · 6 halaman",icon:"▤"},
} as const;

export default async function MediaDetailPage({params}:{params:Promise<{mediaId:string}>}){
 const {mediaId}=await params; const item=media[mediaId as keyof typeof media]; if(!item) notFound();
 return <main className="dashboard media-detail-page">
   <div className="breadcrumb"><Link href="/teacher/media">Media</Link><span>/</span><strong>{item.title}</strong></div>
   <header className="dataset-detail-header"><div><div className="dataset-badges"><span>{item.type}</span><span>School</span><span>Ready</span></div><h1>{item.title}</h1><p>{item.meta} · reusable MediaAsset preview.</p></div><div className="dashboard-actions"><button className="button button-secondary" disabled type="button">Rename</button><button className="button" disabled type="button">Use in Question</button></div></header>

   <section className="media-detail-grid">
     <article className="media-stage">
       <div className={"media-stage-preview "+item.type.toLowerCase()}><span>{item.icon}</span><strong>{item.type} Preview</strong><small>Placeholder UI — asset file belum diunggah</small></div>
     </article>
     <aside className="dashboard-panel dataset-metadata"><p className="eyebrow">Asset Metadata</p><h2>Media info</h2><dl><div><dt>Type</dt><dd>{item.type}</dd></div><div><dt>Scope</dt><dd>School</dd></div><div><dt>Detail</dt><dd>{item.meta}</dd></div><div><dt>Status</dt><dd>Ready</dd></div><div><dt>Usage</dt><dd>2 references</dd></div><div><dt>Archived</dt><dd>No</dd></div></dl></aside>
   </section>

   <section className="dashboard-panel media-usage-panel"><div className="panel-heading"><div><p className="eyebrow">References</p><h2>Dipakai pada konten</h2></div><Link href="/teacher/cases/banjir-rob-semarang-demak">Open Case →</Link></div><div className="usage-list"><span>Case · Banjir Rob Semarang–Demak</span><span>Question · Dampak genangan pada kawasan pesisir</span></div></section>
   <p className="preview-banner">Media detail hanya UI preview. Tidak ada file media nyata yang ditampilkan pada layar ini.</p>
 </main>;
}
