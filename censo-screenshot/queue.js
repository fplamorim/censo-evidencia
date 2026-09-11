// Censo · Evidência v1.5 — modo fila: navega, captura, grava PDF+TXT por item, CSV no fim, sem parar em erros.
let stopFlag = false;
const $ = id => document.getElementById(id);
const log = (m, cls) => { const d = document.createElement('div'); if (cls) d.className = cls; d.textContent = m; $('log').appendChild(d); $('log').scrollTop = 1e9; };
const prog = m => { $('prog').textContent = m; document.title = m; };

function waitLoaded(tabId, timeoutMs) {
  return new Promise((resolve) => {
    let done = false;
    const to = setTimeout(() => { if (!done) { done = true; cleanup(); resolve('timeout'); } }, timeoutMs);
    function listener(id, info) { if (id === tabId && info.status === 'complete' && !done) { done = true; cleanup(); resolve('ok'); } }
    function cleanup() { clearTimeout(to); chrome.tabs.onUpdated.removeListener(listener); }
    chrome.tabs.onUpdated.addListener(listener);
    chrome.tabs.get(tabId).then(t => { if (t.status === 'complete' && !done) { done = true; cleanup(); resolve('ok'); } }).catch(() => {});
  });
}

$('stop').addEventListener('click', () => { stopFlag = true; $('stop').disabled = true; log('Paragem pedida: termina o item atual e para.'); });

$('go').addEventListener('click', async () => {
  const items = $('lista').value.split('\n').map(l => l.trim()).filter(l => l && l.includes('|')).map(l => {
    const [rid, ...rest] = l.split('|');
    return { rid: CENSO.safeRid(rid), url: rest.join('|').trim() };
  }).filter(x => /^https?:/.test(x.url));
  if (!items.length) { prog('Cola primeiro a lista (ID | URL).'); return; }
  $('go').disabled = true; $('stop').disabled = false; stopFlag = false;
  $('log').textContent = '';

  const work = await chrome.tabs.create({ url: 'about:blank', active: true });
  const rows = [];
  for (let i = 0; i < items.length; i++) {
    if (stopFlag) break;
    const { rid, url } = items[i];
    prog(`(${i + 1}/${items.length}) ${rid}`);
    try {
      await chrome.tabs.update(work.id, { url, active: true });
      const load = await waitLoaded(work.id, 25000);
      await CENSO.sleep(load === 'ok' ? 1500 : 500);
      const tab = await chrome.tabs.get(work.id);
      const row = await CENSO.captureItem(tab, rid, url, (a, b) => prog(`(${i + 1}/${items.length}) ${rid} · fatia ${a}/${b}`));
      rows.push(row);
      await CENSO.manifestAppend(row);
      log(`OK    ${rid} (${row.pages} pág.)  sha256(pdf)=${row.sha256_pdf.slice(0, 12)}…`, 'ok');
    } catch (e) {
      const t = CENSO.tsLocal();
      rows.push({ record_id: rid, url, retrieved_iso: t.iso, retrieved_human: t.human, status: 'ERRO', error: e.message });
      log(`ERRO  ${rid} :: ${e.message}`, 'err');
    }
    await CENSO.sleep(2000);   // cortesia com o servidor
  }

  const t = CENSO.tsLocal();
  const nOk = rows.filter(r => r.status === 'OK').length, nErr = rows.length - nOk;
  await CENSO.downloadCsv(rows, `evidencia_censo/FILA_manifesto_${t.file}.csv`);
  const rel = `FILA DE CAPTURAS · ${t.human}\nItens: ${items.length} · OK: ${nOk} · Erros: ${nErr}${stopFlag ? ' · INTERROMPIDA' : ''}\n\n` +
    rows.map(r => r.status === 'OK' ? `OK    ${r.record_id} (${r.pages} pág.) ${r.url}` : `ERRO  ${r.record_id} :: ${r.error} :: ${r.url}`).join('\n') + '\n';
  await chrome.downloads.download({ url: URL.createObjectURL(new Blob([rel], { type: 'text/plain;charset=utf-8' })), filename: `evidencia_censo/FILA_relatorio_${t.file}.txt`, saveAs: false });
  try { await chrome.tabs.remove(work.id); } catch (e) {}
  prog(`Fila terminada: ${nOk}/${items.length} com sucesso. CSV e relatório gravados.`);
  $('go').disabled = false; $('stop').disabled = true;
});
