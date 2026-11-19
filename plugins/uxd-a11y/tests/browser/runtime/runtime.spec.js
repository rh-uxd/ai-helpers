import { test, expect } from '@playwright/test';

import { evidence } from '../helpers/evidence.js';

test('runtime: visible bypass, manual tabs, reverse navigation, and child-mediated scrolling', async ({ page }, info) => {
  await page.goto('/runtime/runtime.html');
  await page.keyboard.press('Tab');
  await expect(page.locator('#skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#tab-a')).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('#tab-b')).toBeFocused();
  await expect(page.locator('#tab-a')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Enter');
  await expect(page.locator('#tab-b')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('#notifications')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(page.locator('#tab-b')).toBeFocused();
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space');
  await expect(page.locator('#tab-a')).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('Tab');
  await expect(page.locator('#profile')).toBeFocused();
  for (const id of ['row-1', 'row-2', 'row-3']) {
    await page.keyboard.press('Tab');
    await expect(page.locator(`#${id}`)).toBeFocused();
  }
  expect(await page.locator('#overflow').evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  const visible = await page.locator('#row-3').evaluate(el => {
    const row = el.getBoundingClientRect();
    const parent = el.parentElement.getBoundingClientRect();
    return row.top >= parent.top && row.bottom <= parent.bottom;
  });
  expect(visible).toBe(true);
  await evidence(page, info, 'navigation-complete');
});

test('runtime: pointer-only Apply is a demonstrated keyboard barrier', async ({ page }, info) => {
  await page.goto('/runtime/runtime.html');
  // Direct setup isolates activation; this is not evidence of full sequential navigation.
  await page.locator('#apply').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#status')).toHaveText('');
  await page.keyboard.press('Space');
  await expect(page.locator('#status')).toHaveText('');
  await evidence(page, info, 'keyboard-activation-fails');
  await page.locator('#apply').click();
  await expect(page.locator('#status')).toHaveText('Applied');
  await evidence(page, info, 'pointer-activation-works-no-speech-claim');
});

for (const width of [375, 320]) {
  test(`runtime: usable dialog at ${width} CSS pixels`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 667 });
    await page.goto('/runtime/runtime.html');
    // Direct focus sets up the overlay-specific check; opening/dismissal use actual keys.
    await page.locator('#open').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#close')).toBeFocused();
    const state = await evidence(page, info, `dialog-${width}`);
    expect(state.closeRect.x).toBeGreaterThanOrEqual(0);
    expect(state.closeRect.right).toBeLessThanOrEqual(width);
    expect(state.closeRect.bottom).toBeLessThanOrEqual(667);
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#open')).toBeFocused();
  });
}

test('runtime: clipped dialog has an invisible focused control, but Escape still exits', async ({ page }, info) => {
  await page.setViewportSize({ width: 320, height: 667 });
  await page.goto('/runtime/runtime.html?variant=clipped');
  await page.locator('#open').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#close')).toBeFocused();
  await page.keyboard.press('PageDown');
  const state = await evidence(page, info, 'clipped-close-after-scroll-attempt');
  expect(state.closeRect.top).toBeGreaterThan(state.dialogRect.bottom);
  expect(state.dialogScroll).toBe(0);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('#open')).toBeFocused();
});
