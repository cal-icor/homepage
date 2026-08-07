from pathlib import Path

logo_dir = Path(r"C:\Users\benja\OneDrive\Desktop\CAL-ICOR\homepage\static\images\logos\tools")
logo_dir.mkdir(parents=True, exist_ok=True)

colors = {
    "jupyter.svg": "#F37626",
    "vscode.svg": "#007ACC",
    "rstudio.svg": "#75AADB",
}
for name, color in colors.items():
    p = logo_dir / name
    if not p.exists():
        print("missing", name)
        continue
    text = p.read_text(encoding="utf-8")
    text = text.replace('fill="currentColor"', f'fill="{color}"')
    if f'fill="{color}"' not in text[:240]:
        text = text.replace("<svg", f'<svg fill="{color}"', 1)
    p.write_text(text, encoding="utf-8")
    print("styled", name)

# Simple SageMath-inspired wordmark icon (green)
sage = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="SageMath">
  <rect width="64" height="64" rx="12" fill="#2E8B57"/>
  <text x="32" y="40" text-anchor="middle" font-family="Georgia, serif" font-size="22" font-weight="700" fill="#ffffff">Sage</text>
</svg>
'''
(logo_dir / "sagemath.svg").write_text(sage, encoding="utf-8")
print("wrote sagemath.svg")
