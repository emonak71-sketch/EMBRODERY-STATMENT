import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const baseURL = 'http://127.0.0.1:4173';
const supabaseHost = 'https://utyhcyjdvzezvagrmbxg.supabase.co';
const server = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', '4173', '--strictPort'], {
  stdio: 'ignore',
  env: {
    ...process.env,
    VITE_SUPABASE_URL: supabaseHost,
    VITE_SUPABASE_ANON_KEY: 'qa-only-public-anon-key'
  }
});

let browser;
const pageErrors = [];
const mockUser = {
  id: 'qa-user-001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'qa@example.com',
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { business_name: 'QA Embroidery Studio' },
  created_at: new Date().toISOString()
};
const mockSession = {
  access_token: 'qa-access-token',
  token_type: 'bearer',
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  refresh_token: 'qa-refresh-token',
  user: mockUser
};
let parties = [{ id: 'party-1', name: 'Demo Customer', phone: '01712345678', is_deleted: false, created_at: new Date().toISOString() }];
let transactions = [{
  id: 'tx-1', party_id: 'party-1', date: new Date().toISOString().slice(0, 10),
  bill_no: 'OLD-001', details: 'Legacy Embroidery Work', pcs: 10, rate: 5,
  credit: 50, payment: 0, created_at: new Date().toISOString()
}];
let idCounter = 2;
let recoveryRequested = false;
let otpVerified = false;
let passwordUpdated = false;

async function waitForServer() {
  for (let i = 0; i < 60; i += 1) {
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {}
    await delay(500);
  }
  throw new Error('Vite dev server did not start.');
}

async function fulfillJson(route, status, body) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    headers: { 'Content-Range': '0-0/*' },
    body: JSON.stringify(body)
  });
}

