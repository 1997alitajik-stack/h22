-- RASTA support center and atomic finalization of accepted candidates.
-- No applicant/ticket history is hard-deleted by these workflows.

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number bigint generated always as identity unique,
  created_by uuid references public.profiles(id) on delete set null,
  requester_name text not null check (char_length(btrim(requester_name)) between 2 and 120),
  requester_email text not null check (char_length(btrim(requester_email)) between 5 and 254),
  subject text not null check (char_length(btrim(subject)) between 3 and 160),
  category text not null check (category in ('ACCOUNT_ACCESS', 'BUG', 'DATA', 'HOW_TO', 'OTHER')),
  status text not null default 'OPEN'
    check (status in ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED')),
  priority text not null default 'NORMAL'
    check (priority in ('LOW', 'NORMAL', 'HIGH', 'URGENT')),
  page_path text check (page_path is null or char_length(page_path) <= 300),
  public_token_hash text check (public_token_hash is null or public_token_hash ~ '^[a-f0-9]{64}$'),
  assigned_to uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint support_tickets_email_shape check (requester_email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')
);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid references public.profiles(id) on delete set null,
  sender_type text not null check (sender_type in ('USER', 'ADMIN', 'GUEST', 'SYSTEM')),
  sender_name text not null check (char_length(btrim(sender_name)) between 1 and 120),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  created_at timestamptz not null default now()
);

create index support_tickets_owner_updated_idx on public.support_tickets (created_by, updated_at desc);
create index support_tickets_status_updated_idx on public.support_tickets (status, updated_at desc);
create index support_tickets_public_email_idx on public.support_tickets (lower(requester_email), created_at desc)
  where created_by is null;
