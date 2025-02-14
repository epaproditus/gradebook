
-- First, let's see the current table structure
\d course_mappings;

-- If you need to add the name column:
ALTER TABLE course_mappings 
ADD COLUMN IF NOT EXISTS name TEXT;

-- To see existing data:
SELECT * FROM course_mappings LIMIT 5;
