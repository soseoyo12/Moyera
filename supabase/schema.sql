-- Sessions table
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  share_id text unique not null,
  tz text not null,
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default now()
);

-- Participants table
create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  name text not null,
  show_details boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Unavailabilities table
create table if not exists public.unavailabilities (
  participant_id uuid not null references public.participants(id) on delete cascade,
  d date not null,
  h smallint not null check (h between 9 and 23),
  primary key (participant_id, d, h)
);

-- Optional: simple function stub for heatmap (to be implemented later)
-- create or replace function public.get_session_heatmap(session_uuid uuid)
-- returns table(d date, h smallint, available_count integer)
-- language sql as $$
--   select date_series::date as d,
--          hour_series as h,
--          0 as available_count
--   from generate_series(
--          (select start_date from public.sessions where id = session_uuid),
--          (select end_date from public.sessions where id = session_uuid),
--          interval '1 day'
--        ) as date_series,
--        generate_series(9, 23, 1) as hour_series;
-- $$;
