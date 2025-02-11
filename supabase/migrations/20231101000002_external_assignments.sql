create table external_assignments (
    id uuid primary key default uuid_generate_v4(),
    title text not null,
    source text not null, -- 'google_classroom' or 'desmos'
    external_id text not null,
    url text,
    created_at timestamptz default now(),
    is_active boolean default true,
    unique(source, external_id)
);

create table external_grades (
    id uuid primary key default uuid_generate_v4(),
    external_assignment_id uuid references external_assignments(id),
    student_id uuid references students(id),
    grade numeric,
    last_synced_at timestamptz default now(),
    unique(external_assignment_id, student_id)
);
