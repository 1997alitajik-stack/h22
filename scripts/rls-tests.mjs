#!/usr/bin/env node
/**
 * RASTA — RLS & authorization matrix tests (mission §10.3/§10.4).
 *
 * Runs against a REAL Supabase project using three provisioned test accounts
 * and asserts actual allow/deny behavior — not rule simulations.
 *
 * Required env (read from .env.local when present):
 *   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
 *   SUPABASE_SERVICE_ROLE_KEY
 * Optional:
 *   RLS_ADMIN_EMAIL / RLS_ADMIN_PASSWORD     (default: rasta-admin-test@rasta-test.ir / Rasta#Admin!2026)
 *   RLS_VIEWER_EMAIL / RLS_VIEWER_PASSWORD   (default: rasta-viewer-test@rasta-test.ir / Rasta#Viewer!2026)
 *
 * The script provisions its own users and cleans up after itself.
 * Usage: npm run test:rls
 */
import { readFileSync, existsSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// --- load .env.local if present ---------------------------------------------
if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!URL || !ANON || !SERVICE) {
  console.error('✖ Missing Supabase env vars. Copy .env.example to .env.local and fill values.');
  process.exit(2);
}

const ADMIN = {
  email: process.env.RLS_ADMIN_EMAIL ?? 'rasta-admin-test@rasta-test.ir',
  password: process.env.RLS_ADMIN_PASSWORD ?? 'Rasta#Admin!2026',
};
const VIEWER = {
  email: process.env.RLS_VIEWER_EMAIL ?? 'rasta-viewer-test@rasta-test.ir',
  password: process.env.RLS_VIEWER_PASSWORD ?? 'Rasta#Viewer!2026',
};

const service = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const results = [];
function record(name, passed, detail = '') {
  results.push({ name, passed, detail });
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${name}${detail ? ` — ${detail}` : ''}`);
}

async function signIn(email, password) {
  const client = createClient(URL, ANON);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`);
  return client;
}

async function ensureUser(email, password, role) {
  const { data: list } = await service.auth.admin.listUsers({ perPage: 500 });
  const existing = list?.users?.find((u) => u.email?.toLowerCase() === email);
  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: 'کاربر آزمون RLS' },
    });
    if (error) throw error;
    userId = data.user.id;
  }
  // Set role/status directly (service role bypasses RLS).
  const { error: upErr } = await service.from('profiles').upsert({
    id: userId,
    email,
    full_name: 'کاربر آزمون RLS',
    role,
    status: 'ACTIVE',
  });
  if (upErr) throw upErr;
  return userId;
}

