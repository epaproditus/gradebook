-- Drop existing table and recreate with correct structure
drop table if exists public.seating_layouts;

create table public.seating_layouts (
    id uuid default gen_random_uuid() primary key,
    period text not null,
    layout jsonb not null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id)
);

-- Add index for performance
create index idx_seating_layouts_period on public.seating_layouts(period);

-- Enable RLS
alter table public.seating_layouts enable row level security;

-- Create policies
create policy "Users can read their own layouts"
    on public.seating_layouts for select
    using (auth.uid() = user_id);

create policy "Users can insert their own layouts"
    on public.seating_layouts for insert
    with check (auth.uid() = user_id);

create policy "Users can update their own layouts"
    on public.seating_layouts for update
    using (auth.uid() = user_id);
