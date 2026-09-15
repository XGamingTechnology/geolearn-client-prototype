import Link from "next/link";
import { notFound } from "next/navigation";
import { getMediaAsset } from "@/server/content/service";
import { requireTeacherSession } from "@/server/auth/session";

const icon:Record<string,string>={IMAGE:"▣",VIDEO:"▶",DOCUMENT:"▤",ILLUSTRATION:"◇"};

export default async function MediaDetailPage({params}:{params:Promise<{mediaId:string}>}){
  const session=await requireTeacherSession();
  const {mediaId}=await params;
  const item=await getMediaAsset(session,mediaId);
  if(!item) notFound();

  return (
    <main className="dashboard media-detail-page">
      <div className="breadcrumb"><Link href="/teacher/media">Media</Link><span>/</span><strong>{item.title}</strong></div>
      <header className="dataset-detail-header"><div><div className="dataset-badges"><span>{item.mediaType}</span><span>{item.scope}</span><span>{item.status}</span></div><h1>{item.title}</h1><p>{item.mimeType??"MIME belum diisi"} · MediaAsset PostgreSQL.</p></div><div className="dashboard-actions"><Link className="button" href="/teacher/questions/new">Use in Question</Link></div></header>
      <section className="media-detail-grid">
        <article className="media-stage"><div className={"media-stage-preview "+item.mediaType.toLowerCase()}><span>{icon[item.mediaType]??"◇"}</span><strong>{item.mediaType}</strong><small>{item.storageKey?"Storage linked":"File storage belum dihubungkan"}</small></div></article>
        <aside className="dashboard-panel dataset-metadata"><p className="eyebrow">Asset Metadata</p><h2>Media info</h2><dl><div><dt>Type</dt><dd>{item.mediaType}</dd></div><div><dt>Scope</dt><dd>{item.scope}</dd></div><div><dt>MIME</dt><dd>{item.mimeType??"-"}</dd></div><div><dt>Storage</dt><dd>{item.storageKey??"Pending"}</dd></div><div><dt>Status</dt><dd>{item.status}</dd></div></dl></aside>
      </section>
    </main>
  );
}
