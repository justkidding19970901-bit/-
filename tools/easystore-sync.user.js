// ==UserScript==
// @name         EasyStore → 商品搬家系統 同步
// @namespace    monna-case
// @version      1.0
// @description  一鍵把 EasyStore 後台所有商品匯出 + 推送到本機 localhost:3000 的搬家系統
// @match        https://admin.easystore.co/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SYNC_TARGET = 'http://localhost:3000/__sync';
  const PRODUCTS_PATH_PREFIX = '/products';
  const BUTTON_ID = '__es-sync-btn';

  // ------------------------------------------------------------------
  // Capture file_url from EasyStore's polling responses (XHR + fetch)
  // ------------------------------------------------------------------
  let capturedFileUrl = null;

  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__esUrl = url;
    return origXhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function () {
    this.addEventListener('load', () => {
      if (this.__esUrl && this.__esUrl.includes('/admin/v2/store/products/exports/')) {
        try {
          const data = JSON.parse(this.responseText);
          if (data && data.file_url) capturedFileUrl = data.file_url;
        } catch { /* not JSON, ignore */ }
      }
    });
    return origXhrSend.apply(this, arguments);
  };

  const origFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url = typeof input === 'string' ? input : input?.url;
    const r = await origFetch.apply(this, arguments);
    if (url && url.includes('/admin/v2/store/products/exports/')) {
      try {
        const clone = r.clone();
        const data = await clone.json();
        if (data && data.file_url) capturedFileUrl = data.file_url;
      } catch { /* ignore */ }
    }
    return r;
  };

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  function findVisibleByText(tag, text) {
    return [...document.querySelectorAll(tag)].find(el => {
      const t = el.textContent.trim();
      return (t === text || t.includes(text)) && el.offsetParent !== null;
    });
  }

  async function waitForCondition(predicate, timeoutMs = 60000, intervalMs = 300) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = predicate();
      if (v) return v;
      await sleep(intervalMs);
    }
    throw new Error('timeout: ' + (predicate.name || 'condition'));
  }

  // ------------------------------------------------------------------
  // Export flow — drives the existing EasyStore UI
  // ------------------------------------------------------------------
  async function runExport() {
    capturedFileUrl = null;

    // 1) Open the ⋯ menu (the button right before "新增商品" in the page header)
    const newProductLink = findVisibleByText('a, button', '新增商品');
    if (!newProductLink) throw new Error('找不到「新增商品」— 請先進入商品管理頁');
    const moreBtn = newProductLink.parentElement?.querySelector('button:not(:nth-of-type(2))')
      || newProductLink.previousElementSibling;
    if (!moreBtn || moreBtn.tagName !== 'BUTTON') throw new Error('找不到「⋯」選單按鈕');
    moreBtn.click();
    await sleep(400);

    // 2) Click 匯出商品
    const exportItem = findVisibleByText('button', '匯出商品');
    if (!exportItem) throw new Error('選單裡沒有「匯出商品」');
    exportItem.click();
    await sleep(900);

    // 3) Switch to "下載所有商品"
    const allRadio = [...document.querySelectorAll('input[type=radio]')]
      .find(r => r.parentElement?.textContent?.includes('下載所有商品'));
    if (allRadio && !allRadio.checked) {
      allRadio.click();
      await sleep(200);
    }

    // 4) Click 下載 (primary button in the modal footer)
    const dialog = document.querySelector('[role=dialog]');
    if (!dialog) throw new Error('「下載商品」對話框沒開起來');
    const submitBtn = [...dialog.querySelectorAll('button')]
      .find(b => b.textContent.trim() === '下載' && !b.disabled);
    if (!submitBtn) throw new Error('找不到對話框裡的「下載」按鈕');
    submitBtn.click();

    // 5) Wait for the API polling to surface a file_url
    await waitForCondition(() => capturedFileUrl, 180000); // up to 3 minutes
    return capturedFileUrl;
  }

  // ------------------------------------------------------------------
  // Push to localhost:3000
  // ------------------------------------------------------------------
  async function syncToLocal(fileUrl) {
    const r = await origFetch(fileUrl);
    if (!r.ok) throw new Error(`下載 CSV 失敗 (${r.status})`);
    const csv = await r.text();
    if (!csv) throw new Error('CSV 空白');

    const post = await origFetch(SYNC_TARGET, {
      method: 'POST',
      headers: { 'Content-Type': 'text/csv;charset=utf-8' },
      body: csv,
    });
    if (!post.ok) {
      throw new Error(
        post.status === 0
          ? '搬家系統 dev server 沒在跑（localhost:3000）'
          : `推送失敗 (${post.status})`
      );
    }
    return { size: csv.length };
  }

  // ------------------------------------------------------------------
  // Inject button into the page header
  // ------------------------------------------------------------------
  function injectButton() {
    if (document.getElementById(BUTTON_ID)) return;
    if (!location.pathname.startsWith(PRODUCTS_PATH_PREFIX)) return;

    const newProductLink = findVisibleByText('a, button', '新增商品');
    const target = newProductLink?.parentElement;
    if (!target) return;

    const btn = document.createElement('button');
    btn.id = BUTTON_ID;
    btn.type = 'button';
    btn.textContent = '🚚 同步到搬家系統';
    btn.style.cssText = [
      'margin-right:8px',
      'padding:6px 12px',
      'background:#4f46e5',
      'color:white',
      'border:none',
      'border-radius:6px',
      'cursor:pointer',
      'font-size:13px',
      'font-weight:600',
      'box-shadow:0 1px 2px rgba(0,0,0,0.1)',
    ].join(';');

    btn.addEventListener('click', async () => {
      const original = btn.textContent;
      btn.disabled = true;
      btn.style.opacity = '0.7';
      btn.textContent = '🚚 匯出中（30-60 秒）…';
      try {
        const url = await runExport();
        btn.textContent = '🚚 推送中…';
        const r = await syncToLocal(url);
        btn.style.background = '#059669';
        btn.textContent = `✅ 已推送 ${(r.size / 1024).toFixed(0)}KB → 搬家系統`;
        setTimeout(() => {
          btn.textContent = original;
          btn.style.background = '#4f46e5';
          btn.style.opacity = '1';
          btn.disabled = false;
        }, 6000);
      } catch (err) {
        btn.style.background = '#dc2626';
        btn.textContent = '❌ ' + (err.message || err);
        // eslint-disable-next-line no-console
        console.error('[easystore-sync]', err);
        setTimeout(() => {
          btn.textContent = original;
          btn.style.background = '#4f46e5';
          btn.style.opacity = '1';
          btn.disabled = false;
        }, 8000);
      }
    });

    target.insertBefore(btn, target.firstChild);
  }

  // Re-inject on SPA navigation / DOM updates
  injectButton();
  setInterval(injectButton, 2000);
})();
