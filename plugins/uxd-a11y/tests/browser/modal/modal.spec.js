import { test, expect } from '@playwright/test';

async function snapshot(page, testInfo, label) {
  const evidence = await page.evaluate(() => {
    const active = document.activeElement;
    const dialog = document.querySelector('dialog, [role="dialog"]');
    return {
      documentHasFocus: document.hasFocus(),
      active: { tag: active?.tagName, id: active?.id, text: active?.textContent?.trim().slice(0, 100) },
      dialog: dialog?.outerHTML,
      background: document.getElementById('background')?.outerHTML,
      viewport: { width: innerWidth, height: innerHeight }
    };
  });
  await testInfo.attach(label, { body: JSON.stringify(evidence, null, 2), contentType: 'application/json' });
  return evidence;
}

async function openByKeyboard(page, testInfo, provider, variant = 'valid') {
  await page.goto(`/modal/?provider=${provider}&variant=${variant}`);
  await page.keyboard.press('Tab');
  await expect(page.locator('#open')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.evaluate(() => Promise.all(document.getAnimations().map(animation => animation.finished.catch(() => {}))));
  await snapshot(page, testInfo, 'opened');
}

for (const provider of ['native', 'pf']) {
  test(`${provider}: named modal accepts static initial focus and restores focus`, async ({ page }, testInfo) => {
    await openByKeyboard(page, testInfo, provider);
    const dialog = page.getByRole('dialog', { name: 'Review changes', exact: true });
    await expect(dialog).toBeVisible();
    await expect(page.locator('#intro')).toBeFocused();
    await testInfo.attach('opened-screenshot', { body: await page.screenshot(), contentType: 'image/png' });
    await testInfo.attach('rendered-semantics', { body: await page.locator('body').ariaSnapshot(), contentType: 'text/plain' });

    // Continue the real keyboard journey from the static introduction.
    await page.keyboard.press('Tab');
    await expect(page.locator('#cancel')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#confirm')).toBeFocused();
    await page.keyboard.press('Tab');
    const forward = await snapshot(page, testInfo, 'forward-boundary');
    expect(forward.active.id).not.toBe('background');
    expect(forward.active.id).not.toBe('open');
    if (provider === 'pf') await expect(dialog.locator(':focus')).toHaveCount(1);
    if (provider === 'native' && forward.active.tag === 'BODY') {
      await page.keyboard.press('Tab');
      await expect(page.locator('#cancel')).toBeFocused();
      await snapshot(page, testInfo, 'native-boundary-reentry');
    }

    // Direct setup is explicitly separate from the keyboard journey.
    // PF's built-in close control precedes the footer controls.
    const first = provider === 'pf' ? dialog.getByRole('button', { name: 'Close' }) : page.locator('#cancel');
    await first.focus();
    await snapshot(page, testInfo, 'reverse-boundary-programmatic-setup');
    await page.keyboard.press('Shift+Tab');
    const reverse = await snapshot(page, testInfo, 'reverse-boundary');
    expect(reverse.active.id).not.toBe('background');
    expect(reverse.active.id).not.toBe('open');
    if (provider === 'pf') await expect(page.locator('#confirm')).toBeFocused();

    // Probe DOM focus exclusion separately from natural sequential navigation.
    await page.locator('#background').focus();
    await expect(page.locator('#background')).not.toBeFocused();
    await page.locator('#cancel').focus();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#open')).toBeFocused();
    await snapshot(page, testInfo, 'escape-restoration');
    await page.keyboard.press('Enter');
    await expect(page.locator('#intro')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#cancel')).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('#open')).toBeFocused();
    await snapshot(page, testInfo, 'cancel-restoration');
  });

  test(`${provider}: missing or broken naming is observable`, async ({ page }, testInfo) => {
    await openByKeyboard(page, testInfo, provider, provider === 'pf' ? 'broken-name' : 'unnamed');
    await expect(page.getByRole('dialog')).toHaveAccessibleName('');
    await snapshot(page, testInfo, 'missing-name');
  });
}

test('native: show() leaves background operable for intended-modal negative case', async ({ page }, testInfo) => {
  await openByKeyboard(page, testInfo, 'native', 'wrong-modality');
  expect(await page.locator('dialog').evaluate(el => el.matches(':modal'))).toBe(false);
  await page.locator('#background').focus();
  await expect(page.locator('#background')).toBeFocused();
  await snapshot(page, testInfo, 'background-reachable');
});

test('custom: aria-modal alone fails entry, background isolation, and Escape', async ({ page }, testInfo) => {
  await openByKeyboard(page, testInfo, 'custom');
  await expect(page.locator('#open')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#background')).toBeFocused();
  await snapshot(page, testInfo, 'background-reachable');
  await page.keyboard.press('Tab');
  await expect(page.locator('#cancel')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeVisible();
  await snapshot(page, testInfo, 'escape-does-not-dismiss');
});

test('pf: omitted naming prop produces a broad fallback, not an empty name', async ({ page }, testInfo) => {
  await openByKeyboard(page, testInfo, 'pf', 'unnamed');
  await expect(page.getByRole('dialog')).toHaveAccessibleName(/Close Review changes Read these changes/);
  await snapshot(page, testInfo, 'fallback-name');
  await testInfo.attach('fallback-semantics', { body: await page.locator('body').ariaSnapshot(), contentType: 'text/plain' });
});

test('pf: disabled trap permits background focus', async ({ page }, testInfo) => {
  await openByKeyboard(page, testInfo, 'pf', 'no-trap');
  await page.locator('#background').focus();
  await expect(page.locator('#background')).toBeFocused();
  await snapshot(page, testInfo, 'disabled-trap-background-focus');
});
