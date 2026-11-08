import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { chromium } from 'playwright-core';

const baseURL = process.env.BROWSER_BASE_URL || 'http://localhost:3000';
const plannedJob = 'Marcus & Lena Webb';
const draftJob = 'Dana Reyes';
const sections = [
  ['Request', '#request'],
  ['Estimate', '#estimate'],
  ['Briefing', '#plan'],
  ['Payments', '#payments'],
  ['Ledger', '#ledger'],
];

let browser;
before(async () => {
  browser = await chromium.launch({ executablePath: process.env.CHROMIUM_EXECUTABLE_PATH });
});
after(async () => { await browser?.close(); });

async function openNavigation(page, mobile) {
  const menu = page.locator('summary').filter({ hasText: 'Menu' });
  assert.equal(await menu.isVisible(), mobile);
  if (mobile) {
    const disclosure = page.locator('details').filter({ has: menu });
    if (await disclosure.getAttribute('open') === null) {
      assert.equal(await page.getByRole('navigation', { name: 'Workspace' }).count(), 0);
      assert.equal(await page.getByRole('navigation', { name: 'Sections in this job' }).count(), 0);
      await menu.press('Enter');
      await page.keyboard.press('Tab');
      const jobs = page.getByRole('navigation', { name: 'Workspace' }).getByRole('link', { name: 'Jobs' });
      assert.ok(await jobs.evaluate(el => el === document.activeElement));
    }
  }
  assert.equal(await page.getByRole('navigation', { name: 'Workspace' }).count(), 1);
}

for (const [width, user] of [[390, 'steve'], [800, 'foti'], [801, 'steve'], [1440, 'foti']]) {
  test(`job shortcuts at ${width}px as ${user}`, async (t) => {
    const mobile = width <= 800;
    const page = await browser.newPage({ baseURL, viewport: { width, height: 844 }, hasTouch: mobile });
    t.after(() => page.close());
    await page.goto('/login');
    await page.getByLabel('Username').fill(user);
    const password = user === 'foti' ? process.env.SEED_FOTI_PASSWORD : process.env.SEED_STEVE_PASSWORD;
    await page.getByLabel('Password').fill(password ?? `${user}-dev-pass`);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await page.waitForURL('**/jobs');

    const navigation = page.getByRole('navigation', { name: 'Sections in this job' });
    await openNavigation(page, mobile);
    assert.equal(await navigation.count(), 0);
    const workspace = page.getByRole('navigation', { name: 'Workspace' });
    assert.equal(await workspace.getByRole('link', { name: 'Intake form' }).count(), Number(user === 'foti'));

    for (const job of [plannedJob, draftJob]) {
      await page.getByRole('link', { name: job, exact: true }).click();
      await page.getByRole('heading', { name: job, exact: true }).waitFor();
      await openNavigation(page, mobile);
      assert.equal(await navigation.count(), 1, 'one exposed job navigation landmark');
      const invoice = page.getByRole('button', { name: 'Issue invoice' });
      assert.equal(await invoice.count(), Number(user === 'foti' && job === plannedJob));
      const expected = sections;
      const briefing = page.locator('#plan');
      await briefing.getByRole('heading', { name: 'Job briefing', exact: true }).waitFor();
      assert.equal(await briefing.locator('form, button, input, ol, li').count(), 0, 'briefing is not an interactive checklist');
      const diagram = briefing.getByRole('figure', { name: 'Job-flow diagram' });
      assert.equal(await diagram.getByRole('link').count(), 4, 'four workflow nodes');
      assert.ok(await briefing.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'briefing fits its container');
      for (const link of await diagram.getByRole('link').all()) {
        const href = await link.getAttribute('href');
        assert.equal(await page.locator(href).count(), 1, 'diagram links have unique destinations');
      }
      assert.deepEqual(await navigation.getByRole('link').allTextContents(), expected.map(([label]) => label));
      for (const [label, hash] of expected) {
        const link = navigation.getByRole('link', { name: label, exact: true });
        assert.equal(await link.getAttribute('href'), hash);
        const target = page.locator(hash);
        assert.equal(await target.count(), 1, `one destination for ${label}`);
        if (mobile && hash === '#ledger') await link.tap();
        else await link.press('Enter');
        assert.equal(new URL(page.url()).hash, hash);
        assert.equal(await target.evaluate(el => el === document.activeElement), true, `focus moved to ${label}`);
      }
      await workspace.getByRole('link', { name: 'Jobs', exact: true }).click();
      await page.waitForURL('**/jobs');
    }
  });
}

function luminance(cssColor) {
  const channels = cssColor.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  assert.ok(channels, `expected an opaque RGB color, got ${cssColor}`);
  const [r, g, b] = channels.slice(1).map(value => {
    const s = Number(value) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

test('form controls have a visible border with 3:1 contrast on both sides', async (t) => {
  const page = await browser.newPage({ baseURL });
  t.after(() => page.close());
  for (const [route, labels] of [
    ['/login', ['Username', 'Password']],
    ['/request', ['Name', 'Service needed', 'Describe the work']],
  ]) {
    await page.goto(route);
    for (const label of labels) {
      const control = page.getByLabel(label, { exact: true });
      await control.blur();
      const { border, fill, outside, width, style } = await control.evaluate(el => {
        const css = getComputedStyle(el);
        let parent = el.parentElement;
        while (parent && getComputedStyle(parent).backgroundColor === 'rgba(0, 0, 0, 0)') {
          parent = parent.parentElement;
        }
        return {
          border: css.borderTopColor, fill: css.backgroundColor,
          outside: getComputedStyle(parent).backgroundColor,
          width: parseFloat(css.borderTopWidth), style: css.borderTopStyle,
        };
      });
      assert.ok(width > 0 && style !== 'none' && style !== 'hidden', `${label} needs a visible border`);
      for (const adjacent of [fill, outside]) {
        const edge = luminance(border);
        const background = luminance(adjacent);
        const ratio = (Math.max(edge, background) + 0.05) / (Math.min(edge, background) + 0.05);
        assert.ok(ratio >= 3, `${label}: ${border} against ${adjacent} is ${ratio.toFixed(2)}:1`);
      }
    }
  }
});
