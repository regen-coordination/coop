const { expect, test } = require('@playwright/test');

test('landing page renders the locked v1 narrative', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /turn loose tabs into shared intelligence/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /fragmented knowledge becomes missed opportunity/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /run one structured community call/i }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: /passive capture stays local/i })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /preview the outcome before you install anything/i }),
  ).toBeVisible();
});

test('landing page stays legible on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This scenario validates the mobile project only.');

  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /turn loose tabs into shared intelligence/i }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Setup ritual', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /copy ritual prompt/i })).toBeVisible();
});
