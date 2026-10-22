import { readdir, mkdir, rm } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Generate raster previews from local article artwork, including SVG and WebP.
// Contain (rather than crop) keeps diagrams and circuit boards complete.
const output = fileURLToPath(new URL('../public/social/', import.meta.url));
const input = fileURLToPath(new URL('../public/images/', import.meta.url));
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
async function convert(directory, prefix = '') {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = join(prefix, entry.name);
    if (entry.isDirectory()) { await convert(join(directory, entry.name), relative); continue; }
    if (!/\.(svg|webp|png|jpe?g)$/i.test(entry.name)) continue;
    const target = join(output, `${relative}.jpg`);
    await mkdir(dirname(target), { recursive: true });
    await sharp(join(directory, entry.name)).resize(1200, 630, { fit: 'contain', background: '#0d0f11' }).flatten({ background: '#0d0f11' }).jpeg({ quality: 88 }).toFile(target);
  }
}
await convert(input);
const fallback = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0d0f11"/><rect x="48" y="48" width="1104" height="534" rx="8" fill="#14181b" stroke="#343b3f"/>
<text x="100" y="160" font-family="monospace" font-size="34" fill="#d6ac79">&gt;_ JOHAN SJÖBERG</text>
<text x="100" y="300" font-family="sans-serif" font-weight="700" font-size="96" fill="#e8e6df">Field Notes</text>
<path d="M100 350H1100" stroke="#343b3f"/>
<text x="100" y="425" font-family="sans-serif" font-size="32" fill="#aec5ad">Applied AI · Cloud · Hands-on experiments</text>
<text x="100" y="515" font-family="monospace" font-size="24" fill="#b0b7b9">Notes from the field. Ideas from the lab.</text></svg>`;
await sharp(Buffer.from(fallback)).jpeg({ quality: 90 }).toFile(join(output, 'field-notes.jpg'));
console.log('Social preview images generated (1200 × 630 JPEG).');
