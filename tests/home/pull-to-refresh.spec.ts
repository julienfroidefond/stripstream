import { expect, test } from '@playwright/test';
import { hasE2eCredentials } from '../helpers/auth';

test.use({
  storageState: 'tests/.auth/stream.json',
  viewport: { width: 390, height: 844 },
  hasTouch: true,
});

const INDICATOR = '[data-testid="pull-to-refresh-indicator"]';

test.describe('Pull-to-refresh indicator', () => {
  test.skip(!hasE2eCredentials, 'Local E2E account unavailable');

  test('keeps the bar, icon and message centered on a narrow viewport', async ({ page }) => {
    await page.goto('/');

    // The hook binds its document listeners in an effect after hydration, so
    // retry the gesture until the indicator mounts instead of guessing a delay.
    await expect
      .poll(
        async () => {
          await page.evaluate(() => {
            const target = document.body;
            const centerX = window.innerWidth / 2;

            const dispatch = (type: string, clientY: number) => {
              const touch = new Touch({
                identifier: 1,
                target,
                clientX: centerX,
                clientY,
                pageX: centerX,
                pageY: clientY,
                radiusX: 2,
                radiusY: 2,
                force: 1,
              });

              target.dispatchEvent(
                new TouchEvent(type, {
                  touches: [touch],
                  targetTouches: [touch],
                  changedTouches: [touch],
                  bubbles: true,
                  cancelable: true,
                })
              );
            };

            dispatch('touchstart', 100);
            // 200px pull × 0.5 resistance = 100px, above the 80px threshold.
            dispatch('touchmove', 300);
          });

          return page.locator(INDICATOR).count();
        },
        { timeout: 15_000 }
      )
      .toBe(1);

    const geometry = await page.evaluate((selector) => {
      const centerOf = (target: string) => {
        const rect = document.querySelector(target)?.getBoundingClientRect();
        return rect ? rect.left + rect.width / 2 : Number.NaN;
      };

      return {
        viewportCenter: window.innerWidth / 2,
        barCenter: centerOf(`${selector} [data-testid="pull-to-refresh-bar"]`),
        iconCenter: centerOf(`${selector} [data-testid="pull-to-refresh-icon"]`),
        messageCenter: centerOf(`${selector} [data-testid="pull-to-refresh-message"]`),
      };
    }, INDICATOR);

    // Every part must sit on the viewport's vertical axis. A tolerance of 1px
    // absorbs sub-pixel rounding without hiding a real offset (the old
    // double-translate bug shifted the whole indicator by its full width).
    expect(Math.abs(geometry.barCenter - geometry.viewportCenter)).toBeLessThan(1);
    expect(Math.abs(geometry.iconCenter - geometry.viewportCenter)).toBeLessThan(1);
    expect(Math.abs(geometry.messageCenter - geometry.viewportCenter)).toBeLessThan(1);
  });
});
