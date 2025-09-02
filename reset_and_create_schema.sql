-- Drop existing tables in reverse order of dependency to avoid errors
DROP TABLE IF EXISTS "public"."messages" CASCADE;
DROP TABLE IF EXISTS "public"."absences" CASCADE;
DROP TABLE IF EXISTS "public"."student_mappings" CASCADE;
DROP TABLE IF EXISTS "public"."course_mappings" CASCADE;
DROP TABLE IF EXISTS "public"."assignment_notes" CASCADE;
DROP TABLE IF EXISTS "public"."extra_points" CASCADE;
DROP TABLE IF EXISTS "public"."google_classroom_links" CASCADE;
DROP TABLE IF EXISTS "public"."assignment_flags" CASCADE;
DROP TABLE IF EXISTS "public"."assignment_tags" CASCADE;
DROP TABLE IF EXISTS "public"."grades" CASCADE;
DROP TABLE IF EXISTS "public"."assignments" CASCADE;
DROP TABLE IF EXISTS "public"."teachers" CASCADE;
DROP TABLE IF EXISTS "public"."students" CASCADE;
DROP TABLE IF EXISTS "public"."benchmark_scores" CASCADE;
DROP TABLE IF EXISTS "public"."benchmark_standards" CASCADE;


-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create students table with TEXT id
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  name text NOT NULL,
  class_period text NOT NULL DEFAULT '1',
  birthday date,
  google_id text,
  google_email text,
  period text,
  is_active boolean DEFAULT true
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id bigserial PRIMARY KEY,
  email text UNIQUE NOT NULL,
  name text
);

-- Insert your teacher email
INSERT INTO teachers (email) VALUES ('aromero@vanguardacademy.net') ON CONFLICT (email) DO NOTHING;

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  date date NOT NULL,
  type text NOT NULL,
  periods text[],
  subject text DEFAULT 'assignment',
  google_classroom_id text,
  google_classroom_link text,
  max_points integer DEFAULT 100,
  six_weeks_period VARCHAR(3) CHECK (six_weeks_period ~ '^[1-6]SW$'),
  status text DEFAULT 'not_started',
  completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_assignments_six_weeks ON assignments(six_weeks_period);

-- Create grades table
CREATE TABLE IF NOT EXISTS grades (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id text REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  period text NOT NULL,
  grade text NOT NULL,
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  extra_points smallint DEFAULT 0,
  google_submission_id text,
  last_synced timestamp,
  created_at timestamptz DEFAULT now()
);

-- Create assignment_tags table
CREATE TABLE IF NOT EXISTS assignment_tags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  period text NOT NULL,
  tag_type text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create assignment_flags table
CREATE TABLE IF NOT EXISTS assignment_flags (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  flag_type text NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Create google_classroom_links table
CREATE TABLE IF NOT EXISTS google_classroom_links (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  google_course_id text NOT NULL,
  google_coursework_id text NOT NULL
);

-- Create extra_points table
CREATE TABLE IF NOT EXISTS extra_points (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  period text NOT NULL,
  points smallint NOT NULL
);

-- Create assignment_notes table
CREATE TABLE IF NOT EXISTS assignment_notes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  notes text
);

-- Create course_mappings table
CREATE TABLE IF NOT EXISTS course_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_course_id text NOT NULL,
  period text NOT NULL DEFAULT '1',
  subject text NOT NULL,
  setup_completed boolean DEFAULT false,
  setup_completed_at timestamp,
  UNIQUE (google_course_id, period)
);

-- Create student_mappings table
CREATE TABLE IF NOT EXISTS student_mappings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  google_id text NOT NULL UNIQUE,
  google_email text,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  period text NOT NULL DEFAULT '1'
);

-- Create absences table
CREATE TABLE IF NOT EXISTS absences (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id uuid REFERENCES assignments(id) ON DELETE CASCADE,
  student_id text REFERENCES students(id) ON DELETE CASCADE,
  period text NOT NULL
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at timestamptz DEFAULT now(),
  sender text,
  recipient text,
  content text,
  is_read boolean DEFAULT false
);

-- Create benchmark_scores table
CREATE TABLE IF NOT EXISTS benchmark_scores (
  id bigserial PRIMARY KEY,
  student_id text REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  test_date date NOT NULL,
  subject text NOT NULL,
  score integer NOT NULL,
  performance_level text,
  test_type text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (student_id, subject, test_date)
);

-- Create benchmark_standards table
CREATE TABLE IF NOT EXISTS benchmark_standards (
  id bigserial PRIMARY KEY,
  student_id text REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  standard text NOT NULL,
  correct integer,
  tested integer,
  mastery integer,
  test_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);


-- Enable RLS for all tables
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE google_classroom_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE extra_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE absences ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_standards ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all access for authenticated users" ON students FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON teachers FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON assignments FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON grades FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON assignment_tags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON assignment_flags FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON google_classroom_links FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON extra_points FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON assignment_notes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON course_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON student_mappings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON absences FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON benchmark_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON benchmark_standards FOR ALL TO authenticated USING (true) WITH CHECK (true);