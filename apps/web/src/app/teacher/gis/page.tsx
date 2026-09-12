import Link from "next/link";

const layers = [
  { name: "Sekolah Pekanbaru", type: "Point", count: "186", color: "point" },
  { name: "Sungai Siak", type: "Line", count: "1", color: "river" },
  { name: "Kecamatan", type: "Polygon", count: "15", color: "polygon" },
];

export default function GisStudioPage() {
  return (
    <main className="gis-studio-page">
      <header className="gis-project-bar">
        <div><p className="eyebrow">GIS Studio · Preview</p><h1>Analisis Akses Sekolah Pekanbaru</h1><span>Tersimpan · UI mock workspace</span></div>
        <div><Link className="button button-secondary" href="/learn/demo">Student Preview</Link><button className="button" type="button" disabled>Save Project</button></div>
      </header>
      <section className="gis-studio-layout">
        <aside className="gis-layer-panel">
          <div className="gis-panel-tabs"><span className="active">Layers</span><span>Tools & Map</span></div>
          <button className="add-layer-button" type="button" disabled>+ Add Layer</button>
          <div className="gis-layer-list">
            {layers.map((layer) => <article className="gis-layer-card" key={layer.name}><div className={"layer-swatch "+layer.color} /><div><strong>{layer.name}</strong><small>{layer.type} · {layer.count} object</small></div><span>•••</span></article>)}
          </div>
          <div className="gis-legend"><strong>Legend</strong><p><i className="legend-school" /> Sekolah</p><p><i className="legend-river" /> Sungai</p><p><i className="legend-area" /> Kecamatan</p></div>
          <div className="gis-crs">Project CRS <strong>EPSG:4326</strong></div>
        </aside>
        <div className="gis-map-workspace">
          <div className="gis-tool-dock"><span>Pan</span><span>Inspect</span><span>Draw</span><span className="active">Buffer</span><span>Overlay</span><span>Distance</span></div>
          <div className="gis-faux-map">
            <div className="gis-map-grid" />
            <span className="gis-river-line" />
            <span className="gis-area area-one" />
            <span className="gis-area area-two" />
            <span className="gis-school school-one" />
            <span className="gis-school school-two" />
            <span className="gis-school school-three" />
            <span className="gis-buffer-preview" />
            <div className="gis-map-note"><strong>Buffer Preview</strong><span>Radius 1 km · belum dieksekusi</span></div>
          </div>
          <div className="gis-statusbar"><span>Lat -0.507 · Lng 101.447</span><span>Zoom 12</span><span>3 layers aktif</span></div>
        </div>
      </section>
      <p className="preview-banner gis-preview-note">GIS Studio ini hanya visual workspace preview. Analisis authoritative tetap akan menggunakan PostGIS; runtime demo tetap config-driven.</p>
    </main>
  );
}
