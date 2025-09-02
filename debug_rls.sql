-- Drop old policies
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON students;
DROP POLICY IF EXISTS "Allow all access for authenticated users" ON assignments;

-- Create public read-only policies
CREATE POLICY "Allow public read access" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read access" ON assignments FOR SELECT USING (true);
