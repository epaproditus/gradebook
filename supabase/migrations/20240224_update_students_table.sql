-- Add new columns
ALTER TABLE students
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Update existing records to split name into first_name and last_name
UPDATE students
SET 
  first_name = COALESCE(split_part(name, ',', 2), ''),
  last_name = COALESCE(split_part(name, ',', 1), name);

-- Make the new columns non-nullable after data migration
ALTER TABLE students
ALTER COLUMN first_name SET NOT NULL,
ALTER COLUMN last_name SET NOT NULL;

-- Keep the name column for now but make it generated
ALTER TABLE students
ALTER COLUMN name SET DATA TYPE text 
GENERATED ALWAYS AS (
  CASE 
    WHEN first_name = '' THEN last_name
    ELSE last_name || ', ' || first_name
  END
) STORED;
