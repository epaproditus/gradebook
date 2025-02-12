-- Add Google Classroom integration fields
ALTER TABLE students 
ADD COLUMN IF NOT EXISTS google_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS google_email TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS period TEXT;

-- Add Google Classroom fields to assignments
ALTER TABLE assignments
ADD COLUMN IF NOT EXISTS google_classroom_id TEXT,
ADD COLUMN IF NOT EXISTS google_classroom_link TEXT;

-- Add tracking fields to grades
ALTER TABLE grades
ADD COLUMN IF NOT EXISTS google_submission_id TEXT,
ADD COLUMN IF NOT EXISTS last_synced TIMESTAMP WITH TIME ZONE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_students_google_id ON students(google_id) WHERE google_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_google_email ON students(google_email) WHERE google_email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_students_period ON students(period) WHERE period IS NOT NULL;
