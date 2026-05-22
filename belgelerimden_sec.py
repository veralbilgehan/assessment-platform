#!/usr/bin/env python3
"""Belgelerimden Seç — Assessment Platform → NotebookLM entegrasyon scripti.

Assessment platformundaki kaydedilmiş belgelerinizi seçip Google NotebookLM'e
kaynak olarak ekler.

Önkoşullar:
    pip install "notebooklm-py[browser]" && playwright install chromium
    notebooklm login   # Önce Google hesabınızla giriş yapın

Kullanım:
    python belgelerimden_sec.py
    python belgelerimden_sec.py --api-url http://localhost:3001 --token JWT_TOKEN
    python belgelerimden_sec.py --notebook-id mevcut-notebook-id
"""

from __future__ import annotations

import asyncio
import os
import sys
from typing import Any

import httpx

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.prompt import Confirm, IntPrompt, Prompt
    from rich.table import Table
    from rich import print as rprint
except ImportError:
    print("rich kütüphanesi eksik. Lütfen çalıştırın: pip install rich")
    sys.exit(1)

try:
    from notebooklm import NotebookLMClient
except ImportError:
    print("notebooklm-py kütüphanesi eksik. Lütfen çalıştırın: pip install 'notebooklm-py[browser]'")
    sys.exit(1)

console = Console()

# ── Yapılandırma ──────────────────────────────────────────────────────────────
DEFAULT_API_URL = os.environ.get(
    "ASSESSMENT_API_URL",
    "https://assessment-platform-service-1054806280226.europe-west1.run.app",
)
DEFAULT_TOKEN = os.environ.get("ASSESSMENT_TOKEN", "")


# ── Assessment Platform API ───────────────────────────────────────────────────

