# GeoLearn authentication foundation

Status: Slice #10 implementation target.

## Contracts

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

## Tenancy

School is the tenancy root. Composite foreign keys on Class, StudentCredential, and Enrollment prevent cross-school enrollment joins at the database boundary. Teacher authorization helpers reject cross-school resource access.

## Staging bootstrap

Do not commit bootstrap credentials or paste them into issue/PR comments.

The bootstrap script is intentionally separate from migrations:

```bash
npm run auth:bootstrap --workspace=@geolearn/web
```

It reads these environment variables:

Required teacher bootstrap:
- DATABASE_URL
- BOOTSTRAP_SCHOOL_NAME
- BOOTSTRAP_SCHOOL_CODE
- BOOTSTRAP_TEACHER_EMAIL
- BOOTSTRAP_TEACHER_PASSWORD

Optional:
- BOOTSTRAP_TEACHER_NAME
- BOOTSTRAP_ROTATE_CREDENTIALS=true

Optional student/class bootstrap (all required as one group):
- BOOTSTRAP_CLASS_NAME
- BOOTSTRAP_CLASS_CODE
- BOOTSTRAP_STUDENT_ID
- BOOTSTRAP_STUDENT_NAME
- BOOTSTRAP_STUDENT_PIN

Additional optional class metadata:
- BOOTSTRAP_GRADE_LEVEL
- BOOTSTRAP_ACADEMIC_YEAR
- BOOTSTRAP_SEMESTER

The script is idempotent for school, teacher, class, student, credential, and enrollment records. Existing credentials are not rotated unless BOOTSTRAP_ROTATE_CREDENTIALS=true.
