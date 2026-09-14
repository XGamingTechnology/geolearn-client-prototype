import { database, query } from "@/server/db";
import { hashPassword } from "@/server/auth/password";
import { STAFF_PERMISSIONS, type StaffPermission } from "@/server/auth/permissions";
import type { TeacherSession } from "@/server/auth/session";
import { assertTeacherSchool, AuthorizationError } from "@/server/auth/authorization";

export type StaffRole = "SCHOOL_ADMIN" | "TEACHER";
export type StaffAccount = {
  id: string;
  schoolId: string;
  email: string;
  displayName: string;
  role: StaffRole;
  status: "ACTIVE" | "DISABLED";
  permissions: StaffPermission[];
  lastLoginAt: Date | null;
};

function validateRole(role: string): asserts role is StaffRole {
  if (role !== "SCHOOL_ADMIN" && role !== "TEACHER") throw new Error("Invalid staff role");
}

function validatePermissions(values: readonly string[]): StaffPermission[] {
  const unique = [...new Set(values)];
  for (const value of unique) {
    if (!(STAFF_PERMISSIONS as readonly string[]).includes(value)) throw new Error("Invalid permission");
  }
  return unique as StaffPermission[];
}

export async function listStaffAccounts(session: TeacherSession): Promise<StaffAccount[]> {
  if (!session.schoolId && session.role !== "SYSTEM_ADMIN") throw new AuthorizationError();
  const schoolId = session.schoolId;
  const rows = await query<{
    id:string; schoolId:string; email:string; displayName:string; role:StaffRole;
    status:"ACTIVE"|"DISABLED"; lastLoginAt:Date|null; permissions:StaffPermission[]|null;
  }>(
    `select su.id,
       su.school_id as "schoolId",
       su.email,
       coalesce(tp.display_name, su.email) as "displayName",
       su.role,
       su.status,
       su.last_login_at as "lastLoginAt",
       coalesce(array_agg(sup.permission_code order by sup.permission_code)
         filter (where sup.permission_code is not null), '{}') as permissions
     from staff_users su
     left join teacher_profiles tp on tp.staff_user_id = su.id
     left join staff_user_permissions sup on sup.staff_user_id = su.id
     where su.school_id = $1
       and su.role in ('SCHOOL_ADMIN','TEACHER')
     group by su.id, tp.display_name
     order by case su.role when 'SCHOOL_ADMIN' then 0 else 1 end, lower(coalesce(tp.display_name, su.email))`,
    [schoolId],
  );
  return rows.map((row) => ({...row, permissions: row.permissions ?? []}));
}

