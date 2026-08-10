-- =====================================================
-- PROGRESS PHOTOS - Storage e tabela para fotos de progresso
-- =====================================================

-- 1. Criar bucket para fotos de progresso
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'progress-photos',
  'progress-photos',
  true,
  10485760, -- 10MB limit
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Criar tabela para metadata das fotos
create table if not exists public.progress_photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,
  photo_date date not null default current_date,
  category text not null default 'front' check (category in ('front', 'side', 'back')),
  notes text,
  weight_at_time numeric(5,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. Indexes
create index if not exists idx_progress_photos_user on public.progress_photos(user_id);
create index if not exists idx_progress_photos_date on public.progress_photos(photo_date desc);
create index if not exists idx_progress_photos_category on public.progress_photos(category);

-- 4. RLS
alter table public.progress_photos enable row level security;

-- Users can see their own photos
drop policy if exists "Users read own progress photos" on public.progress_photos;
create policy "Users read own progress photos"
  on public.progress_photos for select
  using (auth.uid() = user_id);

-- Users can insert their own photos
drop policy if exists "Users insert own progress photos" on public.progress_photos;
create policy "Users insert own progress photos"
  on public.progress_photos for insert
  with check (auth.uid() = user_id);

-- Users can update their own photos
drop policy if exists "Users update own progress photos" on public.progress_photos;
create policy "Users update own progress photos"
  on public.progress_photos for update
  using (auth.uid() = user_id);

-- Users can delete their own photos
drop policy if exists "Users delete own progress photos" on public.progress_photos;
create policy "Users delete own progress photos"
  on public.progress_photos for delete
  using (auth.uid() = user_id);

-- 5. Storage policies for progress-photos bucket
-- Public read access
drop policy if exists "Public read progress photos" on storage.objects;
create policy "Public read progress photos"
  on storage.objects for select
  using (bucket_id = 'progress-photos');

-- Users can upload to their own folder
drop policy if exists "Users upload own progress photos" on storage.objects;
create policy "Users upload own progress photos"
  on storage.objects for insert
  with check (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can update their own files
drop policy if exists "Users update own progress photos" on storage.objects;
create policy "Users update own progress photos"
  on storage.objects for update
  using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- Users can delete their own files
drop policy if exists "Users delete own progress photos" on storage.objects;
create policy "Users delete own progress photos"
  on storage.objects for delete
  using (
    bucket_id = 'progress-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

-- 6. Updated_at trigger
create or replace function public.update_progress_photos_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists progress_photos_updated_at on public.progress_photos;
create trigger progress_photos_updated_at
  before update on public.progress_photos
  for each row execute function public.update_progress_photos_updated_at();

-- 7. Comments
comment on table public.progress_photos is 'Fotos de progresso corporal dos usuários';
comment on column public.progress_photos.storage_path is 'Caminho no bucket progress-photos';
comment on column public.progress_photos.category is 'Tipo de foto: front, side, back';
comment on column public.progress_photos.weight_at_time is 'Peso do usuário no momento da foto';
