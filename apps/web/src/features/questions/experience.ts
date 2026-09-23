export const mapExperienceIds=["standard","analysis","map-data"] as const;
export type MapExperience=(typeof mapExperienceIds)[number];

export const basemapIds=["street","light","terrain","satellite"] as const;
export type BasemapId=(typeof basemapIds)[number];
export const basemapOptions:Array<{id:BasemapId;label:string;description:string}>=[
  {id:"street",label:"Street",description:"Peta jalan dan tempat umum untuk orientasi sehari-hari."},
  {id:"light",label:"Light",description:"Basemap minimal agar layer tematik lebih menonjol."},
  {id:"terrain",label:"Terrain",description:"Konteks relief dan topografi untuk analisis fisik wilayah."},
  {id:"satellite",label:"Satellite",description:"Citra sebagai konteks visual. Bukan pengganti dataset raster analitis."},
];

export const mapInteractionIds=[
  "layer-control",
  "legend",
  "popup",
  "feature-labels",
  "data-panel",
  "attribute-table",
  "search-place",
  "go-to-coordinate",
  "pick-coordinate",
  "pointer-coordinate",
  "fit-to-data",
  "north-arrow",
] as const;
export type MapInteraction=(typeof mapInteractionIds)[number];

export const legacyMapInteractions:MapInteraction[]=[
  "layer-control","popup","feature-labels","attribute-table","search-place","go-to-coordinate","pick-coordinate","pointer-coordinate","fit-to-data",
];

export const mapExperienceOptions:Array<{id:MapExperience;label:string;description:string}>=[
  {id:"standard",label:"Peta Tunggal",description:"Satu ruang peta interaktif dengan kontrol yang dipilih guru."},
  {id:"analysis",label:"Peta Analisis",description:"Peta interaktif untuk menjalankan Buffer, Overlay, atau Distance."},
  {id:"map-data",label:"Peta + Data",description:"Peta dengan panel data untuk membaca atau membandingkan atribut feature."},
];

export const plannedMapExperiences=[
  {id:"compare",label:"Compare Map",description:"Dua peta berdampingan dengan navigasi tersinkron."},
  {id:"slider",label:"Map Slider",description:"Bandingkan dua waktu atau layer dengan slider."},
  {id:"dashboard",label:"Dashboard Map",description:"Peta dipadukan dengan tabel, indikator, atau chart."},
] as const;

export const mapInteractionOptions:Array<{id:MapInteraction;label:string;description:string;group:"explore"|"data"|"orientation"}>=[
  {id:"layer-control",label:"Layer Control",description:"Siswa dapat menyalakan atau mematikan layer.",group:"explore"},
  {id:"legend",label:"Legend",description:"Tampilkan keterangan layer tanpa memberi kontrol tambahan.",group:"explore"},
  {id:"popup",label:"Popup",description:"Klik feature untuk membaca atribut ringkas.",group:"data"},
  {id:"feature-labels",label:"Feature Labels",description:"Tampilkan field label yang dikonfigurasi pada layer.",group:"data"},
  {id:"data-panel",label:"Data Panel",description:"Tampilkan atribut penting feature terpilih dalam panel ringkas.",group:"data"},
  {id:"attribute-table",label:"Attribute Table",description:"Buka tabel atribut lengkap dan pilih feature dari tabel.",group:"data"},
  {id:"search-place",label:"Search Place",description:"Cari nama tempat lalu arahkan peta ke hasil pencarian.",group:"orientation"},
  {id:"go-to-coordinate",label:"Go to Coordinate",description:"Masukkan latitude dan longitude untuk menuju lokasi.",group:"orientation"},
  {id:"pick-coordinate",label:"Pick Coordinate",description:"Klik peta untuk mengambil koordinat lokasi.",group:"orientation"},
  {id:"pointer-coordinate",label:"Pointer Coordinate",description:"Baca koordinat posisi pointer pada peta.",group:"orientation"},
  {id:"fit-to-data",label:"Fit to Data",description:"Kembalikan tampilan ke extent data yang aktif.",group:"orientation"},
  {id:"north-arrow",label:"North Arrow",description:"Tampilkan orientasi utara pada peta.",group:"orientation"},
];

