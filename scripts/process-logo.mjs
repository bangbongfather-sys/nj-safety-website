// One-off: take the brand JPG, remove the white background, repaint the
// black brand text into a near-white tone (so it reads on the dark nav),
// and write a transparent PNG. The orange stays orange. Source/output
// paths are hard-coded — re-run if the source logo ever changes.
//
//   node scripts/process-logo.mjs
//
// Output: public/nj-logo.png (replaces the visible logo via Navigation.tsx)

import { Jimp, intToRGBA, rgbaToInt } from 'jimp';
import { resolve } from 'node:path';

const SRC = resolve('public/nj-logo.jpg');
const OUT = resolve('public/nj-logo.png');

const WHITE_DROP_THRESHOLD = 235;   // R&G&B all above this → fully transparent
const WHITE_FADE_THRESHOLD = 200;   // partial alpha for soft anti-aliased edges
const DARK_TARGET_THRESHOLD = 90;   // R&G&B all below this → recolor to off-white
const OFF_WHITE = { r: 232, g: 232, b: 232 };

function isOrange(r, g, b) {
  // The brand orange is roughly #ff6b1a — high red, mid green, low blue.
  return r > 180 && g > 60 && g < 170 && b < 90;
}

const img = await Jimp.read(SRC);
console.log(`Loaded ${img.bitmap.width}×${img.bitmap.height} JPG`);

let dropped = 0;
let recolored = 0;
let kept = 0;

img.scan(0, 0, img.bitmap.width, img.bitmap.height, function (x, y, idx) {
  const r = this.bitmap.data[idx + 0];
  const g = this.bitmap.data[idx + 1];
  const b = this.bitmap.data[idx + 2];

  // Whites → drop entirely. Lighter grays around edges → partial alpha so
  // anti-aliasing doesn't leave a harsh halo.
  if (r >= WHITE_DROP_THRESHOLD && g >= WHITE_DROP_THRESHOLD && b >= WHITE_DROP_THRESHOLD) {
    this.bitmap.data[idx + 3] = 0;
    dropped++;
    return;
  }
  if (r >= WHITE_FADE_THRESHOLD && g >= WHITE_FADE_THRESHOLD && b >= WHITE_FADE_THRESHOLD) {
    // Soft fade between WHITE_FADE and WHITE_DROP — translate to alpha.
    const minChannel = Math.min(r, g, b);
    const fade = (minChannel - WHITE_FADE_THRESHOLD) / (WHITE_DROP_THRESHOLD - WHITE_FADE_THRESHOLD);
    this.bitmap.data[idx + 3] = Math.round(255 * (1 - fade));
    return;
  }

  // Preserve the brand orange exactly as-is.
  if (isOrange(r, g, b)) {
    kept++;
    return;
  }

  // Anything dark (the "NJ SAFETY" word mark + the dark gray panel of the
  // N glyph) → repaint to off-white so it reads on the dark nav. Keep the
  // alpha so soft edges still anti-alias.
  if (r <= DARK_TARGET_THRESHOLD && g <= DARK_TARGET_THRESHOLD && b <= DARK_TARGET_THRESHOLD) {
    this.bitmap.data[idx + 0] = OFF_WHITE.r;
    this.bitmap.data[idx + 1] = OFF_WHITE.g;
    this.bitmap.data[idx + 2] = OFF_WHITE.b;
    recolored++;
    return;
  }

  // Mid-grays (likely anti-aliased edges of the dark text) — blend toward
  // off-white proportionally so the text edges still look smooth.
  const brightness = (r + g + b) / 3;
  if (brightness < 160) {
    const t = 1 - brightness / 160;
    this.bitmap.data[idx + 0] = Math.round(r * (1 - t) + OFF_WHITE.r * t);
    this.bitmap.data[idx + 1] = Math.round(g * (1 - t) + OFF_WHITE.g * t);
    this.bitmap.data[idx + 2] = Math.round(b * (1 - t) + OFF_WHITE.b * t);
    recolored++;
  }
});

await img.write(OUT);
console.log(`Wrote ${OUT}`);
console.log(`  dropped (transparent): ${dropped}`);
console.log(`  recolored to off-white: ${recolored}`);
console.log(`  orange kept: ${kept}`);
