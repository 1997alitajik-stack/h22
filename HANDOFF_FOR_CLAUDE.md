# سند تحویل سامانه به دستیار کلود (HANDOFF FOR CLAUDE)
## سامانه راستا — راهکار ارزیابی سوابق، تخصص و استعدادها

این سند برای **مهندس بک‌اند و یکپارچه‌ساز (Claude)** تدوین شده است تا بتوانید به سادگی معماری فرانت‌اند سامانه **راستا** را درک کرده و APIهای واقعی، پایگاه‌داده، احراز هویت، اعطای دسترسی و ذخیره‌سازی ابری را به این پروژه متصل کنید.

---

### ۱. ساختار پوشه‌ها و اجزای سیستم (Architecture Overview)

پروژه به صورت یک **React 19 + TypeScript + Vite + Tailwind CSS** پیاده‌سازی شده و از رویکرد ماژولار مبتنی بر لایه‌ها پیروی می‌کند:

```
/
├── src/
│   ├── types/
│   │   └── index.ts                 # تعاریف تایپ‌های داده دامین (Applicant, Vacancy, Attachment, ...)
│   ├── mocks/
│   │   └── mockData.ts              # دیتاست ۲۲ متقاضی ساختگی در رده‌های مختلف + فرصت‌های شغلی + ساختار هلدینگ
│   ├── services/
│   │   └── mockService.ts           # لایه سرویس تایپ‌شده (نقطه اتصال مستقیم به بک‌اند)
│   ├── lib/
│   │   └── persianUtils.ts          # نرمال‌سازی فارسی/عربی، ارقام فارسی، خروجی امن CSV با BOM
│   ├── context/
│   │   └── AppContext.tsx           # مدیریت وضعیت کلاینت، سوییچ نقش‌ها، نوتیفیکیشن‌ها و مسیرها
│   ├── components/
│   │   ├── layout/
│   │   │   ├── TopBar.tsx           # هدر ناوبری منطبق بر قرارداد ۳ منطقه‌ای، جستجوی سریع و سوییچر نقش
│   │   │   ├── Sidebar.tsx          # سایدبار پایدار راست‌چین با ۸ بخش ناوبری
│   │   │   └── DemoBanner.tsx       # بنر شفاف‌سازی محیط آزمایشی
│   │   └── ui/
│   │       ├── PriorityBadge.tsx    # بج ۵ گانه اولویت استخدامی بدون المان‌های تزئینی حبابی
│   │       ├── StatusBadge.tsx      # وضعیت‌های فرآیند استخدام و استعلام
│   │       ├── ConfirmationModal.tsx# مدال تأیید اقدامات حساس
│   │       └── ToastContainer.tsx   # نمایش بازخوردهای عملیاتی
│   ├── features/
│   │   ├── auth/LoginView.tsx       # صفحه شبیه‌سازی ورود
│   │   ├── dashboard/DashboardView.tsx # داشبورد آمار و توزیع‌ها
│   │   ├── applicants/
│   │   │   ├── ApplicantDirectory.tsx # جدول پیشرفته جستجو، فیلتر ترکیبی و مرتب‌سازی
│   │   │   ├── ApplicantProfile.tsx   # پرونده جامع چندزبانه کارجو
│   │   │   └── ApplicantForm.tsx      # فرم ثبت و ویرایش چندمرحله‌ای
│   │   ├── attachments/
│   │   │   └── AttachmentCenter.tsx   # مرکز مدیریت رزومه‌ها، نسخه‌بندی و آپلود کلاینت
│   │   ├── vacancies/
│   │   │   ├── VacancyDirectory.tsx   # فهرست فرصت‌های شغلی
│   │   │   └── VacancyDetail.tsx      # تطبیق کارجویان و پایپ‌لاین ردیف شغلی
│   │   ├── reports/ReportsView.tsx   # مرکز گزارش‌ها و خروجی اکسل و چاپ
│   │   ├── organization/OrganizationView.tsx # ساختار هلدینگ و شرکت‌های تابعه
│   │   ├── users/UserManagementView.tsx # مدیریت حساب‌ها و نقش‌ها
│   │   ├── audit/AuditLogView.tsx    # تاریخچه رویدادهای سیستمی
│   │   └── settings/SettingsView.tsx # واژگان کنترل‌شده و شهرهای فعالیت
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── HANDOFF_FOR_CLAUDE.md
├── UI_SPEC.md
└── FRONTEND_DATA_CONTRACT.md
```

