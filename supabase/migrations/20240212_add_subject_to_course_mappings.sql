
-- Add subject column to course_mappings table
ALTER TABLE course_mappings
ADD COLUMN IF NOT EXISTS subject text CHECK (subject IN ('Math 8', 'Algebra I'));

-- Update existing records to default to 'Math 8'
UPDATE course_mappings
SET subject = 'Math 8'
WHERE subject IS NULL;

-- Make subject column required
ALTER TABLE course_mappings
ALTER COLUMN subject SET NOT NULL;
