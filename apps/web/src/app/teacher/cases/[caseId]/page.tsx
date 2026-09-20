import Link from "next/link";
import { notFound } from "next/navigation";
import { CaseLeafletMap } from "@/components/case-leaflet-map";
import { getCaseDetail } from "@/server/content/service";
import { getCaseWorkspace, listCaseBindableDatasets, listCaseLayers } from "@/server/content/case-workspace";
import { requireTeacherSession } from "@/server/auth/session";

export default async function CaseDetailPage({params,searchParams}:{params:Promise<{caseId:string}>;searchParams:Promise<{status?:string}>}){
  const session=await requireTeacherSession();
  const {caseId}=await params;
  const [item,workspace]=await Promise.all([getCaseDetail(session,caseId),getCaseWorkspace(session,caseId)]);
  if(!item||!workspace) notFound();
  const [{status},layers,datasets]=await Promise.all([
    searchParams,
    listCaseLayers(session,caseId),
    workspace.versionStatus==="DRAFT"?listCaseBindableDatasets(session,caseId):Promise.resolve([]),
  ]);

  return (
    <main className="dashboard case-detail-page">
      <div className="breadcrumb"><Link href="/teacher/cases">Case Library</Link><span>/</span><strong>{item.title}</strong></div>
      {status==="published"&&<p className="account-alert">CaseVersion berhasil dipublish dan immutable.</p>}
      {status==="saved"&&<p className="account-alert">Draft Case berhasil diperbarui.</p>}
      {status==="layer-added"&&<p className="account-alert">Dataset berhasil ditambahkan ke Case.</p>}
      {status==="layer-removed"&&<p className="account-alert">Layer berhasil dihapus dari draft Case.</p>}
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
          <article className="dashboard-panel">
            <div className="panel-heading"><div><p className="eyebrow">Narrative</p><h2>Konteks Case</h2></div></div>
            {item.versionStatus==="DRAFT"?
              <form action={"/api/content/cases/"+item.id+"/update"} method="post" className="case-create-form">
                <label>Narrative<textarea name="narrative" rows={5} defaultValue={item.narrative??item.description??""}/></label>
                <button className="button button-secondary" type="submit">Simpan Narrative</button>
              </form>
              :<p className="case-narrative">{item.narrative??item.description??"Belum ada narrative."}</p>}
          </article>

          <article className="dashboard-panel case-section">
            <div className="panel-heading"><div><p className="eyebrow">Map State</p><h2>Spatial workspace</h2></div><Link href="/teacher/gis">Open GIS Studio →</Link></div>
            <CaseLeafletMap initialLayers={layers}/>

            {item.versionStatus==="DRAFT"&&(
              <div className="case-workspace-controls">
                <form action={"/api/content/cases/"+item.id+"/layers"} method="post" className="case-create-form">
                  <label>Dataset
                    <select name="datasetId" required defaultValue="">
                      <option value="" disabled>Pilih published dataset</option>
                      {datasets.map((dataset)=><option key={dataset.id} value={dataset.id}>{dataset.title} · {dataset.geometryType??"Geometry"} · {dataset.scope}</option>)}
                    </select>
                  </label>
                  <label>Role
                    <select name="role" defaultValue="CONTEXT">
                      <option value="CONTEXT">CONTEXT</option>
                      <option value="SOURCE">SOURCE</option>
                      <option value="TARGET">TARGET</option>
                    </select>
                  </label>
                  <button className="button" type="submit">+ Tambah Dataset</button>
                </form>

                {!!layers.length&&<div className="usage-list">
                  {layers.map((layer)=>(
                    <div key={layer.id} className="dataset-actions">
                      <span>{layer.title} · {layer.role} · {layer.featureCount??0} feature</span>
                      <form action={"/api/content/cases/"+item.id+"/layers/"+layer.id+"/remove"} method="post">
                        <button className="button button-secondary" type="submit">Hapus</button>
                      </form>
                    </div>
                  ))}
                </div>}
              </div>
            )}
          </article>
        </div>
        <aside className="case-side-column">
          <article className="dashboard-panel"><p className="eyebrow">Version State</p><h2>{item.versionStatus}</h2><div className="usage-list"><span>Case ID · {item.id}</span><span>Version · {item.versionNumber??"-"}</span><span>Scope · {item.scope}</span><span>Layers · {layers.length}</span></div></article>
        </aside>
      </section>
    </main>
  );
}
