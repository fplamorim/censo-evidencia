// Censo · Evidência v1.5 — popup (captura individual)
const st = (m, cls) => { const el = document.getElementById('st'); el.textContent = m; el.className = cls || ''; };
const cnt = async () => { const n = (await CENSO.manifestGet()).length; document.getElementById('cnt').textContent = `Manifesto acumulado: ${n} captura${n === 1 ? '' : 's'}.`; };
cnt();

document.getElementById('go').addEventListener('click', async () => {
  const btn = document.getElementById('go'); btn.disabled = true;
  const rid = CENSO.safeRid(document.getElementById('rid').value);
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !/^https?:/.test(tab.url || '')) { st('Abre primeiro a página a capturar.', 'err'); btn.disabled = false; return; }
  try {
    const row = await CENSO.captureItem(tab, rid, tab.url, (i, n) => st(`A capturar… fatia ${i}/${n}`));
    const total = await CENSO.manifestAppend(row);
    st(`Concluído: ${row.pdf_file} (${row.pages} pág.) + ${row.txt_file}. Manifesto: ${total} registos.`, 'ok');
    cnt();
  } catch (e) {
    try { await CENSO.run(tab.id, CENSO.fnRestore, [0]); } catch (_) {}
    st('Erro: ' + e.message, 'err');
  }
  btn.disabled = false;
});

document.getElementById('fila').addEventListener('click', () => chrome.tabs.create({ url: chrome.runtime.getURL('queue.html') }));

document.getElementById('export').addEventListener('click', async () => {
  try { const n = await CENSO.manifestExport(); st(`Manifesto exportado (${n} registos) para Transferências/evidencia_censo/.`, 'ok'); }
  catch (e) { st('Erro ao exportar: ' + e.message, 'err'); }
});

document.getElementById('clear').addEventListener('click', async () => {
  const n = (await CENSO.manifestGet()).length;
  if (!n) { st('O manifesto já está vazio.'); return; }
  if (!confirm(`Apagar o manifesto acumulado (${n} registos)? Os PDF/TXT já gravados não são afetados. Exporta primeiro se ainda não o fizeste.`)) return;
  await CENSO.manifestClear(); st('Manifesto limpo.', 'ok'); cnt();
});
