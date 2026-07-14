const { chromium } = require('playwright');
const TEST_PASS = process.env.TEST_USER_PASSWORD || '';
const TEST_EMAIL = process.env.TEST_USER_EMAIL || 'owner@komputermakassar.com';

async function runPath(label, query, useDropdownBtn) {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  const logs = [];
  page.on('pageerror', e => logs.push('PAGE_ERR: ' + String(e).slice(0, 600)));
  const out = {};
  try {
    await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
    await page.getByText('Akses Portal ERP').first().click({ force: true });
    await page.waitForSelector('text=Masuk Sistem', { timeout: 6000 });
    const inputs = await page.$$('input');
    if (inputs[0]) await inputs[0].fill(TEST_EMAIL);
    if (inputs[1]) await inputs[1].fill(TEST_PASS);
    await page.getByText('Masuk Sistem').last().click({ force: true });
    await page.waitForFunction(() => document.querySelectorAll('input').length > 5, { timeout: 15000 }).catch(()=>{});
    await page.waitForTimeout(400);
    await page.getByText('Servis', { exact: true }).first().click({ force: true });
    await page.waitForTimeout(700);
    await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/Terima Unit Baru/.test(x.textContent)); if(b)b.click(); });
    await page.waitForFunction(() => /Penerimaan Unit Servis Baru/i.test(document.body.innerText), { timeout: 12000 }).catch(()=>{});
    await page.waitForSelector('input[placeholder*="Cari nama / no. WhatsApp pelanggan"]', { timeout: 12000 }).catch(()=>{});

    const c = page.locator('input[placeholder*="Cari nama / no. WhatsApp pelanggan"]').first();
    await c.click({ force: true });
    await c.type(query, { delay: 10 });
    await page.waitForTimeout(400);
    if (useDropdownBtn) {
      await page.evaluate(() => { const b=[...document.querySelectorAll('button')].find(x=>/Tambah pelanggan baru/.test(x.textContent)); if(b)b.click(); });
      await page.waitForTimeout(300);
    }
    await page.locator('input[placeholder*="Asus ROG GL503"]').first().click({ force: true });
    await page.locator('input[placeholder*="Asus ROG GL503"]').first().type('iPhone 14', { delay: 10 });
    await page.locator('textarea[placeholder*="Layar bergaris"]').first().click({ force: true });
    await page.locator('textarea[placeholder*="Layar bergaris"]').first().type('Layar mati.', { delay: 10 });
    await page.waitForTimeout(300);
    await page.getByText('Daftarkan Unit & Buat SPK', { exact: false }).first().click({ force: true });
    await page.waitForTimeout(2500);
    out.preview = await page.evaluate(() => /Penerimaan Unit Berhasil|Tanda Terima/i.test(document.body.innerText));
    out.toast = await page.evaluate(() => {
      const t = [...document.querySelectorAll('*')].find(e => /Harap lengkapi|wajib|gagal|error|terdaftar/i.test(e.textContent) && e.children.length < 4 && e.textContent.trim().length < 200);
      return t ? t.textContent.trim() : '';
    });
  } catch (e) { out.error = String(e).slice(0, 400); }
  out.logs = logs;
  await browser.close();
  return out;
}
(async () => {
  const r = {};
  r.pathB_dropdownBtn = await runPath('B', 'Joko Susilo', true);
  r.pathC_phoneOnly = await runPath('C', '628123456789', false);
  console.log(JSON.stringify(r, null, 2));
})();