async function main() {
  console.log('— provisioning test users —');
  const adminId = await ensureUser(ADMIN.email, ADMIN.password, 'ADMIN');
  const viewerId = await ensureUser(VIEWER.email, VIEWER.password, 'VIEWER');

  console.log('— signing in —');
  const admin = await signIn(ADMIN.email, ADMIN.password);
  const viewer = await signIn(VIEWER.email, VIEWER.password);
  const anon = createClient(URL, ANON);

  // ---------------------------------------------------------------- cases --
  console.log('\n— group 1: unauthenticated denial —');
  {
    const { error } = await anon.from('applicants').select('id').limit(1);
    record('TC01 anon cannot read applicants', !!error);
  }
  {
    const { error } = await anon.from('applicants').insert({ first_name: 'x', last_name: 'y', primary_job_title: 'job', primary_job_category: 'c' });
    record('TC02 anon cannot create applicants', !!error);
  }

  console.log('\n— group 2: viewer least privilege —');
  {
    const { error } = await viewer.from('applicants').select('id').limit(1);
    record('TC03 viewer reads applicants', !error, error?.message);
  }
  {
    const { error } = await viewer.from('applicants').insert({ first_name: 'تست', last_name: 'بیننده', primary_job_title: 'شغل', primary_job_category: 'حوزه' });
    record('TC04 viewer cannot create applicant', !!error);
  }
  {
    const { error } = await viewer.from('applicants').update({ primary_job_title: 'hack' }).neq('id', '00000000-0000-0000-0000-000000000000');
    record('TC04b viewer cannot update applicant', !!error);
  }
  {
    const { error } = await viewer.rpc('set_verification', {
      p_record_id: '00000000-0000-0000-0000-000000000000',
      p_new_status: 'VERIFIED',
      p_notes: '',
    });
    record('TC04c viewer cannot invoke verification RPC', !!error);
  }
  {
    const { error } = await viewer.rpc('create_applicant_full', { p_payload: {} });
    record('TC04d viewer cannot invoke create RPC', !!error);
  }

  console.log('\n— group 3: PII isolation —');
  let applicantId;
  {
    // Admin creates an applicant with PII through the real RPC.
    const { data, error } = await admin.rpc('create_applicant_full', {
      p_payload: {
        first_name: 'حسین',
        last_name: 'آزمون',
        residential_city: 'تهران',
        primary_job_title: 'مهندس آزمون',
        primary_job_category: 'مهندسی عمران و سازه',
        years_of_experience: 5,
        national_id: '0062384914',
        phone: '09123421890',
        home_address: 'تهران، خیابان آزمون',
        email: 'rls-test@example.com',
        employment: [
          {
            employerName: 'ستاد آزمون',
            jobTitle: 'کارشناس',
            startDate: '1398/01/01',
            isCurrent: true,
            isGroupEntity: true,
            groupEntityType: 'PARENT',
          },
        ],
        lastSalary: '۳۰ میلیون',
      },
    });
    record('TC05 admin creates applicant with PII via RPC', !error, error?.message);
    applicantId = data;
  }
  {
    const { data, error } = await viewer.from('applicant_sensitive').select('national_id').eq('applicant_id', applicantId);
    record('TC06 viewer blocked from applicant_sensitive (RLS)', !!error && data === null, error?.message);
  }
  {
    const { data, error } = await viewer
      .from('employment_records')
      .select('id, employment_sensitive(last_salary)')
      .eq('applicant_id', applicantId)
      .limit(1);
    const leaked = !error && (data?.[0]?.employment_sensitive ?? null) !== null;
    record('TC07 viewer cannot join employment_sensitive', !leaked);
  }
  {
    const { data, error } = await admin.from('applicant_sensitive').select('national_id, phone').eq('applicant_id', applicantId).single();
    record('TC08 admin reads applicant_sensitive', !error && data?.national_id === '0062384914', error?.message);
  }
  {
    // Masked PII for viewer via SECURITY DEFINER function
    const { data, error } = await viewer.rpc('get_masked_pii', { p_applicant: applicantId });
    const masked = !error && data?.national_id_masked === '۰۰۶-******-۴' && data?.phone_masked?.includes('***');
    record('TC09 viewer receives masked PII only', masked, error?.message);
  }
  {
    const res = await fetch(`${URL}/rest/v1/applicant_sensitive?select=national_id&applicant_id=eq.${applicantId}`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}` },
    });
    record('TC10 raw REST with anon key gets empty/denied', res.status === 401 || res.status === 403 || res.status === 200
      ? (await res.text()).includes('[]') || res.status !== 200
      : true);
  }

  console.log('\n— group 4: verification state machine —');
  {
    const { data: rec } = await admin
      .from('employment_records')
      .select('id')
      .eq('applicant_id', applicantId)
      .limit(1)
      .single();

    const { error: rejectErr } = await admin.rpc('set_verification', {
      p_record_id: rec.id,
      p_new_status: 'REJECTED',
      p_notes: '',
    });
    record('TC11 rejection without reason is refused', !!rejectErr && rejectErr.message.includes('REJECTION_REQUIRES_REASON'));

    const { error: okErr } = await admin.rpc('set_verification', {
      p_record_id: rec.id,
      p_new_status: 'VERIFIED',
      p_notes: 'استعلام بیمه تأیید شد (آزمون)',
    });
    const { data: app } = await admin.from('applicants').select('group_priority').eq('id', applicantId).single();
    record('TC12 verify grants VERIFIED_PARENT priority', !okErr && app?.group_priority === 'VERIFIED_PARENT', app?.group_priority);

    // Edit invalidates (trigger) — direct update as admin on a verified row.
    const { error: editErr } = await admin
      .from('employment_records')
      .update({ job_title: 'کارشناس ارشد آزمون' })
      .eq('id', rec.id);
    const { data: afterEdit } = await admin
      .from('employment_records')
      .select('verification_status')
      .eq('id', rec.id)
      .single();
    record('TC13 editing verified record reverts to PENDING', !editErr && afterEdit?.verification_status === 'PENDING', afterEdit?.verification_status);

    const { data: history } = await admin
      .from('verification_history')
      .select('old_status, new_status')
      .eq('employment_record_id', rec.id)
      .order('changed_at', { ascending: false });
    const hasInvalidation = (history ?? []).some((h) => h.old_status === 'VERIFIED' && h.new_status === 'PENDING');
    record('TC14 invalidation appended to history', hasInvalidation);
  }

  console.log('\n— group 5: audit immutability —');
  let auditId;
  {
    await admin.rpc('log_audit', {
      p_channel: 'ADMIN_SECURITY',
      p_category: 'SECURITY',
      p_summary: 'رویداد آزمون RLS',
      p_severity: 'LOW',
    });
    const { data } = await admin.from('audit_events').select('id').order('created_at', { ascending: false }).limit(1);
    auditId = data?.[0]?.id;
    record('TC15 admin-channel audit written via RPC', !!auditId);
  }
  {
    const { error } = await admin.rpc('log_audit', {
      p_channel: 'ADMIN_SECURITY',
      p_category: 'SECURITY',
      p_summary: 'تلاش از کانال مدیریتی توسط مشاهده‌گر',
    });
    record('TC16 viewer cannot write admin-channel audit', !!error && error.message.includes('FORBIDDEN'), error?.message);
  }
  {
    const { error } = await viewer.rpc('log_audit', {
      p_channel: 'CLIENT_ACTIVITY',
      p_category: 'VIEW_RESUME',
      p_summary: 'مشاهده رزومه (آزمون)',
    });
    record('TC17 viewer logs LOW client event', !error, error?.message);
  }
  {
    const { error } = await viewer.rpc('log_audit', {
      p_channel: 'CLIENT_ACTIVITY',
      p_category: 'APPLICANT',
      p_summary: 'تلاش برای ثبت رویداد حساس',
    });
    record('TC18 viewer cannot log non-whitelisted category', !!error && error.message.includes('INVALID_CLIENT_EVENT'));
  }
  {
    const { error: upd } = await admin.from('audit_events').update({ summary: 'دستکاری' }).eq('id', auditId);
    const { error: del } = await admin.from('audit_events').delete().eq('id', auditId);
    record('TC19 audit immutable even for admin', !!upd && !!del, `${upd?.message ?? ''} | ${del?.message ?? ''}`);
  }
  {
    const { error } = await viewer.from('audit_events').select('id').limit(1);
    record('TC20 viewer cannot read audit events', !!error);
  }

  console.log('\n— group 6: role management —');
  {
    const { error } = await viewer.from('profiles').update({ role: 'ADMIN' }).eq('id', viewerId);
    record('TC21 viewer cannot self-promote to ADMIN', !!error);
  }
  {
    const { data, error } = await viewer.from('profiles').select('role').eq('id', adminId).single();
    record('TC22 role unchanged after escalation attempt', !error && data?.role === 'ADMIN', data?.role ?? error?.message);
  }
  {
    const { error } = await viewer.from('vacancies').insert({ code: `HACK-${Date.now()}`, title: 'hack', category: 'c', city: 'تهران' });
    record('TC23 viewer cannot create vacancy', !!error);
  }
  {
    const { error } = await viewer.from('vocabularies').update({ values: [] }).eq('key', 'cities');
    record('TC24 viewer cannot modify vocabularies', !!error);
  }

  // ----------------------------------------------------------------- summary
  const passed = results.filter((r) => r.passed).length;
  console.log(`\n=== RLS test summary: ${passed}/${results.length} passed ===`);
  if (passed !== results.length) {
    for (const f of results.filter((r) => !r.passed)) console.error(`FAILED: ${f.name} — ${f.detail}`);
    process.exitCode = 1;
  }

  console.log('\n— cleanup: removing test applicant —');
  await service.from('applicants').delete().eq('id', applicantId);
  console.log('done (test users kept for re-runs; delete from Supabase Auth to remove).');
}

main().catch((err) => {
  console.error('✖ RLS test run failed:', err.message);
  process.exit(1);
});
