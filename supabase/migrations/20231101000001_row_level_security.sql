-- First drop all existing policies
drop policy if exists "Enable read access for all users" on public.students;
drop policy if exists "Enable read access for all users" on public.assignments;
drop policy if exists "Enable read access for all users" on public.grades;
drop policy if exists "Enable read access for all users" on public.assignment_tags;
drop policy if exists "Enable insert for authenticated users" on public.students;
drop policy if exists "Enable insert for authenticated users" on public.assignments;
drop policy if exists "Enable insert for authenticated users" on public.grades;
drop policy if exists "Enable insert for authenticated users" on public.assignment_tags;
drop policy if exists "Enable delete for authenticated users" on public.assignments;
drop policy if exists "Enable update for authenticated users" on public.assignments;
drop policy if exists "Enable all operations for authenticated users" on public.assignments;

-- First disable RLS on critical tables while developing
alter table public.assignments disable row level security;
alter table public.assignment_tags disable row level security;

-- Keep RLS on for student data (optional)
alter table public.students enable row level security;
alter table public.grades enable row level security;

-- Add policies for student data
create policy "enable_all_students"
on public.students
for all
to authenticated
using (true)
with check (true);

create policy "enable_all_grades"
on public.grades
for all
to authenticated
using (true)
with check (true);
