import Link from "next/link";
import { listCaseBank } from "@/server/content/service";
import { requireTeacherSession } from "@/server/auth/session";

export default async function CaseLibraryPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const cases=await listCaseBank(session);
  const {status}=await searchParams;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Reusable Spatial Content</p><h1>Case Library</h1><p>Case sekarang dibaca dari PostgreSQL dan memakai draft/published version.</p></div>
      </header>
      {status==="error"&&<p className="account-alert error">Case gagal dibuat.</p>}
      <details className="class-create-panel">
        <summary>+ Case Baru</summary>
        <form action="/api/content/cases" method="post" className="case-create-form">
          <label>Judul<input name="title" required maxLength={220}/></label>
          <label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Case</option><option value="SCHOOL">School Case</option></select></label>
          <label>Deskripsi<textarea name="description" rows={3}/></label>
          <button className="button" type="submit">Simpan Draft Case</button>
        </form>
      </details>

      <section className="case-grid">
        {cases.map((item)=>(
          <article className="case-card" key={item.id}>
            <div className="case-preview"><div className="case-map-grid"/><span className="case-water-line"/><span className="case-area-shape"/><div className="case-preview-label"><strong>{item.versionStatus??"DRAFT"}</strong><small>{item.scope}</small></div></div>
            <div className="case-card-body">
              <div className="dataset-badges"><span>{item.scope}</span><span>{item.versionStatus??"DRAFT"}</span><span>{item.versionNumber?"v"+item.versionNumber:"-"}</span></div>
              <h2>{item.title}</h2><p>{item.description??"Belum ada deskripsi."}</p>
              <div className="dataset-actions"><Link href={"/teacher/cases/"+item.id}>Open Case</Link></div>
            </div>
          </article>
        ))}
      </section>
      {!cases.length&&<div className="empty-state"><strong>Case Library masih kosong.</strong><p>Buat Case pertama untuk mengelompokkan stimulus dan pertanyaan.</p></div>}
    </main>
  );
}
