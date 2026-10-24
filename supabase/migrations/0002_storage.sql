-- ============================================================================
-- RASTA — private applicant document storage (mission §5.5)
-- Bucket: applicant-documents (private). Path convention: {applicant_uuid}/{uuid}.{ext}
-- ============================================================================

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
  set public = false,
      file_size_limit = 10485760,
      allowed_mime_types = excluded.allowed_mime_types;

-- Every storage operation requires an authenticated, active user.
-- Downloads: any active member (mirrors applicant read permission).
create policy applicant_docs_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'applicant-documents'
    and rasta.is_active_user()
  );

-- Uploads: admin only, path root must be an existing applicant UUID.
create policy applicant_docs_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'applicant-documents'
    and rasta.is_admin()
    and name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/[^/]+$'
    and exists (
      select 1 from public.applicants a
      where a.id = (string_to_array(name, '/'))[1]::uuid
    )
  );

-- Deletion/update: admin only.
create policy applicant_docs_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'applicant-documents' and rasta.is_admin());

create policy applicant_docs_update on storage.objects
  for update to authenticated
  using (bucket_id = 'applicant-documents' and rasta.is_admin());
