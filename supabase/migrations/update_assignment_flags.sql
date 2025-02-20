-- Drop the unique constraint
alter table assignment_flags drop constraint assignment_flags_assignment_id_student_id_key;

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
