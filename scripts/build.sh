#!/usr/bin/env bash
# 构建发布目录 dist/。图片已转到 R2 代理域 pose-images.cyber101.cc，
# 不再把 thumbs/ img/ 打进站点产物。
set -euo pipefail

cd "$(dirname "$0")/.."

rm -rf dist
mkdir -p dist

cp index.html site.css gallery-simple.js chrome.js studio-gen.js studio-app.js _headers robots.txt sitemap.xml og-cover.jpg vercel.json dist/
cp -R poses costumes portraits studio data workflows api dist/

echo "dist ready:"
du -sh dist
find dist -type f | wc -l
