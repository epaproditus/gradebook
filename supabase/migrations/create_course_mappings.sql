-- Create course mappings table
CREATE TABLE course_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    google_course_id TEXT NOT NULL UNIQUE,
    period TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    CONSTRAINT valid_period CHECK (period ~ '^[1-9]$')
);

-- Create student mappings table if it doesn't exist
CREATE TABLE IF NOT EXISTS student_mappings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    google_id TEXT NOT NULL UNIQUE,
    google_email TEXT NOT NULL,
    student_id BIGINT REFERENCES students(id),  -- Changed from UUID to BIGINT to match students table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add index for faster lookups
CREATE INDEX idx_student_mappings_email ON student_mappings(google_email);
