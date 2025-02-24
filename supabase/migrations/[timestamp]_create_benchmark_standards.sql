-- Create the benchmark_standards table
create table if not exists benchmark_standards (
  id uuid default uuid_generate_v4() primary key,
  student_id bigint not null,
  standard varchar not null,
  correct integer not null check (correct >= 0),
  tested integer not null check (tested >= 0),
  mastery integer not null check (mastery >= 0 and mastery <= 100),
  test_date date not null default current_date,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,

  -- Add foreign key constraint
  constraint fk_student_id foreign key (student_id) references students(id) on delete cascade,
  
  -- Add unique constraint to prevent duplicates
  unique(student_id, standard, test_date)
);

-- Add index for efficient queries
create index idx_benchmark_standards_student on benchmark_standards(student_id);

-- Add comments for documentation
comment on table benchmark_standards is 'Stores student performance on individual TEKS standards';
comment on column benchmark_standards.standard is 'TEKS standard code (e.g., 8.2C)';
comment on column benchmark_standards.correct is 'Number of correct answers';
comment on column benchmark_standards.tested is 'Number of questions tested';
comment on column benchmark_standards.mastery is 'Mastery percentage (0-100)';
