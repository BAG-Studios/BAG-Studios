create table public.blog_posts (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check (length(title) between 3 and 150),
 category text not null default 'STUDIO NOTES',
 excerpt text not null check (length(excerpt) between 10 and 400),
 content text not null check (length(content) between 10 and 100000),
 cover_url text,
 layout jsonb check (layout is null or jsonb_typeof(layout)='object'),
 status text not null default 'draft' check (status in ('draft','published')),
 published_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check (status <> 'published' or published_at is not null)
);
create index blog_posts_published on public.blog_posts(published_at desc) where status = 'published';
alter table public.blog_posts enable row level security;
revoke all on public.blog_posts from anon, authenticated;
grant select on public.blog_posts to anon, authenticated;
grant all on public.blog_posts to service_role;
create policy published_posts_only on public.blog_posts for select to anon, authenticated using (status = 'published' and published_at <= now());
create policy service_manages_posts on public.blog_posts to service_role using (true) with check (true);
-- Public reading of article images; writes only through the authenticated owner API.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('blog-media','blog-media',true,2621440,array['image/jpeg','image/png','image/webp']);
