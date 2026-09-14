import Link from "next/link";
import { notFound } from "next/navigation";

const datasets={
  "sungai-siak":{title:"Sungai Siak",format:"GeoJSON",scope:"System",geometry:"LineString",objects:"1 feature",srid:"EPSG:4326",version:"v1"},
  "sekolah-pekanbaru":{title:"Sekolah Pekanbaru",format:"GeoJSON",scope:"School",geometry:"Point",objects:"186 features",srid:"EPSG:4326",version:"v2"},
  "batas-administrasi-pekanbaru":{title:"Batas Administrasi Pekanbaru",format:"GeoJSON",scope:"System",geometry:"Polygon",objects:"83 features",srid:"EPSG:4326",version:"v3"},
  "dem-jawa-timur":{title:"DEM Jawa Timur",format:"GeoTIFF",scope:"My",geometry:"Raster",objects:"30 m resolution",srid:"EPSG:4326",version:"v1"},
  "curah-hujan-tahunan":{title:"Curah Hujan Tahunan",format:"GeoTIFF",scope:"School",geometry:"Raster",objects:"2025 composite",srid:"EPSG:4326",version:"v1"},
  "fasilitas-kesehatan-kota":{title:"Fasilitas Kesehatan Kota",format:"GeoJSON",scope:"My",geometry:"Point",objects:"74 features",srid:"EPSG:4326",version:"v1"},
} as const;

export default async function DatasetDetailPage({params}:{params:Promise<{datasetId:string}>}){
 const {datasetId}=await params; const item=datasets[datasetId as keyof typeof datasets]; if(!item) notFound();
 return <main className="dashboard dataset-detail-page">
   <div className="breadcrumb"><Link href="/teacher/data">Bank Data</Link><span>/</span><strong>{item.title}</strong></div>
   <header className="dataset-detail-header"><div><div className="dataset-badges"><span>{item.format}</span><span>{item.scope}</span><span className="ready">Ready</span></div><h1>{item.title}</h1><p>Dataset detail preview untuk metadata, version, pemakaian, dan spatial preview.</p></div><div className="dashboard-actions"><button className="button button-secondary" disabled type="button">Duplicate/Fork</button><Link className="button" href="/teacher/gis">Open in GIS Studio</Link></div></header>

   <section className="dataset-detail-grid">
     <article className="dashboard-panel dataset-preview-panel"><div className="panel-heading"><div><p className="eyebrow">Spatial Preview</p><h2>{item.geometry}</h2></div><span className="status-pill">SIMULATED</span></div><div className={"dataset-map-large "+(item.geometry==="Raster"?"raster":"")}><div className="case-map-grid"/><span className="dataset-demo-line"/><span className="dataset-demo-area"/><span className="dataset-demo-point p1"/><span className="dataset-demo-point p2"/><div className="case-map-caption">Preview UI · bukan geometri authoritative</div></div></article>
     <aside className="dashboard-panel dataset-metadata"><p className="eyebrow">Metadata</p><h2>Dataset info</h2><dl><div><dt>Geometry</dt><dd>{item.geometry}</dd></div><div><dt>Objects</dt><dd>{item.objects}</dd></div><div><dt>CRS</dt><dd>{item.srid}</dd></div><div><dt>Version</dt><dd>{item.version}</dd></div><div><dt>Scope</dt><dd>{item.scope}</dd></div><div><dt>Status</dt><dd>Ready</dd></div></dl></aside>
   </section>

   <section className="dataset-bottom-grid">
     <article className="dashboard-panel"><p className="eyebrow">Usage</p><h2>Dipakai pada</h2><div className="usage-list"><span>Case · Akses Sekolah Pekanbaru</span><span>Question · Pengaruh Sungai terhadap Akses Sekolah</span><span>GIS Project · Analisis Akses Sekolah</span></div></article>
     <article className="dashboard-panel"><p className="eyebrow">Version History</p><h2>Dataset versions</h2><div className="version-list"><div><strong>{item.version}</strong><span>Published · immutable</span></div><div><strong>Draft next</strong><span>Belum dibuat</span></div></div></article>
   </section>
 </main>;
}
