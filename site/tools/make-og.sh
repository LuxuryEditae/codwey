#!/usr/bin/env bash
# Renders site/static/og.png (1200x630) from tools/og.html with the logo from brand/logo.svg. Needs Chrome + Inter font.
set -euo pipefail
cd "$(dirname "$0")"
tmp=$(mktemp -d)
python3 -c "import sys;t=open('og.html').read();l=open('../brand/logo.svg').read().strip();open(sys.argv[1],'w').write(t.replace('{{LOGO}}',l))" "$tmp/og.html"
google-chrome --headless=new --no-sandbox --disable-gpu --hide-scrollbars --window-size=1200,630 --screenshot="$tmp/og.png" "file://$tmp/og.html" >/dev/null 2>&1
cp "$tmp/og.png" ../static/og.png && rm -rf "$tmp" && echo "og.png updated"
