"""Record short continuous-action demos for hub tools."""

from __future__ import annotations

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright


def dismiss_jupyter(page) -> None:
    for _ in range(6):
        for label in ("Select", "OK", "Continue", "Dismiss", "Got it", "Close", "No", "Yes"):
            btn = page.locator(
                f'.jp-Dialog-buttonLabel:has-text("{label}"), '
                f'.jp-Notification-button:has-text("{label}"), '
                f'button:has-text("{label}")'
            )
            if btn.count():
                try:
                    btn.first.click(timeout=800)
                    page.wait_for_timeout(250)
                except Exception:
                    pass
        dialog = page.locator("dialog.jp-Dialog, .jp-Dialog")
        if dialog.count() == 0:
            break
        page.keyboard.press("Escape")
        page.wait_for_timeout(200)


def record_context(out: Path, width: int, height: int):
    out.parent.mkdir(parents=True, exist_ok=True)
    video_dir = out.parent / "_pw_videos"
    video_dir.mkdir(parents=True, exist_ok=True)
    p = sync_playwright().start()
    browser = p.chromium.launch(headless=True)
    context = browser.new_context(
        viewport={"width": width, "height": height},
        record_video_dir=str(video_dir),
        record_video_size={"width": width, "height": height},
    )
    page = context.new_page()
    return p, browser, context, page


def finalize(page, context, browser, p, out: Path) -> None:
    video_path = Path(page.video.path())
    context.close()
    browser.close()
    p.stop()
    final = out if out.suffix else out.with_suffix(".webm")
    if final.exists():
        final.unlink()
    video_path.replace(final)
    print(f"Wrote {final}")


