# RASTA — خلاصه معماری

## ۱. لایه‌ها

```
Browser ── proxy.ts (refresh session, auth gate)
   └── App Router pages (Server Components by default)
         ├── server actions (mutations, role-guarded)
         ├── route handlers (files: upload/download, CSV export, signout)
         ├── src/server/* (data access, server-only)
         │     └── Supabase (RLS-scoped, authenticated user context)
         └── lib/domain (pure: priority, match, labels) + lib/validation (zod)

Service-role key: ONLY src/lib/supabase/admin.ts (server-only import),
used exclusively by /setup bootstrap and user provisioning/reset in src/server/users.ts.
```

## ۲. مدل داده (مایگریشن ۰۰۰۱)

| جدول | نقش | دسترسی (RLS) |
|---|---|---|
| profiles | نقش/وضعیت هر auth.user | خود + مدیر |
| organizations · projects | ساختار هلدینگ | خواندن: همه؛ نوشتن: مدیر |
| applicants | پرونده عمومی (بدون PII کامل) | خواندن: کاربران فعال؛ نوشتن: مدیر |
| applicant_sensitive | کد ملی/تلفن/نشانی کامل | **فقط مدیر** |
| employment_records + employment_sensitive | سوابق شغلی + حقوق/دلیل خروج | عمومی/مدیر |
| verification_history | تاریخچه استعلام (فقط‌الحاقی) | مدیر (خواندن) |
| education · certificates · applicant_skills · job_preferences | زیرمجموعه‌های پرونده | عمومی/مدیر |
| attachments | متادیتا اسناد (باینری در Storage خصوصی) | عمومی/مدیر |
| vacancies · candidacies · candidacy_history | جذب | عمومی/مدیر |
| vocabularies | شهرها/حوزه‌ها | خواندن: همه؛ نوشتن: مدیر |
| audit_events | رویدادها (فقط‌الحاقی از طریق RPC) | مدیر (خواندن) |

ستون‌های تولیدی: `search_norm` (نرمال‌سازی فارسی برای جستجوی trigram)، `completeness` (تریگر بازمحاسبه)، `public_code` به‌صورت `APP-{سال شمسی}-{دنباله}`.

## ۳. قواعد حساس دامنه

- **اولویت ۵گانه**: تابع `rasta.compute_priority` در DB (تریگر روی employment_records) و آینه TS در `lib/domain/priority` — تست‌شده یکسان. دلیل هر رتبه ذخیره و نمایش داده می‌شود.
- **استعلام سابقه**: فقط از طریق `rasta.set_verification` (اتمیک، مدیرانه، رد بدون دلیل ممنوع، تاریخچه‌دار). ویرایش سابقه تأییدشده توسط تریگر به PENDING برمی‌گردد.
- **نوشتن پرونده کامل**: `rasta.create_applicant_full` / `update_applicant_full` — یک تراکنش واحد برای متقاضی+حساس+سوابق+تحصیل+مهارت+ترجیحات.
- **ماسک PII**: `rasta.get_masked_pii` فقط مقدار ماسک‌شده برمی‌گرداند؛ مشاهده‌گر هرگز مقدار کامل دریافت نمی‌کند (حتی از REST خام).
- **تطابق داوطلب-فرصت**: فرمول شفاف قرارداد (پایه ۵۰ + شهر ۱۵ + سابقه ۱۵ + اولویت ۱۵/۱۰ + مهارت تا ۱۵، سقف ۹۹) با breakdown ذخیره‌شده.

## ۴. احراز هویت و مجوزدهی

- نشست کوکی‌ای `@supabase/ssr`؛ proxy.ts فقط لایه دفاعی است — مرجع واقعی `requireUser/requireAdmin` در هر صفحه/اکشن/handler است.
- ورود عمومی بسته؛ نخستین مدیر با توکن یک‌بارمصرف `/setup`؛ حساب‌های بعدی توسط مدیر (Admin API، service-role).
- حساب غیرفعال: نشست بلافاصله پاک و ورود رد می‌شود.
- نقش از جدول profiles خوانده می‌شود (نه از claim کاربر) — غیرقابل جعل از سمت کلاینت.

## ۵. اسناد

آپلود از طریق server action با اعتبارسنجی حجم/پسوند/MIME/امضای باینری؛ مسیر ذخیره `{applicant}/{uuid}.{ext}` در سطل خصوصی؛ دانلود فقط با URL امضاشده ۶۰ثانیه‌ای پس از بررسی دسترسی؛ حذف = متادیتا + شیء، با رویداد حسابرسی.

## ۶. جستجو/گزارش

فیلتر/جستجو/مرتب‌سازی/صفحه‌بندی کاملاً سمت سرور (`.or()` روی ستون‌های `*_norm` با ایندکس GIN trigram؛ ارقام فارسی نرمال می‌شوند). خروجی CSV با ستون‌های مجاز نقش، BOM یونیکد و خنثی‌سازی فرمول اکسل.
