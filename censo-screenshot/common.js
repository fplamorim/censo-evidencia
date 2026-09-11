// Censo · Evidência v1.5 — código partilhado (popup + fila)
// Tudo corre localmente. Nenhuma função aqui comunica com servidores externos.

const CENSO = (() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const MAX_HEIGHT_PX = 30000;

  // ---------- data-hora ----------
  function tsLocal() {
    const d = new Date();
    const off = -d.getTimezoneOffset(), sign = off >= 0 ? '+' : '-';
    const abs = Math.abs(off), oh = Math.floor(abs / 60), om = abs % 60;
    const utc = `UTC${sign}${oh}${om ? ':' + String(om).padStart(2, '0') : ''}`;
    const month = d.toLocaleString('en-US', { month: 'long' });
    const pad = n => String(n).padStart(2, '0');
    const isoOff = `${sign}${pad(oh)}:${pad(om)}`;
    return {
      human: `${month} ${d.getDate()}, ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())} (${utc})`,
      iso: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}${isoOff}`,
      file: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}h${pad(d.getMinutes())}`
    };
  }

  // ---------- hash ----------
  async function sha256(buf) {
    const h = await crypto.subtle.digest('SHA-256', buf);
    return Array.from(new Uint8Array(h)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // ---------- funções injetadas na página (têm de ser autocontidas) ----------
  const fnMetrics = () => ({
    scrollH: Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0),
    viewH: window.innerHeight, viewW: window.innerWidth,
    dpr: window.devicePixelRatio || 1, y0: window.scrollY
  });
  const fnScroll = (y) => { window.scrollTo(0, y); return window.scrollY; };
  const fnHideFixed = () => {
    let n = 0;
    document.querySelectorAll('body *').forEach(el => {
      try {
        const cs = getComputedStyle(el);
        if ((cs.position === 'fixed' || cs.position === 'sticky') && cs.visibility !== 'hidden') {
          el.setAttribute('data-censo-hidden', el.style.visibility || '');
          el.style.visibility = 'hidden'; n++;
        }
      } catch (e) {}
    });
    return n;
  };
  const fnRestore = (y) => {
    document.querySelectorAll('[data-censo-hidden]').forEach(el => {
      el.style.visibility = el.getAttribute('data-censo-hidden');
      el.removeAttribute('data-censo-hidden');
    });
    window.scrollTo(0, y);
  };

  // metadados + texto integral + texto principal + ligações
  const fnDump = () => {
    const q = s => document.querySelector(s);
    const m = sel => { const el = q(sel); return el ? (el.getAttribute('content') || '').trim() : ''; };
    const meta = {
      title: document.title || '',
      og_title: m('meta[property="og:title"]') || m('meta[name="title"]') || m('meta[name="twitter:title"]'),
      site: m('meta[property="og:site_name"]') || m('meta[name="application-name"]'),
      description: m('meta[property="og:description"]') || m('meta[name="description"]'),
      published: m('meta[property="article:published_time"]') || m('meta[name="pubdate"]') || m('meta[name="publishdate"]') ||
                 m('meta[name="date"]') || m('meta[name="dc.date"]') || m('meta[name="DC.date.issued"]') ||
                 m('meta[itemprop="datePublished"]') || m('meta[name="parsely-pub-date"]') ||
                 (q('time[datetime]') ? (q('time[datetime]').getAttribute('datetime') || '') : ''),
      modified: m('meta[property="article:modified_time"]') || m('meta[itemprop="dateModified"]'),
      author: m('meta[name="author"]') || m('meta[property="article:author"]') || m('meta[name="dc.creator"]') || m('meta[name="parsely-author"]'),
      canonical: q('link[rel="canonical"]') ? q('link[rel="canonical"]').href : '',
      lang: document.documentElement.lang || m('meta[http-equiv="content-language"]') || ''
    };
    // JSON-LD como fallback (muitos jornais só põem a data aqui)
    try {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
        let j; try { j = JSON.parse(s.textContent); } catch (e) { return; }
        const arr = Array.isArray(j) ? j : (j && j['@graph'] ? j['@graph'] : [j]);
        arr.forEach(o => {
          if (!o || typeof o !== 'object') return;
          if (!meta.published && o.datePublished) meta.published = String(o.datePublished);
          if (!meta.modified && o.dateModified) meta.modified = String(o.dateModified);
          if (!meta.author && o.author) {
            const a = Array.isArray(o.author) ? o.author[0] : o.author;
            meta.author = typeof a === 'string' ? a : ((a && a.name) || '');
          }
          if (!meta.og_title && o.headline) meta.og_title = String(o.headline);
          if (!meta.site && o.publisher && o.publisher.name) meta.site = String(o.publisher.name);
        });
      });
    } catch (e) {}
    Object.keys(meta).forEach(k => { meta[k] = String(meta[k] || '').replace(/\s+/g, ' ').trim(); });

    // texto principal: <article>/<main> se existirem; senão o elemento com mais texto em <p>
    let main = '';
    try {
      const pref = Array.from(document.querySelectorAll('article, main, [role="main"], [itemprop="articleBody"]'));
      let best = null, bestLen = 0;
      if (pref.length) {
        pref.forEach(el => { const l = (el.innerText || '').trim().length; if (l > bestLen) { bestLen = l; best = el; } });
      } else {
        const scores = new Map();
        document.querySelectorAll('p').forEach(p => {
          const len = (p.innerText || '').trim().length; if (len < 40) return;
          const par = p.parentElement; if (!par) return;
          scores.set(par, (scores.get(par) || 0) + len);
        });
        scores.forEach((len, el) => { if (len > bestLen) { bestLen = len; best = el; } });
      }
      if (best && bestLen > 300) main = best.innerText || '';
    } catch (e) {}

    return {
      meta, main,
      txt: document.body ? document.body.innerText : '',
      links: Array.from(document.querySelectorAll('a[href]'))
        .map(a => ({ t: (a.textContent || '').trim().replace(/\s+/g, ' '), h: a.href }))
        .filter(x => x.t && x.h.startsWith('http'))
    };
  };

  const run = (tabId, func, args) =>
    chrome.scripting.executeScript({ target: { tabId }, func, args: args || [] }).then(r => r[0].result);

  // ---------- captura deslizar-e-coser ----------
  async function captureCanvas(tab, onProgress) {
    const m = await run(tab.id, fnMetrics);
    const H = Math.min(m.scrollH, MAX_HEIGHT_PX);
    const big = document.createElement('canvas');
    big.width = Math.round(m.viewW * m.dpr);
    big.height = Math.round(H * m.dpr);
    const bctx = big.getContext('2d');
    bctx.fillStyle = '#ffffff'; bctx.fillRect(0, 0, big.width, big.height);
    const nSlices = Math.max(1, Math.ceil(H / m.viewH));
    try {
      for (let i = 0; i < nSlices; i++) {
        const target = Math.max(0, Math.min(i * m.viewH, H - m.viewH));
        const actualY = await run(tab.id, fnScroll, [target]);
        if (i === 1) await run(tab.id, fnHideFixed);
        if (onProgress) onProgress(i + 1, nSlices);
        await sleep(650);                               // render + limite de 2 capturas/seg do Chrome
        const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' });
        const img = new Image(); img.src = dataUrl; await img.decode();
        bctx.drawImage(img, 0, Math.round(actualY * m.dpr));
      }
    } finally {
      try { await run(tab.id, fnRestore, [m.y0]); } catch (e) {}
    }
    return big;
  }

  // ---------- PDF A4 com rodapé em todas as páginas ----------
  function buildPdf(big, rid, url, t) {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
    const pageW = 210, pageH = 297, margin = 8, footerH = 12;
    const usableW = pageW - 2 * margin, usableH = pageH - margin - footerH;
    const pxPerMm = big.width / usableW;
    const slicePx = Math.floor(usableH * pxPerMm);
    const nPages = Math.max(1, Math.ceil(big.height / slicePx));
    const pc = document.createElement('canvas'); const pctx = pc.getContext('2d');
    const u = url.length > 150 ? url.slice(0, 147) + '…' : url;
    for (let i = 0; i < nPages; i++) {
      const sy = i * slicePx, sh = Math.min(slicePx, big.height - sy);
      pc.width = big.width; pc.height = sh;
      pctx.fillStyle = '#ffffff'; pctx.fillRect(0, 0, pc.width, pc.height);
      pctx.drawImage(big, 0, sy, big.width, sh, 0, 0, big.width, sh);
      if (i > 0) pdf.addPage();
      pdf.addImage(pc.toDataURL('image/jpeg', 0.9), 'JPEG', margin, margin, usableW, sh / pxPerMm);
      pdf.setDrawColor(1, 22, 87); pdf.setLineWidth(0.3);
      pdf.line(margin, pageH - footerH, pageW - margin, pageH - footerH);
      pdf.setFontSize(7.5); pdf.setTextColor(60, 60, 60);
      pdf.text(`Retrieved ${t.human}  ·  Record ${rid}  ·  Page ${i + 1} of ${nPages}`, margin, pageH - footerH + 4);
      pdf.text(`from ${u}`, margin, pageH - footerH + 8, { maxWidth: usableW });
    }
    return { pdf, nPages };
  }

  // ---------- sidecar TXT ----------
  function buildSidecar(rid, url, t, dump, pdfFile, pdfSha, nPages) {
    const mt = dump.meta || {};
    const head = [
      `RECORD: ${rid}`,
      `RETRIEVED: ${t.human}`,
      `RETRIEVED_ISO: ${t.iso}`,
      `URL: ${url}`,
      `CANONICAL: ${mt.canonical || ''}`,
      `TITLE: ${mt.title || ''}`,
      `OG_TITLE: ${mt.og_title || ''}`,
      `SITE: ${mt.site || ''}`,
      `PUBLISHED: ${mt.published || ''}`,
      `MODIFIED: ${mt.modified || ''}`,
      `AUTHOR: ${mt.author || ''}`,
      `LANG: ${mt.lang || ''}`,
      `DESCRIPTION: ${mt.description || ''}`,
      `PDF_FILE: ${pdfFile}`,
      `PDF_SHA256: ${pdfSha}`,
      `PDF_PAGES: ${nPages}`,
      `TOOL: Censo · Evidência v1.5.0 — extensão local, sem comunicação externa`,
      `AUTHOR_TOOL: Fernando Paulo Lopes Amorim (ORCID 0000-0003-1646-5366), CICANT / MeLCi Lab, Universidade Lusófona — desenvolvido com Claude Cowork (Claude Fable 5.1, Anthropic)`,
      `SOURCE: https://github.com/fplamorim/censo-evidencia`
    ].join('\n');
    return `${head}\n\n===== MAIN TEXT =====\n${dump.main || '(não identificado — usar PAGE TEXT)'}\n\n===== PAGE TEXT =====\n${dump.txt}\n\n===== LINKS =====\n` +
      dump.links.map(l => `${l.t} | ${l.h}`).join('\n') + '\n';
  }

  // ---------- captura completa de um item (usado pelo popup e pela fila) ----------
  // devolve a linha de manifesto
  async function captureItem(tab, rid, url, onProgress) {
    const t = tsLocal();
    const big = await captureCanvas(tab, onProgress);
    const { pdf, nPages } = buildPdf(big, rid, url, t);
    const pdfBytes = pdf.output('arraybuffer');
    const pdfSha = await sha256(pdfBytes);
    const pdfFile = `${rid}_${t.file}.pdf`;
    const txtFile = `${rid}_${t.file}.txt`;

    const dump = await run(tab.id, fnDump);
    const sidecar = buildSidecar(rid, url, t, dump, pdfFile, pdfSha, nPages);
    const txtBytes = new TextEncoder().encode(sidecar);
    const txtSha = await sha256(txtBytes);

    await chrome.downloads.download({
      url: URL.createObjectURL(new Blob([txtBytes], { type: 'text/plain;charset=utf-8' })),
      filename: `evidencia_censo/${txtFile}`, saveAs: false
    });
    await chrome.downloads.download({
      url: URL.createObjectURL(new Blob([pdfBytes], { type: 'application/pdf' })),
      filename: `evidencia_censo/${pdfFile}`, saveAs: false
    });

    const mt = dump.meta || {};
    return {
      record_id: rid, url, canonical_url: mt.canonical || '', title: mt.title || '', og_title: mt.og_title || '',
      site: mt.site || '', published: mt.published || '', author: mt.author || '', lang: mt.lang || '',
      retrieved_iso: t.iso, retrieved_human: t.human, pages: nPages,
      pdf_file: pdfFile, txt_file: txtFile, sha256_pdf: pdfSha, sha256_txt: txtSha,
      status: 'OK', error: ''
    };
  }

  // ---------- manifesto CSV ----------
  const COLS = ['record_id', 'url', 'canonical_url', 'title', 'og_title', 'site', 'published', 'author', 'lang',
                'retrieved_iso', 'retrieved_human', 'pages', 'pdf_file', 'txt_file', 'sha256_pdf', 'sha256_txt', 'status', 'error'];
  const csvEsc = v => { const s = String(v == null ? '' : v); return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  function rowsToCsv(rows) {
    return '\ufeff' + COLS.join(',') + '\r\n' + rows.map(r => COLS.map(c => csvEsc(r[c])).join(',')).join('\r\n') + '\r\n';
  }
  async function downloadCsv(rows, filename) {
    await chrome.downloads.download({
      url: URL.createObjectURL(new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' })),
      filename, saveAs: false
    });
  }
  // manifesto acumulado (todas as capturas, popup + fila) em chrome.storage.local
  async function manifestGet() { const r = await chrome.storage.local.get('manifest'); return Array.isArray(r.manifest) ? r.manifest : []; }
  async function manifestAppend(row) { const rows = await manifestGet(); rows.push(row); await chrome.storage.local.set({ manifest: rows }); return rows.length; }
  async function manifestClear() { await chrome.storage.local.set({ manifest: [] }); }
  async function manifestExport() {
    const rows = await manifestGet();
    await downloadCsv(rows, `evidencia_censo/MANIFESTO_censo_${tsLocal().file}.csv`);
    return rows.length;
  }

  const safeRid = s => (String(s || '').trim() || 'AVULSO').replace(/[^\w.-]+/g, '_');

  return { sleep, tsLocal, sha256, run, fnRestore, captureItem, rowsToCsv, downloadCsv,
           manifestGet, manifestAppend, manifestClear, manifestExport, safeRid, COLS };
})();
