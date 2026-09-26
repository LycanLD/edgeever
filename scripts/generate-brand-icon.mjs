/**
 * Generate the raster-backed brand icon sources from assets/brand/icon-source.png.
 *
 * Why this exists:
 * The current mark is flat line art on transparency, which is invisible on light
 * surfaces. We therefore compose the artwork onto an opaque brand tile (same
 * rounded-square geometry as before) and embed it as a palette-quantised PNG so
 * every downstream raster target (web favicon/PWA, site, extension, desktop,
 * iOS, Android) keeps a single source of truth and stays crisp at 1024px.
 *
 * Usage: bun scripts/generate-brand-icon.mjs
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Tile + artwork geometry, expressed in the 1024x1024 icon viewBox. */
const VIEW_BOX = 1024;
const TILE_RADIUS = 224;
/** Kept in sync with AGENTS.md and the flatten colour in prepare-brand-icons.mjs. */
const TILE_COLOR = "#47704c";
/**
 * Android adaptive icons reuse the flattened tile as the background layer and
 * only reveal the centre 66%, so the artwork stays inside that safe zone.
 */
const ARTWORK_HEIGHT_RATIO = 0.58;
/** Favicons paint at 16-64px, so a 320px raster is already oversampled. */
const FAVICON_PIXELS = 320;

const sourcePath = path.join(projectRoot, "assets/brand/icon-source.png");
const source = await readFile(sourcePath);

/**
 * Flat line art quantises losslessly enough at 24 colours to stay small, so the
 * raster can be inlined as a data URI and the icon stays resolution independent.
 * `pixels` lets the favicon carry a lighter payload than the 1024px app icon.
 */
const embed = async (pixels) => {
  const buffer = await sharp(source)
    .resize(pixels, pixels, { fit: "contain", kernel: sharp.kernel.lanczos3 })
    .png({ compressionLevel: 9, palette: true, colours: 24, dither: 0.4 })
    .toBuffer();
  return buffer.toString("base64");
};

/**
 * Centre the artwork's opaque bounding box on the tile origin. The caller wraps
 * the result in `translate(centre) scale(...)`, so the offsets are expressed in
 * the untransformed artwork space.
 */
const artworkTransform = (bbox) => ({
  offsetX: -(bbox.minX + bbox.maxX) / 2,
  offsetY: -(bbox.minY + bbox.maxY) / 2,
});

const opaqueBounds = async () => {
  const { data, info } = await sharp(source)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let minY = info.height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      if (data[(y * info.width + x) * info.channels + 3] > 10) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { minX, minY, maxX, maxY, width: info.width, height: info.height };
};

const bounds = await opaqueBounds();
if (bounds.maxX < 0) throw new Error("Brand icon source has no opaque pixels");
const artworkHeight = bounds.maxY - bounds.minY;
const scale = (VIEW_BOX * ARTWORK_HEIGHT_RATIO) / artworkHeight;
const { offsetX, offsetY } = artworkTransform(bounds);
const artworkAt = async (pixels, ratio) => {
  const href = `data:image/png;base64,${await embed(pixels)}`;
  const artScale = (VIEW_BOX * ratio) / artworkHeight;
  return {
    href,
    markup: `<g transform="translate(${VIEW_BOX / 2} ${VIEW_BOX / 2}) scale(${artScale.toFixed(5)})">
    <image x="${offsetX.toFixed(3)}" y="${offsetY.toFixed(3)}" width="${bounds.width}" height="${bounds.height}" href="${href}" />
  </g>`,
  };
};

const { markup: artwork } = await artworkAt(VIEW_BOX, ARTWORK_HEIGHT_RATIO);

const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_BOX} ${VIEW_BOX}" role="img" aria-labelledby="title desc">
  <title id="title">LumiNotes</title>
  <desc id="desc">The Boy Kisser cat mascot on a sage green rounded tile.</desc>
  <rect x="0" y="0" width="${VIEW_BOX}" height="${VIEW_BOX}" rx="${TILE_RADIUS}" fill="${TILE_COLOR}" />
${artwork}
</svg>
`;

await writeFile(path.join(projectRoot, "assets/brand/edgeever-icon.svg"), iconSvg);

/**
 * The favicon is fetched on every page view and only ever painted at 16-64px, so
 * it carries a 320px raster instead of the 1024px one used by the app icons.
 */
const { markup: faviconArtwork } = await artworkAt(FAVICON_PIXELS, ARTWORK_HEIGHT_RATIO);
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_BOX} ${VIEW_BOX}" role="img" aria-label="LumiNotes">
  <rect x="0" y="0" width="${VIEW_BOX}" height="${VIEW_BOX}" rx="${TILE_RADIUS}" fill="${TILE_COLOR}" />
${faviconArtwork}
</svg>
`;
await writeFile(path.join(projectRoot, "assets/brand/edgeever-favicon.svg"), faviconSvg);

/**
 * Android adaptive icons crop hard (circle, squircle, rounded square), so the
 * foreground layer keeps the artwork inside the 66% safe zone with no tile.
 */
const adaptiveSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VIEW_BOX} ${VIEW_BOX}" role="img" aria-label="LumiNotes">
${(await artworkAt(VIEW_BOX, ARTWORK_HEIGHT_RATIO)).markup}
</svg>
`;
await writeFile(
  path.join(projectRoot, "apps/mobile/assets/adaptive-icon-foreground.svg"),
  adaptiveSvg,
);

console.log(
  `[generate-brand-icon] wrote edgeever-icon.svg, edgeever-favicon.svg and adaptive-icon-foreground.svg (tile ${TILE_COLOR}, artwork ${(artworkHeight * scale).toFixed(0)}px)`,
);
