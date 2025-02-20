create table teachers (
  id uuid default gen_random_uuid() primary key,
  email text unique not null,
  name text,
  created_at timestamptz default now()
);

-- Add teacher_id to messages table
alter table messages add column teacher_id uuid references teachers(id);
create index messages_teacher_id_idx on messages(teacher_id);

-- Add RLS policies
alter table teachers enable row level security;

create policy "Allow public read access to teachers"
  on teachers for select
  to authenticated
  using (true);

create policy "Allow teachers to update their own records"
  on teachers for update
  to authenticated
  using (auth.email() = email);
