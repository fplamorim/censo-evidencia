# Changelog

## 1.5.0 — 2026-09-11
- SHA-256 do PDF no cabeçalho do TXT; SHA-256 do PDF e do TXT no manifesto CSV.
- Metadados da página no cabeçalho do TXT (título, og:title, site, data de publicação, autor, canonical, idioma), com fallback a JSON-LD.
- Bloco `MAIN TEXT` (corpo do artigo) antes do `PAGE TEXT`.
- Manifesto acumulado (popup + fila) com exportação CSV; CSV por corrida da fila.
- `scripts/manifesto.py`: reconstrução e verificação do manifesto a partir dos ficheiros em disco.
- Código de captura partilhado em `common.js`. Créditos no manifest e no TXT.

## 1.4 — 2026-08
- Modo fila (`ID | URL`) com relatório.
- Sidecar TXT com texto e ligações.

## 1.1 — 2026-08
- Captura por deslizar-e-coser sem debugger; rodapé APA em todas as páginas.
