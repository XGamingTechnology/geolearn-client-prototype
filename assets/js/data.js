/* GeoLearn static prototype data. Semua geometri dan angka adalah DATA SIMULASI untuk demonstrasi UI. */
window.GEOLEARN_DATA = {
  spatialModes: {
    location: { label: 'Location', purpose: 'Mengidentifikasi posisi suatu objek', tools: ['zoom','pan','search','coordinate'] },
    condition: { label: 'Spatial Condition', purpose: 'Mendeskripsikan karakteristik suatu lokasi', tools: ['layer-control','popup','attribute-table'] },
    influence: { label: 'Spatial Influence', purpose: 'Menentukan pengaruh fenomena terhadap wilayah lain', tools: ['buffer','overlay','distance'] },
    group: { label: 'Spatial Group', purpose: 'Mengelompokkan wilayah berdasarkan karakteristik sama', tools: ['filter','symbology'] },
    hierarchy: { label: 'Spatial Hierarchy', purpose: 'Menentukan hubungan antarwilayah berdasarkan pelayanan/skala', tools: ['network','administrative-layer'] },
    analogies: { label: 'Spatial Analogies', purpose: 'Membandingkan wilayah dengan karakteristik serupa', tools: ['swipe','compare-layer'] },
    pattern: { label: 'Spatial Pattern', purpose: 'Mengidentifikasi pola persebaran fenomena', tools: ['heatmap','cluster'] },
    association: { label: 'Spatial Association', purpose: 'Menjelaskan hubungan antarfenomena spasial', tools: ['overlay','transparency'] }
  },
  themes: [
    { id:'atmosfer', name:'Atmosfer', icon:'☁', desc:'Membaca lokasi, kondisi, dan pola fenomena atmosfer.', progress:72 },
    { id:'demografi', name:'Demografi', icon:'◉', desc:'Menganalisis kepadatan, persebaran, dan hubungan penduduk.', progress:48 },
    { id:'kebencanaan', name:'Kebencanaan', icon:'△', desc:'Memahami area pengaruh dan risiko bencana secara spasial.', progress:35 },
    { id:'wilayah', name:'Wilayah & Layanan', icon:'⌘', desc:'Mengkaji hierarki wilayah, akses, dan pusat pelayanan.', progress:18 }
  ],
  questions: [
    {
      id:'ATM-LOC-01', theme:'atmosfer', spatialMode:'location', title:'Lokasi stasiun pengamatan atmosfer',
      prompt:'Perhatikan koordinat dan titik stasiun pada peta. Stasiun manakah yang berada paling dekat dengan koordinat -7.795, 110.370?',
      instruction:'Gunakan Search atau Coordinate untuk membantu menemukan posisi target sebelum memilih jawaban.',
      tools:['zoom','pan','search','coordinate'], requiredActions:['search'],
      layers:['Stasiun Cuaca','Batas Wilayah'], answer:'B',
      options:[['A','Stasiun Utara'],['B','Stasiun Pusat'],['C','Stasiun Timur'],['D','Stasiun Selatan']],
      explanation:'Pada data simulasi prototype, Stasiun Pusat ditempatkan paling dekat dengan koordinat target.',
      mapType:'stations'
    },
    {
      id:'DEM-PAT-01', theme:'demografi', spatialMode:'pattern', title:'Pola persebaran permukiman',
      prompt:'Berdasarkan persebaran titik permukiman pada peta, pola dominan apa yang paling terlihat pada wilayah simulasi ini?',
      instruction:'Aktifkan Cluster atau Heatmap untuk memperjelas konsentrasi titik sebelum menjawab.',
      tools:['zoom','pan','cluster','heatmap'], requiredActions:['cluster'],
      layers:['Titik Permukiman','Jalan Utama'], answer:'C',
      options:[['A','Seragam sempurna'],['B','Acak tanpa kecenderungan'],['C','Mengelompok pada koridor tertentu'],['D','Melingkar konsentris sempurna']],
      explanation:'Visualisasi simulasi menunjukkan beberapa konsentrasi titik yang membentuk kelompok pada koridor utama.',
      mapType:'settlements'
    },
    {
      id:'BAN-INF-01', theme:'kebencanaan', spatialMode:'influence', title:'Area pengaruh luapan sungai',
      prompt:'Jika sungai meluap hingga radius 500 meter dari alurnya, desa simulasi manakah yang paling jelas masuk ke area terdampak?',
      instruction:'Aktifkan Buffer 500 m kemudian Overlay. Sistem mensyaratkan aktivitas Buffer sebelum jawaban dapat dikirim.',
      tools:['zoom','pan','buffer','overlay','distance'], requiredActions:['buffer'],
      layers:['Sungai','Batas Desa','Permukiman'], answer:'A',
      options:[['A','Desa A'],['B','Desa B'],['C','Desa C'],['D','Desa D']],
      explanation:'Pada geometri simulasi, Desa A berpotongan paling nyata dengan buffer 500 meter dari sungai.',
      mapType:'flood'
    },
    {
      id:'DEM-GRP-02', theme:'demografi', spatialMode:'group', title:'Kelompok kepadatan penduduk',
      prompt:'Kelompokkan kecamatan berdasarkan kelas kepadatan penduduk yang tampak pada peta tematik.',
      instruction:'Gunakan Filter dan Symbology untuk membandingkan kelas.',
      tools:['filter','symbology'], requiredActions:[], layers:['Kepadatan Penduduk'], answer:'D',
      options:[['A','Semua wilayah sama'],['B','Hanya dua kelas'],['C','Tidak ada pola kelas'],['D','Terdapat beberapa kelas kepadatan']], explanation:'Contoh konfigurasi untuk menunjukkan bahwa Spatial Group memanggil tool yang berbeda.', mapType:'choropleth'
    },
    {
      id:'WIL-HIE-01', theme:'wilayah', spatialMode:'hierarchy', title:'Pusat pelayanan kesehatan',
      prompt:'Pusat pelayanan manakah yang secara jaringan melayani wilayah pendukung paling luas?',
      instruction:'Gunakan Network dan Administrative Layer.', tools:['network','administrative-layer'], requiredActions:[], layers:['Jaringan Jalan','Fasilitas Kesehatan','Batas Administrasi'], answer:'B',
      options:[['A','Puskesmas A'],['B','Rumah Sakit B'],['C','Klinik C'],['D','Pos D']], explanation:'Contoh konfigurasi Spatial Hierarchy.', mapType:'network'
    },
    {
      id:'DEM-ASS-03', theme:'demografi', spatialMode:'association', title:'Penduduk dan jaringan jalan',
      prompt:'Apakah terdapat indikasi hubungan antara kepadatan penduduk dan kedekatan terhadap jaringan jalan utama?',
      instruction:'Gunakan Overlay dan Transparency untuk membandingkan layer.', tools:['overlay','transparency'], requiredActions:[], layers:['Kepadatan Penduduk','Jaringan Jalan'], answer:'A',
      options:[['A','Ada indikasi hubungan spasial'],['B','Tidak berhubungan sama sekali'],['C','Data tidak dapat dibandingkan'],['D','Semua wilayah identik']], explanation:'Contoh konfigurasi Spatial Association.', mapType:'association'
    }
  ],
  demoGeometry: {
    center: [-7.7956,110.3695],
    stations: [
      {name:'Stasiun Utara',lat:-7.770,lng:110.355},{name:'Stasiun Pusat',lat:-7.795,lng:110.370},{name:'Stasiun Timur',lat:-7.805,lng:110.405},{name:'Stasiun Selatan',lat:-7.830,lng:110.365}
    ],
    settlements: [
      [-7.780,110.350],[-7.783,110.354],[-7.786,110.357],[-7.789,110.360],[-7.792,110.365],[-7.795,110.368],[-7.798,110.372],[-7.801,110.377],[-7.804,110.381],[-7.807,110.385],
      [-7.812,110.388],[-7.815,110.392],[-7.818,110.395],[-7.801,110.350],[-7.803,110.353],[-7.806,110.356],[-7.809,110.359],[-7.812,110.362],[-7.815,110.365]
    ],
    river: [[-7.755,110.345],[-7.770,110.352],[-7.786,110.360],[-7.800,110.371],[-7.815,110.380],[-7.835,110.392]],
    villages: [
      {name:'Desa A',coords:[[-7.784,110.357],[-7.784,110.376],[-7.803,110.376],[-7.803,110.357]]},
      {name:'Desa B',coords:[[-7.765,110.385],[-7.765,110.405],[-7.785,110.405],[-7.785,110.385]]},
      {name:'Desa C',coords:[[-7.813,110.345],[-7.813,110.358],[-7.831,110.358],[-7.831,110.345]]},
      {name:'Desa D',coords:[[-7.820,110.402],[-7.820,110.420],[-7.838,110.420],[-7.838,110.402]]}
    ]
  }
};
