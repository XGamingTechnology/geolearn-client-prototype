import Link from "next/link";
import { requireTeacherSession } from "@/server/auth/session";
import { listDatasets } from "@/server/data/service";
import styles from "./data-upload.module.css";

function accent(type:string|null,dataKind:string){
  if(dataKind==="RASTER")return "raster";
  return type==="Point"||type==="MultiPoint"?"point":type?.includes("Line")?"river":type?.includes("Polygon")?"polygon":"raster";
}

export default async function DataPage({searchParams}:{searchParams:Promise<{status?:string;message?:string}>}) {
  const session=await requireTeacherSession();
  const datasets=await listDatasets(session);
  const {status,message}=await searchParams;

  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Spatial Data Catalog</p><h1>Bank Data</h1><p>Kelola data spasial reusable. Vector disimpan sebagai geometry PostGIS; raster analitis dapat diregistrasikan sebagai layer XYZ tanpa menjadikannya basemap.</p></div>
        <div className="dashboard-actions"><Link className="button button-secondary" href="/teacher/gis">Open GIS Studio</Link></div>
      </header>
      {status==="error"&&<p className="account-alert error">{message||"Dataset gagal disimpan. Periksa format dan konfigurasi sumber."}</p>}

      <details className={styles.uploadCard}>
        <summary className={styles.uploadSummary}>Upload Vector Dataset</summary>
        <form action="/api/data/datasets" method="post" encType="multipart/form-data" className={styles.form}>
          <input type="hidden" name="datasetKind" value="VECTOR"/>
          <label className={styles.field}>Judul
            <input className={styles.input} name="title" maxLength={220} placeholder="Sekolah Pekanbaru"/>
          </label>
          <label className={styles.field}>Scope
            <select className={styles.select} name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Data</option><option value="SCHOOL">School Data</option></select>
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>Deskripsi
            <input className={styles.input} name="description" placeholder="Keterangan singkat dataset"/>
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>File dataset
            <input className={styles.file} name="file" type="file" accept=".geojson,.json,.kml,.kmz,.zip,application/geo+json,application/json,application/vnd.google-earth.kml+xml,application/vnd.google-earth.kmz,application/zip" required/>
          </label>
          <div className={styles.formatGrid} aria-label="Supported vector formats">
            <div className={styles.formatItem}><strong>GeoJSON</strong>.geojson / .json</div>
            <div className={styles.formatItem}><strong>KML</strong>.kml</div>
            <div className={styles.formatItem}><strong>KMZ</strong>.kmz</div>
            <div className={styles.formatItem}><strong>Shapefile</strong>ZIP: .shp + .shx + .dbf + .prj</div>
          </div>
          <p className={styles.help}>Maksimal 20 MB dan 5000 feature. Geometry dinormalisasi menjadi 2D EPSG:4326 untuk PostGIS GeoLearn.</p>
          <div className={styles.actions}><button className={`button ${styles.submit}`} type="submit">Upload & Publish Vector</button></div>
        </form>
      </details>

      <details className={styles.uploadCard}>
        <summary className={styles.uploadSummary}>Register Raster / Citra XYZ</summary>
        <form action="/api/data/datasets" method="post" className={styles.form}>
          <input type="hidden" name="datasetKind" value="RASTER_XYZ"/>
          <label className={styles.field}>Judul
            <input className={styles.input} name="title" maxLength={220} required placeholder="Sentinel-2 Jakarta 2025"/>
          </label>
          <label className={styles.field}>Scope
            <select className={styles.select} name="scope" defaultValue="PRIVATE"><option value="PRIVATE">My Data</option><option value="SCHOOL">School Data</option></select>
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>Deskripsi
            <input className={styles.input} name="description" placeholder="Citra atau raster analitis yang digunakan dalam soal"/>
          </label>
          <label className={`${styles.field} ${styles.fieldFull}`}>Public XYZ tile URL
            <input className={styles.input} name="tileUrl" type="url" required placeholder="https://tiles.example.org/{z}/{x}/{y}.png"/>
          </label>
          <div className={styles.twoCol}>
            <label className={styles.field}>Sumber / koleksi<input className={styles.input} name="sourceLabel" placeholder="Copernicus Data Space"/></label>
            <label className={styles.field}>Sensor<input className={styles.input} name="sensor" placeholder="Sentinel-2 L2A"/></label>
          </div>
          <div className={styles.twoCol}>
            <label className={styles.field}>Tanggal akuisisi<input className={styles.input} name="acquiredAt" type="date"/></label>
            <label className={styles.field}>Label waktu<input className={styles.input} name="temporalLabel" placeholder="2025 / Musim Hujan / Setelah Banjir"/></label>
          </div>
          <div className={styles.formatGrid} aria-label="Raster extent">
            <label className={styles.field}>Min Lon<input className={styles.input} name="minLon" type="number" step="any" min={-180} max={180} required/></label>
            <label className={styles.field}>Min Lat<input className={styles.input} name="minLat" type="number" step="any" min={-90} max={90} required/></label>
            <label className={styles.field}>Max Lon<input className={styles.input} name="maxLon" type="number" step="any" min={-180} max={180} required/></label>
            <label className={styles.field}>Max Lat<input className={styles.input} name="maxLat" type="number" step="any" min={-90} max={90} required/></label>
          </div>
          <label className={`${styles.field} ${styles.fieldFull}`}>Attribution
            <input className={styles.input} name="attribution" placeholder="Sumber data / lisensi yang wajib ditampilkan"/>
          </label>
          <p className={styles.help}>Foundation v1 memakai endpoint XYZ publik melalui HTTPS. Jangan masukkan API key, token, password, atau kredensial pada URL. Upload GeoTIFF/COG dan katalog Sentinel/Landsat langsung akan ditambahkan pada fase raster berikutnya.</p>
          <div className={styles.actions}><button className={`button ${styles.submit}`} type="submit">Register Raster</button></div>
        </form>
      </details>

      <div className="scope-tabs"><span className="active">All Accessible</span><span>System Data</span><span>School Data</span><span>My Data</span></div>
      <section className="dataset-grid">
        {datasets.map((d)=>(
          <article className="dataset-card" key={d.id}>
            <div className={"dataset-preview "+accent(d.geometryType,d.dataKind)}><span>{d.dataKind==="RASTER"?"RASTER":d.geometryType??d.dataKind}</span></div>
            <div className="dataset-card-body">
              <div className="dataset-badges"><span>{d.format??"-"}</span><span>{d.scope}</span><span className="ready">{d.processingStatus??"-"}</span></div>
              <h2>{d.title}</h2><p>{d.description??"Dataset spatial reusable GeoLearn."}</p>
              <dl>{d.dataKind==="RASTER"?<><div><dt>Kind</dt><dd>Raster</dd></div><div><dt>Source</dt><dd>{d.format??"-"}</dd></div><div><dt>CRS</dt><dd>{d.srid?"EPSG:"+d.srid:"-"}</dd></div></>:<><div><dt>Geometry</dt><dd>{d.geometryType??"-"}</dd></div><div><dt>Objects</dt><dd>{d.featureCount??0}</dd></div><div><dt>CRS</dt><dd>{d.srid?"EPSG:"+d.srid:"-"}</dd></div></>}</dl>
              <div className="dataset-actions"><Link href={"/teacher/data/"+d.id}>Preview</Link>{d.dataKind==="VECTOR"&&<Link href={"/teacher/gis?dataset="+d.id}>Open in Studio</Link>}</div>
            </div>
          </article>
        ))}
      </section>
      {!datasets.length&&<div className="empty-state"><strong>Bank Data masih kosong.</strong><p>Upload vector atau register raster XYZ pertama untuk mulai membangun pengalaman spasial.</p></div>}
    </main>
  );
}
