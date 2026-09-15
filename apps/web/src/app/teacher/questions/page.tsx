import Link from "next/link";
import { listQuestionBank } from "@/server/content/service";
import { requireTeacherSession } from "@/server/auth/session";

export default async function QuestionsPage({searchParams}:{searchParams:Promise<{status?:string}>}) {
  const session=await requireTeacherSession();
  const questions=await listQuestionBank(session);
  const {status}=await searchParams;
  return (
    <main className="dashboard catalog-page">
      <header className="catalog-header">
        <div><p className="eyebrow">Content Bank</p><h1>Bank Soal</h1><p>System, School, dan Private Bank dari PostgreSQL.</p></div>
        <Link className="button" href="/teacher/questions/new">+ Soal Baru</Link>
      </header>
      {status==="error"&&<p className="account-alert error">Operasi soal gagal.</p>}
      <div className="scope-tabs"><span className="active">Semua</span><span>System Bank</span><span>School Bank</span><span>My Bank</span></div>
      <section className="question-bank-list">
        {questions.map((q)=>(
          <article className="question-bank-row" key={q.id}>
            <div className="question-thumb">{q.stimulusType==="webgis"?"◎":q.stimulusType==="video"?"▶":"▣"}</div>
            <div className="question-main">
              <div className="question-tags"><span>{q.spatialMode??"-"}</span><span>{q.stimulusType??"-"}</span><span>{q.responseType??"-"}</span></div>
              <h2>{q.title}</h2><p>{q.difficulty??"-"} · {q.scope} · {q.versionNumber?"v"+q.versionNumber:"-"}</p>
            </div>
            <div className="question-status"><span className={q.versionStatus==="PUBLISHED"?"publish":"draft"}>{q.versionStatus??"DRAFT"}</span></div>
            <div className="row-actions"><Link href={"/teacher/questions/"+q.id}>Open</Link>{q.versionStatus==="PUBLISHED"&&<form action={"/api/content/questions/"+q.id+"/duplicate"} method="post"><button type="submit">Duplicate</button></form>}</div>
          </article>
        ))}
      </section>
      {!questions.length&&<div className="empty-state"><strong>Bank Soal masih kosong.</strong><p>Buat draft pertama untuk mulai authoring.</p></div>}
    </main>
  );
}
