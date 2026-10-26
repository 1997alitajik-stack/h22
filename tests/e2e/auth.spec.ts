import { test, expect } from '@playwright/test';
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  VIEWER_EMAIL,
  VIEWER_PASSWORD,
  login,
  logout,
  skipIfMissing,
  T,
} from './helpers';

test.describe('authentication & access control', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'ورود به سامانه راستا' })).toBeVisible();
  });

  test('unauthenticated visitors can open the public support form', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: /مشکل ورود دارید/ }).click();
    await expect(page.getByLabel('نام و نام خانوادگی')).toBeVisible();
    await expect(page.getByLabel('ایمیل برای معرفی درخواست')).toBeVisible();
    await expect(page.getByLabel('شرح مشکل')).toBeVisible();
  });

  test('wrong password shows a generic error and stays on login', async ({ page }) => {
    test.skip(!!skipIfMissing(), skipIfMissing() ?? '');
    await page.goto('/login');
    await page.getByLabel('نشانی ایمیل سازمانی').fill(ADMIN_EMAIL!);
    await page.getByLabel('کلمه عبور').fill('wrong-password');
    await page.getByRole('button', { name: 'ورود به سامانه' }).click();
    await expect(page.getByRole('alert')).toContainText('ورود ناموفق بود');
    await expect(page).toHaveURL(/\/login/);
  });

  test('admin can log in, see the dashboard, and log out (E2E-01/02)', async ({ page }) => {
    test.skip(!!skipIfMissing(), skipIfMissing() ?? '');
    await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await expect(page.getByRole('heading', { name: T.dashboardHeading })).toBeVisible();
    await logout(page);
  });

  test('viewer dashboard loads and admin-only nav items are hidden (E2E-03/04)', async ({ page }) => {
    test.skip(!!skipIfMissing(), skipIfMissing() ?? '');
    await login(page, VIEWER_EMAIL!, VIEWER_PASSWORD!);
    await expect(page.getByRole('heading', { name: T.dashboardHeading })).toBeVisible();

    // Role-aware sidebar: administration group must not render for viewers.
    await expect(page.getByRole('link', { name: 'مدیریت کاربران' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'سوابق رویدادها' })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'تنظیمات پایه' })).toHaveCount(0);

    // Direct URL access is still blocked by the server guard.
    await page.goto('/users');
    await expect(page).toHaveURL(/\/forbidden/);

    await logout(page);
  });

  test('viewer sees no create-applicant action in the directory', async ({ page, request }) => {
    test.skip(!!skipIfMissing(), skipIfMissing() ?? '');
    await login(page, VIEWER_EMAIL!, VIEWER_PASSWORD!);
    await page.goto('/applicants');
    await expect(page.getByRole('heading', { name: T.applicantsHeading })).toBeVisible();
    await expect(page.getByRole('link', { name: 'ثبت متقاضی جدید' })).toHaveCount(0);

    // Server-side enforcement: the sensitive-reveal API must 403 for viewers.
    const res = await request.post('/api/applicants/00000000-0000-0000-0000-000000000000/sensitive');
    expect([401, 403]).toContain(res.status());

    // Export endpoint works for viewers but contains no unmasked PII columns.
    const exportRes = await request.get('/api/export/applicants');
    expect(exportRes.status()).toBe(200);
    const body = await exportRes.text();
    expect(body).not.toContain('کد ملی کامل');
  });
});
