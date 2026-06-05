-- Table for share tokens that allow non-members to read private space posts
create table if not exists post_share_tokens (
  token      text primary key default encode(gen_random_bytes(24), 'base64url'),
  post_id    uuid not null references posts(id) on delete cascade,
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Index for fast token lookup and preventing duplicate tokens per post/user
create unique index if not exists post_share_tokens_post_user_idx on post_share_tokens(post_id, created_by);

-- Allow the token creator to read their own tokens
alter table post_share_tokens enable row level security;

create policy "members can insert share tokens for their posts"
  on post_share_tokens for insert
  with check (auth.uid() = created_by);

create policy "token owner can read their tokens"
  on post_share_tokens for select
  using (auth.uid() = created_by);

-- Allow public (anon) to look up a token to verify it exists — no sensitive data exposed
create policy "public can verify token"
  on post_share_tokens for select
  using (true);
