import Link from "next/link";

const items = [
  {href:"/teacher/cases",icon:"◇",title:"Case Library",copy:"Media + dataset + related questions"},
  {href:"/teacher/media",icon:"▣",title:"Media",copy:"Image, video, document, illustration"},
  {href:"/teacher/gis",icon:"◎",title:"GIS Studio",copy:"Layer, digitize, Buffer, Overlay"},
  {href:"/teacher/assignments",icon:"✓",title:"Penugasan",copy:"Quiz version, kelas, jadwal, monitoring"},
  {href:"/teacher/results",icon:"◔",title:"Hasil",copy:"Spatial Thinking analytics"},
];

export default function TeacherMorePage(){
  return (
    <main className="dashboard catalog-page teacher-more-page">
      <header className="catalog-header"><div><p className="eyebrow">Teacher Workspace</p><h1>More</h1><p>Akses modul tambahan GeoLearn pada layar mobile maupun desktop.</p></div></header>
      <section className="more-module-grid">
        {items.map((item)=><Link href={item.href} key={item.href}><span>{item.icon}</span><div><strong>{item.title}</strong><small>{item.copy}</small></div><b>→</b></Link>)}
      </section>
    </main>
  );
}
