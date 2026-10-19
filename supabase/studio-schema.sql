create table public.blog_posts (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check (length(title) between 3 and 150),
 category text not null default 'STUDIO NOTES',
 excerpt text not null check (length(excerpt) between 10 and 400),
 content text not null check (length(content) between 10 and 100000),
 cover_url text,
 status text not null default 'draft' check (status in ('draft','published')),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (status <> 'published' or published_at is not null)
);
create index blog_posts_published on public.blog_posts(published_at desc) where status = 'published';
create table public.contact_messages (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 100),
 email text not null check(length(email) <= 254),
 subject text not null check(length(subject) between 2 and 160),
 message text not null check(length(message) between 10 and 5000),
 consent_at timestamptz not null,
 created_at timestamptz not null default now()
);
create table public.newsletter_subscribers (
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(email = lower(email) and length(email) <= 254),
 consent_at timestamptz not null,
 consent_version text not null,
 unsubscribe_token text not null unique check(unsubscribe_token ~ '^[a-f0-9]{64}$'),
 unsubscribed_at timestamptz
);
create table public.website_rate_limits (
 key text primary key,
 window_started_at timestamptz not null,
 requests integer not null
);
alter table public.blog_posts enable row level security;
alter table public.contact_messages enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.website_rate_limits enable row level security;
revoke all on public.blog_posts, public.contact_messages, public.newsletter_subscribers, public.website_rate_limits from anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant all on public.blog_posts, public.contact_messages, public.newsletter_subscribers, public.website_rate_limits to service_role;
create policy published_posts_only on public.blog_posts for select to anon, authenticated using (status = 'published' and published_at <= now());
create policy service_manages_posts on public.blog_posts to service_role using (true) with check (true);
create policy service_manages_messages on public.contact_messages to service_role using (true) with check (true);
create policy service_manages_subscribers on public.newsletter_subscribers to service_role using (true) with check (true);
create policy service_manages_limits on public.website_rate_limits to service_role using (true) with check (true);
create or replace function public.website_take_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean language plpgsql security definer set search_path = '' as $$
declare allowed boolean;
begin
 if length(p_key) <> 64 or p_limit < 1 or p_window_seconds < 1 then return false; end if;
 delete from public.website_rate_limits where window_started_at < now() - interval '2 days';
 insert into public.website_rate_limits as limits(key, window_started_at, requests)
 values (p_key, now(), 1)
 on conflict(key) do update set
 requests = case when limits.window_started_at < now() - make_interval(secs => p_window_seconds) then 1 else limits.requests + 1 end,
 window_started_at = case when limits.window_started_at < now() - make_interval(secs => p_window_seconds) then now() else limits.window_started_at end
 returning requests <= p_limit into allowed;
 return allowed;
end $$;
revoke all on function public.website_take_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.website_take_rate_limit(text, integer, integer) to service_role;
