create type message_type as enum ('grade_question', 'general');

create table messages (
  id uuid default gen_random_uuid() primary key,
  student_id integer references students(id),
  assignment_id uuid references assignments(id),
  type message_type not null,
  message text not null,
  status text default 'unread',
  created_at timestamptz default now(),
  read_at timestamptz,
  resolved_at timestamptz
);

create index messages_student_id_idx on messages(student_id);
create index messages_assignment_id_idx on messages(assignment_id);
