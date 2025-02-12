-- First, check what students we have and their periods
SELECT class_period, COUNT(*) as student_count, 
       COUNT(google_id) as mapped_count,
       array_agg(name) as student_names
FROM students 
GROUP BY class_period 
ORDER BY class_period;

-- Then check individual students for a specific period
SELECT id, name, class_period, google_id, google_email
FROM students
WHERE class_period = '6th'
ORDER BY name;
