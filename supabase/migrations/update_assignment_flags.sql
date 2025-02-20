-- Drop existing unique constraint if exists
alter table assignment_flags drop constraint if exists assignment_flags_assignment_id_student_id_key;

-- Add new columns
alter table assignment_flags add column created_by uuid references teachers(id);
alter table assignment_flags add column message text;

-- Add index for student notifications
create index student_unviewed_flags_idx on assignment_flags(student_id) 
where viewed_at is null;

-- Add a rule to prevent creating new flags if there's an unreviewed one
create or replace function check_existing_flag()
returns trigger as $$
begin
  if exists (
    select 1 
    from assignment_flags 
    where assignment_id = new.assignment_id 
    and student_id = new.student_id
    and reviewed_at is null
  ) then
    return null;  -- Silently prevent duplicate unreviewed flags
  end if;
  return new;
end;
$$ language plpgsql;

create trigger prevent_duplicate_unreviewed_flags
before insert on assignment_flags
for each row
execute function check_existing_flag();
