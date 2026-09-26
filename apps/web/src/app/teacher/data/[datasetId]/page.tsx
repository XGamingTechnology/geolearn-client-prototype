import Link from "next/link";
import { notFound } from "next/navigation";
import { requireTeacherSession } from "@/server/auth/session";
import { getDataset, listFeaturePreview } from "@/server/data/service";
import {getRasterDatasetMetadata} from "@/server/data/raster-source";

export default async function DatasetDetailPage({params}:{params:Promise<{datasetId:string}>}){
  const session=await requireTeacherSession();
  const {datasetId}=await params;
  const item=await getDataset(session,datasetId);
  if(!item) notFound();
  const [features,raster]=await Promise.all([
    item.dataKind==="VECTOR"?listFeaturePreview(session,datasetId,20):Promise.resolve([]),
    item.dataKind==="RASTER"?getRasterDatasetMetadata(session,datasetId):Promise.resolve(null),
  ]);

  return <main className="dashboard dataset-detail-page">
    <div className="breadcrumb"><Link href="/teacher/data">Bank Data</Link><span>/</span><strong>{item.title}</strong></div>
    <header className="dataset-detail-header">
      <div><div className="dataset-badges"><span>{item.format??"-"}</span><span>{item.scope}</span><span className="ready">{item.processingStatus??"-"}</span></div><h1>{item.title}</h1><p>{item.description??"Dataset spatial reusable GeoLearn."}</p></div>
      <div className="dashboard-actions">{item.dataKind==="VECTOR"&&<><a className="button button-secondary" href={"/api/data/datasets/"+item.id+"/geojson"}>GeoJSON</a><Link className="button" href={"/teacher/gis?dataset="+item.id}>Open in GIS Studio</Link></>}</div>
    </header>

    <section className="dataset-detail-grid">
      <article className="dashboard-panel dataset-preview-panel">
        <div className="panel-heading"><div><p className="eyebrow">{item.dataKind==="RASTER"?"Raster Source":"Feature Preview"}</p><h2>{item.dataKind==="RASTER"?"Analytical Raster":item.geometryType??item.dataKind}</h2></div><span className="status-pill">{item.dataKind==="RASTER"?"XYZ":"POSTGIS"}</span></div>
        {item.dataKind==="RASTER"?<div className="feature-preview-table">
          <div className="feature-preview-head"><span>Metadata</span><span>Value</span></div>
          <div><span>Source</span><code>{raster?.sourceLabel??"—"}</code></div>
          <div><span>Sensor</span><code>{raster?.sensor??"—"}</code></div>
          <div><span>Acquired</span><code>{raster?.acquiredAt??"—"}</code></div>
          <div><span>Temporal label</span><code>{raster?.temporalLabel??"—"}</code></div>
          <div><span>Extent</span><code>{raster?.bbox?JSON.stringify(raster.bbox):"—"}</code></div>
          <div><span>Attribution</span><code>{raster?.attribution||"—"}</code></div>
        </div>:<div className="feature-preview-table">
          <div className="feature-preview-head"><span>ID</span><span>Properties</span></div>
          {features.map((f)=><div key={f.id}><span>{f.sourceFeatureId??f.id.slice(0,8)}</span><code>{JSON.stringify(f.properties)}</code></div>)}
          {!features.length&&<p>Preview feature belum tersedia untuk jenis data ini.</p>}
        </div>}
      </article>
      <aside className="dashboard-panel dataset-metadata"><p className="eyebrow">Metadata</p><h2>Dataset info</h2><dl>
        <div><dt>Kind</dt><dd>{item.dataKind}</dd></div><div><dt>Source</dt><dd>{item.sourceType}</dd></div>
        <div><dt>Geometry</dt><dd>{item.dataKind==="RASTER"?"Raster tiles":item.geometryType??"-"}</dd></div><div><dt>Objects</dt><dd>{item.dataKind==="RASTER"?"—":item.featureCount??0}</dd></div>
        <div><dt>CRS</dt><dd>{item.srid?"EPSG:"+item.srid:"-"}</dd></div><div><dt>Version</dt><dd>{item.versionNumber?"v"+item.versionNumber:"-"}</dd></div>
        <div><dt>Scope</dt><dd>{item.scope}</dd></div><div><dt>Status</dt><dd>{item.versionStatus??"-"}</dd></div>
      </dl></aside>
    </section>
    <p className="preview-banner">{item.dataKind==="RASTER"?"Raster ini adalah layer data analitis, bukan basemap. Foundation v1 merender endpoint XYZ publik; GeoTIFF/COG dan katalog citra temporal akan ditambahkan pada fase berikutnya.":"Feature geometry di endpoint GeoJSON berasal langsung dari PostGIS. Tabel di atas hanya preview atribut 20 feature pertama."}</p>
  </main>;
}