def record_jupyter(url: str, out: Path, width: int, height: int) -> None:
    p, browser, context, page = record_context(out, width, height)
    page.add_init_script(
        """
        window.localStorage.setItem('jupyterlab-news-optout', 'true');
        window.localStorage.setItem(
          '@jupyterlab/apputils-extension:notification.doNotDisturbMode', 'true'
        );
        """
    )
    page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    page.wait_for_timeout(2500)
    dismiss_jupyter(page)

    if page.locator('.lm-TabBar-tabLabel:has-text("cal-icor-notebook-demo")').count() == 0:
        item = page.locator('.jp-DirListing-itemText:has-text("cal-icor-notebook-demo")')
        if item.count():
            item.first.dblclick()
            page.wait_for_timeout(1800)
            dismiss_jupyter(page)

    select_btn = page.locator(
        '.jp-Dialog-footer button.jp-mod-accept, button:has-text("Select")'
    )
    if select_btn.count():
        try:
            select_btn.first.click(timeout=2500)
            page.wait_for_timeout(900)
        except Exception:
            pass
    dismiss_jupyter(page)
    page.locator(".jp-Cell").first.wait_for(state="visible", timeout=30000)

    def focus_run(index: int) -> None:
        cell = page.locator(".jp-Notebook .jp-Cell").nth(index)
        box = cell.bounding_box()
        if box:
            page.mouse.click(box["x"] + 40, box["y"] + 22)
        else:
            cell.click()
        page.wait_for_timeout(250)
        page.keyboard.press("Escape")
        page.wait_for_timeout(120)
        page.keyboard.press("Enter")
        page.wait_for_timeout(180)
        page.keyboard.press("Shift+Enter")
        page.wait_for_timeout(1300)

    focus_run(1)
    dismiss_jupyter(page)
    focus_run(2)
    page.mouse.move(width // 2 + 80, height // 2)
    for _ in range(4):
        page.mouse.wheel(0, 160)
        page.wait_for_timeout(260)
    focus_run(3)
    for _ in range(3):
        page.mouse.wheel(0, -140)
        page.wait_for_timeout(220)
    page.wait_for_timeout(800)
    finalize(page, context, browser, p, out)


def record_vscode(url: str, out: Path, width: int, height: int) -> None:
    p, browser, context, page = record_context(out, width, height)
    page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    page.wait_for_timeout(2500)

    pw = page.locator('input[type="password"], input[name="password"]')
    if pw.count():
        pw.fill("calicor")
        submit = page.locator('button[type="submit"], input[type="submit"], button:has-text("Submit")')
        if submit.count():
            submit.first.click()
        else:
            page.keyboard.press("Enter")
        page.wait_for_timeout(4500)

    for sel in (
        'a:has-text("Yes, I trust the authors")',
        'button:has-text("Yes, I trust the authors")',
        'a:has-text("Trust")',
        'button:has-text("Trust")',
    ):
        btn = page.locator(sel)
        if btn.count():
            try:
                btn.first.click(timeout=2000, force=True)
                page.wait_for_timeout(800)
            except Exception:
                pass

    # Open demo file via quick open (most reliable in code-server)
    page.keyboard.press("Control+p")
    page.wait_for_timeout(600)
    page.keyboard.type("demo.py", delay=70)
    page.wait_for_timeout(400)
    page.keyboard.press("Enter")
    page.wait_for_timeout(1200)

    editor = page.locator(".monaco-editor").first
    if editor.count():
        box = editor.bounding_box()
        if box:
            page.mouse.click(box["x"] + 120, box["y"] + 60)
    page.wait_for_timeout(300)
    page.keyboard.press("Control+End")
    page.wait_for_timeout(200)
    page.keyboard.type("\n\nprint('Cal-ICOR VS Code demo')\n", delay=45)
    page.wait_for_timeout(400)
    page.keyboard.press("Control+s")
    page.wait_for_timeout(500)

    for _ in range(4):
        page.mouse.wheel(0, 120)
        page.wait_for_timeout(220)
    for _ in range(3):
        page.mouse.wheel(0, -100)
        page.wait_for_timeout(200)
    page.wait_for_timeout(800)
    finalize(page, context, browser, p, out)


def record_rstudio(url: str, out: Path, width: int, height: int) -> None:
    p, browser, context, page = record_context(out, width, height)
    page.goto(url, wait_until="domcontentloaded", timeout=180_000)
    page.wait_for_timeout(2500)

    # Login form for rocker/rstudio default
    user = page.locator('input[name="username"], #username')
    pw = page.locator('input[name="password"], #password')
    if user.count() and pw.count():
        user.fill("rstudio")
        pw.fill("calicor")
        page.locator('button[type="submit"], input[type="submit"]').first.click()
        page.wait_for_timeout(5000)

    # Focus console / source and type R code
    page.mouse.click(width * 0.35, height * 0.35)
    page.wait_for_timeout(400)
    page.keyboard.type(
        "enrollment <- data.frame(campus=c('CCC','CSU','UC'), students_k=c(1800,460,290))\n"
        "enrollment\n"
        "barplot(enrollment$students_k, names.arg=enrollment$campus, col='#75AADB', main='Enrollment')\n",
        delay=35,
    )
    page.wait_for_timeout(2500)
    page.mouse.move(width * 0.7, height * 0.55)
    for _ in range(4):
        page.mouse.wheel(0, 140)
        page.wait_for_timeout(240)
    page.wait_for_timeout(900)
    finalize(page, context, browser, p, out)


def record_sagemath(url: str, out: Path, width: int, height: int) -> None:
    p, browser, context, page = record_context(out, width, height)
    page.goto(url, wait_until="domcontentloaded", timeout=120_000)
    page.wait_for_timeout(3000)

    # SageCell uses CodeMirror; click the visible editor surface
    cm = page.locator(".CodeMirror-scroll, .CodeMirror").first
    cm.wait_for(state="visible", timeout=30000)
    box = cm.bounding_box()
    if box:
        page.mouse.click(box["x"] + 48, box["y"] + 36)
    else:
        cm.click(force=True)
    page.wait_for_timeout(400)
    page.keyboard.press("Control+a")
    page.wait_for_timeout(150)
    page.keyboard.type(
        "x = var('x')\n"
        "f = x^3 - 3*x + 1\n"
        "show(plot(f, (x, -2.5, 2.5), color='green', thickness=2))\n"
        "solve(f == 0, x)\n",
        delay=40,
    )
    page.wait_for_timeout(400)
    eval_btn = page.locator(".sagecell_evalButton, button:has-text('Evaluate')")
    if eval_btn.count():
        eval_btn.first.click()
    else:
        page.keyboard.press("Shift+Enter")
    page.wait_for_timeout(5500)
    page.mouse.move(width // 2, int(height * 0.65))
    for _ in range(4):
        page.mouse.wheel(0, 140)
        page.wait_for_timeout(250)
    page.wait_for_timeout(900)
    finalize(page, context, browser, p, out)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--tool", required=True, choices=["jupyter", "vscode", "rstudio", "sagemath"])
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", type=Path, required=True)
    parser.add_argument("--width", type=int, default=960)
    parser.add_argument("--height", type=int, default=540)
    args = parser.parse_args()
    {
        "jupyter": record_jupyter,
        "vscode": record_vscode,
        "rstudio": record_rstudio,
        "sagemath": record_sagemath,
    }[args.tool](args.url, args.out, args.width, args.height)


if __name__ == "__main__":
    main()
