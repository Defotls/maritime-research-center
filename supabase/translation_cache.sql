create table if not exists public.paper_translation_cache (
 user_id uuid not null references auth.users(id) on delete cascade,
 paper_id text not null references public.research_papers(id) on delete cascade,
 cache_key text not null,
 page_number integer,
 source_text text not null,
 translation text not null,
 model text not null default 'deepseek-flash',
 updated_at timestamptz not null default now(),
 primary key(user_id,paper_id,cache_key)
);
alter table public.paper_translation_cache enable row level security;
drop policy if exists "Own translation cache only" on public.paper_translation_cache;
create policy "Own translation cache only" on public.paper_translation_cache
 for all to authenticated using(auth.uid()=user_id) with check(auth.uid()=user_id);
grant select,insert,update,delete on public.paper_translation_cache to authenticated;