---

### ۲. نقاط اتصال به بک‌اند واقعی (Production Integration Points)

تمام تعاملات بیزینسی درون فایل `src/services/mockService.ts` متمرکز شده‌اند. برای اتصال به سرور:

1. **مدیریت کارجویان (Applicants API)**:
   - `listApplicants(filters, sortField, sortDirection)`: تبدیل به فراخوانی `GET /api/v1/applicants?city=...&category=...`
   - `getApplicantById(id)`: تبدیل به `GET /api/v1/applicants/:id`
   - `createApplicant(data)`: تبدیل به `POST /api/v1/applicants`
   - `updateApplicant(id, data)`: تبدیل به `PUT /api/v1/applicants/:id`

2. **استعلام سوابق و اولویت استخدامی (Employment Verification)**:
   - تابع `updateEmploymentVerification(applicantId, recordId, status, notes, reviewerName)` در حال حاضر برچسب اولویت سازمانی را بر مبنای وجود سابقه تاییدشده در سازمان مادر (`VERIFIED_PARENT`) یا زیرمجموعه (`VERIFIED_SUBSIDIARY`) محاسبه می‌کند.
   - **کلود:** باید این منطق را سمت دیتابیس با مجوزهای دسترسی امن (RBAC) و درج در جدول لاگ اعتبارسنجی پیاده‌سازی کند.

3. **آپلود فایل و اسناد (Private Object Storage)**:
   - تابع `addMockAttachment` در فرانت‌اند فعلاً متادیتای فایل انتخابی کاربر را ذخیره می‌کند.
   - **کلود:** باید فرآیند Signed URL (مانند S3 Presigned URL یا Cloud Storage) را پیاده‌سازی کند تا فایل به صورت امن آپلود شود، پس از اعتبارسنجی نوع فایل، اسکن امنیتی و ثبت نسخه (Versioning) در جدول اسناد ذخیره گردد.

4. **فرصت‌های شغلی و موقعیت‌ها (Vacancies & Candidacies)**:
   - توابع `listVacancies`, `getVacancyById`, `createVacancy`, `linkApplicantToVacancy`, `updateCandidacyStage`
   - جدول رابطه `candidacy` بین متقاضی و فرصت شغلی برقرار می‌کند؛ هر داوطلب می‌تواند در چند فرصت مستقل ثبت شود بدون تکرار پرونده اصلی.

---

### ۳. سطوح دسترسی شبیه‌سازی‌شده و محدودیت‌ها

- **مدیر سامانه (ADMIN)**: دسترسی به دکمه ثبت متقاضی، ویرایش، بررسی و تایید سوابق کارگزینی، آپلود سند، ایجاد ردیف شغلی، تغییر نقش کاربران و افزودن واژگان.
- **مشاهده‌گر منابع انسانی (VIEWER)**: دسترسی فقط خواندنی (Read-only) به بانک متقاضیان، جزئیات، گزارش‌ها و خروجی اکسل.
- **تذکر امنیتی:** محدودیت‌های فعلی کاملاً در سمت کلاینت (UI) اعمال شده است. در نسخه نهایی باید کلیه این محدودیت‌ها با JWT/Session و میدل‌ویرهای سرور محافظت شوند.

---

### ۴. ویژگی‌های شاخص RTL و بومی‌سازی فارسی

- فونت پیش‌فرض: `Vazirmatn` با فال‌بک‌های معتبر.
- تمامی تاریخ‌ها در فرمت شمسی (جلالی) استاندارد.
- تابع نرمال‌سازی فارسی در `src/lib/persianUtils.ts`: تطبیق ي/ی، ك/ک، ارقام فارسی ۰-۹ و حروف کشیده.
- خروجی CSV با استاندارد **UTF-8 BOM (`\uFEFF`)** تا هنگام باز شدن در مایکروسافت اکسل کاراکترهای فارسی دچار به‌هم‌ریختگی نشوند.
- خنثی‌سازی تزریق فرمول در سلول‌های خروجی اکسل (Formula Injection Prevention).
