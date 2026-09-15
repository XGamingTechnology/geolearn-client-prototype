import Link from "next/link";
import { notFound } from "next/navigation";
import { getCaseDetail } from "@/server/content/service";
import { requireTeacherSession } from "@/server/auth/session";

export default async function CaseDetailPage({params,searchParams}:{params:Promise<{caseId:string}>;searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const {caseId}=await params;
  const item=await getCaseDetail(session,caseId);
  if(!item) notFound();
  const {status}=await searchParams;

  return (
    <main className="dashboard case-detail-page">
      <div className="breadcrumb"><Link href="/teacher/cases">Case Library</Link><span>/</span><strong>{item.title}</strong></div>
      {status==="published"&&<p className="account-alert">CaseVersion berhasil dipublish dan immutable.</p>}
      {status==="error"&&<p className="account-alert error">Operasi Case gagal.</p>}

      <header className="case-detail-header">
        <div><div className="dataset-badges"><span>{item.scope}</span><span>{item.versionStatus}</span><span>{item.versionNumber?"v"+item.versionNumber:"-"}</span></div><h1>{item.title}</h1><p>{item.description??"Belum ada deskripsi."}</p></div>
        <div className="dashboard-actions">
          {item.versionStatus==="DRAFT"
            ? <form action={"/api/content/cases/"+item.id+"/publish"} method="post"><button className="button" type="submit">Publish CaseVersion</button></form>
            : <form action={"/api/content/cases/"+item.id+"/duplicate"} method="post"><button className="button button-secondary" type="submit">Duplicate / Fork</button></form>}
        </div>
      </header>

      <section className="case-detail-layout">
        <div className="case-main-column">
          <article className="dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">Narrative</p><h2>Konteks Case</h2></div></div><p className="case-narrative">{item.narrative??item.description??"Belum ada narrative."}</p></article>
          <article className="dashboard-panel case-section"><div className="panel-heading"><div><p className="eyebrow">Map State</p><h2>Spatial workspace</h2></div><Link href="/teacher/gis">Open GIS Studio →</Link></div><div className="case-map-large"><div className="case-map-grid"/><span className="case-water-line"/><span className="case-area-shape"/><div className="case-map-caption">Map config tersimpan sebagai JSONB; binding dataset masuk Slice Data/GIS.</div></div></article>
        </div>
        <aside className="case-side-column">
          <article className="dashboard-panel"><p className="eyebrow">Version State</p><h2>{item.versionStatus}</h2><div className="usage-list"><span>Case ID · {item.id}</span><span>Version · {item.versionNumber??"-"}</span><span>Scope · {item.scope}</span></div></article>
        </aside>
      </section>
    </main>
  );
}
