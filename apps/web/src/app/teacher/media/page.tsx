import Link from "next/link";
import { listMediaBank } from "@/server/content/service";
import { requireTeacherSession } from "@/server/auth/session";

const icon:Record<string,string>={IMAGE:"▣",VIDEO:"▶",DOCUMENT:"▤",ILLUSTRATION:"◇"};

export default async function MediaPage({searchParams}:{searchParams:Promise<{status?:string}>}) {
  const session=await requireTeacherSession();
  const media=await listMediaBank(session);
  const {status}=await searchParams;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header"><div><p className="eyebrow">Media Bank</p><h1>Media</h1><p>MediaAsset metadata dari PostgreSQL. File storage akan dihubungkan ke object storage.</p></div></header>
      {status==="created"&&<p className="account-alert">MediaAsset berhasil dibuat.</p>}
      {status==="error"&&<p className="account-alert error">MediaAsset gagal dibuat.</p>}
      <details className="class-create-panel">
        <summary>+ Tambah MediaAsset</summary>
        <form action="/api/content/media" method="post" className="media-create-form">
          <label>Judul<input name="title" required/></label>
          <label>Tipe<select name="mediaType" defaultValue="IMAGE"><option>IMAGE</option><option>VIDEO</option><option>DOCUMENT</option><option>ILLUSTRATION</option></select></label>
          <label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Media</option><option value="SCHOOL">School Media</option></select></label>
          <label>Storage Key / URL<input name="storageKey" placeholder="optional"/></label>
          <label>MIME Type<input name="mimeType" placeholder="image/png"/></label>
          <button className="button" type="submit">Simpan Metadata</button>
        </form>
      </details>

      <section className="media-grid">
        {media.map((m)=>(
          <article className="media-card" key={m.id}>
            <div className="media-preview"><span>{icon[m.mediaType]??"◇"}</span><small>{m.mediaType}</small></div>
            <div className="media-body"><div className="dataset-badges"><span>{m.mediaType}</span><span>{m.scope}</span></div><h2>{m.title}</h2><p>{m.mimeType??"No MIME metadata"} · {m.storageKey?"storage linked":"storage pending"}</p><div className="dataset-actions"><Link href={"/teacher/media/"+m.id}>Preview</Link><Link href="/teacher/questions/new">Use in Question</Link></div></div>
          </article>
        ))}
      </section>
      {!media.length&&<div className="empty-state"><strong>Media Bank masih kosong.</strong><p>Tambahkan metadata asset pertama untuk stimulus image/video/document.</p></div>}
    </main>
  );
}
