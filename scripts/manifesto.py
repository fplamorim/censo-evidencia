#!/usr/bin/env python3
"""
manifesto.py — Censo · Evidência v1.5.0
Idealizado e desenvolvido por Fernando Paulo Lopes Amorim (ORCID 0000-0003-1646-5366)
com Claude Cowork (Claude Fable 5.1, Anthropic). Licença MIT.

Reconstrói o manifesto CSV a partir dos sidecars TXT gravados pela extensão e
verifica a integridade (SHA-256) dos PDF e TXT em disco.

Uso:
  python manifesto.py <pasta_evidencia>                 -> gera manifesto_verificado.csv na pasta
  python manifesto.py <pasta_evidencia> -o saida.csv    -> nome do CSV de saída
  python manifesto.py <pasta_evidencia> --verify m.csv  -> compara hashes atuais com um manifesto anterior

Sem dependências externas (só biblioteca-padrão).
"""
import argparse, csv, hashlib, sys
from pathlib import Path

HEADER_KEYS = ["AUTHOR_TOOL", "SOURCE", "RECORD", "RETRIEVED", "RETRIEVED_ISO", "URL", "CANONICAL", "TITLE", "OG_TITLE", "SITE",
               "PUBLISHED", "MODIFIED", "AUTHOR", "LANG", "DESCRIPTION", "PDF_FILE", "PDF_SHA256", "PDF_PAGES", "TOOL"]  # AUTHOR_TOOL/SOURCE são só crédito
COLS = ["record_id", "url", "canonical_url", "title", "og_title", "site", "published", "author", "lang",
        "retrieved_iso", "retrieved_human", "pages", "pdf_file", "txt_file",
        "sha256_pdf_declarado", "sha256_pdf_disco", "sha256_txt_disco", "pdf_ok", "status", "nota"]


def sha256_file(p: Path) -> str:
    h = hashlib.sha256()
    with p.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_header(txt_path: Path) -> dict:
    """Lê só o cabeçalho (até à primeira linha em branco) do sidecar."""
    meta = {}
    with txt_path.open("r", encoding="utf-8", errors="replace") as f:
        for line in f:
            line = line.rstrip("\n")
            if not line.strip():
                break
            if ":" in line:
                k, v = line.split(":", 1)
                k = k.strip()
                if k in HEADER_KEYS:
                    meta[k] = v.strip()
    return meta


def build(folder: Path, out: Path) -> int:
    rows, problems = [], 0
    txts = sorted(p for p in folder.glob("*.txt") if not p.name.startswith(("FILA_", "MANIFESTO_")))
    if not txts:
        print(f"Nenhum sidecar .txt encontrado em {folder}", file=sys.stderr)
        return 1
    for txt in txts:
        m = parse_header(txt)
        row = {c: "" for c in COLS}
        row.update({
            "record_id": m.get("RECORD", ""), "url": m.get("URL", ""), "canonical_url": m.get("CANONICAL", ""),
            "title": m.get("TITLE", ""), "og_title": m.get("OG_TITLE", ""), "site": m.get("SITE", ""),
            "published": m.get("PUBLISHED", ""), "author": m.get("AUTHOR", ""), "lang": m.get("LANG", ""),
            "retrieved_iso": m.get("RETRIEVED_ISO", ""), "retrieved_human": m.get("RETRIEVED", ""),
            "pages": m.get("PDF_PAGES", ""), "txt_file": txt.name,
            "sha256_pdf_declarado": m.get("PDF_SHA256", ""),
        })
        row["sha256_txt_disco"] = sha256_file(txt)
        if not m:
            row["status"] = "SEM_CABECALHO"; row["nota"] = "sidecar de versão anterior (v1.4) — sem metadados/hash"
        pdf_name = m.get("PDF_FILE") or txt.with_suffix(".pdf").name
        pdf = folder / pdf_name
        row["pdf_file"] = pdf_name
        if pdf.exists():
            row["sha256_pdf_disco"] = sha256_file(pdf)
            if row["sha256_pdf_declarado"]:
                ok = row["sha256_pdf_disco"] == row["sha256_pdf_declarado"]
                row["pdf_ok"] = "SIM" if ok else "NAO"
                if not ok:
                    row["status"] = "HASH_DIVERGENTE"; row["nota"] = "PDF alterado depois da captura"; problems += 1
            else:
                row["pdf_ok"] = "N/A"
        else:
            row["status"] = "PDF_EM_FALTA"; row["nota"] = f"não encontrado: {pdf_name}"; problems += 1
        if not row["status"]:
            row["status"] = "OK"
        rows.append(row)

    with out.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=COLS)
        w.writeheader(); w.writerows(rows)
    print(f"{len(rows)} registos → {out}  ({problems} problema(s))")
    for r in rows:
        if r["status"] != "OK":
            print(f"  [{r['status']}] {r['record_id']} — {r['nota']}")
    return 0


def verify(folder: Path, manifest: Path) -> int:
    """Recalcula os hashes atuais e compara com um manifesto anterior (da extensão ou deste script)."""
    diffs = 0
    with manifest.open("r", encoding="utf-8-sig", newline="") as f:
        for r in csv.DictReader(f):
            if r.get("status") not in ("OK", None, ""):
                continue
            checks = [("pdf_file", r.get("sha256_pdf") or r.get("sha256_pdf_disco")),
                      ("txt_file", r.get("sha256_txt") or r.get("sha256_txt_disco"))]
            for key, expected in checks:
                name = r.get(key, "")
                if not name or not expected:
                    continue
                p = folder / name
                if not p.exists():
                    print(f"  [EM_FALTA] {r.get('record_id')} — {name}"); diffs += 1; continue
                actual = sha256_file(p)
                if actual != expected:
                    print(f"  [ALTERADO] {r.get('record_id')} — {name}"); diffs += 1
    print("Verificação concluída: " + ("tudo íntegro." if diffs == 0 else f"{diffs} diferença(s)."))
    return 0 if diffs == 0 else 2


def main() -> int:
    ap = argparse.ArgumentParser(description="Manifesto e verificação de integridade — Censo · Evidência")
    ap.add_argument("pasta", help="pasta evidencia_censo (PDF + TXT)")
    ap.add_argument("-o", "--out", default="manifesto_verificado.csv", help="CSV de saída (dentro da pasta)")
    ap.add_argument("--verify", metavar="CSV", help="verificar hashes contra um manifesto anterior")
    a = ap.parse_args()
    folder = Path(a.pasta).expanduser().resolve()
    if not folder.is_dir():
        print(f"Pasta não encontrada: {folder}", file=sys.stderr); return 1
    if a.verify:
        return verify(folder, Path(a.verify).expanduser().resolve())
    return build(folder, folder / a.out)


if __name__ == "__main__":
    sys.exit(main())
