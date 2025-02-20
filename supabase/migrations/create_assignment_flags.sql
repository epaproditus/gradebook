create table assignment_flags (
  id uuid default gen_random_uuid() primary key,
  assignment_id uuid references assignments(id),
  student_id integer references students(id),
  type text default 'needs_review',
  created_at timestamptz default now(),
  reviewed_at timestamptz,
  unique(assignment_id, student_id)
);

-- Add indexes
create index assignment_flags_lookup_idx on assignment_flags(assignment_id, student_id);
create index assignment_flags_review_idx on assignment_flags(reviewed_at) where reviewed_at is null;
