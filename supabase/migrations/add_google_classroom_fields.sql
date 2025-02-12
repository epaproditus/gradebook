-- Add Google Classroom fields to existing tables
ALTER TABLE students
ADD COLUMN google_id text,
ADD COLUMN google_email text;

ALTER TABLE assignments
ADD COLUMN google_classroom_id text,
ADD COLUMN google_classroom_link text;

ALTER TABLE grades
ADD COLUMN google_submission_id text,
ADD COLUMN last_synced timestamp with time zone;

-- Add indexes for faster lookups
CREATE INDEX idx_students_google_id ON students(google_id);
CREATE INDEX idx_assignments_google_id ON assignments(google_classroom_id);
CREATE INDEX idx_grades_google_sub ON grades(google_submission_id);
