-- Create students table
create table if not exists public.students (
    id bigint primary key,
    name text not null,
    birthday date,
    class_period text not null
);

-- Create assignments table
create table if not exists public.assignments (
    id text primary key,
    name text not null,
    date date not null,
    type text not null check (type in ('Daily', 'Assessment')),
    subject text not null check (subject in ('Math 8', 'Algebra I')),
    periods text[] not null
);

-- Create grades table
create table if not exists public.grades (
    id uuid default uuid_generate_v4() primary key,
    assignment_id text references public.assignments(id) on delete cascade,
    student_id bigint references public.students(id) on delete cascade,
    period text not null,
    grade text not null,
    extra_points text default '0',
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
