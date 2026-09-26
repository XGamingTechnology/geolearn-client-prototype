-- GeoLearn migration 0003: school account administration and delegated permissions.

ALTER TABLE staff_users
  ADD COLUMN must_change_password boolean NOT NULL DEFAULT false;

CREATE TABLE staff_user_permissions (
  staff_user_id uuid NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  permission_code text NOT NULL CHECK (permission_code IN (
    'ACCOUNT_MANAGE',
    'STUDENT_CREDENTIAL_MANAGE',
    'CLASS_MANAGE_ALL',
    'CONTENT_MANAGE_SCHOOL',
    'RESULTS_VIEW_ALL',
    'SCHOOL_SETTINGS'
  )),
  granted_by uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (staff_user_id, permission_code)
);
CREATE INDEX staff_user_permissions_code_idx ON staff_user_permissions (permission_code);

CREATE TABLE account_admin_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL REFERENCES schools(id) ON DELETE RESTRICT,
  actor_staff_user_id uuid REFERENCES staff_users(id) ON DELETE SET NULL,
  target_type text NOT NULL CHECK (target_type IN ('STAFF', 'STUDENT')),
  target_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN (
    'CREATE',
    'UPDATE_PROFILE',
    'CHANGE_ROLE',
    'CHANGE_PERMISSIONS',
    'ENABLE',
    'DISABLE',
    'ARCHIVE',
    'RESET_PASSWORD',
    'RESET_PIN',
    'ENROLL'
  )),
  details_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX account_admin_events_school_created_idx
  ON account_admin_events (school_id, created_at DESC);
CREATE INDEX account_admin_events_target_idx
  ON account_admin_events (target_type, target_id, created_at DESC);
