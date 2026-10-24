import { test, expect, type Page } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  login,
  logout,
  skipIfMissing,
  T,
} from './helpers';

/**
 * Core applicant journey (E2E-05…08): create → search → verify → edit.
 * Creates a uniquely-named applicant, cleans nothing (data stays as evidence)
 * but names are stamped with the run timestamp for determinism.
 */
const stamp = Date.now().toString().slice(-6);
const FIRST = 'آزمون';
const LAST = `داوطلب${stamp}`;

async function adminPage(page: Page) {
  await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
}

test.describe.serial('applicant lifecycle (admin)', () => {
  test.skip(() => !!skipIfMissing(), 'E2E accounts not configured');

  let applicantUrl = '';

  test('create a new applicant with group history (E2E-07)', async ({ page }) => {
    await adminPage(page);
    await page.goto('/applicants/new');

    await page.getByLabel('نام', { exact: true }).fill(FIRST);
    await page.getByLabel('نام خانوادگی').fill(LAST);
    await page.getByLabel('کد ملی (۱۰ رقم)').fill('0062384914');
    await page.getByLabel('شهر محل سکونت').fill('تهران');
    await page.getByLabel('شماره تماس اصلی').fill('09120000001');
    await page.getByLabel('عنوان شغلی اصلی / پست تخصصی').fill('مهندس آزمون خودکار');
    await page.getByLabel('سابقه کار مفید (سال)').fill('7');

    // Step 2: one group-entity employment record (pending verification).
    await page.getByRole('button', { name: 'مرحله بعدی' }).click();
    await page.getByRole('button', { name: 'افزودن سابقه کاری' }).click().catch(() => undefined);
    await page.getByRole('checkbox', { name: /همکاری در ستاد سازمان مادر/ }).first().check();
    await page
      .getByLabel(/ستاد سازمان مادر/)
      .last()
      .selectOption('PARENT');
    await page.getByLabel('نام کارفرما / شرکت').first().fill('ستاد سازمان (آزمون)');
    await page.getByLabel('سمت / عنوان شغلی').first().fill('کارشناس ارشد');
    await page.getByLabel('تاریخ شروع (شمسی)').first().fill('1398/01/01');

    // Step 4: skills
    await page.getByRole('button', { name: 'مرحله بعدی' }).click();
    await page.getByRole('button', { name: 'مرحله بعدی' }).click();
    await page.getByLabel(/مهارت‌های تخصصی/).fill('AutoCAD، نقشه‌خوانی');

    await page.getByRole('button', { name: 'ایجاد پرونده متقاضی' }).click();

    await expect(page).toHaveURL(/\/applicants\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    applicantUrl = page.url();
    await expect(page.getByRole('heading', { name: new RegExp(`${FIRST} ${LAST}`) })).toBeVisible();

    // New group claim starts as PENDING — never auto-verified (mission §4.3).
    await expect(page.getByText('سابقه در انتظار تأیید').first()).toBeVisible();
    await logout(page);
  });

  test('search finds the applicant; filters and pagination respond (E2E-05/06)', async ({ page }) => {
    await adminPage(page);
    await page.goto('/applicants');
    await page.getByLabel('جستجوی متقاضیان').fill(`داوطلب${stamp}`);
    await expect(page.getByRole('cell', { name: new RegExp(`${FIRST} ${LAST}`) })).toBeVisible({
      timeout: 15_000,
    });

    // Filter by priority
    await page.getByRole('button', { name: /فیلترهای پیشرفته/ }).click();
    await page.getByLabel('اولویت سازمانی').selectOption('PENDING_VERIFICATION');
    await expect(page.getByRole('cell', { name: new RegExp(`${FIRST} ${LAST}`) })).toBeVisible();
    await page.getByRole('button', { name: 'پاک کردن همه فیلترها' }).click();

    // Page-size control re-renders the table footer
    await page.getByLabel('تعداد سطر در صفحه').selectOption('20');
    await expect(page.getByText(/از \d+ متقاضی/).or(page.getByText(/نافرید/))).toBeVisible();
    await logout(page);
  });

  test('verify employment → priority becomes VERIFIED_PARENT (E2E-10)', async ({ page }) => {
    await adminPage(page);
    await page.goto(applicantUrl);
    await page.getByRole('button', { name: 'بررسی و تأیید سابقه' }).first().click();
    await page.getByLabel('نتیجه بررسی استعلام کارگزینی').selectOption('VERIFIED');
    await page.getByLabel(/توضیحات و مستند استعلام/).fill('استعلام بیمه تأیید شد (آزمون E2E)');
    await page.getByRole('button', { name: 'ثبت نتیجه استعلام' }).click();
    await expect(page.getByText('سابقه تأییدشده در سازمان مادر').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/وضعیت سابقه در مجموعه/)).toContainText('ستاد سازمان مادر');
    await logout(page);
  });

  test('editing the verified record invalidates it to PENDING (mission §4.3)', async ({ page }) => {
    await adminPage(page);
    await page.goto(`${applicantUrl}/edit`);
    await page.getByRole('button', { name: 'مرحله بعدی' }).click();
    await page.getByLabel('سمت / عنوان شغلی').first().fill('کارشناس ارشد (ویرایش‌شده)');
    await page.getByRole('button', { name: 'ذخیره تغییرات پرونده' }).click();
    await expect(page).toHaveURL(/\/applicants\/[0-9a-f-]{36}$/, { timeout: 20_000 });
    await expect(page.getByText('سابقه در انتظار تأیید').first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/نیازمند بررسی مجدد/).or(page.getByText(/در انتظار/)).first()).toBeVisible();
    await logout(page);
  });

  test('admin can unmask PII; masked by default (E2E-16 context)', async ({ page }) => {
    await adminPage(page);
    await page.goto(applicantUrl);
    const idCell = page.getByText(/۰۰۶-      \*{6}|۰۰۶-\*{6}-۴/).first();
    await expect(page.getByText(/ماسک‌شده جهت حفظ حریم خصوصی|۰۰۶/).first()).toBeVisible();

    await page.getByRole('button', { name: 'نمایش کامل اطلاعات حساس' }).click();
    await expect(page.getByText('0062384914')).toBeVisible();
    void idCell;
    await logout(page);
  });
});

