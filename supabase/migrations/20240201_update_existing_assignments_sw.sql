
-- Update existing assignments with six_weeks_period based on their dates
UPDATE assignments
SET six_weeks_period = 
  CASE 
    WHEN date BETWEEN '2023-08-14' AND '2023-09-22' THEN '1SW'
    WHEN date BETWEEN '2023-09-23' AND '2023-11-03' THEN '2SW'
    WHEN date BETWEEN '2023-11-04' AND '2023-12-22' THEN '3SW'
    WHEN date BETWEEN '2025-01-07' AND '2025-02-20' THEN '4SW'
    WHEN date BETWEEN '2025-02-24' AND '2025-03-17' THEN '5SW'
    WHEN date BETWEEN '2025-03-22' AND '2025-05-29' THEN '6SW'
    ELSE '5SW' -- Default to current six weeks if date doesn't match
  END
WHERE six_weeks_period IS NULL;

-- Add a default constraint for new assignments
ALTER TABLE assignments
ALTER COLUMN six_weeks_period SET DEFAULT '5SW';
