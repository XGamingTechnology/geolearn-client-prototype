const datasets = [
  { title: "Sungai Siak", format: "GeoJSON", scope: "System", type: "LineString", count: "1 feature", srid: "EPSG:4326", accent: "river" },
  { title: "Sekolah Pekanbaru", format: "GeoJSON", scope: "School", type: "Point", count: "186 features", srid: "EPSG:4326", accent: "point" },
  { title: "Batas Administrasi Pekanbaru", format: "GeoJSON", scope: "System", type: "Polygon", count: "83 features", srid: "EPSG:4326", accent: "polygon" },
  { title: "DEM Jawa Timur", format: "GeoTIFF", scope: "My", type: "Raster", count: "30 m resolution", srid: "EPSG:4326", accent: "raster" },
  { title: "Curah Hujan Tahunan", format: "GeoTIFF", scope: "School", type: "Raster", count: "2025 composite", srid: "EPSG:4326", accent: "raster" },
  { title: "Fasilitas Kesehatan Kota", format: "GeoJSON", scope: "My", type: "Point", count: "74 features", srid: "EPSG:4326", accent: "point" },
];

export default function DataPage() {
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Spatial Data Catalog</p><h1>Bank Data</h1><p>Data spatial reusable untuk Case, Question, GIS Studio, dan analisis pembelajaran.</p></div>
        <div className="dashboard-actions"><button className="button button-secondary" type="button" disabled>Open GIS Studio</button><button className="button" type="button" disabled>Upload Data</button></div>
      </header>
      <div className="scope-tabs"><span className="active">All Accessible</span><span>System Data</span><span>School Data</span><span>My Data</span></div>
      <div className="catalog-toolbar">
        <div className="search-box">⌕ <input aria-label="Cari dataset" placeholder="Cari dataset..." readOnly /></div>
        <div className="filter-chips"><span className="active">Semua</span><span>Vector</span><span>Raster</span><span>Table</span></div>
      </div>
      <section className="dataset-grid">
        {datasets.map((d) => (
          <article className="dataset-card" key={d.title}>
            <div className={"dataset-preview " + d.accent}><span>{d.type}</span></div>
            <div className="dataset-card-body"><div className="dataset-badges"><span>{d.format}</span><span>{d.scope}</span><span className="ready">Ready</span></div><h2>{d.title}</h2><p>Dataset preview untuk alur GeoLearn spatial content.</p>
              <dl><div><dt>Geometry</dt><dd>{d.type}</dd></div><div><dt>Objects</dt><dd>{d.count}</dd></div><div><dt>CRS</dt><dd>{d.srid}</dd></div></dl>
              <div className="dataset-actions"><button type="button" disabled>Preview</button><button type="button" disabled>Use</button><button type="button" disabled>Open in Studio</button></div>
            </div>
          </article>
        ))}
      </section>
      <p className="preview-banner">Dataset di layar ini bersifat UI preview, bukan inventaris data authoritative.</p>
    </main>
  );
}
