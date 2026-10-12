#!/usr/bin/env python3
"""Builds the single-file offline SizeUp app (index.html) from src/ and assets/."""
import base64, pathlib
root = pathlib.Path(__file__).parent; src = root / 'src'
r = lambda n: (src / n).read_text()
b64 = lambda n: 'data:image/jpeg;base64,' + base64.b64encode((root / 'assets' / n).read_bytes()).decode()
assets = f"window.SIZEUP_ASSETS={{house:'{b64('house.jpg')}',mixed:'{b64('mixed.jpg')}','house-b':'{b64('house-b.jpg')}','house-c':'{b64('house-c.jpg')}','house-d':'{b64('house-d.jpg')}'}};"
app = r('app.js'); cut = app.rstrip().rfind('})();')
app = app[:cut] + '\n/* ---- dispatch.js (same scope as app.js) ---- */\n' + r('dispatch.js') + '\n/* ---- sides.js (same scope as app.js) ---- */\n' + r('sides.js') + '\n/* ---- command.js (same scope as app.js) ---- */\n' + r('command.js') + '\n' + app[cut:]
js = '\n'.join([assets] + [r(n) for n in ['sources.js', 'buildings.js', 'model.js', 'render.js', 'visual.js']] + [app])
assert '</script' not in js.lower()
html = f'''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#0d0f12">
<title>SizeUp · Training</title>
<!-- SizeUp v2 training prototype. Not for operational use. See CREDITS.md for sources and licenses. -->
<style>
{r('base.css')}
{r('extra.css')}
</style>
</head>
<body class="solo">
{r('body.html')}
<script>
{js}
</script>
</body>
</html>
'''
(root / 'index.html').write_text(html)
print('index.html', len(html.encode()) // 1024, 'KB')
