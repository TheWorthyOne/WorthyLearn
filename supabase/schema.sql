create table if not exists public.courses (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade,
  topic text not null,
  audience text,
  depth int not null default 3,
  format text not null default 'course',
  overview text,
  content jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.courses enable row level security;

create policy "Users can read their own courses"
  on public.courses for select
  using (auth.uid() = user_id or user_id is null);

create policy "Users can insert their own courses"
  on public.courses for insert
  with check (auth.uid() = user_id or user_id is null);

create index if not exists courses_created_at_idx on public.courses(created_at desc);
create index if not exists courses_topic_idx on public.courses using gin(to_tsvector('english', topic));
