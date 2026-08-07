# Recording hub feature demos (2i2c-style)

Muted, looping MP4s for the homepage “What’s in a Cal-ICOR hub?” grid.

## Layout

Four compact cards side-by-side (`data/hub_demos.yaml`):

- Jupyter
- VS Code
- RStudio
- SageMath

Each card shows a looping video plus logo + name underneath.

## Record

```bash
# Jupyter (local JupyterLab)
python record_tool_demo.py --tool jupyter \
  --url "http://127.0.0.1:8765/lab/tree/cal-icor-notebook-demo.ipynb?token=TOKEN" \
  --out raw-jupyter.webm

# VS Code (Docker code-server)
docker run -d --name calicor-vscode -p 8443:8080 -e PASSWORD=calicor \
  -v "$PWD/vscode-demo:/home/coder/project" \
  codercom/code-server:latest \
  --auth password --bind-addr 0.0.0.0:8080 --disable-workspace-trust /home/coder/project
python record_tool_demo.py --tool vscode \
  --url "http://127.0.0.1:8443/?folder=/home/coder/project" \
  --out raw-vscode.webm

# RStudio (Docker rocker)
docker run -d --name calicor-rstudio -p 8787:8787 -e PASSWORD=calicor rocker/rstudio:4.4.1
python record_tool_demo.py --tool rstudio --url "http://127.0.0.1:8787/" --out raw-rstudio.webm

# SageMath (public SageCell)
python record_tool_demo.py --tool sagemath \
  --url "https://sagecell.sagemath.org/" --out raw-sagemath.webm
```

## Encode

```bash
ffmpeg -y -ss 2 -i raw-TOOL.webm -t 15 \
  -vf "scale=960:540:flags=lanczos" \
  -c:v libx264 -pix_fmt yuv420p -crf 28 -preset fast \
  -movflags +faststart -an ../../static/videos/TOOL.mp4

ffmpeg -y -ss 6 -i ../../static/videos/TOOL.mp4 \
  -frames:v 1 -update 1 -q:v 4 ../../static/videos/TOOL.jpg
```

Update `data/hub_demos.yaml` paths if filenames change. Logos live in `static/images/logos/tools/`.
