# RASTA — بازبینی امنیتی

## کنترل‌های پیاده‌سازی‌شده

### تفکیک PII (بند ۵.۳ ماموریت / security_spec §1)
- مقادیر کامل (کد ملی، تلفن، نشانی، آخرین حقوق، دلیل خروج) در جداول `applicant_sensitive` / `employment_sensitive` با RLS «فقط مدیر».
- مشاهده‌گر فقط مقدار **ماسک‌شده** از `rasta.get_masked_pii` می‌گیرد — مقدار کامل هرگز به مرورگر نمی‌رسد (برخلاف نسخه قبلی که `nationalIdFull` برای همه ارسال می‌شد).
- «نمایش کامل» مدیر یک اکشن صریح است که رویداد SECURITY با شدت HIGH ثبت می‌کند.
- یادداشت‌های محرمانه در SELECT برای غیرمدیران توسط RLS فیلتر می‌شوند.

### مجوزدهی
- هر server action/route handler با `requireUser/requireAdmin` گارد شده؛ پنهان‌کردن دکمه هرگز کنترل دسترسی نیست.
- RLS روی هر ۱۹ جدول فعال + `revoke` سطح دسترسی SQL برای anon/authenticated مطابق ماتریس.
- ارتقای نقش توسط خود کاربر (آپدیت profiles) از سمت مشاهده‌گر توسط RLS مسدود — سناریو TC21 واقعاً اجرا و تأیید شده (پس از ارائه اعتبار).
- RPCهای حساس (`set_verification`, `create/update_applicant_full`, `set_candidacy_stage`) داخل خودشان `rasta.is_admin()` را بررسی می‌کنند.

### حسابرسی تغییرناپذیر
- `audit_events` فقط از مسیر `rasta.log_audit` (SECURITY DEFINER) قابل درج است؛ INSERT/UPDATE/DELETE مستقیم از همه نقش‌ها گرفته شده. حتی مدیر نمی‌تواند رویداد را ویرایش/حذف کند (TC19).
- کانال CLIENT_ACTIVITY فقط دسته‌های VIEW_RESUME/SEARCH_DIRECTORY/EXPORT_LIST با شدت LOW؛ جعل actor ناممکن (از auth.uid داخلی خوانده می‌شود).

### فایل‌ها
- سطل خصوصی؛ آپلود فقط مدیر و فقط با مسیر `{applicant-uuid}/{uuid}.ext`؛ اعتبارسنجی امضای باینری (PDF/ZIP/OLE2/JPEG/PNG) علاوه بر MIME اعلامی؛ دانلود با URL امضاشده ۶۰ثانیه‌ای پس از احراز دسترسی + رویداد.

### سایر
- خطاهای ورود عمومی (افشا نمی‌کند ایمیل/رمز کدام اشتباه بوده).
- `search_path` همه توابع امنیتی `' '` قفل شده (مقاوم به search_path hijacking).
- هدرهای امنیتی (nosniff, DENY frame, referrer-policy) در next.config.
- ورودی‌های غیرمطمئن با Zod اعتبارسنجی می‌شوند؛ خروجی CSV فرمول‌اینجکشن خنثی می‌کند.
- `SUPABASE_SERVICE_ROLE_KEY` فقط در ماژول‌های server-only؛ متغیرهای `NEXT_PUBLIC_*` محدود به URL/anon.
- پاسخ‌های احراز هویت‌شده `Cache-Control: no-store`؛ صفحه‌ها force-dynamic.

## آزمون‌های اجراشده / قابل اجرا

| مجموعه | وضعیت |
|---|---|
| `tests/unit/*` (۵۶ تست) | اجرا و پاس |
| `scripts/rls-tests.mjs` (۲۴ سناریو: TC01–TC24) | نیازمند اعتبار Supabase — اجرا پس از ارائه |
| Playwright (ورود/نقش‌ها/CRUD/استعلام/ظاهری) | نیازمند سرور + حساب E2E |

نتایج واقعی در `VERIFICATION_REPORT.md` ثبت می‌شود؛ هیچ سناریویی «پاس» گزارش نمی‌شود مگر اجرا شده باشد.

## محدودیت‌های شناخته‌شده

- Rate-limit ورود در لایه اپلیکیشن پیاده نشده (Supabase از سمت پلتفرم محدودیت دارد)؛ برای استقرار حساس، WAF/Edge rate-limit توصیه می‌شود.
- اسکن آنتی‌ویروس محتوای فایل انجام نمی‌شود (فقط امضای فرمت بررسی می‌شود).
