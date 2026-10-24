import { test, expect } from '@playwright/test';
import { ADMIN_EMAIL, ADMIN_PASSWORD, login, skipIfMissing, T } from './helpers';

/**
 * Page-by-page visual acceptance at desktop (1440×900) and mobile (Pixel 7)
 * widths (mission §11): no horizontal overflow, no clipped headings, sidebar
 * collapses on mobile, RTL direction correct.
 */
const PAGES: { path: string; heading: RegExp | string }[] = [
  { path: '/', heading: T.dashboardHeading },
  { path: '/applicants', heading: T.applicantsHeading },
  { path: '/vacancies', heading: T.vacanciesHeading },
  { path: '/reports', heading: T.reportsHeading },
  { path: '/organization', heading: T.orgHeading },
  { path: '/users', heading: T.usersHeading },
  { path: '/audit', heading: T.auditHeading },
  { path: '/settings', heading: T.settingsHeading },
];

test.describe('visual acceptance — desktop', () => {
  test.skip(() => !!skipIfMissing(), 'E2E accounts not configured');

  for (const p of PAGES) {
    test(`${p.path} renders without overflow`, async ({ page }) => {
      await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
      await page.goto(p.path);
      await expect(page.getByRole('heading', { name: p.heading }).first()).toBeVisible();

      // RTL direction
      expect(await page.evaluate(() => document.documentElement.dir)).toBe('rtl');
      expect(await page.evaluate(() => document.documentElement.lang)).toBe('fa');

      // No accidental horizontal scroll on the document.
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow).toBeLessThanOrEqual(2);
    });
  }
});

test.describe('visual acceptance — mobile', () => {
  test.skip(() => !!skipIfMissing(), 'E2E accounts not configured');

  test('dashboard: off-canvas nav opens and navigates', async ({ page }) => {
    await login(page, ADMIN_EMAIL!, ADMIN_PASSWORD!);
    await page.setViewportSize({ width: 390, height: 844 });

    await page.getByRole('button', { name: 'باز کردن منو' }).click();
    const nav = page.getByRole('navigation', { name: 'ناوبری اصلی' });
    await expect(nav).toBeVisible();
    await page.getByRole('link', { name: 'بانک متقاضیان' }).first().click();
    await expect(page).toHaveURL(/\/applicants/);
    await expect(page.getByRole('heading', { name: T.applicantsHeading })).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });

  test('login page fits mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'ورود به سامانه راستا' })).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(2);
  });
});
