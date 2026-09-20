import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listDatasets } from "@/server/data/service";

function accent(type:string|null){return type==="Point"||type==="MultiPoint"?"point":type?.includes("Line")?"river":type?.includes("Polygon")?"polygon":"raster";}

export default async function DataPage({searchParams}:{searchParams:Promise<{status?:string;message?:string}>}) {
  const session=await requireTeacherSession();
  const datasets=await listDatasets(session);
  const {status,message}=await searchParams;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Spatial Data Catalog</p><h1>Bank Data</h1><p>Dataset reusable dari PostgreSQL/PostGIS. Format upload dinormalisasi ke geometry EPSG:4326 lalu dipublish sebagai DatasetVersion immutable.</p></div>
        <div className="dashboard-actions"><Link className="button button-secondary" href="/teacher/gis">Open GIS Studio</Link></div>
      </header>
      {status==="error"&&<p className="account-alert error">{message||"Upload dataset gagal. Periksa format dan isi file."}</p>}

      <details className="class-create-panel">
        <summary>+ Upload Dataset</summary>
        <form action="/api/data/datasets" method="post" encType="multipart/form-data" className="dataset-upload-form">
          <label>Judul<input name="title" maxLength={220} placeholder="Sekolah Pekanbaru"/></label>
          <label>Scope<select name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Data</option><option value="SCHOOL">School Data</option></select></label>
          <label>Deskripsi<input name="description" placeholder="Keterangan dataset"/></label>
          <label>File dataset<input name="file" type="file" accept=".geojson,.json,.kml,.kmz,.zip,application/geo+json,application/json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/zip" required/></label>
          <p className="form-help">Didukung: GeoJSON/JSON, KML, KMZ, dan ESRI Shapefile dalam ZIP. ZIP Shapefile wajib berisi satu layer lengkap .shp + .shx + .dbf + .prj. Maksimal 20 MB dan 5000 feature.</p>
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
      {!datasets.length&&<div className="empty-state"><strong>Bank Data masih kosong.</strong><p>Upload GeoJSON, KML, KMZ, atau ZIP Shapefile pertama untuk mulai memakai PostGIS.</p></div>}
    </main>
  );
}
