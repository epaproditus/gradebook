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

-- Disable RLS on all tables during development
alter table public.students disable row level security;
alter table public.assignments disable row level security;
alter table public.grades disable row level security;
alter table public.assignment_tags disable row level security;

-- Grant all privileges to authenticated users
grant all privileges on public.students to authenticated;
grant all privileges on public.assignments to authenticated;
grant all privileges on public.grades to authenticated;
grant all privileges on public.assignment_tags to authenticated;

-- Grant usage on sequences
grant usage on all sequences in schema public to authenticated;
