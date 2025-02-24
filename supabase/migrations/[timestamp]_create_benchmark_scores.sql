create table if not exists benchmark_scores (
  id uuid default uuid_generate_v4() primary key,
  student_id bigint not null,  -- Changed from local_id to match students table
  test_date date not null,
  subject varchar not null,
  score integer not null check (score >= 0 AND score <= 100), -- Add score validation
  performance_level varchar check (performance_level in ('Did Not Meet', 'Approaches', 'Meets', 'Masters')), -- Add valid levels
  test_type varchar not null check (test_type in ('Spring', 'Fall', 'Winter')), -- Add test type
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  -- Update foreign key to reference correct column
  constraint fk_student_id foreign key (student_id) references students(id) on delete cascade,
  
  -- Add unique constraint to prevent duplicate entries
  unique(student_id, test_date, subject, test_type)
);

-- Create index as separate statement
create index benchmark_scores_student_date_idx 
  on benchmark_scores(student_id, test_date);

-- Add comments for better documentation
comment on table benchmark_scores is 'Stores student benchmark test scores';
comment on column benchmark_scores.score is 'Score from 0-100';
comment on column benchmark_scores.performance_level is 'STAAR performance level';
comment on column benchmark_scores.test_type is 'Testing period (Spring/Fall/Winter)';
