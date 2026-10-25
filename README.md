# سامانه راستا (RASTA) — نسخه ۲.۰

**راهکار ارزیابی سوابق، تخصص و استعدادها** — بانک متقاضیان، مدیریت جذب و استعلام سوابق سازمانی.

پشته فناوری: **Next.js 16 (App Router) · TypeScript strict · Supabase (PostgreSQL + Auth + Storage + RLS) · Tailwind CSS 4 · Vitest · Playwright**. رابط کاربری فارسی، راست‌چین، با فونت خودمیزبانی‌شده وزیرمتن و طراحی بازسازی‌شده مطابق `UI_SPEC.md`.

---

## ۱. راه‌اندازی محلی

پیش‌نیازها: Node.js ≥ 20، یک پروژه Supabase (پلن رایگان کافی است).

```bash
npm ci                      # نصب reproducible از package-lock.json
cp .env.example .env.local  # و مقادیر واقعی را وارد کنید
npm run dev                 # http://localhost:3000
```

متغیرهای محیطی `.env.local`:

| متغیر | توضیح |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | نشانی پروژه Supabase (Settings → API) |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | کلید عمومی جدید (مناسب مرورگر؛ حفاظت داده‌ها با RLS انجام می‌شود) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | متغیر سازگاری اختیاری برای استقرارهای قدیمی؛ کلید publishable در صورت وجود اولویت دارد |
| `SUPABASE_SERVICE_ROLE_KEY` | **فقط سرور** — هرگز در کد مرورگر استفاده نمی‌شود |
| `RASTA_SETUP_TOKEN` | توکن یک‌بارمصرف راه‌اندازی نخستین مدیر (`node -e "console.log(crypto.randomUUID())"`) |

## ۲. پیکربندی Supabase

۱. **اعمال مایگریشن‌ها** — در SQL Editor پروژه، چهار فایل `supabase/migrations/` را **به ترتیب** اجرا کنید:
   `0001_rasta_schema.sql` → `0002_storage.sql` → `0003_applicant_rpc.sql` → `0004_reference_data.sql`
   (یا با CLI: `supabase db push`)

۲. **Auth → Providers → Email**: فعال. گزینه **Allow new users to sign up / public signup خاموش باشد** — حساب‌ها فقط توسط مدیر از داخل سامانه ساخته می‌شوند.

۳. **Storage**: سطل خصوصی `applicant-documents` توسط مایگریشن ۰۰۰۲ ساخته می‌شود (سقف ۱۰MB، MIMEهای مجاز).

۴. **راه‌اندازی نخستین مدیر**:
   ```bash
   # مقدار RASTA_SETUP_TOKEN را در .env.local بگذارید، سپس:
   npm run build && npm run start
   # مرورگر: http://localhost:3000/setup
   ```
   پس از ایجاد مدیر، صفحه `/setup` برای همیشه غیرفعال می‌شود (حتی با توکن معتبر).

۵. **حساب مشاهده‌گر نمونه (اختیاری، برای آزمون)**: از منوی «مدیریت کاربران» حساب با نقش VIEWER بسازید.

## ۳. آزمون‌ها

```bash
npm run typecheck    # بررسی تایپ strict
npm run lint         # ESLint (بدون هشدار)
npm run test         # ۵۶ تست واحد (منطق دامنه، اعتبارسنجی، CSV، نرمال‌سازی فارسی)
npm run test:rls     # تست RLS فقط روی Supabase آزمایشی ایزوله، با opt-in صریح
npm run test:e2e     # Playwright: دسکتاپ + موبایل (نیازمند حساب‌های E2E در .env.local)
```

**هشدار تست RLS:** این اسکریپت در Supabase حساب آزمایشی ایجاد می‌کند، یک متقاضی مصنوعی ثبت می‌کند و رویدادهای حسابرسی می‌نویسد. فقط روی پروژهٔ آزمایشی جدا از Production اجرا شود. مقدار `RASTA_ALLOW_DESTRUCTIVE_RLS_TESTS=true`، مقدار دقیق `RLS_TEST_PROJECT_REF` و چهار متغیر ایمیل/رمز `RLS_ADMIN_*` و `RLS_VIEWER_*` الزامی‌اند؛ حساب و رمز پیش‌فرض وجود ندارد.

برای E2E این متغیرها را نیز تنظیم کنید:
`E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD`, `E2E_VIEWER_EMAIL`, `E2E_VIEWER_PASSWORD`
(همان حساب‌های ساخته‌شده در مراحل بالا).

## ۴. استقرار روی Vercel

۱. ریپازیتوری را به Vercel وصل کنید (Framework: Next.js — پیش‌فرض).
۲. متغیرهای محیطی لازم جدول بالا را در Project → Settings → Environment Variables ثبت کنید (Production و Preview جدا). متغیر `NEXT_PUBLIC_SUPABASE_ANON_KEY` اختیاری و فقط برای سازگاری با استقرارهای قدیمی است.
۳. بررسی‌های پیش از استقرار: `npm run build`.
۴. پس از اولین استقرار، `/setup` را فقط یک‌بار روی محیط Production اجرا کنید (توکن را پس از آن از env حذف کنید — صفحه به‌هرحال قفل می‌شود).
۵. دود-تست پس از استقرار: ورود مدیر → داشبورد → ثبت متقاضی → خروجی CSV → خروج.

بازگشت (Rollback): هر Deploy در Vercel قابل بازگردانی است؛ مایگریشن‌های SQL فقط «افزاینده» نوشته شده‌اند و downgrade خودکار ندارند — برای تغییر شِما فایل مایگریشن جدید بسازید.

## ۵. ساختار پروژه

```
src/
├── app/                     # صفحات App Router + اکشن‌های سرور + route handlers
│   ├── (app)/               # پوسته احراز هویت‌شده (سایدبار + هدر)
│   ├── actions/             # server actions (applicants, admin, auth)
│   ├── api/                 # خروجی CSV، دانلود سند، PII حساس، خروج
│   ├── login/ · setup/      # صفحات عمومی
├── components/              # UI مشترک (Badges, Primitives, Modal, Tabs, Shell)
├── lib/                     # persian, domain (priority/match/labels), validation (zod)
│   ├── supabase/            # سه کلاینت: server(RLS) / admin(service-role) / browser
│   └── auth.ts              # requireUser / requireAdmin / guards
├── server/                  # لایه دسترسی داده (فقط سرور)
├── proxy.ts                 # درواز نشست (Next 16 proxy convention)
supabase/migrations/         # شِما + RLS + RPC + داده مرجع
tests/unit · tests/e2e       # Vitest · Playwright
docs/                        # معماری، امنیت، موجودی امکانات، گزارش وارسی
legacy/                      # سورس Vite تحویل‌شده (مرجع؛ در بیلد استفاده نمی‌شود)
```

## ۶. مستندات تکمیلی

- `docs/audit/AUDIT.md` — موجودی صفحات، ماتریس ردیابی و تصمیمات معماری
- `docs/ARCHITECTURE.md` — خلاصه معماری دامنه/دسترسی‌ها
- `docs/SECURITY_REVIEW.md` — کنترل‌های امنیتی و آزمون‌ها
- `docs/VERIFICATION_REPORT.md` — نتایج واقعی وارسی (صادقانه، بدون اغراق)
