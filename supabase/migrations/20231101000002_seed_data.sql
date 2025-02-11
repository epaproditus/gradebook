-- Add some sample students
INSERT INTO public.students (id, name, birthday, class_period) VALUES
(1001, 'Smith, John', '2008-05-15', '1'),
(1002, 'Johnson, Emily', '2008-07-22', '1'),
(1003, 'Williams, Michael', '2008-03-10', '2')
ON CONFLICT (id) DO NOTHING;

-- Add some sample assignments
INSERT INTO public.assignments (id, name, date, type, subject, periods) VALUES
('2023-11-01-homework1', 'Homework 1', '2023-11-01', 'Daily', 'Math 8', ARRAY['1', '2']),
('2023-11-02-quiz1', 'Quiz 1', '2023-11-02', 'Assessment', 'Math 8', ARRAY['1', '2'])
ON CONFLICT (id) DO NOTHING;
