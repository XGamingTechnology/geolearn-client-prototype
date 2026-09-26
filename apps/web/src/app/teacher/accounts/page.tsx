import { redirect } from "next/navigation";
import { listStaffAccounts } from "@/server/accounts/service";
import { STAFF_PERMISSIONS, requireStaffPermission } from "@/server/auth/permissions";
import { requireTeacherSession } from "@/server/auth/session";

const permissionLabels: Record<string,string> = {
  ACCOUNT_MANAGE:"Kelola akun & hak akses",
  STUDENT_CREDENTIAL_MANAGE:"Reset / nonaktifkan kredensial siswa",
  CLASS_MANAGE_ALL:"Kelola semua kelas sekolah",
  CONTENT_MANAGE_SCHOOL:"Kelola School Bank",
  RESULTS_VIEW_ALL:"Lihat seluruh hasil sekolah",
  SCHOOL_SETTINGS:"Pengaturan sekolah",
};

const messages:Record<string,string>={
  created:"Akun berhasil dibuat.",
  updated:"Akun dan hak akses berhasil diperbarui.",
  "password-reset":"Password sementara berhasil direset.",
  error:"Perubahan gagal. Periksa data atau hak akses Anda.",
};

export default async function AccountsPage({searchParams}:{searchParams:Promise<{status?:string}>}){
  const actor=await requireTeacherSession();
  try{await requireStaffPermission(actor,"ACCOUNT_MANAGE");}catch{redirect("/teacher?error=forbidden");}
  const accounts=await listStaffAccounts(actor);
  const {status}=await searchParams;

  return (
    <main className="dashboard catalog-page accounts-page">
      <header className="catalog-header">
        <div><p className="eyebrow">School Administration</p><h1>Akun & Hak Akses</h1><p>Buat akun guru/admin, atur role, permission, status akun, dan reset password.</p></div>
        <span className="status-pill">{actor.role}</span>
      </header>

      {status&&<p className={status==="error"?"account-alert error":"account-alert"}>{messages[status]??messages.error}</p>}

      <section className="account-layout">
        <article className="dashboard-panel account-create-card">
          <div className="panel-heading"><div><p className="eyebrow">Add Account</p><h2>Tambah akun staf</h2></div><span className="status-pill">DATABASE</span></div>
          <form action="/api/admin/staff" method="post" className="account-form">
            <label>Nama<input name="displayName" placeholder="Nama guru/admin" required maxLength={160}/></label>
            <label>Email<input name="email" type="email" placeholder="guru@sekolah.sch.id" required maxLength={320}/></label>
            <label>Password sementara<input name="password" type="password" placeholder="Minimal 12 karakter" minLength={12} maxLength={512} required/></label>
            <label>Role
              <select name="role" defaultValue="TEACHER">
                <option value="TEACHER">Teacher</option>
                {actor.role!=="TEACHER"&&<option value="SCHOOL_ADMIN">School Admin</option>}
              </select>
            </label>
            <fieldset className="permission-fieldset"><legend>Hak akses tambahan</legend>
              {STAFF_PERMISSIONS.map((permission)=>{
                const privileged=permission==="ACCOUNT_MANAGE"||permission==="SCHOOL_SETTINGS";
                if(actor.role==="TEACHER"&&privileged)return null;
                return <label key={permission}><input type="checkbox" name="permissions" value={permission}/><span><strong>{permission}</strong><small>{permissionLabels[permission]}</small></span></label>;
              })}
            </fieldset>
            <button className="button button-wide" type="submit">Tambah Akun</button>
          </form>
          <p className="account-note">Password langsung di-hash sebelum disimpan. Akun baru diwajibkan mengganti password pada lifecycle berikutnya.</p>
        </article>

        <section className="account-list-panel">
          <div className="panel-heading"><div><p className="eyebrow">Staff Accounts</p><h2>{accounts.length} akun sekolah</h2></div><span className="status-pill">CRUD ACTIVE</span></div>
          <div className="account-list">
            {accounts.map((account)=>(
              <details className="account-row" key={account.id}>
                <summary>
                  <div className="account-avatar">{account.displayName.slice(0,2).toUpperCase()}</div>
                  <div><strong>{account.displayName}</strong><small>{account.email}</small></div>
                  <span className={"account-role "+account.role.toLowerCase()}>{account.role}</span>
                  <span className={account.status==="ACTIVE"?"account-status active":"account-status"}>{account.status}</span>
                  <b>⌄</b>
                </summary>
                <div className="account-editor">
                  <form action={"/api/admin/staff/"+account.id} method="post" className="account-form compact">
                    <div className="builder-two-col">
                      <label>Nama<input name="displayName" defaultValue={account.displayName} required/></label>
                      <label>Role<select name="role" defaultValue={account.role}><option value="TEACHER">Teacher</option>{actor.role!=="TEACHER"&&<option value="SCHOOL_ADMIN">School Admin</option>}</select></label>
                    </div>
                    <label>Status<select name="status" defaultValue={account.status}><option value="ACTIVE">Active</option><option value="DISABLED">Disabled</option></select></label>
                    <fieldset className="permission-fieldset"><legend>Hak akses</legend>
                      {STAFF_PERMISSIONS.map((permission)=>{
                        const privileged=permission==="ACCOUNT_MANAGE"||permission==="SCHOOL_SETTINGS";
                        if(actor.role==="TEACHER"&&privileged)return null;
                        return <label key={permission}><input type="checkbox" name="permissions" value={permission} defaultChecked={account.permissions.includes(permission)}/><span><strong>{permission}</strong><small>{permissionLabels[permission]}</small></span></label>;
                      })}
                    </fieldset>
                    <button className="button" type="submit">Simpan Perubahan</button>
                  </form>
                  <form action={"/api/admin/staff/"+account.id+"/reset-password"} method="post" className="reset-password-form">
                    <label>Reset password sementara<input name="password" type="password" minLength={12} maxLength={512} placeholder="Password baru sementara" required/></label>
                    <button className="button button-secondary" type="submit">Reset Password</button>
                  </form>
                </div>
              </details>
            ))}
          </div>
        </section>
      </section>

      <p className="preview-banner">Semua akun, role, permission, status, session, dan audit event pada modul ini disimpan di PostgreSQL. Tidak ada credential user di .env.</p>
    </main>
  );
}