export async function createStaffAccount(input: {
  actor: TeacherSession;
  email: string;
  displayName: string;
  password: string;
  role: string;
  permissions: readonly string[];
}): Promise<string> {
  if (!input.actor.schoolId) throw new AuthorizationError();
  validateRole(input.role);
  const permissions = validatePermissions(input.permissions);
  const email = input.email.trim().toLowerCase();
  const displayName = input.displayName.trim();
  if (!email || email.length > 320 || !displayName || displayName.length > 160) throw new Error("Invalid account data");
  const passwordHash = await hashPassword(input.password);
  const client = await database().connect();
  try {
    await client.query("begin");
    const created = await client.query<{id:string}>(
      `insert into staff_users(school_id,email,password_hash,role,status,must_change_password)
       values ($1,$2,$3,$4,'ACTIVE',true)
       returning id`,
      [input.actor.schoolId,email,passwordHash,input.role],
    );
    const staffUserId = created.rows[0]?.id;
    if (!staffUserId) throw new Error("Account creation failed");
    await client.query(
      "insert into teacher_profiles(staff_user_id,display_name,subject) values ($1,$2,'Geografi')",
      [staffUserId,displayName],
    );
    for (const permission of permissions) {
      await client.query(
        "insert into staff_user_permissions(staff_user_id,permission_code,granted_by) values ($1,$2,$3)",
        [staffUserId,permission,input.actor.staffUserId],
      );
    }
    await client.query(
      `insert into account_admin_events(school_id,actor_staff_user_id,target_type,target_id,action,details_json)
       values ($1,$2,'STAFF',$3,'CREATE',$4::jsonb)`,
      [input.actor.schoolId,input.actor.staffUserId,staffUserId,JSON.stringify({role:input.role,permissions})],
    );
    await client.query("commit");
    return staffUserId;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function updateStaffAccount(input: {
  actor: TeacherSession;
  staffUserId: string;
  displayName: string;
  role: string;
  status: string;
  permissions: readonly string[];
}): Promise<void> {
  if (!input.actor.schoolId) throw new AuthorizationError();
  if (input.staffUserId === input.actor.staffUserId && input.status !== "ACTIVE") throw new Error("Cannot disable your own account");
  validateRole(input.role);
  if (input.status !== "ACTIVE" && input.status !== "DISABLED") throw new Error("Invalid status");
  const permissions = validatePermissions(input.permissions);
  const displayName = input.displayName.trim();
  if (!displayName || displayName.length > 160) throw new Error("Invalid display name");

  const [target] = await query<{school_id:string; role:string}>("select school_id,role from staff_users where id=$1",[input.staffUserId]);
  if (!target) throw new Error("Account not found");
  assertTeacherSchool(input.actor,target.school_id);

  const client = await database().connect();
  try {
    await client.query("begin");
    await client.query(
      `update staff_users set role=$2,status=$3,
       credential_version = credential_version + case when role <> $2 or status <> $3 then 1 else 0 end,
       updated_at=now() where id=$1 and school_id=$4`,
      [input.staffUserId,input.role,input.status,input.actor.schoolId],
    );
    await client.query("update teacher_profiles set display_name=$2,updated_at=now() where staff_user_id=$1",[input.staffUserId,displayName]);
    await client.query("delete from staff_user_permissions where staff_user_id=$1",[input.staffUserId]);
    for (const permission of permissions) {
      await client.query(
        "insert into staff_user_permissions(staff_user_id,permission_code,granted_by) values ($1,$2,$3)",
        [input.staffUserId,permission,input.actor.staffUserId],
      );
    }
    await client.query(
      "update auth_sessions set revoked_at=coalesce(revoked_at,now()) where staff_user_id=$1 and revoked_at is null",
      [input.staffUserId],
    );
    await client.query(
      `insert into account_admin_events(school_id,actor_staff_user_id,target_type,target_id,action,details_json)
       values ($1,$2,'STAFF',$3,'UPDATE_PROFILE',$4::jsonb)`,
      [input.actor.schoolId,input.actor.staffUserId,input.staffUserId,JSON.stringify({role:input.role,status:input.status,permissions})],
    );
    await client.query("commit");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

export async function resetStaffPassword(input:{actor:TeacherSession;staffUserId:string;password:string}):Promise<void>{
  if (!input.actor.schoolId) throw new AuthorizationError();
  const [target]=await query<{school_id:string}>("select school_id from staff_users where id=$1",[input.staffUserId]);
  if(!target) throw new Error("Account not found");
  assertTeacherSchool(input.actor,target.school_id);
  const passwordHash=await hashPassword(input.password);
  await query(
    `update staff_users set password_hash=$2,must_change_password=true,
      credential_version=credential_version+1,password_changed_at=now(),updated_at=now()
      where id=$1`,
    [input.staffUserId,passwordHash],
  );
  await query("update auth_sessions set revoked_at=coalesce(revoked_at,now()) where staff_user_id=$1",[input.staffUserId]);
  await query(
    `insert into account_admin_events(school_id,actor_staff_user_id,target_type,target_id,action)
     values ($1,$2,'STAFF',$3,'RESET_PASSWORD')`,
    [input.actor.schoolId,input.actor.staffUserId,input.staffUserId],
  );
}
