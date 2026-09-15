"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Student = {
  studentId:string;
  loginId:string;
  fullName:string;
  credentialStatus:"ACTIVE"|"DISABLED";
  lastLoginAt:string|null;
};

export function StudentManagerControls({classId,students}:{classId:string;students:Student[]}){
  const router=useRouter();
  const [name,setName]=useState("");
  const [loginId,setLoginId]=useState("");
  const [busy,setBusy]=useState(false);
  const [credential,setCredential]=useState<{loginId:string;pin:string}|null>(null);
  const [error,setError]=useState("");

  async function addStudent(event:React.FormEvent){
    event.preventDefault(); setBusy(true); setError(""); setCredential(null);
    try{
      const response=await fetch(`/api/classes/${classId}/students`,{
        method:"POST",headers:{"content-type":"application/json"},
        body:JSON.stringify({fullName:name,loginId:loginId||undefined}),
      });
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||"Gagal menambah siswa");
      setCredential({loginId:body.loginId,pin:body.initialPin});
      setName(""); setLoginId(""); router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Gagal menambah siswa");}
    finally{setBusy(false);}
  }

  async function resetPin(studentId:string,studentLoginId:string){
    if(!confirm("Reset PIN siswa ini? PIN lama langsung tidak berlaku.")) return;
    setBusy(true); setError("");
    try{
      const response=await fetch(`/api/classes/${classId}/students/${studentId}/reset-pin`,{method:"POST"});
      const body=await response.json();
      if(!response.ok) throw new Error(body.error||"Gagal reset PIN");
      setCredential({loginId:studentLoginId,pin:body.pin});
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Gagal reset PIN");}
    finally{setBusy(false);}
  }

  async function toggleCredential(studentId:string,enabled:boolean){
    setBusy(true); setError("");
    try{
      const response=await fetch(`/api/classes/${classId}/students/${studentId}/credential`,{
        method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({enabled}),
      });
      if(!response.ok) throw new Error("Gagal mengubah credential");
      router.refresh();
    }catch(e){setError(e instanceof Error?e.message:"Gagal mengubah credential");}
    finally{setBusy(false);}
  }

  return <>
    <section className="student-add-panel">
      <div><p className="eyebrow">Manual Add</p><h2>Tambah siswa</h2><p>Student ID boleh dikosongkan agar GeoLearn membuat ID otomatis.</p></div>
      <form onSubmit={addStudent} className="student-add-form">
        <label>Nama siswa<input value={name} onChange={(e)=>setName(e.target.value)} required maxLength={180} placeholder="Nama lengkap"/></label>
        <label>Student ID opsional<input value={loginId} onChange={(e)=>setLoginId(e.target.value)} maxLength={128} placeholder="Auto-generate"/></label>
        <button className="button" disabled={busy} type="submit">{busy?"Memproses...":"+ Tambah Siswa"}</button>
      </form>
      {error&&<p className="auth-error">{error}</p>}
      {credential&&<div className="credential-receipt"><strong>Simpan kredensial ini sekarang</strong><span>Student ID <b>{credential.loginId}</b></span><span>PIN <b>{credential.pin}</b></span><small>PIN hanya dikirim sekali dari server dan tidak disimpan plaintext.</small></div>}
    </section>

    <div className="student-table" role="table" aria-label="Daftar siswa">
      <div className="student-table-head" role="row"><span>Student ID</span><span>Nama</span><span>Status</span><span>Login terakhir</span><span>Aksi</span></div>
      {students.map((student)=>(
        <div className="student-table-row" role="row" key={student.studentId}>
          <span className="student-id">{student.loginId}</span>
          <strong>{student.fullName}</strong>
          <span><i className={student.credentialStatus==="ACTIVE"?"status-mini active":"status-mini warning"}/>{student.credentialStatus==="ACTIVE"?"Aktif":"Nonaktif"}</span>
          <span>{student.lastLoginAt?new Date(student.lastLoginAt).toLocaleDateString("id-ID"):"Belum pernah"}</span>
          <span className="student-row-actions">
            <button disabled={busy} onClick={()=>resetPin(student.studentId,student.loginId)} type="button">Reset PIN</button>
            <button disabled={busy} onClick={()=>toggleCredential(student.studentId,student.credentialStatus!=="ACTIVE")} type="button">{student.credentialStatus==="ACTIVE"?"Nonaktifkan":"Aktifkan"}</button>
          </span>
        </div>
      ))}
    </div>

    <div className="mobile-student-list">
      {students.map((student)=>(
        <article className="mobile-student-card" key={student.studentId}>
          <div><strong>{student.fullName}</strong><span>{student.loginId}</span></div>
          <div><span><i className={student.credentialStatus==="ACTIVE"?"status-mini active":"status-mini warning"}/>{student.credentialStatus==="ACTIVE"?"Aktif":"Nonaktif"}</span><small>{student.lastLoginAt?"Pernah login":"Belum login"}</small></div>
          <button disabled={busy} onClick={()=>resetPin(student.studentId,student.loginId)} type="button">Reset PIN</button>
        </article>
      ))}
    </div>
  </>;
}
