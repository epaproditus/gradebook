create table if not exists public.seating_layouts (
  id uuid default gen_random_uuid() primary key,
  period text not null,
  layout jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS (Row Level Security)
alter table public.seating_layouts enable row level security;

-- Create policy to allow authenticated users to read/write
create policy "Allow authenticated users full access" on public.seating_layouts
  for all 
  to authenticated 
  using (true);
