# GeoLearn Static Prototype — Scope v0.1

## Tujuan

Prototype ini dibuat untuk memvalidasi **alur produk dan pengalaman pengguna** sebelum implementasi backend dan GIS engine penuh.

## Grand flow

Theme → Question Bank → Question Configuration → Adaptive GIS → Spatial Activity → MCQ Answer → Feedback → Learning Analytics.

## Mapping Spatial Thinking

| Mode | Tujuan | Fitur WebGIS |
|---|---|---|
| Location | Mengidentifikasi posisi objek | Zoom, Pan, Search, Koordinat |
| Spatial Condition | Mendeskripsikan karakteristik lokasi | Layer Control, Popup, Attribute Table |
| Spatial Influence | Menentukan pengaruh fenomena | Buffer, Overlay, Distance |
| Spatial Group | Mengelompokkan wilayah | Filter, Symbology |
| Spatial Hierarchy | Menentukan hubungan pelayanan/skala | Network Layer, Administrative Layer |
| Spatial Analogies | Membandingkan wilayah | Swipe, Compare Layer |
| Spatial Pattern | Mengidentifikasi pola persebaran | Heat Map, Cluster Map |
| Spatial Association | Menjelaskan hubungan antarfenomena | Overlay, Transparency |

Mapping di atas diturunkan dari dokumen **Tabel Indikator dan Fitur WebGIS** yang diberikan untuk proyek.

## Demo interaktif utama

### ATM-LOC-01
- Tema: Atmosfer
- Spatial mode: Location
- Tools: Zoom, Pan, Search, Coordinate
- Required action: Search

### DEM-PAT-01
- Tema: Demografi
- Spatial mode: Spatial Pattern
- Tools: Zoom, Pan, Cluster, Heatmap
- Required action: Cluster

### BAN-INF-01
- Tema: Kebencanaan
- Spatial mode: Spatial Influence
- Tools: Zoom, Pan, Buffer, Overlay, Distance
- Required action: Buffer

## Dynamic question concept

Question Builder pada prototype memperlihatkan model konfigurasi:

- theme
- spatial thinking mode
- question text
- answer options
- correct answer
- GIS tools
- basemap

Pada produk final, konfigurasi tersebut disimpan ke database dan dibaca oleh Question Engine/GIS Engine. Pada prototype statis, konfigurasi hanya disimpan ke `localStorage`.

## Non-goals v0.1

Prototype ini bukan produk final dan tidak dimaksudkan untuk:

- menghitung analisis spasial ilmiah secara authoritative;
- menyimpan data siswa;
- melakukan autentikasi;
- authoring data GIS produksi;
- deployment production/staging;
- menjadi sumber data penelitian.

Semua data peta dan angka adalah simulasi.
