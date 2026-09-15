import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listDatasets } from "@/server/data/service";

function accent(type:string|null){return type==="Point"||type==="MultiPoint"?"point":type?.includes("Line")?"river":type?.includes("Polygon")?"polygon":"raster";}

export default async function DataPage({searchParams}:{searchParams:Promise<{status?:string}>}) {
  const session=await requireTeacherSession();
  const datasets=await listDatasets(session);
  const {status}=await searchParams;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Spatial Data Catalog</p><h1>Bank Data</h1><p>Dataset reusable dari PostgreSQL/PostGIS. GeoJSON upload masuk sebagai DatasetVersion immutable.</p></div>
        <div className="dashboard-actions"><Link className="button button-secondary" href="/teacher/gis">Open GIS Studio</Link></div>
      </header>
      {status==="error"&&<p className="account-alert error">Upload dataset gagal. Pastikan file GeoJSON FeatureCollection valid dan maksimal 5000 feature.</p>}

      <details className="class-create-panel">
        <summary>+ Upload GeoJSON</summary>
        <form action="/api/data/datasets" method="post" encType="multipart/form-data" className="dataset-upload-form">
          <label>Judul<input name="title" required maxLength={220} placeholder="Sekolah Pekanbaru"/></label>
          <label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Data</option><option value="SCHOOL">School Data</option></select></label>
          <label>Deskripsi<input name="description" placeholder="Keterangan dataset"/></label>
          <label>GeoJSON<input name="file" type="file" accept=".geojson,.json,application/geo+json,application/json" required/></label>
          <button className="button" type="submit">Upload & Publish Version</button>
        </form>
      </details>

      <div className="scope-tabs"><span className="active">All Accessible</span><span>System Data</span><span>School Data</span><span>My Data</span></div>
      <section className="dataset-grid">
        {datasets.map((d)=>(
          <article className="dataset-card" key={d.id}>
            <div className={"dataset-preview "+accent(d.geometryType)}><span>{d.geometryType??d.dataKind}</span></div>
            <div className="dataset-card-body">
              <div className="dataset-badges"><span>{d.format??"-"}</span><span>{d.scope}</span><span className="ready">{d.processingStatus??"-"}</span></div>
              <h2>{d.title}</h2><p>{d.description??"Dataset spatial reusable GeoLearn."}</p>
              <dl><div><dt>Geometry</dt><dd>{d.geometryType??"-"}</dd></div><div><dt>Objects</dt><dd>{d.featureCount??0}</dd></div><div><dt>CRS</dt><dd>{d.srid?"EPSG:"+d.srid:"-"}</dd></div></dl>
              <div className="dataset-actions"><Link href={"/teacher/data/"+d.id}>Preview</Link><Link href={"/teacher/gis?dataset="+d.id}>Open in Studio</Link></div>
            </div>
          </article>
        ))}
      </section>
      {!datasets.length&&<div className="empty-state"><strong>Bank Data masih kosong.</strong><p>Upload GeoJSON pertama untuk mulai memakai PostGIS.</p></div>}
    </main>
  );
}
