-- Get a sample of the actual data stored
SELECT student_id, standard, correct, tested, mastery, test_date
FROM benchmark_standards
ORDER BY student_id, standard
LIMIT 10;