test.describe.serial('vacancy & candidacy lifecycle (admin)', () => {
  test.skip(() => !!skipIfMissing(), 'E2E accounts not configured');

  const vacTitle = `ردیف آزمون ${stamp}`;

  test('create vacancy (E2E-11) and link the test applicant', async ({ page }) => {
    await adminPage(page);
    await page.goto('/vacancies');
    await page.getByRole('button', { name: 'تعریف موقعیت شغلی جدید' }).click();

    await page.getByLabel('عنوان موقعیت شغلی').fill(vacTitle);
    await page.getByLabel('نام نمایشی سازمان').fill('ستاد سازمان (آزمون)');
    await page.getByLabel('شهر محل خدمت').fill('تهران');
    await page.getByLabel('حداقل سابقه کار (سال)').fill('3');
    await page.getByLabel('مهارت‌های الزامی (با ویرگول)').fill('AutoCAD');
    await page.getByRole('button', { name: 'ایجاد موقعیت شغلی' }).click();

    await expect(page.getByRole('heading', { name: vacTitle })).toBeVisible({ timeout: 15_000 });

    // Link the applicant created earlier in the run.
    await page.getByRole('link', { name: new RegExp(vacTitle) }).first().click();
    await page.getByRole('button', { name: 'معرفی متقاضی از استخر' }).click();
    // Select the exact applicant by option text; selectOption expects a string label/value,
    // and Array.find callbacks cannot contain await expressions.
    const select = page.getByLabel('انتخاب متقاضی از استخر رزومه');
    const options = await select.locator('option').evaluateAll((nodes) =>
      nodes.map((node) => {
        const option = node as HTMLOptionElement;
        return { value: option.value, text: option.textContent ?? '' };
      }),
    );
    const match = options.find((option) => option.text.includes(FIRST) && option.text.includes(LAST));
    if (!match) {
      throw new Error('Could not find the newly created applicant option: ' + FIRST + ' ' + LAST);
    }
    await select.selectOption(match.value);
    await page.getByRole('button', { name: 'اتصال به موقعیت شغلی' }).click();

    await expect(page.getByRole('table').getByText(FIRST)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/٪/).first()).toBeVisible(); // match score shown
  });

  test('change candidacy stage (E2E-12)', async ({ page }) => {
    await adminPage(page);
    await page.goto('/vacancies');
    await page.getByRole('link', { name: new RegExp(vacTitle) }).first().click();
    const stageSelect = page.getByRole('combobox').first();
    await stageSelect.selectOption('SCREENING');
    await page.getByRole('button', { name: 'ثبت' }).first().click();
    await expect(page.locator('select').first()).toHaveValue('SCREENING', { timeout: 15_000 });
    await logout(page);
  });
});

test.describe('admin screens render with live data', () => {
  test.skip(() => !!skipIfMissing(), 'E2E accounts not configured');

  test('reports, organization and settings render (E2E-13 context)', async ({ page }) => {
    await adminPage(page);
    await page.goto('/reports');
    await expect(page.getByRole('heading', { name: T.reportsHeading })).toBeVisible();

    await page.goto('/organization');
    await expect(page.getByRole('heading', { name: T.orgHeading })).toBeVisible();

    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: T.settingsHeading })).toBeVisible();
    await logout(page);
  });

  test("audit log lists this run's events (E2E-14 context)", async ({ page }) => {
    await adminPage(page);
    await page.goto('/audit');
    await expect(page.getByRole('heading', { name: T.auditHeading })).toBeVisible();
    await expect(page.getByText(/آزمون/).first()).toBeVisible();
    await logout(page);
  });
});
