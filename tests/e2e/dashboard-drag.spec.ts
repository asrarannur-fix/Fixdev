import { test, expect } from '@playwright/test';

const BASE = process.env.TEST_BASE_URL || 'http://127.0.0.1:3001';
const EMAIL = process.env.TEST_OWNER_EMAIL || 'asrar@mail.com';
const PASS = process.env.TEST_OWNER_PASSWORD || '778877';

test.describe('Dashboard Widget Drag-and-Drop', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/login');
    await page.getByLabel('Alamat email').fill(EMAIL);
    await page.getByLabel('Password').fill(PASS);
    await page.locator('form').getByRole('button', { name: 'Masuk' }).click();
    await page.waitForURL('**/tenant/**', { timeout: 10000 });
    await page.waitForLoadState('networkidle');
  });

  test('Widgets render with drag handle', async ({ page }) => {
    // Find widget containers
    const widgets = page.locator('[id^="widget-"]');
    const count = await widgets.count();
    console.log(`Found ${count} widgets`);
    expect(count).toBeGreaterThanOrEqual(3);

    // Check "Geser" text exists
    const geserText = page.locator('text=Geser');
    const geserCount = await geserText.count();
    console.log(`Found ${geserCount} "Geser" labels`);
    expect(geserCount).toBeGreaterThanOrEqual(1);
  });

  test('Widget outer div has proper sortable attributes', async ({ page }) => {
    const firstWidget = page.locator('[id^="widget-"]').first();
    await expect(firstWidget).toBeVisible();

    // Check it has role="button" from @dnd-kit attributes
    const role = await firstWidget.getAttribute('role');
    console.log(`First widget role: ${role}`);
    expect(role).toBe('button');

    // Check tabindex
    const tabIndex = await firstWidget.getAttribute('tabindex');
    console.log(`First widget tabindex: ${tabIndex}`);
    expect(tabIndex).toBe('0');

    // Check touch-action style
    const style = await firstWidget.getAttribute('style');
    console.log(`First widget style: ${style}`);
    expect(style).toContain('touch-action: none');
  });

  test('Widget drag works from center of widget', async ({ page }) => {
    const widgets = page.locator('[id^="widget-"]');
    const count = await widgets.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Get first widget ID and position
    const firstWidget = widgets.nth(0);
    const secondWidget = widgets.nth(1);

    const firstId = await firstWidget.getAttribute('id');
    const secondId = await secondWidget.getAttribute('id');
    console.log(`Dragging ${firstId} -> ${secondId}`);

    const firstBox = await firstWidget.boundingBox();
    const secondBox = await secondWidget.boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();

    if (!firstBox || !secondBox) return;

    // Center of first widget
    const startX = firstBox.x + firstBox.width / 2;
    const startY = firstBox.y + firstBox.height / 2;

    // Target: center of second widget
    const endX = secondBox.x + secondBox.width / 2;
    const endY = secondBox.y + secondBox.height / 2;

    console.log(`Drag from (${startX}, ${startY}) to (${endX}, ${endY})`);

    // Perform drag using mouse API directly
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Move slowly to trigger drag sensor (needs 5px activation distance)
    for (let i = 0; i <= 10; i++) {
      const x = startX + ((endX - startX) * i) / 10;
      const y = startY + ((endY - startY) * i) / 10;
      await page.mouse.move(x, y);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Check that widget order changed
    const newFirstId = await widgets.nth(0).getAttribute('id');
    const newSecondId = await widgets.nth(1).getAttribute('id');
    console.log(`After drag: first=${newFirstId}, second=${newSecondId}`);

    // The first widget should no longer be the same (order should have swapped)
    const orderChanged = firstId !== newFirstId || secondId !== newSecondId;
    console.log(`Order changed: ${orderChanged}`);
    expect(orderChanged).toBeTruthy();
  });

  test('Widget drag works from RIGHT side of widget', async ({ page }) => {
    const widgets = page.locator('[id^="widget-"]');
    const count = await widgets.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstWidget = widgets.nth(0);
    const secondWidget = widgets.nth(1);

    const firstId = await firstWidget.getAttribute('id');
    const secondId = await secondWidget.getAttribute('id');

    const firstBox = await firstWidget.boundingBox();
    const secondBox = await secondWidget.boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();

    if (!firstBox || !secondBox) return;

    // RIGHT side of first widget (90% from left)
    const startX = firstBox.x + firstBox.width * 0.9;
    const startY = firstBox.y + firstBox.height / 2;

    // Target: center of second widget
    const endX = secondBox.x + secondBox.width / 2;
    const endY = secondBox.y + secondBox.height / 2;

    console.log(`Drag from RIGHT side (${startX}, ${startY}) to (${endX}, ${endY})`);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 0; i <= 10; i++) {
      const x = startX + ((endX - startX) * i) / 10;
      const y = startY + ((endY - startY) * i) / 10;
      await page.mouse.move(x, y);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const newFirstId = await widgets.nth(0).getAttribute('id');
    const newSecondId = await widgets.nth(1).getAttribute('id');
    console.log(`After drag from RIGHT: first=${newFirstId}, second=${newSecondId}`);

    const orderChanged = firstId !== newFirstId || secondId !== newSecondId;
    console.log(`Order changed from RIGHT: ${orderChanged}`);
    expect(orderChanged).toBeTruthy();
  });

  test('Widget drag works from LEFT side of widget', async ({ page }) => {
    const widgets = page.locator('[id^="widget-"]');
    const count = await widgets.count();
    expect(count).toBeGreaterThanOrEqual(2);

    const firstWidget = widgets.nth(0);
    const secondWidget = widgets.nth(1);

    const firstId = await firstWidget.getAttribute('id');
    const secondId = await secondWidget.getAttribute('id');

    const firstBox = await firstWidget.boundingBox();
    const secondBox = await secondWidget.boundingBox();
    expect(firstBox).toBeTruthy();
    expect(secondBox).toBeTruthy();

    if (!firstBox || !secondBox) return;

    // LEFT side of first widget (10% from left)
    const startX = firstBox.x + firstBox.width * 0.1;
    const startY = firstBox.y + firstBox.height / 2;

    const endX = secondBox.x + secondBox.width / 2;
    const endY = secondBox.y + secondBox.height / 2;

    console.log(`Drag from LEFT side (${startX}, ${startY}) to (${endX}, ${endY})`);

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    for (let i = 0; i <= 10; i++) {
      const x = startX + ((endX - startX) * i) / 10;
      const y = startY + ((endY - startY) * i) / 10;
      await page.mouse.move(x, y);
      await page.waitForTimeout(30);
    }
    await page.mouse.up();
    await page.waitForTimeout(500);

    const newFirstId = await widgets.nth(0).getAttribute('id');
    const newSecondId = await widgets.nth(1).getAttribute('id');
    console.log(`After drag from LEFT: first=${newFirstId}, second=${newSecondId}`);

    const orderChanged = firstId !== newFirstId || secondId !== newSecondId;
    console.log(`Order changed from LEFT: ${orderChanged}`);
    expect(orderChanged).toBeTruthy();
  });
});
