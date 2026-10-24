-- ============================================================================
-- RASTA — reference data: controlled vocabularies and the group's legal
-- entities (from the supplied requirements/mock structure). Contains NO
-- applicants and NO user accounts (mission §8: never auto-seed demo people
-- or credentials; a dev-only sample-data script lives separately).
-- ============================================================================

insert into public.vocabularies (key, values) values
  ('cities', '[
    "تهران","اصفهان","مشهد","اهواز","شیراز","تبریز","کرج","بندرعباس","بوشهر","کرمان","اراک","یزد"
  ]'::jsonb),
  ('job_categories', '[
    "مهندسی عمران و سازه",
    "معماری و شهرسازی",
    "نظارت کارگاهی و کنترل پروژه",
    "تأسیسات مکانیکی و برقی",
    "تکنسین فنی و تعمیرات",
    "امور مالی و حسابداری",
    "منابع انسانی و اداری",
    "حمل و نقل و لجستیک",
    "خدمات عمومی و پذیرایی",
    "حفاظت فیزیکی و انتظامات"
  ]'::jsonb)
on conflict (key) do nothing;

insert into public.organizations (code, name_fa, name_en, field, city, status) values
  ('SADID-ENG',   'شرکت مهندسی و توسعه سدید',   'Sadid Engineering & Development', 'مهندسی، طراحی و نظارت پروژه‌های عمرانی',            'تهران',   'ACTIVE'),
  ('OMRAN-PARS', 'شرکت پیمانکاری عمران پارس',   'Omran Pars Contracting',          'پیمانکاری ساختمانی، زیرساخت و سیویل',              'اصفهان',  'ACTIVE'),
  ('OFOGH-TECH', 'شرکت خدمات فنی و نگهداری افق','Ofogh Technical & Maintenance',   'بهره‌برداری و تعمیرات تأسیسات مکانیکی و برقی',      'اهواز',   'ACTIVE'),
  ('KOOSHA-LOG', 'شرکت پشتیبانی و لجستیک کوشا', 'Koosha Support & Logistics',       'حمل‌ونقل، پشتیبانی، تشریفات و خدمات اداری',         'تهران',   'ACTIVE')
on conflict (code) do nothing;
