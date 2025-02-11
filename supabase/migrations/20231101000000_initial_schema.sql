-- Create students table
create table if not exists public.students (
    id bigint primary key,
    name text not null,
    birthday date,
    class_period text not null,
    created_at timestamptz default now()
);

-- Create assignments table
create table if not exists public.assignments (
    id text primary key,
    name text not null,
    date date not null,
    type text not null check (type in ('Daily', 'Assessment')),
    subject text not null check (subject in ('Math 8', 'Algebra I')),
    periods text[] not null,
    created_at timestamptz default now()
);

-- Create grades table
create table if not exists public.grades (
    id uuid default uuid_generate_v4() primary key,
    assignment_id text references public.assignments(id) on delete cascade,
    student_id bigint references public.students(id) on delete cascade,
    period text not null,
    grade text not null,
    extra_points text default '0',
    created_at timestamptz default now(),
    updated_at timestamptz default now(),
    unique(assignment_id, student_id, period)
);

-- Create assignment tags table
create table if not exists public.assignment_tags (
    id uuid default uuid_generate_v4() primary key,
    assignment_id text references public.assignments(id) on delete cascade,
    student_id bigint references public.students(id) on delete cascade,
    period text not null,
    tag_type text not null check (tag_type in ('absent', 'late', 'incomplete', 'retest')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(assignment_id, student_id, period, tag_type)
);

-- Add indexes
create index if not exists idx_students_class_period on public.students(class_period);
create index if not exists idx_assignments_date on public.assignments(date);
create index if not exists idx_grades_assignment on public.grades(assignment_id);
create index if not exists idx_grades_student on public.grades(student_id);
create index if not exists idx_tags_assignment on public.assignment_tags(assignment_id);
create index if not exists idx_tags_student on public.assignment_tags(student_id);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for grades
DROP TRIGGER IF EXISTS update_grades_updated_at ON public.grades;
CREATE TRIGGER update_grades_updated_at
  BEFORE UPDATE ON public.grades
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Grant all privileges to authenticated users
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
