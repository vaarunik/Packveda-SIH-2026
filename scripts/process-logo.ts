// One-off asset pipeline: PackVeda logo → transparent icon + full logo + favicon
import sharp from "sharp";

const SRC = "upload/pasted_image_1790697497723.png";

async function main() {
  const trimmed = await sharp(SRC).trim({ threshold: 12 }).png().toBuffer();
  const { data, info } = await sharp(trimmed)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const W = info.width;
  const H = info.height;

  // White → transparent: only near-neutral light pixels (keeps colored AA fringes)
  const isVisible = (i: number): boolean => {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    return !(!(max - min > 28) && min > 230);
  };

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const min = Math.min(r, g, b);
    const max = Math.max(r, g, b);
    const chroma = max - min;
    if (chroma < 28 && min > 230) {
      const t = Math.min(1, (min - 230) / 12); // fully transparent at min ≥ 242
      data[i + 3] = Math.round(255 * (1 - t));
    }
  }

  // Band detection using chroma-based visibility
  const bands: Array<[number, number]> = [];
  let start = -1;
  for (let y = 0; y < H; y++) {
    let c = 0;
    for (let x = 0; x < W; x++) {
      if (isVisible((y * W + x) * 4)) c++;
    }
    const on = c > 2;
    if (on && start === -1) start = y;
    if (!on && start !== -1) {
      bands.push([start, y - 1]);
      start = -1;
    }
  }
  if (start !== -1) bands.push([start, H - 1]);
  console.log("bands:", JSON.stringify(bands));

  if (bands.length < 2) throw new Error("Could not separate icon from wordmark");

  const [iconTop, iconBottom] = bands[0];

  function colBox(y0: number, y1: number): [number, number] {
    let minX = W;
    let maxX = -1;
    for (let y = y0; y <= y1; y++) {
      for (let x = 0; x < W; x++) {
        if (isVisible((y * W + x) * 4)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
        }
      }
    }
    return [Math.max(0, minX), Math.min(W - 1, maxX)];
  }
  const [ix0, ix1] = colBox(iconTop, iconBottom);
  const pad = 4;
  const iconBox = {
    left: Math.max(0, ix0 - pad),
    top: Math.max(0, iconTop - pad),
    width: Math.min(W - 1, ix1 + pad) - Math.max(0, ix0 - pad) + 1,
    height: Math.min(H - 1, iconBottom + pad) - Math.max(0, iconTop - pad) + 1,
  };
  console.log("iconBox:", JSON.stringify(iconBox));

  const rawOut = Buffer.from(data);

  const iconBuf = await sharp(rawOut, { raw: { width: W, height: H, channels: 4 } })
    .extract(iconBox)
    .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(iconBuf).toFile("public/packveda-icon.png");

  // Wordmark-only band (PACKVEDA text) for flexible lockups
  const [wt0, wt1] = bands[1];
  const [wx0, wx1] = colBox(wt0, wt1);
  await sharp(rawOut, { raw: { width: W, height: H, channels: 4 } })
    .extract({
      left: Math.max(0, wx0 - 2),
      top: Math.max(0, wt0 - 2),
      width: Math.min(W - 1, wx1 + 2) - Math.max(0, wx0 - 2) + 1,
      height: wt1 - wt0 + 5,
    })
    .png()
    .toFile("public/packveda-wordmark.png");

  await sharp(rawOut, { raw: { width: W, height: H, channels: 4 } })
    .png()
    .toFile("public/packveda-logo.png");

  await sharp(iconBuf).resize(256, 256).png().toFile("src/app/icon.png");

  console.log("done");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
