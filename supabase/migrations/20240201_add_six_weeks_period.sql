-- First check if column exists, if not then add it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 
                  FROM information_schema.columns 
                  WHERE table_name='assignments' 
                  AND column_name='six_weeks_period') THEN
        ALTER TABLE assignments
        ADD COLUMN six_weeks_period VARCHAR(3) CHECK (six_weeks_period ~ '^[1-6]SW$');
    END IF;
END $$;

-- Check if index exists before creating it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1
                  FROM pg_indexes
                  WHERE indexname = 'idx_assignments_six_weeks') THEN
        CREATE INDEX idx_assignments_six_weeks ON assignments(six_weeks_period);
    END IF;
END $$;

-- Optional: Update existing assignments (commented out for safety)
-- UPDATE assignments SET six_weeks_period = '4SW' WHERE six_weeks_period IS NULL;
