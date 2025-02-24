-- Check a few specific standards for Leila
SELECT standard, correct, tested, mastery
FROM benchmark_standards
WHERE student_id = 423306
  AND standard IN ('8.2C', '8.2D')
ORDER BY standard;

-- Also check the raw counts
SELECT COUNT(*) as total_standards,
       COUNT(CASE WHEN correct > 0 THEN 1 END) as standards_with_correct,
       COUNT(CASE WHEN tested > 0 THEN 1 END) as standards_with_tested
FROM benchmark_standards
WHERE student_id = 423306;
