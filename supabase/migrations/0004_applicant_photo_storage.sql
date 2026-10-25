-- ============================================================================
-- RASTA — Attachment metadata and private storage policy hardening.
-- Apply to existing Supabase projects after migrations 0001–0003.
-- ============================================================================

alter table public.attachments
  add column if not exists uploader_name text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'applicant-documents',
  'applicant-documents',
  false,
  10485760,
  array[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'image/jpeg',
    'image/png'
  ]
)
on conflict (id) do update
  set name = excluded.name,
      public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists rasta_applicant_documents_select on storage.objects;
create policy rasta_applicant_documents_select
  on storage.objects for select to authenticated
  using (
    bucket_id = 'applicant-documents'
    and rasta.is_active_user()
    and exists (
      select 1
      from public.attachments as at
      where at.storage_path = name
    )
  );

drop policy if exists rasta_applicant_documents_insert on storage.objects;
create policy rasta_applicant_documents_insert
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'applicant-documents'
    and rasta.is_admin()
    and exists (
      select 1
      from public.applicants as a
      where a.id::text = (storage.foldername(name))[1]
    )
  );

drop policy if exists rasta_applicant_documents_delete on storage.objects;
create policy rasta_applicant_documents_delete
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'applicant-documents'
    and rasta.is_admin()
  );
