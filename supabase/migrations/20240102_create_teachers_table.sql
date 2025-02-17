CREATE TABLE IF NOT EXISTS teachers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR NOT NULL UNIQUE,
  name VARCHAR,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add index on email
CREATE INDEX IF NOT EXISTS idx_teachers_email ON teachers(email);

-- Insert your email as a teacher
INSERT INTO teachers (email, name)
VALUES ('your.email@eeisd.org', 'Your Name')
ON CONFLICT (email) DO NOTHING;
