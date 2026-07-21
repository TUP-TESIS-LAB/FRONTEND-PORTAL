// Regenera los PNG de public/icons/ a partir de source.svg.
// Uso: node tools/generate-pwa-icons.mjs  (requiere playwright disponible;
// en este repo no está como dep — correrlo desde un checkout que lo tenga o
// instalarlo ad hoc). Los PNG generados SÍ se versionan; este script existe
// para no perder la fuente si hay que cambiar el glifo.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createRequire } from 'node:module';

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const svg = readFileSync(join(here, '../public/icons/source.svg'), 'utf8');
// Variante maskable: el glifo entra en la safe-zone (80% central) — se
// renderiza el mismo SVG escalado al 72% sobre el mismo fondo.
const maskableSvg = svg.replace(
  '<g transform="translate(256 264)">',
  '<g transform="translate(256 262) scale(0.72)">',
);

// [archivo, tamaño, svg]
const TARGETS = [
  ['icon-192x192.png', 192, svg],
  ['icon-512x512.png', 512, svg],
  ['icon-maskable-192x192.png', 192, maskableSvg],
  ['icon-maskable-512x512.png', 512, maskableSvg],
  ['apple-touch-icon.png', 180, svg],
];

const browser = await chromium.launch();
for (const [file, size, source] of TARGETS) {
  const page = await browser.newPage({ viewport: { width: size, height: size } });
  await page.setContent(
    `<style>*{margin:0;padding:0}svg{display:block;width:${size}px;height:${size}px}</style>${source}`,
  );
  await page.screenshot({ path: join(here, '../public/icons', file) });
  await page.close();
  console.log(`ok ${file} (${size}x${size})`);
}
await browser.close();
