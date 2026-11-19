import { test, expect } from '@playwright/test';

// Small recipe regression fixture, not a production modal or containment test.
// The broken variant deliberately restores focus without dismissing the overlay.
for (const variant of ['broken', 'hidden', 'removed']) {
  test(`dismissal assertion distinguishes ${variant} dialog from focus return`, async ({ page }) => {
    await page.setContent(`
      <button id="open">Review changes</button>
      <div id="review" role="dialog" aria-modal="true" aria-label="Review changes" hidden>
        <button id="cancel">Cancel</button>
      </div>
      <script>
        const trigger = document.querySelector('#open');
        const dialog = document.querySelector('#review');
        trigger.onclick = () => { dialog.hidden = false; document.querySelector('#cancel').focus(); };
        dialog.onkeydown = event => {
          if (event.key !== 'Escape') return;
          ${variant === 'hidden' ? 'dialog.hidden = true;' : variant === 'removed' ? 'dialog.remove();' : ''}
          trigger.focus();
        };
      </script>
    `);
    const trigger = page.locator('#open');
    const dialog = page.locator('#review');
    await trigger.focus(); // Isolated lifecycle setup, not natural entry.
    await page.keyboard.press('Enter');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#cancel')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused(); // The old recipe passes in ALL three variants.
    if (variant === 'broken') {
      await expect(dialog).toBeVisible();
      // The added closure guard must reject the seeded defect.
      await expect(expect(dialog).toBeHidden({ timeout: 150 })).rejects.toThrow();
    } else if (variant === 'hidden') {
      await expect(dialog).toHaveCount(1);
      await expect(dialog).toBeHidden();
    } else {
      await expect(dialog).toHaveCount(0);
    }
  });
}
