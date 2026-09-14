# GeoLearn authentication and account administration

Status: Slice #10 implementation target.

## Identity source of truth

Authentication and account state live in PostgreSQL.

Teacher/staff:
- `staff_users`
- `teacher_profiles`
- `staff_user_permissions`

Student:
- `students`
- `student_credentials`
- `classes`
- `enrollments`

Session/security:
- `auth_sessions`
- `auth_login_throttles`
- `account_admin_events`

User passwords and PINs are **not** environment variables.

## Login contracts

Teacher:
- email + password
- authenticated adult is a StaffUser
- non-system staff belongs to exactly one School

Student:
- Class Code + Student ID + PIN
- Student is not a StaffUser
- login resolves an ACTIVE Enrollment in the requested Class
- no self-registration

## Credential safety

- passwords and PINs use Node.js scrypt with per-credential random salts
- plaintext passwords/PINs are never stored
- session cookies are opaque random tokens; PostgreSQL stores only SHA-256 token hashes
- cookies are HttpOnly, SameSite=Lax, Secure outside local development
- credential reset/disable increments credential_version and revokes existing sessions
- repeated failed logins are throttled per hashed principal key
- login errors do not reveal which credential component was wrong

## Staff roles

Base roles:
- SYSTEM_ADMIN
- SCHOOL_ADMIN
- TEACHER

A SCHOOL_ADMIN can create and manage school staff accounts.

Delegated permissions:
- ACCOUNT_MANAGE
- STUDENT_CREDENTIAL_MANAGE
- CLASS_MANAGE_ALL
- CONTENT_MANAGE_SCHOOL
- RESULTS_VIEW_ALL
- SCHOOL_SETTINGS

Delegated teachers cannot promote themselves/others to SCHOOL_ADMIN or grant privileged ACCOUNT_MANAGE/SCHOOL_SETTINGS rights.

## Account CRUD

Teacher workspace route:
`/teacher/accounts`

Supported staff operations:
- Add account
- Edit display name
- Change role
- Add/remove delegated permissions
- Enable/disable account
- Reset password
- Revoke active sessions when security-sensitive account state changes

Administrative changes produce an `account_admin_events` audit record.

Hard delete is intentionally avoided. Disable/archive semantics preserve audit and historical references.

## Tenancy

School is the tenancy root. Composite foreign keys on Class, StudentCredential, and Enrollment prevent cross-school enrollment joins at the database boundary. Authorization helpers reject cross-school operations.

## First School Admin bootstrap

The first school administrator is the only account that cannot be created through the UI because no administrator exists yet.

Bootstrap is interactive. Only `DATABASE_URL` comes from infrastructure environment configuration; user credentials are entered at the terminal and immediately hashed into PostgreSQL.

Run from an image/workspace that contains application scripts:

```bash
npm run auth:bootstrap-admin --workspace=@geolearn/web
```

The command prompts for:
- School name
- School code
- Admin display name
- Admin email
- Temporary admin password

No teacher/student password or PIN is stored in a persistent `.env` file.

After the first SCHOOL_ADMIN exists, all additional staff accounts are created from `/teacher/accounts`.

Student creation/enrollment remains a separate class/student management workflow so student identity stays tied to School + Enrollment rather than being treated as a generic staff account.
