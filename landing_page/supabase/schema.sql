-- =========================================================
-- FIRE.UP 블로그 — Supabase 테이블 · 보안 규칙
-- Supabase 대시보드 → SQL Editor → New query → 전체 붙여 넣고 Run
-- =========================================================

-- 1) 글
create table if not exists public.posts (
  id          text primary key,
  title       text    not null check (char_length(title) <= 200),
  html        text    not null default '',
  tags        text[]  not null default '{}',
  visibility  text    not null default 'public' check (visibility in ('public','private')),
  pinned      boolean not null default false,
  created_at  bigint  not null,              -- 밀리초(ms) 시간
  updated_at  bigint  not null,
  views       integer not null default 0,
  write_ms    bigint  not null default 0
);

-- 2) 댓글 · 답글 (parent_id가 있으면 답글)
create table if not exists public.comments (
  id          text primary key,
  post_id     text    not null references public.posts(id) on delete cascade,
  parent_id   text    references public.comments(id) on delete cascade,
  name        text    not null default '' check (char_length(name) <= 20),
  text        text    not null check (char_length(text) between 1 and 1000),
  author      boolean not null default false,  -- 관리자가 단 댓글 표시
  created_at  bigint  not null
);
create index if not exists comments_post_idx on public.comments(post_id);

-- 3) 보안 규칙(RLS): 방문자는 공개 글 읽기 + 댓글 쓰기만, 관리자(로그인)는 모두 가능
alter table public.posts    enable row level security;
alter table public.comments enable row level security;

drop policy if exists "posts: 방문자는 공개 글만 읽기" on public.posts;
create policy "posts: 방문자는 공개 글만 읽기" on public.posts
  for select to anon using (visibility = 'public');

drop policy if exists "posts: 관리자 전체 권한" on public.posts;
create policy "posts: 관리자 전체 권한" on public.posts
  for all to authenticated using (true) with check (true);

drop policy if exists "comments: 방문자는 공개 글 댓글 읽기" on public.comments;
create policy "comments: 방문자는 공개 글 댓글 읽기" on public.comments
  for select to anon
  using (exists (select 1 from public.posts p where p.id = post_id and p.visibility = 'public'));

-- 답글 확인용: 부모 댓글이 같은 글의 '댓글'(답글 아님)인지 (보안 규칙 안에서 쓰기 위해 별도 함수)
create or replace function public.is_top_comment(cid text, pid text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.comments c where c.id = cid and c.post_id = pid and c.parent_id is null);
$$;
revoke all on function public.is_top_comment(text, text) from public;
grant execute on function public.is_top_comment(text, text) to anon, authenticated;

drop policy if exists "comments: 방문자 댓글 쓰기" on public.comments;
create policy "comments: 방문자 댓글 쓰기" on public.comments
  for insert to anon
  with check (
    author = false
    and exists (select 1 from public.posts p where p.id = post_id and p.visibility = 'public')
    and (parent_id is null or public.is_top_comment(parent_id, post_id))
  );

drop policy if exists "comments: 관리자 전체 권한" on public.comments;
create policy "comments: 관리자 전체 권한" on public.comments
  for all to authenticated using (true) with check (true);

-- 4) 조회수 +1 (방문자는 이 함수로만 조회수를 올릴 수 있음)
create or replace function public.increment_views(pid text)
returns void
language sql
security definer
set search_path = public
as $$
  update public.posts set views = views + 1 where id = pid and visibility = 'public';
$$;
revoke all on function public.increment_views(text) from public;
grant execute on function public.increment_views(text) to anon, authenticated;