create index support_messages_thread_idx on public.support_messages (ticket_id, created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

create policy support_tickets_select on public.support_tickets
  for select to authenticated
  using (rasta.is_active_user() and (rasta.is_admin() or created_by = auth.uid()));

create policy support_tickets_update_admin on public.support_tickets
  for update to authenticated
  using (rasta.is_admin())
  with check (rasta.is_admin());

create policy support_messages_select on public.support_messages
  for select to authenticated
  using (
    rasta.is_active_user()
    and exists (
      select 1 from public.support_tickets t
      where t.id = support_messages.ticket_id
        and (rasta.is_admin() or t.created_by = auth.uid())
    )
  );

grant select on public.support_tickets, public.support_messages to authenticated;

create trigger touch_support_tickets
  before update on public.support_tickets
  for each row execute function rasta.touch_updated_at();

-- Authenticated ticket creation and first message are one transaction.
create or replace function public.create_support_ticket(
  p_subject text,
  p_category text,
  p_message text,
  p_page_path text default null
)
returns table(ticket_id uuid, ticket_number bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
  v_email text;
  v_id uuid;
  v_number bigint;
begin
  if auth.uid() is null or not rasta.is_active_user() then
    raise exception 'UNAUTHENTICATED';
  end if;
  if char_length(btrim(coalesce(p_subject, ''))) not between 3 and 160
     or char_length(btrim(coalesce(p_message, ''))) not between 10 and 5000
     or p_category not in ('ACCOUNT_ACCESS', 'BUG', 'DATA', 'HOW_TO', 'OTHER')
     or char_length(coalesce(p_page_path, '')) > 300 then
    raise exception 'INVALID_INPUT';
  end if;

  select p.full_name, p.email::text
    into v_name, v_email
    from public.profiles p
   where p.id = auth.uid() and p.status = 'ACTIVE';
  if not found then raise exception 'UNAUTHENTICATED'; end if;

  insert into public.support_tickets
    (created_by, requester_name, requester_email, subject, category, status, page_path)
  values
    (auth.uid(), coalesce(nullif(btrim(v_name), ''), v_email), v_email, btrim(p_subject), p_category, 'OPEN', nullif(btrim(p_page_path), ''))
  returning id, support_tickets.ticket_number into v_id, v_number;

  insert into public.support_messages
    (ticket_id, sender_id, sender_type, sender_name, body)
  values
    (v_id, auth.uid(), case when rasta.is_admin() then 'ADMIN' else 'USER' end,
     coalesce(nullif(btrim(v_name), ''), v_email), btrim(p_message));

  return query select v_id, v_number;
end;
$$;

revoke all on function public.create_support_ticket(text, text, text, text) from public, anon;
grant execute on function public.create_support_ticket(text, text, text, text) to authenticated;

-- A single checked reply entry-point prevents users from posting to another
-- employee's ticket or changing workflow fields directly.
create or replace function public.reply_support_ticket(
  p_ticket_id uuid,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.support_tickets%rowtype;
  v_name text;
  v_sender_type text;
begin
  if auth.uid() is null or not rasta.is_active_user() then raise exception 'UNAUTHENTICATED'; end if;
  if char_length(btrim(coalesce(p_message, ''))) not between 1 and 5000 then raise exception 'INVALID_INPUT'; end if;

  select t.* into v_ticket from public.support_tickets t
   where t.id = p_ticket_id
     and (rasta.is_admin() or t.created_by = auth.uid())
   for update;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;

  select p.full_name into v_name from public.profiles p where p.id = auth.uid();
  v_sender_type := case when rasta.is_admin() then 'ADMIN' else 'USER' end;

  insert into public.support_messages (ticket_id, sender_id, sender_type, sender_name, body)
  values (p_ticket_id, auth.uid(), v_sender_type,
          coalesce(nullif(btrim(v_name), ''), v_ticket.requester_email), btrim(p_message));

  update public.support_tickets
     set status = case
       when v_sender_type = 'ADMIN' then 'WAITING_USER'
       when status in ('RESOLVED', 'CLOSED') then 'OPEN'
       else 'IN_PROGRESS'
     end,
     resolved_at = null,
     updated_at = now()
   where id = p_ticket_id;
end;
$$;

revoke all on function public.reply_support_ticket(uuid, text) from public, anon;
grant execute on function public.reply_support_ticket(uuid, text) to authenticated;

create or replace function public.set_support_ticket_status(
  p_ticket_id uuid,
  p_status text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not rasta.is_admin() then raise exception 'FORBIDDEN'; end if;
  if p_status not in ('OPEN', 'IN_PROGRESS', 'WAITING_USER', 'RESOLVED', 'CLOSED') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.support_tickets
     set status = p_status,
         resolved_at = case when p_status in ('RESOLVED', 'CLOSED') then now() else null end,
         updated_at = now()
   where id = p_ticket_id;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;
end;
$$;

revoke all on function public.set_support_ticket_status(uuid, text) from public, anon;
grant execute on function public.set_support_ticket_status(uuid, text) to authenticated;

-- Public sign-in help uses a random one-time secret generated by the server.
-- Only its SHA-256 hash is stored; messages are accessible to guests only with
-- the matching secret. Limit repeated requests per email to reduce abuse.
create or replace function public.create_public_support_ticket(
  p_requester_name text,
  p_requester_email text,
  p_subject text,
  p_category text,
  p_message text,
  p_page_path text,
  p_token_hash text
)
returns table(ticket_id uuid, ticket_number bigint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_number bigint;
  v_recent integer;
begin
  if char_length(btrim(coalesce(p_requester_name, ''))) not between 2 and 120
     or char_length(btrim(coalesce(p_requester_email, ''))) not between 5 and 254
     or btrim(coalesce(p_requester_email, '')) !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(btrim(coalesce(p_subject, ''))) not between 3 and 160
     or char_length(btrim(coalesce(p_message, ''))) not between 10 and 5000
     or p_category not in ('ACCOUNT_ACCESS', 'BUG', 'DATA', 'HOW_TO', 'OTHER')
     or char_length(coalesce(p_page_path, '')) > 300
     or coalesce(p_token_hash, '') !~ '^[a-f0-9]{64}$' then
    raise exception 'INVALID_INPUT';
  end if;

  select count(*) into v_recent
    from public.support_tickets t
   where t.created_by is null
     and lower(t.requester_email) = lower(btrim(p_requester_email))
     and t.created_at > now() - interval '1 hour';
  if v_recent >= 5 then raise exception 'RATE_LIMITED'; end if;

  insert into public.support_tickets
    (created_by, requester_name, requester_email, subject, category, status, page_path, public_token_hash)
  values
    (null, btrim(p_requester_name), lower(btrim(p_requester_email)), btrim(p_subject),
     p_category, 'OPEN', nullif(btrim(p_page_path), ''), p_token_hash)
  returning id, support_tickets.ticket_number into v_id, v_number;

  insert into public.support_messages (ticket_id, sender_id, sender_type, sender_name, body)
  values (v_id, null, 'GUEST', btrim(p_requester_name), btrim(p_message));

  return query select v_id, v_number;
end;
$$;

revoke all on function public.create_public_support_ticket(text, text, text, text, text, text, text) from public;
grant execute on function public.create_public_support_ticket(text, text, text, text, text, text, text) to anon, authenticated;

create or replace function public.reply_public_support_ticket(
  p_ticket_id uuid,
  p_token_hash text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ticket public.support_tickets%rowtype;
begin
  if coalesce(p_token_hash, '') !~ '^[a-f0-9]{64}$'
     or char_length(btrim(coalesce(p_message, ''))) not between 1 and 5000 then
    raise exception 'INVALID_INPUT';
  end if;

  select t.* into v_ticket
    from public.support_tickets t
   where t.id = p_ticket_id
     and t.created_by is null
     and t.public_token_hash = p_token_hash
   for update;
  if not found then raise exception 'INVALID_TICKET_LINK'; end if;

  insert into public.support_messages (ticket_id, sender_id, sender_type, sender_name, body)
  values (v_ticket.id, null, 'GUEST', v_ticket.requester_name, btrim(p_message));

  update public.support_tickets
     set status = case when status in ('RESOLVED', 'CLOSED') then 'OPEN' else 'IN_PROGRESS' end,
         resolved_at = null,
         updated_at = now()
   where id = v_ticket.id;
end;
$$;

revoke all on function public.reply_public_support_ticket(uuid, text, text) from public;
grant execute on function public.reply_public_support_ticket(uuid, text, text) to anon, authenticated;

-- Acceptance is one atomic business operation: record stage history, mark the
-- vacancy filled/archived with the assigned person's name, archive competing
-- candidacies, and keep the accepted candidacy visible as the assignment record.
create or replace function public.set_candidacy_stage(
  p_candidacy_id uuid,
  p_new_stage public.candidacy_stage,
  p_notes text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old_stage public.candidacy_stage;
  v_old_notes text;
  v_vacancy_id uuid;
  v_applicant_name text;
begin
  if not rasta.is_admin() then raise exception 'FORBIDDEN'; end if;

  select c.stage, c.notes, c.vacancy_id, a.full_name
    into v_old_stage, v_old_notes, v_vacancy_id, v_applicant_name
    from public.candidacies c
    join public.applicants a on a.id = c.applicant_id
   where c.id = p_candidacy_id
     and c.archived_at is null
   for update of c;
  if not found then raise exception 'RECORD_NOT_FOUND'; end if;

  if exists (
    select 1 from public.vacancies v
     where v.id = v_vacancy_id and v.archived_at is not null
  ) then
    raise exception 'VACANCY_ARCHIVED';
  end if;

  update public.candidacies c
     set stage = p_new_stage,
         notes = coalesce(nullif(btrim(p_notes), ''), v_old_notes),
         updated_at = now()
   where c.id = p_candidacy_id;

  if v_old_stage is distinct from p_new_stage then
    insert into public.candidacy_history
      (candidacy_id, old_stage, new_stage, notes, changed_by)
    values
      (p_candidacy_id, v_old_stage, p_new_stage, nullif(btrim(p_notes), ''), auth.uid());
  end if;

  if p_new_stage = 'ACCEPTED' then
    update public.vacancies
       set status = 'FILLED',
           closed_at = coalesce(closed_at, now()),
           archived_at = coalesce(archived_at, now()),
           archive_reason = 'تخصیص نهایی به: ' || coalesce(nullif(btrim(v_applicant_name), ''), 'متقاضی انتخاب‌شده')
     where id = v_vacancy_id;

    update public.candidacies c
       set archived_at = coalesce(c.archived_at, now()),
           archive_reason = coalesce(c.archive_reason,
             'فرصت با تخصیص نهایی به ' || coalesce(nullif(btrim(v_applicant_name), ''), 'متقاضی انتخاب‌شده') || ' بایگانی شد'),
           updated_at = now()
     where c.vacancy_id = v_vacancy_id
       and c.id <> p_candidacy_id
       and c.archived_at is null;
  end if;
end;
$$;

revoke all on function public.set_candidacy_stage(uuid, public.candidacy_stage, text) from public, anon;
grant execute on function public.set_candidacy_stage(uuid, public.candidacy_stage, text) to authenticated;
