import { test, expect } from '@playwright/test';
import { evidence } from '../helpers/evidence.js';

test('disclosure: trigger focus and background access are valid', async ({ page }, testInfo) => {
  await page.goto('/disclosure/');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page.locator('#open')).toBeFocused();
  await expect(page.locator('#open')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('#details')).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.keyboard.press('Tab');
  await expect(page.locator('#background')).toBeFocused();
  await evidence(page, testInfo, 'nonmodal-disclosure');
});
