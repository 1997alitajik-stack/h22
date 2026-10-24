import { expect, type Page } from '@playwright/test';

/**
 * E2E environment contract (set in .env.local or shell):
 *   E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD     — provisioned admin account
 *   E2E_VIEWER_EMAIL / E2E_VIEWER_PASSWORD   — provisioned viewer account
 * Tests are skipped with a clear message when accounts are not configured.
 */
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;
export const VIEWER_EMAIL = process.env.E2E_VIEWER_EMAIL;
export const VIEWER_PASSWORD = process.env.E2E_VIEWER_PASSWORD;

export function skipIfMissing(): string | null {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD || !VIEWER_EMAIL || !VIEWER_PASSWORD) {
    return 'E2E accounts not configured (E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD/E2E_VIEWER_EMAIL/E2E_VIEWER_PASSWORD)';
  }
  return null;
}

export async function login(page: Page, email: string, password: string): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('نشانی ایمیل سازمانی').fill(email);
  await page.getByLabel('کلمه عبور').fill(password);
  await page.getByRole('button', { name: 'ورود به سامانه' }).click();
  await expect(page).toHaveURL(/\/$/);
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /کاربر|منوی کاربر/ }).first().click();
  await page.getByRole('button', { name: 'خروج از حساب' }).click();
  await expect(page).toHaveURL(/\/login/);
}

export const T = {
  dashboardHeading: 'داشبورد مدیریت',
  applicantsHeading: 'بانک متقاضیان',
  vacanciesHeading: 'فرصت‌های شغلی و موقعیت‌های جذب',
  reportsHeading: 'گزارش‌ها و تحلیل آماری',
  orgHeading: 'ساختار سازمان و شرکت‌های تابعه',
  usersHeading: 'مدیریت کاربران و سطوح دسترسی',
  auditHeading: 'سوابق رویدادها و حسابرسی امنیتی',
  settingsHeading: 'تنظیمات پایه و واژگان کنترل‌شده',
};
