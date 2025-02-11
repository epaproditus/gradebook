create table assignment_tags (
  id uuid default uuid_generate_v4() primary key,
  assignment_id text references assignments(id) on delete cascade,
  student_id bigint references students(id) on delete cascade,
  period text not null,
  tag_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index idx_assignment_tags_lookup on assignment_tags(assignment_id, student_id, period);
