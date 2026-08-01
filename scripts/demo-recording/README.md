# Recording hub feature demos (2i2c-style)

2i2c does **not** use animated GIFs on [2i2c.org](https://2i2c.org/) under “What is a community hub?” / platform features.

They use:

```html
<video muted playsinline autoplay loop poster="/path/poster.jpg">
  <source src="/path/demo.mp4" type="video/mp4">
</video>
```

Typical specs from their site:

- ~20–25 seconds, muted, looping
- ~1280×720 H.264 MP4
- Matching `.jpg` poster frame
- Stored under `assets/media/videos/` (Hugo) and embedded via a shortcode

That pattern autoplays in modern browsers because the video is muted (same UX as a GIF, smaller files, sharper).

## Cal-ICOR workflow

1. Log into a Cal-ICOR hub (or run local JupyterLab) and prepare a short, realistic workflow.
2. Record ~20–25s of UI (OBS, QuickTime, or the Playwright helper below).
3. Encode + poster:

```bash
ffmpeg -y -i raw.webm -t 20 \
  -vf "scale=1280:720:flags=lanczos" \
  -c:v libx264 -pix_fmt yuv420p -crf 26 -preset slow \
  -movflags +faststart -an \
  ../../static/videos/FEATURE.mp4

ffmpeg -y -ss 8 -i ../../static/videos/FEATURE.mp4 \
  -frames:v 1 -update 1 -q:v 3 ../../static/videos/FEATURE.jpg
```

4. Update the single entry in `data/hub_demos.yaml` (`video`, `poster`, caption).

## Playwright helper (optional)

```bash
jupyter lab --no-browser --port 8765 --IdentityProvider.token=TOKEN \
  --ServerApp.root_dir=./notebook

python record_jupyter_demo.py \
  --url "http://127.0.0.1:8765/lab/tree/NOTEBOOK.ipynb?token=TOKEN" \
  --out raw-jupyter-demo.webm
```

Keep the file browser clean (only the demo notebook) and dismiss kernel / news dialogs before the interesting frames.

## Tips for good demos

- Keep a single featured clip on the homepage (larger embed, continuous motion).
- One clear story per clip (open → run cells → chart → edit → re-run).
- Trim idle / empty-scroll stretches so the loop always shows action.
- Avoid personal data, real student names, and noisy notifications.
- Prefer hub branding when you have access; local JupyterLab is fine as a stand-in.
- Prefer MP4 over GIF (much smaller at the same resolution).