try {
  await waitForServer();
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, acceptDownloads: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('request', request => console.log('REQUEST', request.method(), request.url()));
  page.on('console', message => console.log('CONSOLE', message.type(), message.text()));

  await page.route(supabaseHost + '/auth/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();

    if (url.pathname.endsWith('/recover') && method === 'POST') {
      recoveryRequested = true;
      return fulfillJson(route, 200, {});
    }
    if (url.pathname.endsWith('/verify') && method === 'POST') {
      otpVerified = true;
      return fulfillJson(route, 200, mockSession);
    }
    if (url.pathname.endsWith('/user') && method === 'GET') {
      return fulfillJson(route, 200, mockUser);
    }
    if (url.pathname.endsWith('/user') && (method === 'PUT' || method === 'PATCH')) {
      const body = request.postDataJSON() || {};
      if (body.data?.business_name) mockUser.user_metadata.business_name = body.data.business_name;
      if (body.email) mockUser.email = body.email;
      passwordUpdated = passwordUpdated || Boolean(body.password);
      return fulfillJson(route, 200, mockUser);
    }
    if (url.pathname.endsWith('/logout') && method === 'POST') {
      return route.fulfill({ status: 204, body: '' });
    }
    return fulfillJson(route, 200, {});
  });

  await page.route(supabaseHost + '/rest/v1/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const table = url.pathname.split('/').pop();
    const rows = table === 'Parties' ? parties : table === 'Transactions' ? transactions : null;
    if (!rows) return fulfillJson(route, 404, { message: 'Unknown test table: ' + table });

    if (request.method() === 'GET') {
      const result = rows.slice();
      if (table === 'Transactions') result.sort((a, b) => String(a.date).localeCompare(String(b.date)));
      return fulfillJson(route, 200, result);
    }
    if (request.method() === 'POST') {
      const payload = request.postDataJSON();
      const inserted = (Array.isArray(payload) ? payload : [payload]).map(row => ({
        ...row,
        id: (table === 'Parties' ? 'party-' : 'tx-') + idCounter++,
        created_at: new Date().toISOString()
      }));
      rows.push(...inserted);
      return fulfillJson(route, 201, inserted);
    }
    if (request.method() === 'PATCH') {
      const id = (url.searchParams.get('id') || '').replace(/^eq\./, '');
      const row = rows.find(item => item.id === id);
      if (row) Object.assign(row, request.postDataJSON() || {});
      return fulfillJson(route, 200, row ? [row] : []);
    }
    if (request.method() === 'DELETE') {
      const id = (url.searchParams.get('id') || '').replace(/^eq\./, '');
      const index = rows.findIndex(item => item.id === id);
      if (index >= 0) rows.splice(index, 1);
      return route.fulfill({ status: 204, body: '' });
    }
    return fulfillJson(route, 200, []);
  });

  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

  // Password recovery: request code -> verify six digits -> set new password.
  await page.getByRole('button', { name: 'পাসওয়ার্ড ভুলে গেছেন?' }).click();
  await page.getByPlaceholder('name@gmail.com').fill('qa@example.com');
  await page.getByRole('button', { name: '৬ সংখ্যার কোড পাঠান' }).click();
  await page.getByText('৬ সংখ্যার OTP').waitFor();
  assert.equal(recoveryRequested, true, 'Recovery email request should reach Supabase.');
  await page.locator('input[autocomplete="one-time-code"]').fill('123456');
  await page.getByRole('button', { name: 'কোড যাচাই করুন' }).click();
  await page.getByText('নতুন পাসওয়ার্ড', { exact: true }).waitFor();
  assert.equal(otpVerified, true, 'OTP should be verified by Supabase.');
  await page.getByLabel('নতুন পাসওয়ার্ড', { exact: true }).fill('QA-Strong-Pass-2026');
  await page.getByLabel('পাসওয়ার্ড নিশ্চিত করুন', { exact: true }).fill('QA-Strong-Pass-2026');
  await page.getByRole('button', { name: 'নতুন পাসওয়ার্ড সংরক্ষণ করুন' }).click();
  await page.getByText('Overview', { exact: false }).first().waitFor();
  assert.equal(passwordUpdated, true, 'New password should be saved after OTP verification.');

  // Mobile menu and three-dot customer actions must be visible and usable.
  const menuButton = page.getByRole('button', { name: 'Open navigation menu' });
  await menuButton.waitFor({ state: 'visible' });
  await menuButton.click();
  const moreButton = page.getByRole('button', { name: 'More actions for Demo Customer' });
  await moreButton.waitFor({ state: 'visible' });
  const opacity = await moreButton.evaluate(element => getComputedStyle(element).opacity);
  assert.equal(opacity, '1', 'Customer three-dot action must remain visible on touch screens.');
  await moreButton.click();
  await page.getByRole('menuitem', { name: 'Edit' }).waitFor({ state: 'visible' });
  await page.getByRole('menuitem', { name: 'Edit' }).click();
  await page.getByText('Edit Party', { exact: false }).waitFor();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();

  // Open customer ledger and record production using PCS x Rate.
  await page.getByRole('button', { name: /Demo Customer/ }).first().click();
  await page.getByRole('button', { name: /Quick Entry/ }).click();
  await page.locator('input[aria-label="Design or work details"]').fill('QA logo embroidery');
  await page.locator('input[aria-label="Production pieces"]').fill('120');
  await page.locator('input[aria-label="Rate per piece"]').fill('3.5');
  await page.getByText('৳420').waitFor();
  await page.getByRole('button', { name: 'Save work' }).click();
  await page.getByText('120 pcs × ৳3.5').first().waitFor();
  const createdWork = transactions.find(row => row.details === 'QA logo embroidery');
  assert.ok(createdWork, 'Production entry should be saved.');
  assert.equal(Number(createdWork.credit), 420, 'Work amount must equal PCS multiplied by rate.');
  assert.equal(Number(createdWork.pcs), 120);
  assert.equal(Number(createdWork.rate), 3.5);

  // Record a payment separately.
  await page.getByRole('button', { name: /Quick Entry/ }).click();
  await page.getByRole('button', { name: 'Payment', exact: true }).click();
  await page.locator('input[aria-label="Payment amount"]').fill('100');
  await page.getByRole('button', { name: 'Save payment' }).click();
  assert.ok(transactions.some(row => Number(row.payment) === 100), 'Payment entry should be saved.');

  // CSV export and WhatsApp reminder must invoke real browser actions.
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'CSV', exact: true }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /_Ledger_.*\.csv$/);

  const popupPromise = page.waitForEvent('popup');
  assert.ok(popup.url().startsWith('https://wa.me/') || popup.url().startsWith('https://api.whatsapp.com/send'), 'WhatsApp should open a valid WhatsApp chat URL.');
  const popup = await popupPromise;
  assert.match(popup.url(), /^https:\/\/wa\.me\//);
  await popup.close();

  // Settings profile save and logout.
  await menuButton.click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('input[autocomplete="organization"]').fill('QA Stitch Studio');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.getByRole('status').waitFor();
  assert.equal(mockUser.user_metadata.business_name, 'QA Stitch Studio');

  await menuButton.click();
  await page.getByRole('button', { name: 'Logout', exact: true }).click();
  await page.getByRole('button', { name: 'পাসওয়ার্ড ভুলে গেছেন?' }).waitFor();

  assert.deepEqual(pageErrors, [], 'The app should not throw browser runtime errors during the smoke flow.');
  console.log('Browser smoke QA passed: recovery OTP, mobile menu, customer actions, PCS × Rate production, payment, CSV export, WhatsApp reminder, settings and logout.');
  await context.close();
} finally {
  if (browser) await browser.close();
  server.kill('SIGTERM');
}
