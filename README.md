# GeoLearn — Client Review Static Prototype

Prototype statis untuk menggambarkan konsep **QuizInLearning + WebGIS + Spatial Thinking** pada GeoLearn.

## Yang bisa direview client

- Pilih tema pembelajaran.
- Question Bank dengan karakter GIS berbeda per soal.
- Quiz pilihan ganda dengan **GIS tools adaptif**.
- Contoh `Location`, `Spatial Pattern`, dan `Spatial Influence` yang dapat diklik.
- Required GIS action sebelum submit (contoh: Buffer 500 m).
- Peta & Data sebagai gambaran GIS Tool Registry.
- Learning Analytics / jejak aktivitas siswa.
- Question Builder untuk menggambarkan update soal dinamis tanpa coding.

> Semua koordinat, geometri, nilai, hasil, dan statistik pada prototype adalah **data simulasi** untuk review konsep UI/UX. Kerangka mode Spatial Thinking dan mapping fitur mengacu pada dokumen indikator proyek.

## Teknologi

- HTML5
- CSS3
- Vanilla JavaScript
- Leaflet 1.9.4 dari CDN
- OpenStreetMap tiles
- Tidak ada backend / database / build step

## Jalankan lokal

Bisa langsung membuka `index.html`. Untuk hasil yang paling konsisten, jalankan web server sederhana:

```bash
python3 -m http.server 8080
```

Lalu buka `http://localhost:8080`.

## Deploy ke GitHub Pages

### Opsi paling sederhana

1. Buat repository GitHub baru, misalnya `geolearn-prototype`.
2. Upload seluruh isi folder ini ke branch `main`.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **Deploy from a branch**.
5. Pilih branch `main` dan folder `/ (root)`.
6. Simpan.

URL akan berbentuk:

`https://USERNAME.github.io/geolearn-prototype/`

Semua path prototype bersifat relatif dan routing menggunakan URL hash, sehingga aman dijalankan dari GitHub Project Pages.

### Opsi GitHub Actions

Repository ini juga menyertakan workflow `.github/workflows/pages.yml`. Jika ingin memakai Actions, ubah Pages source menjadi **GitHub Actions**.

## Struktur

```text
geolearn-client-prototype/
├── index.html
├── assets/
│   ├── css/styles.css
│   └── js/
│       ├── data.js
│       └── app.js
├── docs/
│   └── PROTOTYPE_SCOPE.md
├── .github/workflows/pages.yml
├── .nojekyll
└── README.md
```

## Batas prototype

- Tidak ada autentikasi.
- Tidak ada server/database.
- Question Builder hanya menyimpan data pada `localStorage` browser.
- Analisis GIS tertentu adalah simulasi visual, bukan hasil analisis ilmiah.
- Basemap memerlukan koneksi internet ke OpenStreetMap.
- Data produksi dan mekanisme authoring final akan dikembangkan di repo aplikasi utama.
