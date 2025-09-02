-- Drop the permissive debug policies
DROP POLICY IF EXISTS "Allow public read access" ON students;
DROP POLICY IF EXISTS "Allow public read access" ON assignments;
DROP POLICY IF EXISTS "Allow public read access" ON grades;
DROP POLICY IF EXISTS "Allow public read access" ON assignment_tags;
DROP POLICY IF EXISTS "Allow public read access" ON assignment_flags;

-- TEACHER POLICIES (Full Access)
CREATE POLICY "Allow teachers full access to students" ON students FOR ALL
  USING (auth.email() IN (SELECT email FROM teachers));

CREATE POLICY "Allow teachers full access to assignments" ON assignments FOR ALL
  USING (auth.email() IN (SELECT email FROM teachers));

CREATE POLICY "Allow teachers full access to grades" ON grades FOR ALL
  USING (auth.email() IN (SELECT email FROM teachers));

CREATE POLICY "Allow teachers full access to tags" ON assignment_tags FOR ALL
  USING (auth.email() IN (SELECT email FROM teachers));
  
CREATE POLICY "Allow teachers full access to flags" ON assignment_flags FOR ALL
  USING (auth.email() IN (SELECT email FROM teachers));

-- STUDENT POLICIES (Restricted Access)
CREATE POLICY "Allow students to see their own info" ON students FOR SELECT
  USING (google_email = auth.email());

CREATE POLICY "Allow students to see their own assignments" ON assignments FOR SELECT
  USING (
    id IN (
      SELECT assignment_id FROM grades WHERE student_id IN (
        SELECT id FROM students WHERE google_email = auth.email()
      )
    )
  );

CREATE POLICY "Allow students to see their own grades" ON grades FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE google_email = auth.email()
    )
  );

CREATE POLICY "Allow students to see their own tags" ON assignment_tags FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE google_email = auth.email()
    )
  );
  
CREATE POLICY "Allow students to see their own flags" ON assignment_flags FOR SELECT
  USING (
    student_id IN (
      SELECT id FROM students WHERE google_email = auth.email()
    )
  );