async def belgeler_listesi_al(api_url: str, token: str) -> list[dict[str, Any]]:
    """Assessment platformundan belge listesini çeker."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{api_url}/api/belgeler", headers=headers)
        r.raise_for_status()
        data = r.json()
        # API { belgeler: [...] } veya doğrudan [...] döndürebilir
        if isinstance(data, list):
            return data
        return data.get("belgeler", data.get("data", []))


async def belge_detay_al(api_url: str, token: str, belge_id: int) -> dict[str, Any]:
    """Tek belgenin tam içeriğini (icerik alanı dahil) çeker."""
    headers = {"Authorization": f"Bearer {token}"} if token else {}
    async with httpx.AsyncClient(timeout=30.0) as client:
        r = await client.get(f"{api_url}/api/belgeler/{belge_id}", headers=headers)
        r.raise_for_status()
        return r.json()


async def giris_yap(api_url: str, eposta: str, sifre: str) -> str:
    """Assessment platformuna giriş yapıp JWT token döndürür."""
    async with httpx.AsyncClient(timeout=15.0) as client:
        r = await client.post(
            f"{api_url}/api/auth/giris",
            json={"eposta": eposta, "sifre": sifre},
        )
        r.raise_for_status()
        data = r.json()
        return data.get("token", data.get("accessToken", ""))


# ── Yardımcı fonksiyonlar ─────────────────────────────────────────────────────

def belge_icerik_ozet(belge: dict[str, Any]) -> str:
    """Belgenin NotebookLM kaynağı olarak kullanılacak metin içeriğini oluşturur."""
    parcalar: list[str] = []

    baslik = belge.get("orijinal_ad") or belge.get("ai_konu") or "Belge"
    parcalar.append(f"# {baslik}\n")

    konu = belge.get("ai_konu")
    if konu:
        parcalar.append(f"**Konu:** {konu}\n")

    bilgiler = belge.get("ai_bilgi")
    if bilgiler:
        if isinstance(bilgiler, list):
            parcalar.append("**Önemli Bilgiler:**")
            for b in bilgiler:
                parcalar.append(f"- {b}")
            parcalar.append("")
        elif isinstance(bilgiler, str):
            parcalar.append(f"**Önemli Bilgiler:** {bilgiler}\n")

    makale = belge.get("ai_makale")
    if makale:
        parcalar.append("---\n")
        parcalar.append(makale)

    icerik = belge.get("icerik")
    if icerik and not makale:
        # Yalnızca makale yoksa ham içeriği ekle (ham metin çok büyük olabilir)
        parcalar.append("---\n")
        parcalar.append(str(icerik)[:15000])  # NotebookLM metin kaynağı sınırı

    return "\n".join(parcalar)


def belgeler_tablosu_goster(belgeler: list[dict[str, Any]]) -> None:
    """Belge listesini renkli tablo olarak gösterir."""
    tablo = Table(title="📚 Belgelerim", show_header=True, header_style="bold cyan")
    tablo.add_column("#", style="dim", width=4)
    tablo.add_column("Ad", min_width=25)
    tablo.add_column("Konu", min_width=20)
    tablo.add_column("Tür", width=12)
    tablo.add_column("Tarih", width=16)

    for i, b in enumerate(belgeler, 1):
        ad = (b.get("orijinal_ad") or "—")[:40]
        konu = (b.get("ai_konu") or "—")[:35]
        tur = (b.get("mime_type") or "—").split("/")[-1][:12]
        tarih = str(b.get("olusturma") or "")[:16]
        tablo.add_row(str(i), ad, konu, tur, tarih)

    console.print(tablo)


def secim_parse(secim_str: str, toplam: int) -> list[int]:
    """'1,3,5-7' gibi bir seçim dizesini indeks listesine çevirir (0-tabanlı)."""
    indeksler: set[int] = set()
    for parca in secim_str.split(","):
        parca = parca.strip()
        if "-" in parca:
            baslangic, bitis = parca.split("-", 1)
            for i in range(int(baslangic), int(bitis) + 1):
                if 1 <= i <= toplam:
                    indeksler.add(i - 1)
        else:
            try:
                i = int(parca)
                if 1 <= i <= toplam:
                    indeksler.add(i - 1)
            except ValueError:
                pass
    return sorted(indeksler)


# ── Ana iş akışı ──────────────────────────────────────────────────────────────

async def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(
        description="Assessment platformu belgelerini NotebookLM'e ekle",
    )
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Assessment platform URL")
    parser.add_argument("--token", default=DEFAULT_TOKEN, help="JWT auth token")
    parser.add_argument("--notebook-id", default="", help="Mevcut notebook ID (bos=yeni olustur)")
    parser.add_argument("--notebook-title", default="", help="Yeni notebook basligi")
    args = parser.parse_args()

    console.print(Panel.fit(
        "[bold cyan]Belgelerimden Seç[/bold cyan]\n"
        "[dim]Assessment Platform → Google NotebookLM[/dim]",
        border_style="cyan",
    ))

    api_url: str = args.api_url
    token: str = args.token

    # ── 1. Kimlik doğrulama ────────────────────────────────────────────────────
    if not token:
        console.print("\n[yellow]Assessment Platform girişi gerekli[/yellow]")
        eposta = Prompt.ask("  E-posta")
        sifre = Prompt.ask("  Şifre", password=True)
        try:
            token = await giris_yap(api_url, eposta, sifre)
            console.print("  [green]✓ Giriş başarılı[/green]")
        except httpx.HTTPStatusError as e:
            console.print(f"  [red]✗ Giriş başarısız: {e.response.status_code}[/red]")
            sys.exit(1)
        except Exception as e:
            console.print(f"  [red]✗ Bağlantı hatası: {e}[/red]")
            console.print(f"  [dim]API URL: {api_url}[/dim]")
            sys.exit(1)

    # ── 2. Belgeleri listele ───────────────────────────────────────────────────
    console.print("\n[cyan]Belgeler yükleniyor...[/cyan]")
    try:
        belgeler = await belgeler_listesi_al(api_url, token)
    except httpx.HTTPStatusError as e:
        if e.response.status_code == 401:
            console.print("[red]✗ Oturum süresi dolmuş — lütfen tekrar giriş yapın veya --token ile token verin[/red]")
        else:
            console.print(f"[red]✗ Belgeler alınamadı: {e}[/red]")
        sys.exit(1)
    except Exception as e:
        console.print(f"[red]✗ Bağlantı hatası: {e}[/red]")
        sys.exit(1)

    if not belgeler:
        console.print("[yellow]⚠ Hiç belge bulunamadı. Önce belge ekleyin.[/yellow]")
        sys.exit(0)

    console.print(f"  [green]✓ {len(belgeler)} belge bulundu[/green]\n")
    belgeler_tablosu_goster(belgeler)

    # ── 3. Belge seçimi ────────────────────────────────────────────────────────
    console.print(
        "\n[bold]Eklenecek belgeleri seçin[/bold] "
        "[dim](örn: 1,3,5  veya  2-5  veya  tümü)[/dim]"
    )
    secim_str = Prompt.ask("  Seçim", default="tümü")

    if secim_str.strip().lower() in ("tümü", "hepsi", "all", "tumü", "tumu"):
        secilen_indeksler = list(range(len(belgeler)))
    else:
        secilen_indeksler = secim_parse(secim_str, len(belgeler))

    if not secilen_indeksler:
        console.print("[red]✗ Geçerli seçim yapılmadı[/red]")
        sys.exit(1)

    secilen = [belgeler[i] for i in secilen_indeksler]
    console.print(f"\n  [green]✓ {len(secilen)} belge seçildi:[/green]")
    for b in secilen:
        console.print(f"    • {b.get('orijinal_ad') or b.get('ai_konu') or 'Belge'}")

    # ── 4. Notebook seçimi / oluşturma ─────────────────────────────────────────
    notebook_id: str = args.notebook_id
    notebook_title: str = args.notebook_title

    async with await NotebookLMClient.from_storage() as client:
        if not notebook_id:
            if not notebook_title:
                ilk_konu = secilen[0].get("ai_konu") or secilen[0].get("orijinal_ad") or "Belgelerim"
                varsayilan_baslik = f"Assessment – {ilk_konu}"
                notebook_title = Prompt.ask(
                    "\n  Notebook başlığı",
                    default=varsayilan_baslik,
                )
            console.print(f"\n[cyan]'{notebook_title}' notebook oluşturuluyor...[/cyan]")
            nb = await client.notebooks.create(notebook_title)
            notebook_id = nb.id
            console.print(f"  [green]✓ Oluşturuldu: {nb.id}[/green]")
        else:
            console.print(f"\n[cyan]Mevcut notebook kullanılıyor: {notebook_id}[/cyan]")

        # ── 5. Tam içerikleri çek ve kaynak olarak ekle ────────────────────────
        basarili: list[str] = []
        basarisiz: list[str] = []

        console.print(f"\n[cyan]Kaynaklar NotebookLM'e ekleniyor ({len(secilen)} belge)...[/cyan]")

        for belge in secilen:
            belge_id = belge.get("id")
            belge_adi = belge.get("orijinal_ad") or belge.get("ai_konu") or f"Belge-{belge_id}"

            try:
                # Tam içeriği (icerik, ai_makale vs.) al
                console.print(f"  → [dim]{belge_adi}[/dim] içeriği yükleniyor...", end="")
                tam_belge = await belge_detay_al(api_url, token, belge_id)
                metin = belge_icerik_ozet(tam_belge)

                if not metin.strip():
                    console.print(" [yellow]⚠ İçerik boş, atlandı[/yellow]")
                    basarisiz.append(f"{belge_adi} (boş içerik)")
                    continue

                console.print(" ekleniyor...", end="")
                kaynak = await client.sources.add_text(
                    notebook_id,
                    belge_adi[:100],  # NotebookLM başlık uzunluk sınırı
                    metin,
                )
                console.print(f" [green]✓[/green]")
                basarili.append(kaynak.title or belge_adi)

            except httpx.HTTPError as e:
                console.print(f" [red]✗ API hatası: {e}[/red]")
                basarisiz.append(f"{belge_adi} (API hatası)")
            except Exception as e:
                console.print(f" [red]✗ {type(e).__name__}: {e}[/red]")
                basarisiz.append(f"{belge_adi} ({type(e).__name__})")

        # ── 6. Özet ───────────────────────────────────────────────────────────
        console.print("\n" + "─" * 50)
        console.print(f"[bold green]✓ Başarılı:[/bold green] {len(basarili)}")
        if basarisiz:
            console.print(f"[bold red]✗ Başarısız:[/bold red] {len(basarisiz)}")
            for item in basarisiz:
                console.print(f"  • {item}")

        nb_url = f"https://notebooklm.google.com/notebook/{notebook_id}"
        console.print(
            f"\n[bold cyan]📓 Notebook:[/bold cyan] [link={nb_url}]{nb_url}[/link]"
        )
        console.print(
            "\n[dim]İpucu: NotebookLM'de kaynaklar işlendikten sonra "
            "soru sorabilir, podcast oluşturabilirsiniz.[/dim]"
        )


if __name__ == "__main__":
    asyncio.run(main())
