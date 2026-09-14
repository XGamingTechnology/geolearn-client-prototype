"use client";

import Link from "next/link";
import { useState } from "react";

type Layer = { id: string; name: string; type: string; count: string; color: string; visible: boolean };

const initialLayers: Layer[] = [
  { id: "schools", name: "Sekolah Pekanbaru", type: "Point", count: "186", color: "point", visible: true },
  { id: "river", name: "Sungai Siak", type: "Line", count: "1", color: "river", visible: true },
  { id: "districts", name: "Kecamatan", type: "Polygon", count: "15", color: "polygon", visible: true },
];

const toolsList = ["Pan","Inspect","Draw","Buffer","Overlay","Distance"];

export function GisStudioPreview() {
  const [layers, setLayers] = useState(initialLayers);
  const [activeTool, setActiveTool] = useState("Buffer");
  const [showCatalog, setShowCatalog] = useState(false);

  const toggleLayer = (id: string) => setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, visible: !layer.visible } : layer));
  const activeLayers = layers.filter((layer) => layer.visible).length;

  return (
    <main className="gis-studio-page">
      <header className="gis-project-bar">
        <div><p className="eyebrow">GIS Studio · Interactive Preview</p><h1>Analisis Akses Sekolah Pekanbaru</h1><span>Draft project · belum disimpan ke database</span></div>
        <div><Link className="button button-secondary" href="/student/assessment/demo">Student Preview</Link><button className="button" type="button">Save Project</button></div>
      </header>

      <section className="gis-studio-layout">
        <aside className="gis-layer-panel">
          <div className="gis-panel-tabs"><span className="active">Layers</span><span>Tools & Map</span></div>
          <button className="add-layer-button" onClick={() => setShowCatalog(!showCatalog)} type="button">+ Add Layer</button>

          {showCatalog && <div className="gis-add-layer-panel">
            <strong>Data Bank</strong>
            <p>Tambahkan dataset reusable ke project.</p>
            <button type="button">Jalan Utama Pekanbaru <span>+</span></button>
            <button type="button">Fasilitas Kesehatan <span>+</span></button>
            <Link href="/teacher/data">Buka Bank Data →</Link>
          </div>}

          <div className="gis-layer-list">
            {layers.map((layer) => (
              <article className={"gis-layer-card " + (!layer.visible ? "muted" : "")} key={layer.id}>
                <button className="layer-visibility" onClick={() => toggleLayer(layer.id)} aria-label={(layer.visible ? "Sembunyikan " : "Tampilkan ") + layer.name} type="button">{layer.visible ? "●" : "○"}</button>
                <div className={"layer-swatch "+layer.color} />
                <div><strong>{layer.name}</strong><small>{layer.type} · {layer.count} object</small></div>
                <span>•••</span>
              </article>
            ))}
          </div>

          <div className="gis-legend"><strong>Legend</strong>{layers.filter((layer) => layer.visible).map((layer) => <p key={layer.id}><i className={layer.color === "point" ? "legend-school" : layer.color === "river" ? "legend-river" : "legend-area"} /> {layer.name}</p>)}</div>
          <div className="gis-crs">Project CRS <strong>EPSG:4326</strong></div>
        </aside>

        <div className="gis-map-workspace">
          <div className="gis-tool-dock">{toolsList.map((tool) => <button className={activeTool === tool ? "active" : ""} onClick={() => setActiveTool(tool)} key={tool} type="button">{tool}</button>)}</div>
          <div className="gis-faux-map">
            <div className="gis-map-grid" />
            {layers.find((layer) => layer.id === "river")?.visible && <span className="gis-river-line" />}
            {layers.find((layer) => layer.id === "districts")?.visible && <><span className="gis-area area-one" /><span className="gis-area area-two" /></>}
            {layers.find((layer) => layer.id === "schools")?.visible && <><span className="gis-school school-one" /><span className="gis-school school-two" /><span className="gis-school school-three" /></>}
            {activeTool === "Buffer" && <span className="gis-buffer-preview" />}
            <div className="gis-map-note"><strong>{activeTool} tool active</strong><span>{activeTool === "Buffer" ? "Preview radius 1 km" : "UI tool mode preview"}</span></div>
            <div className="mobile-layer-sheet"><strong>Layers · {activeLayers} aktif</strong><button onClick={() => setShowCatalog(!showCatalog)} type="button">+ Add</button></div>
          </div>
          <div className="gis-statusbar"><span>Lat -0.507 · Lng 101.447</span><span>Zoom 12</span><span>{activeLayers} layers aktif</span></div>
        </div>
      </section>
      <p className="preview-banner gis-preview-note">Interaksi ini hanya state UI preview. Analisis authoritative tetap akan memakai PostGIS; Student Preview memakai runtime config-driven yang sebenarnya.</p>
    </main>
  );
}