export const plannedMapInteractions=[
  {id:"inset-map",label:"Inset Map",description:"Peta kecil konteks lokasi untuk membantu orientasi regional."},
  {id:"sync-navigation",label:"Sync Pan / Zoom",description:"Sinkronkan navigasi pada Compare Map."},
] as const;

type SpatialRecommendation={
  experience:MapExperience;
  interactions:MapInteraction[];
  analysis:string[];
  note:string;
  futureExperience?:"compare"|"slider"|"dashboard";
};

const recommendationByMode:Record<string,SpatialRecommendation>={
  location:{experience:"standard",interactions:["layer-control","legend","popup","search-place","go-to-coordinate","pick-coordinate","pointer-coordinate","fit-to-data","north-arrow"],analysis:[],note:"Cocok untuk membaca posisi, arah, koordinat, dan hubungan lokasi."},
  condition:{experience:"map-data",interactions:["layer-control","legend","popup","data-panel","attribute-table","fit-to-data"],analysis:[],note:"Cocok ketika siswa perlu membaca beberapa atribut kondisi wilayah."},
  influence:{experience:"analysis",interactions:["layer-control","legend","popup","fit-to-data"],analysis:["buffer","overlay"],note:"Cocok untuk menguji wilayah pengaruh dan hubungan antar-layer."},
  region:{experience:"standard",interactions:["layer-control","legend","popup","fit-to-data","north-arrow"],analysis:[],note:"Cocok untuk mengenali batas, karakteristik, dan perbedaan wilayah."},
  hierarchy:{experience:"map-data",interactions:["layer-control","legend","popup","data-panel","attribute-table","fit-to-data"],analysis:["distance"],note:"Cocok untuk membaca tingkatan layanan, jangkauan, dan hubungan pusat–wilayah.",futureExperience:"dashboard"},
  analogy:{experience:"standard",interactions:["legend","popup","fit-to-data"],analysis:[],note:"Spatial Analogies idealnya memakai Compare Map. Untuk saat ini gunakan peta tunggal; Compare Map akan menjadi renderer lanjutan.",futureExperience:"compare"},
  pattern:{experience:"map-data",interactions:["layer-control","legend","popup","data-panel","attribute-table","fit-to-data"],analysis:[],note:"Cocok untuk mengenali distribusi, konsentrasi, dan pola feature."},
  association:{experience:"analysis",interactions:["layer-control","legend","popup","data-panel","attribute-table","fit-to-data"],analysis:["overlay"],note:"Cocok untuk menguji keterkaitan dua atau lebih fenomena spasial."},
};

export function recommendationForSpatialMode(mode:string):SpatialRecommendation{return recommendationByMode[mode]??recommendationByMode.location;}
export function normalizeMapExperience(value:unknown):MapExperience{return typeof value==="string"&&(mapExperienceIds as readonly string[]).includes(value)?value as MapExperience:"standard";}
export function normalizeBasemap(value:unknown):BasemapId{return typeof value==="string"&&(basemapIds as readonly string[]).includes(value)?value as BasemapId:"street";}
export function normalizeMapInteractions(value:unknown):MapInteraction[]{
  if(!Array.isArray(value))return [];
  return Array.from(new Set(value.filter((item):item is MapInteraction=>typeof item==="string"&&(mapInteractionIds as readonly string[]).includes(item))));
}
export function configuredMapInteractions(config:Record<string,unknown>):MapInteraction[]|null{
  if(!Object.prototype.hasOwnProperty.call(config,"interactions"))return null;
  return normalizeMapInteractions(config.interactions);
}
export function mapInteractionsForActivityConfig(config:Record<string,unknown>):MapInteraction[]{return configuredMapInteractions(config)??legacyMapInteractions;}
