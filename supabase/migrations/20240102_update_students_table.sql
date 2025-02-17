-- Add columns if they don't exist
ALTER TABLE students
ADD COLUMN IF NOT EXISTS email VARCHAR,
ADD COLUMN IF NOT EXISTS google_email VARCHAR;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_students_emails 
ON students(email, google_email);

-- Update existing records where possible
UPDATE students
SET google_email = email
WHERE google_email IS NULL AND email LIKE '%@eeisd.org';
