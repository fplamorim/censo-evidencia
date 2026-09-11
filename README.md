# Censo · Evidência

**Extensão local para Chrome que transforma uma página web em evidência auditável para corpora de análise de conteúdo** — PDF de página inteira com rodapé APA, sidecar TXT com metadados e texto, hashes SHA-256 e manifesto CSV.

*A local Chrome extension that turns a web page into auditable evidence for content-analysis corpora — full-page PDF with APA footer, TXT sidecar with metadata and text, SHA-256 hashes and a CSV manifest.* **[English below](#english)**

Idealizado e desenvolvido por **Fernando Paulo Lopes Amorim** — [ORCID 0000-0003-1646-5366](https://orcid.org/0000-0003-1646-5366) · [fernandoamorim.com](https://fernandoamorim.com) · [LinkedIn](https://www.linkedin.com/in/fplamorim/) — CICANT / MeLCi Lab, Universidade Lusófona, com **Claude Cowork (Claude Fable 5.1, Anthropic)**. Licença MIT.

---

## Português

### Para que serve

Quem faz análise de conteúdo, análise de enquadramento ou análise do discurso sobre material online (notícias, comunicados oficiais, sites de embaixadas, blogues) tem um problema de prova: a página pode mudar ou desaparecer, e um júri, um revisor ou um coautor precisa de poder verificar **o que foi analisado, quando, e que o ficheiro não foi alterado depois**.

Esta extensão resolve isso em dois ficheiros por item, mais um manifesto:

| Ficheiro | O que contém |
|---|---|
| `ID_AAAA-MM-DD_HHhMM.pdf` | Página inteira (deslizar e coser), A4, com rodapé em **todas** as páginas: `Retrieved <data-hora, UTC±h> · Record <ID> · Page n of N · from <URL>` — formato de recuperação APA, pronto a citar. |
| `ID_AAAA-MM-DD_HHhMM.txt` | Cabeçalho com metadados (título, `og:title`, site, data de publicação, autor, canonical, idioma), nome e **SHA-256 do PDF**, n.º de páginas; depois `MAIN TEXT` (corpo do artigo), `PAGE TEXT` (texto integral) e `LINKS` (todas as ligações). Permite usar o conteúdo em qualquer ferramenta — CAQDAS, scripts, LLM — sem OCR. |
| `MANIFESTO_censo_….csv` | Uma linha por captura: ID, URL, metadados, data de recuperação, ficheiros, **SHA-256 do PDF e do TXT**, estado. É o registo do corpus. |

Foi construída para o corpus de uma tese de doutoramento em Comunicação (discurso oficial chinês dirigido ao Brasil), mas serve para qualquer corpus web.

### O que NÃO faz

- Não comunica com nenhum servidor. Não recolhe nada. Não é publicada na Chrome Web Store — carrega-se "expandida".
- Não arquiva na Wayback Machine (isso obrigaria a comunicar com um serviço externo). Se quiseres cópia externa, submete o URL à mão em `web.archive.org/save`.
- Não decide o que entra no corpus: a triagem é humana; a extensão só documenta o que decidiste incluir.

### Instalação (1 minuto)

1. Descarrega ou clona este repositório e guarda a pasta `censo-screenshot/` num local permanente.
2. No Chrome: `chrome://extensions` → liga **Modo de programador**.
3. **Carregar expandida** → escolhe a pasta `censo-screenshot/`.
4. Afixa a extensão na barra (ícone de puzzle → pin).

A única permissão fora do normal é `storage`, usada para guardar o manifesto acumulado localmente.

### Uso

**Captura individual** — abre a página, clica na extensão, escreve o ID do registo (ex.: `F1-004`; vazio = `AVULSO`) e **Capturar**. Os ficheiros saem em `Transferências/evidencia_censo/`. Mantém o popup aberto até «concluído».

**Modo fila (lote)** — botão «Abrir modo fila», cola uma linha por item no formato `ID | URL`, **Processar fila**. Não mexas no separador de trabalho. No fim sai `FILA_manifesto_….csv` (só essa corrida, com erros) e `FILA_relatorio_….txt`.

**Manifesto** — cada captura (individual ou em fila) é acrescentada a um manifesto acumulado dentro da extensão. «Exportar manifesto CSV» grava-o; «Limpar manifesto» apaga só a lista, nunca os ficheiros.

### Esquema de IDs

Usa o teu. O ID entra no nome dos ficheiros, no rodapé do PDF, no cabeçalho do TXT e no CSV — e deve ser o mesmo que usas no codebook e nas citações. Exemplos: `F1-004` (fonte 1, item 4), `ACT-2021-10-22` (acto por data), `BR-FOLHA-2019-11-14-003`.

### Hashes e verificação

- O SHA-256 do PDF vai dentro do TXT; o SHA-256 do TXT só pode ir no CSV (um ficheiro não pode conter o próprio hash).
- Qualquer alteração posterior a um ficheiro muda o hash. Isso é a prova de integridade.
- `scripts/manifesto.py` (Python 3, sem dependências) reconstrói o manifesto a partir dos TXT em disco, recalcula os hashes e assinala PDF em falta ou alterado:

```bash
python scripts/manifesto.py caminho/para/evidencia_censo
python scripts/manifesto.py caminho/para/evidencia_censo --verify MANIFESTO_censo_2026-09-11_15h00.csv
```

### Como citar num método

Uma redacção possível para a secção de método:

> Cada documento incluído no corpus foi capturado com a extensão local *Censo · Evidência* v1.5 (Amorim, 2026), que gera um PDF de página inteira com data-hora e URL de recuperação em cada página, um ficheiro de texto com metadados e conteúdo integral, e um manifesto com os hashes SHA-256 de ambos os ficheiros, permitindo verificar a integridade do corpus. O corpus, o manifesto e o codebook estão disponíveis em https://github.com/fplamorim/censo-evidencia.

Ver `CITATION.cff` para a referência. Contacto: via ORCID, [fernandoamorim.com](https://fernandoamorim.com) ou LinkedIn.

### Limitações conhecidas

- Páginas com mais de 30 000 px de altura são truncadas.
- Conteúdo carregado por *scroll* infinito pode não aparecer completo.
- `MAIN TEXT` usa `<article>`/`<main>` ou o bloco com mais parágrafos; em páginas sem estrutura semântica pode falhar — `PAGE TEXT` tem sempre o texto integral.
- Durante a captura o Chrome mostra uma barra amarela («a ser depurado»): é o mecanismo de captura do próprio Chrome.
- Paywalls: a extensão captura o que o teu browser vê; se estás autenticado, captura a versão autenticada.

### Contribuir

*Issues* e *pull requests* são bem-vindos, sobretudo de colegas que trabalhem com análise de conteúdo. Mantém a regra de ouro: **nenhuma comunicação com serviços externos**.

---

## English

### What it does

Researchers doing content, framing or discourse analysis on online material (news, official statements, embassy websites, blogs) face an evidence problem: pages change or vanish, and a jury, reviewer or co-author needs to verify **what was analysed, when, and that the file was not altered afterwards**.

This extension produces two files per item, plus a manifest:

| File | Contents |
|---|---|
| `ID_YYYY-MM-DD_HHhMM.pdf` | Full page (scroll-and-stitch), A4, with a footer on **every** page: `Retrieved <date-time, UTC±h> · Record <ID> · Page n of N · from <URL>` — APA retrieval format, ready to cite. |
| `ID_YYYY-MM-DD_HHhMM.txt` | Header with metadata (title, `og:title`, site, publication date, author, canonical, language), PDF filename and **SHA-256**, page count; then `MAIN TEXT` (article body), `PAGE TEXT` (full text) and `LINKS` (all links). Lets you feed the content to any tool — CAQDAS, scripts, LLMs — without OCR. |
| `MANIFESTO_censo_….csv` | One row per capture: ID, URL, metadata, retrieval time, filenames, **SHA-256 of PDF and TXT**, status. This is the corpus record. |

Built for the corpus of a PhD thesis in Communication (Chinese official discourse addressed to Brazil); usable for any web corpus.

### What it does NOT do

- No network calls. No data collection. Not on the Chrome Web Store — loaded "unpacked".
- No automatic Wayback Machine archiving (that would require contacting an external service). Submit URLs manually at `web.archive.org/save` if you want an external copy.
- No screening: inclusion decisions are human; the extension documents what you decided to include.

### Install (1 minute)

1. Download or clone this repository; keep the `censo-screenshot/` folder somewhere permanent.
2. Chrome: `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select `censo-screenshot/`.
4. Pin the extension (puzzle icon → pin).

The only non-obvious permission is `storage`, used to keep the accumulated manifest locally.

### Use

**Single capture** — open the page, click the extension, type the record ID (e.g. `F1-004`; empty = `AVULSO`), **Capture**. Files land in `Downloads/evidencia_censo/`. Keep the popup open until "concluído".

**Queue mode (batch)** — "Abrir modo fila", paste one line per item as `ID | URL`, **Processar fila**. Leave the working tab alone. At the end you get `FILA_manifesto_….csv` (this run only, including errors) and `FILA_relatorio_….txt`.

**Manifest** — every capture is appended to an accumulated manifest inside the extension. "Exportar manifesto CSV" saves it; "Limpar manifesto" clears the list only, never the files.

The UI is in Portuguese; the workflow is language-independent.

### Hashes and verification

- The PDF's SHA-256 is stored inside the TXT; the TXT's SHA-256 can only live in the CSV (a file cannot contain its own hash).
- Any later change to a file changes its hash — that is the integrity proof.
- `scripts/manifesto.py` (Python 3, standard library only) rebuilds the manifest from the TXT sidecars on disk, recomputes hashes and flags missing or altered PDFs:

```bash
python scripts/manifesto.py path/to/evidencia_censo
python scripts/manifesto.py path/to/evidencia_censo --verify MANIFESTO_censo_2026-09-11_15h00.csv
```

### Citing it in a methods section

> Each document included in the corpus was captured with the local browser extension *Censo · Evidência* v1.5 (Amorim, 2026), which produces a full-page PDF with retrieval date-time and URL on every page, a text file with metadata and full content, and a manifest with SHA-256 hashes of both files, allowing the integrity of the corpus to be verified. Corpus, manifest and codebook are available at https://github.com/fplamorim/censo-evidencia.

See `CITATION.cff`.

### Known limitations

Pages taller than 30,000 px are truncated; infinite-scroll content may be incomplete; `MAIN TEXT` relies on `<article>`/`<main>` or the block with most paragraphs and may fail on unstructured pages (`PAGE TEXT` always has the full text); Chrome shows a yellow "being debugged" bar during capture (Chrome's own capture mechanism); paywalled pages are captured as your browser sees them.

### Contributing

Issues and pull requests welcome, especially from colleagues working in content analysis. Golden rule: **no communication with external services**.

### Credits

Conceived and developed by **Fernando Paulo Lopes Amorim** — [ORCID 0000-0003-1646-5366](https://orcid.org/0000-0003-1646-5366) · [fernandoamorim.com](https://fernandoamorim.com) · [LinkedIn](https://www.linkedin.com/in/fplamorim/) — CICANT / MeLCi Lab, Universidade Lusófona, with **Claude Cowork (Claude Fable 5.1, Anthropic)**. PDF generation by [jsPDF](https://github.com/parallax/jsPDF) (MIT). Licensed under MIT — see `LICENSE`.
