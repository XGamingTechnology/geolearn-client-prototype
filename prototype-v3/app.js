(() => {
const app=document.getElementById('app');
let gisMap=null,studentMap=null,builderStep=1;
const route=()=>location.hash.replace('#/','')||'landing';
const go=r=>location.hash='#/'+r; window.go=go;

function brand(){return '<div class="brand"><div class="logo">G</div><div><b>GeoLearn</b><small>Spatial Learning Platform</small></div></div>'}
function pageHead(k,t,d,a=''){return '<div class="page-head"><div><div class="eyebrow">'+k+'</div><h1>'+t+'</h1><p>'+d+'</p></div><div class="actions">'+a+'</div></div>'}
function badge(t,c='blue'){return '<span class="badge '+c+'">'+t+'</span>'}
function btn(t,onclick='',c=''){return '<button class="btn '+c+'" '+(onclick?'onclick="'+onclick+'"':'')+'>'+t+'</button>'}
function metric(l,v,n){return '<div class="card metric"><span>'+l+'</span><b>'+v+'</b><small>'+n+'</small></div>'}
function mnav(r,ic,l,a){return '<button class="'+(a===r?'active':'')+'" onclick="go(\''+r+'\')"><span>'+ic+'</span>'+l+'</button>'}
function teacherShell(active,content,after){
  if(gisMap){gisMap.remove();gisMap=null}
  app.innerHTML='<header class="header">'+brand()+
  '<nav class="nav">'+
  [['dashboard','Dashboard'],['classes','Kelas'],['questions','Bank Soal'],['data','Bank Data'],['media','Media'],['studio','GIS Studio'],['results','Hasil']].map(x=>'<button class="'+(active===x[0]?'active':'')+'" onclick="go(\''+x[0]+'\')">'+x[1]+'</button>').join('')+
  '</nav><div class="header-actions">'+btn('Preview Siswa',"go('studenthome')",'ghost')+'<div class="avatar">IS</div></div></header><main class="main">'+content+'</main>'+
  '<nav class="mobile-bottom">'+mnav('dashboard','⌂','Home',active)+mnav('classes','▦','Kelas',active)+mnav('questions','◫','Soal',active)+mnav('data','◇','Data',active)+mnav('studio','⌖','GIS',active)+'</nav>';
  if(after)setTimeout(after,40);
}
function dashboard(){
 return pageHead('Teacher Workspace','Selamat pagi, Ibu Siti','Pantau kelas, tugas, bank soal, media, dan data spasial dari satu dashboard.',btn('+ Soal Baru',"go('builder')")+btn('+ Buat Tugas',"go('classes')",'primary'))+
 '<div class="grid g4">'+metric('Kelas aktif','4','+1 semester ini')+metric('Siswa aktif','128','98% kredensial aktif')+metric('Tugas aktif','6','2 perlu ditinjau')+metric('Bank Soal','86','+12 bulan ini')+'</div>'+
 '<div class="grid g2" style="margin-top:14px"><section class="card panel"><div class="section-title"><div><h3>Tugas aktif</h3><p>Status pengumpulan terbaru.</p></div></div><div class="list">'+
 '<div class="row">'+badge('XI-A')+'<div class="grow"><h4>Spatial Condition — Cisarua</h4><p>28 siswa · tutup 14 September</p></div>'+badge('21 terkumpul','green')+'</div>'+
 '<div class="row">'+badge('XI-B')+'<div class="grow"><h4>Spatial Location — Kawasan Monas</h4><p>31 siswa · tutup 15 September</p></div>'+badge('12 terkumpul','amber')+'</div></div></section>'+
 '<section class="card panel"><div class="section-title"><div><h3>Akses cepat</h3><p>Mulai dari pekerjaan yang paling sering digunakan.</p></div></div><div class="grid g2">'+
 '<button class="choice" onclick="go(\'questions\')">🧠<br>Bank Soal</button><button class="choice" onclick="go(\'data\')">🗺️<br>Bank Data</button><button class="choice" onclick="go(\'media\')">🎬<br>Media Bank</button><button class="choice" onclick="go(\'studio\')">📍<br>GIS Studio</button></div></section></div>';
}
function classes(){
 const cs=['XI-A','XI-B','XI-C','XII-A'];
 return pageHead('Ruang Kelas','Kelas & Siswa','Guru membuat kelas dan kredensial siswa. Siswa tidak perlu registrasi mandiri.',btn('+ Buat Kelas','','primary'))+
 '<div class="grid g3">'+cs.map((c,i)=>'<div class="card class-card">'+badge(c)+badge('2026/2027','gray')+'<h4>'+c+' Geografi</h4><p>'+(28+i*2)+' siswa · '+(2+i%3)+' tugas aktif</p><div class="meta-box"><span>Class Code</span><span class="class-code">GL-'+c.replace('-','')+'-'+['7K3Q','9J2M','4N8R','5T1P'][i]+'</span></div><div class="card-foot">'+btn('Salin Kode','','sm')+btn('Buka Kelas →',"go('classdetail')",'primary sm')+'</div></div>').join('')+'</div>';
}
function classDetail(){
 const rows=['Andi Pratama','Nadia Salsabila','Rizky Ramadhan'].map((n,i)=>'<div class="row"><div class="avatar" style="background:#eff6ff;color:#2563eb">'+n.split(' ').map(x=>x[0]).join('').slice(0,2)+'</div><div class="grow"><h4>'+n+'</h4><p>GL-11A-00'+(i+1)+' · aktivitas terakhir '+['hari ini','kemarin','2 hari lalu'][i]+'</p></div>'+badge('Aktif','green')+'<div class="actions">'+btn('Reset PIN','','sm')+btn('•••','','sm')+'</div></div>').join('');
 return pageHead('Kelas XI-A','XI-A Geografi','28 siswa · Semester Ganjil · 2026/2027',btn('Copy Class Code')+btn('+ Buat Tugas','','primary'))+
 '<div class="card panel"><div class="tabs"><button>Assignments</button><button class="active">Students</button><button>Results</button></div><div class="toolbar" style="margin:14px 0"><input class="search" placeholder="Cari siswa...">'+btn('Import Excel/CSV')+btn('+ Tambah Siswa','','primary')+'</div><div class="list">'+rows+'</div></div>';
}
function questions(){
 return pageHead('Reusable Content','Bank Soal','Gunakan soal system, soal sekolah, atau soal pribadi. Konten bawaan dapat diduplikasi dan dikembangkan.',btn('+ Buat Soal',"go('builder')",'primary'))+
 '<div class="card panel"><div class="toolbar"><input class="search" placeholder="Cari soal, materi, indikator..."><select class="select"><option>Kelas XI</option></select><select class="select"><option>Spatial Mode</option></select><select class="select"><option>Stimulus</option></select></div><div class="tabs" style="margin-top:12px"><button class="active">System Bank</button><button>School Bank</button><button>My Bank</button></div></div>'+
 '<div class="list" style="margin-top:14px">'+qrow('WEBGIS','Location','Sekolah Tangguh Bencana — Sungai Siak','Buffer 500 m · popup · proximity analysis','WebGIS')+qrow('VIDEO','Influence','Banjir dan Wilayah Hilir','Video / image · hubungan hulu–hilir','Media')+qrow('DUAL MAP','Analogy','Pantura: Sayung vs Pekalongan Utara','Compare / swipe · perubahan garis pantai','Compare')+'</div>';
}
function qrow(icon,mode,title,desc,stim){return '<div class="row"><div class="thumb" style="width:126px;height:80px;flex:0 0 auto">'+icon+'</div><div class="grow"><div class="toolbar">'+badge(mode.toUpperCase())+badge(stim,'green')+badge('A–E','gray')+'</div><h4 style="margin-top:7px">'+title+'</h4><p>'+desc+'</p></div><div class="actions">'+btn('Preview','','sm')+btn('Gunakan','','sm')+btn('Duplicate & Edit',"go('builder')",'primary sm')+'</div></div>'}
function dataBank(){
 const ds=[['Sungai Siak','GEOJSON','System','LineString · referensi analisis Pekanbaru','1.284'],['SMA Negeri Pekanbaru','GEOJSON','School','Point · sekolah negeri untuk soal mitigasi','48'],['DEM Semarang-Demak','GEOTIFF','System','Raster elevasi pesisir untuk rob','Raster'],['Land Subsidence InSAR','GEOTIFF','System','Raster laju penurunan tanah','Raster'],['Jaringan Jalan Pekanbaru','SHP','My Data','Vector jaringan aksesibilitas','8.932'],['Region Merapi','GEOJSON','School','Polygon KRB dan region lereng','3']];
 return pageHead('Katalog Data GeoLearn','Bank Data Spasial','Upload, digitasi, dan gunakan ulang dataset untuk berbagai Case dan Question.',btn('+ Upload Data','','primary')+btn('Buka GIS Studio',"go('studio')"))+
 '<div class="card panel"><div class="tabs"><button class="active">Semua</button><button>System Data</button><button>School Data</button><button>My Data</button></div><div class="toolbar" style="margin-top:12px"><input class="search" placeholder="Cari dataset spasial..."><select class="select"><option>Semua Format</option></select></div></div>'+
 '<div class="grid g3" style="margin-top:14px">'+ds.map(d=>'<div class="card data-card"><div class="toolbar">'+badge(d[1],d[1]==='GEOTIFF'?'amber':'green')+badge(d[2])+badge('Siap','green')+'</div><h4>'+d[0]+'</h4><p>'+d[3]+'</p><div class="meta-box"><span>Jumlah: '+d[4]+'</span><span>EPSG:4326</span></div><div class="card-foot">'+btn('Pratinjau','','sm')+btn('Buka di Studio →',"go('studio')",'sm')+'</div></div>').join('')+'</div>';
}
function mediaBank(){
 const cards=[['Diagram DAS Hulu–Hilir','Spatial Influence · 1600×900','Image',''],['Video Perubahan Penggunaan Lahan','Spatial Condition · 02:34 · MP4','Video','video'],['Range vs Threshold','Spatial Hierarchy · SVG/PNG','Chart',''],['Citra Pesisir Semarang','Spatial Association · 1920×1080','Image','']];
 return pageHead('Multimedia Stimulus','Media Bank','Gambar, video, dokumen, grafik, dan ilustrasi dikelola terpisah dari dataset spasial.',btn('+ Upload Media','','primary'))+
 '<div class="card panel"><div class="tabs"><button class="active">Semua</button><button>Gambar</button><button>Video</button><button>Dokumen</button><button>Grafik</button></div></div>'+
 '<div class="grid g3" style="margin-top:14px">'+cards.map(c=>'<div class="card media-card"><div class="thumb '+c[3]+'">'+(c[3]?'':c[0])+'</div><h4>'+c[0]+'</h4><p>'+c[1]+'</p><div class="card-foot">'+badge(c[2],c[2]==='Video'?'amber':'blue')+btn('Gunakan','','sm')+'</div></div>').join('')+'</div>';
}
function studio(){
 return pageHead('Geospatial Workspace','GIS Studio','Siapkan layer, digitasi, analisis, dan uji pengalaman siswa sebelum mengikat proyek ke Case atau Question.',btn('Student Preview')+btn('Simpan Proyek','','success'))+
 '<div class="studio"><aside class="card layer-panel"><div class="section-title"><div><h3>Layer Proyek</h3><p>3 layer aktif</p></div>'+badge('EPSG:4326')+'</div>'+btn('+ Tambah Layer','','primary')+
 layer('Sungai Siak','LINE · System Data','#2563eb')+layer('SMA Negeri Pekanbaru','POINT · School Data','#10b981')+layer('Buffer 500 m','GENERATED · Analysis','#f59e0b')+
 '<div style="border-top:1px solid var(--line);padding-top:12px;margin-top:12px"><div class="grid g2">'+btn('✎ Digitasi','','sm')+btn('◉ Buffer','','sm')+btn('⊕ Overlay','','sm')+btn('↔ Distance','','sm')+'</div></div></aside>'+
 '<section class="card studio-map"><div class="studio-bar"><div><b style="font-size:10px">Case: Sungai Siak — Sekolah Tangguh Bencana</b><div style="font-size:8px;color:var(--muted)">Question-ready workspace</div></div><div class="toolbar">'+badge('Saved','gray')+btn('Bind to Question','','sm')+'</div></div><div class="map-area"><div id="gisMap"></div><div class="map-status"><span>📍 Pekanbaru</span><span>Zoom 12.4×</span><span>3 Layer Aktif</span><span>OSM</span></div></div></section></div>';
}
function layer(n,m,c){return '<div class="layer"><div class="layer-top"><span class="swatch" style="background:'+c+'"></span><strong>'+n+'</strong><span>👁</span></div><small>'+m+'</small><div class="toolbar" style="margin-top:8px">'+btn('Style','','sm')+btn('Atribut','','sm')+'</div></div>'}
function initGis(){
 const el=document.getElementById('gisMap'); if(!el)return;
 gisMap=L.map(el).setView([0.54,101.45],12); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(gisMap);
 L.polyline([[0.54,101.36],[0.55,101.40],[0.54,101.46],[0.53,101.51],[0.54,101.56]],{color:'#2563eb',weight:5}).addTo(gisMap);
 L.circle([0.54,101.46],{radius:500,color:'#f59e0b',fillColor:'#fcd34d',fillOpacity:.2}).addTo(gisMap);
 [[0.545,101.448],[0.538,101.472],[0.555,101.433],[0.525,101.485]].forEach((p,i)=>L.circleMarker(p,{radius:7,color:'#fff',weight:2,fillColor:'#10b981',fillOpacity:1}).bindPopup('SMA Negeri '+(i+1)).addTo(gisMap));
}
function builder(){
 const names=['Informasi','Stimulus','Data & GIS','Aktivitas','Response','Validation','Feedback','Student Preview'];
 const body=[
 '<h3>Informasi Soal</h3><div class="field"><label>Judul</label><input value="Sekolah Tangguh Bencana — Sungai Siak"></div><div class="grid g2"><div class="field"><label>Spatial Thinking</label><select><option>Location</option></select></div><div class="field"><label>Kelas</label><select><option>XI SMA</option></select></div></div><div class="field"><label>Prompt</label><textarea>SMA Negeri manakah yang berada pada zona buffer paling dekat dari Sungai Siak?</textarea></div>',
 '<h3>Pilih Stimulus</h3><div class="choice-grid">'+['Text','Image','Video','Static Map','WebGIS','Dual Map','Map + Table','Map + Chart','Composite'].map(x=>'<button class="choice '+(x==='WebGIS'?'active':'')+'">'+x+'</button>').join('')+'</div>',
 '<h3>Data & GIS</h3><div class="list"><div class="row"><span class="swatch" style="background:#2563eb"></span><div class="grow"><h4>Sungai Siak</h4><p>DatasetVersion v3 · System Data</p></div>'+badge('Visible','green')+'</div><div class="row"><span class="swatch"></span><div class="grow"><h4>SMA Negeri Pekanbaru</h4><p>DatasetVersion v1 · School Data</p></div>'+badge('Visible','green')+'</div></div>',
 '<h3>Aktivitas Siswa</h3><div class="grid g2"><div class="card panel"><h3>Allowed tools</h3><p>☑ Pan<br>☑ Zoom<br>☑ Popup<br>☑ Buffer</p></div><div class="card panel"><h3>Required</h3><p>Buffer 500 m<br>Source: Sungai Siak</p></div></div>',
 '<h3>Response</h3><div class="choice-grid">'+['Multiple Choice A–E','Multi Select','Map Feature Select','Draw Point','Draw Line','Draw Polygon','Ranking','Numeric','Short Text'].map((x,i)=>'<button class="choice '+(i===0?'active':'')+'">'+x+'</button>').join('')+'</div>',
 '<h3>Validation</h3><div class="field"><label>Metode</label><select><option>Spatial Query</option><option>Static Answer</option><option>Geometry Overlap</option></select></div>',
 '<h3>Feedback</h3><div class="field"><label>Pembahasan</label><textarea>Gunakan buffer 500 m lalu identifikasi sekolah yang berada di dalam zona tersebut.</textarea></div>',
 '<h3>Student Preview</h3>'+btn('Buka Preview Siswa',"go('assessment')",'primary')
 ][builderStep-1];
 return pageHead('Question Builder','Builder V2','Wizard menampilkan kompleksitas GIS hanya bila memang diperlukan.',badge('Draft tersimpan','green')+btn('Kembali',"go('questions')"))+
 '<div class="builder"><aside class="card steps">'+names.map((n,i)=>'<div class="step '+(builderStep===i+1?'active':'')+'" onclick="builderStep='+(i+1)+';render()">'+(i+1)+'. '+n+'</div>').join('')+'</aside><section class="card editor">'+body+'<div style="display:flex;justify-content:space-between;margin-top:20px">'+btn('← Sebelumnya','prevStep()')+btn(builderStep===8?'Simpan Draft':'Berikutnya →','nextStep()','primary')+'</div></section></div>';
}
window.nextStep=()=>{if(builderStep<8)builderStep++;render()}; window.prevStep=()=>{if(builderStep>1)builderStep--;render()};
function results(){
 return pageHead('Learning Analytics','Hasil & Spatial Thinking','Analisis kelas, soal, aktivitas GIS, dan profil Spatial Thinking.',btn('Export'))+
 '<div class="grid g4">'+metric('Submission','26/28','93% selesai')+metric('Rata-rata','78.4','+4.2')+metric('Akurasi','74%','12 soal')+metric('Median Waktu','21m','−3 menit')+'</div>';
}
function landing(){
 app.innerHTML='<div class="public"><header class="public-header">'+brand()+'<nav class="public-nav"><a>Beranda</a><a>Tentang</a><a>Panduan</a><a>Katalog Publik</a></nav>'+btn('Login Pendidik & Admin',"go('dashboard')")+'</header><main class="landing"><section class="landing-copy">'+badge('Platform Pembelajaran Spatial Thinking')+'<h1>Belajar Geografi melalui <span>analisis spasial interaktif</span>.</h1><p>Kerjakan soal berbasis gambar, video, tabel, grafik, dan WebGIS. Guru dapat membangun bank soal dan bank data sendiri tanpa memaksa siswa membuat akun baru.</p></section><section class="card login-card">'+badge('KHUSUS SISWA')+'<h2>Masuk ke Ruang Belajar</h2><div class="field"><label>Kode Kelas</label><input value="GL-XIA-7K3Q"></div><div class="field"><label>Student ID</label><input value="GL-11A-001"></div><div class="field"><label>PIN</label><input type="password" value="123456"></div>'+btn('Masuk ke Ruang Belajar',"go('studenthome')",'primary')+'</section></main></div>';
}
function studentHead(t){return '<header class="student-head">'+brand()+'<div style="flex:1"></div>'+badge(t)+'<div class="avatar">AP</div></header>'}
function studentHome(){
 app.innerHTML=studentHead('Kelas XI-A')+'<main class="student-main">'+pageHead('Ruang Belajar','Halo, Andi 👋','Ada 2 tugas yang perlu kamu perhatikan.')+'<div class="grid g2"><div class="card panel">'+badge('Belum dikerjakan','amber')+'<h3>Spatial Location — Sungai Siak</h3><p>5 soal · gambar + WebGIS · batas 15 September</p>'+btn('Mulai Tugas',"go('assessment')",'primary')+'</div><div class="card panel">'+badge('Selesai','green')+'<h3>Koordinat Geografis — Monas</h3><p>Nilai 80 · Location</p>'+btn('Lihat Hasil',"go('studentresult')")+'</div></div></main>';
}
function assessment(){
 app.innerHTML=studentHead('Soal 1 / 5')+'<main class="student-main"><div class="assessment"><section class="card question-pane">'+badge('LOCATION')+'<h2>SMA Negeri manakah yang berada pada zona buffer paling dekat (&lt; 500 meter) dari Sungai Siak?</h2><p>Gunakan WebGIS untuk membuat buffer dan identifikasi sekolah yang berada dalam zona tersebut.</p><div class="required">Aktivitas wajib: <b>jalankan Buffer 500 m</b> sebelum menjawab.</div>'+btn('◉ Jalankan Buffer 500 m','runBuffer()','primary')+'<div>'+['SMAN 1 Pekanbaru','SMAN 3 Pekanbaru','SMAN 8 Pekanbaru','SMAN 9 Pekanbaru','SMAN 10 Pekanbaru'].map((x,i)=>'<div class="answer" onclick="pick(this)"><b>'+('ABCDE'[i])+'</b><span>'+x+'</span></div>').join('')+'</div>'+btn('Kirim Jawaban',"go('studentresult')",'primary')+'</section><section class="card stimulus"><div class="stimulus-head"><div><b>WebGIS · Pekanbaru</b><div style="font-size:8px;color:var(--muted)">Sungai + Sekolah</div></div><div class="toolbar">'+badge('Pan','gray')+badge('Zoom','gray')+badge('Popup','gray')+badge('Buffer')+'</div></div><div class="stimulus-body"><div id="studentMap"></div></div></section></div></main>';
 setTimeout(initStudent,40);
}
window.pick=e=>{document.querySelectorAll('.answer').forEach(x=>x.classList.remove('selected'));e.classList.add('selected')};
function initStudent(){
 const el=document.getElementById('studentMap');if(!el)return;studentMap=L.map(el).setView([0.54,101.45],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(studentMap);L.polyline([[0.54,101.36],[0.55,101.40],[0.54,101.46],[0.53,101.51],[0.54,101.56]],{color:'#2563eb',weight:5}).addTo(studentMap);[[0.545,101.448],[0.538,101.472],[0.555,101.433],[0.525,101.485]].forEach((p,i)=>L.circleMarker(p,{radius:7,color:'#fff',weight:2,fillColor:'#10b981',fillOpacity:1}).bindPopup('SMA '+(i+1)).addTo(studentMap));
}
window.runBuffer=()=>{if(studentMap&&!window.buf)window.buf=L.circle([0.54,101.46],{radius:500,color:'#f59e0b',fillColor:'#fcd34d',fillOpacity:.2}).addTo(studentMap)};
function studentResult(){app.innerHTML=studentHead('Hasil Saya')+'<main class="student-main"><div class="card panel">'+badge('Tugas selesai','green')+'<h1>Nilai 80</h1><p>Spatial Location — Sungai Siak</p></div></main>'}

function render(){
 const r=route();
 if(studentMap){studentMap.remove();studentMap=null}
 ({landing,studenthome:studentHome,assessment,studentresult:studentResult}[r]||(()=>teacherShell(
   ({dashboard:'dashboard',classes:'classes',classdetail:'classes',questions:'questions',data:'data',media:'media',studio:'studio',builder:'questions',results:'results'}[r]||'dashboard'),
   ({dashboard:dashboard(),classes:classes(),classdetail:classDetail(),questions:questions(),data:dataBank(),media:mediaBank(),studio:studio(),builder:builder(),results:results()}[r]||dashboard()),
   r==='studio'?initGis:null
 )))();
}
window.addEventListener('hashchange',render); render();
})();