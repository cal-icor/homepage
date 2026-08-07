"""
Record a muted looping JupyterLab notebook demo with continuous actions.

Usage:
  python record_jupyter_demo.py --url "http://127.0.0.1:8888/lab?token=..." --out raw.webm
"""

from __future__ import annotations

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright


def dismiss_dialogs(page) -> None:
    for _ in range(8):
        dialog = page.locator("dialog.jp-Dialog, .jp-Dialog")
        if dialog.count() == 0:
            break
        clicked = False
        for label in ("Select", "OK", "Continue", "Dismiss", "Got it", "Close", "Yes", "No"):
            btn = page.locator(
                f'.jp-Dialog-buttonLabel:has-text("{label}"), button:has-text("{label}")'
            )
            if btn.count():
                try:
                    btn.first.click(timeout=1500)
                    clicked = True
                    page.wait_for_timeout(400)
                    break
                except Exception:
                    pass
        if not clicked:
            page.keyboard.press("Escape")
            page.wait_for_timeout(300)


def dismiss_toasts(page) -> None:
    for _ in range(4):
        clicked = False
        for label in ("No", "Dismiss", "Close"):
            toast_btn = page.locator(
                f'.jp-Notification-button:has-text("{label}"), '
                f'.jp-toast-button:has-text("{label}"), '
                f'button:has-text("{label}")'
            )
            if toast_btn.count():
                try:
                    toast_btn.first.click(timeout=800)
                    clicked = True
                    page.wait_for_timeout(300)
                except Exception:
                    pass
        if not clicked:
            break


def focus_cell(page, index: int) -> None:
    cells = page.locator(".jp-Notebook .jp-Cell")
    box = cells.nth(index).bounding_box()
    if box:
        page.mouse.move(box["x"] + 36, box["y"] + 20)
        page.wait_for_timeout(180)
        page.mouse.click(box["x"] + 36, box["y"] + 20)
    else:
        cells.nth(index).click(position={"x": 40, "y": 24})
    page.wait_for_timeout(300)
    page.keyboard.press("Escape")
    page.wait_for_timeout(150)
    page.keyboard.press("Enter")
    page.wait_for_timeout(220)


def run_cell(page) -> None:
    page.keyboard.press("Shift+Enter")
    page.wait_for_timeout(1500)


def scroll_notebook(page, width: int, height: int, delta: int, steps: int) -> None:
    page.mouse.move(width // 2 + 100, height // 2)
    for _ in range(steps):
        page.mouse.wheel(0, delta)
        page.wait_for_timeout(260)


def run(url: str, out: Path, width: int, height: int) -> None:
    out.parent.mkdir(parents=True, exist_ok=True)
    video_dir = out.parent / "_pw_videos"
    video_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            viewport={"width": width, "height": height},
            record_video_dir=str(video_dir),
            record_video_size={"width": width, "height": height},
        )
        page = context.new_page()
        page.add_init_script(
            """
            window.localStorage.setItem('jupyterlab-news-optout', 'true');
            window.localStorage.setItem(
              '@jupyterlab/apputils-extension:notification.doNotDisturbMode',
              'true'
            );
            """
        )
        page.goto(url, wait_until="domcontentloaded", timeout=120_000)
        page.wait_for_timeout(2800)
        dismiss_toasts(page)
        dismiss_dialogs(page)

        notebook_tab = page.locator('.lm-TabBar-tabLabel:has-text("cal-icor-notebook-demo")')
        if notebook_tab.count() == 0:
            file_item = page.locator('.jp-DirListing-itemText:has-text("cal-icor-notebook-demo")')
            if file_item.count():
                file_item.first.dblclick()
                page.wait_for_timeout(2000)
                dismiss_dialogs(page)

        page.wait_for_timeout(800)
        select_btn = page.locator(
            '.jp-Dialog-footer button.jp-mod-accept, .jp-Dialog-button.jp-mod-accept, button:has-text("Select")'
        )
        if select_btn.count():
            try:
                select_btn.first.click(timeout=3000)
                page.wait_for_timeout(1000)
            except Exception:
                pass
        dismiss_dialogs(page)
        dismiss_toasts(page)

        page.locator(".jp-Cell").first.wait_for(state="visible", timeout=30000)
        page.wait_for_timeout(600)
        dismiss_toasts(page)

        # Continuous story: move cursor, run cells one-by-one, scroll, tweak value, re-run.
        focus_cell(page, 1)
        run_cell(page)
        dismiss_toasts(page)

        focus_cell(page, 2)
        run_cell(page)
        page.wait_for_timeout(700)

        scroll_notebook(page, width, height, 170, 5)
        page.wait_for_timeout(400)

        focus_cell(page, 3)
        run_cell(page)
        page.wait_for_timeout(600)

        # Continuous edit: change Private enrollment 120 -> 210
        focus_cell(page, 1)
        page.keyboard.press("Control+End")
        page.wait_for_timeout(250)
        for _ in range(4):
            page.keyboard.press("ArrowLeft")
            page.wait_for_timeout(90)
        for _ in range(3):
            page.keyboard.press("Backspace")
            page.wait_for_timeout(110)
        page.keyboard.type("210", delay=130)
        page.wait_for_timeout(350)
        run_cell(page)

        focus_cell(page, 2)
        run_cell(page)
        page.wait_for_timeout(800)

        scroll_notebook(page, width, height, 180, 4)
        scroll_notebook(page, width, height, -150, 3)
        page.wait_for_timeout(1000)

        dismiss_dialogs(page)
        dismiss_toasts(page)

        video_path = Path(page.video.path())
        context.close()
        browser.close()

        final = out if out.suffix else out.with_suffix(".webm")
        if video_path.exists():
            if final.exists():
                final.unlink()
            video_path.replace(final)
            print(f"Wrote {final}")
        else:
            raise SystemExit("Recording failed: no video file produced")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--url", required=True)
    parser.add_argument("--out", type=Path, default=Path("raw-jupyter-demo.webm"))
    parser.add_argument("--width", type=int, default=1280)
    parser.add_argument("--height", type=int, default=720)
    args = parser.parse_args()
    run(args.url, args.out, args.width, args.height)
