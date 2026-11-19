export async function evidence(page, testInfo, label) {
  const state = await page.evaluate(() => {
    const active = document.activeElement;
    const close = document.getElementById('close');
    const dialog = document.querySelector('dialog');
    const overflow = document.getElementById('overflow');
    return {
      url: location.href, viewport: { width: innerWidth, height: innerHeight },
      userAgent: navigator.userAgent,
      active: { id: active?.id, tag: active?.tagName, text: active?.textContent?.trim() },
      ...(overflow && { overflowScroll: overflow.scrollTop }),
      selected: [...document.querySelectorAll('[role=tab]')].map(el => [el.id, el.getAttribute('aria-selected')]),
      ...(close && { closeRect: close.getBoundingClientRect().toJSON() }),
      ...(dialog && { dialogRect: dialog.getBoundingClientRect().toJSON(), dialogScroll: dialog.scrollTop })
    };
  });
  await testInfo.attach(label, { body: JSON.stringify(state, null, 2), contentType: 'application/json' });
  await testInfo.attach(`${label}-semantics`, { body: await page.locator('body').ariaSnapshot(), contentType: 'text/plain' });
  await testInfo.attach(`${label}-screenshot`, { body: await page.screenshot(), contentType: 'image/png' });
  return state;
}

