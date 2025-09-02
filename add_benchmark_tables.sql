-- Create benchmark_scores table
CREATE TABLE IF NOT EXISTS benchmark_scores (
  id bigserial PRIMARY KEY,
  student_id bigint REFERENCES students(id) ON DELETE CASCADE NOT NULL,
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
  student_id bigint REFERENCES students(id) ON DELETE CASCADE NOT NULL,
  standard text NOT NULL,
  correct integer,
  tested integer,
  mastery integer,
  test_date date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE benchmark_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE benchmark_standards ENABLE ROW LEVEL SECURITY;

-- Create permissive policies
CREATE POLICY "Allow all access for authenticated users" ON benchmark_scores FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all access for authenticated users" ON benchmark_standards FOR ALL TO authenticated USING (true) WITH CHECK (true);
