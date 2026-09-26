import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { prepareDesktopIcons } from "./prepare-desktop-icons.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = path.join(projectRoot, "assets/brand/edgeever-icon.svg");
const adaptiveForegroundSourcePath = path.join(projectRoot, "apps/mobile/assets/adaptive-icon-foreground.svg");
const adaptiveTransparentSourcePath = path.join(projectRoot, "apps/mobile/assets/adaptive-icon-transparent.svg");
/**
 * The brand icon is a transparent cut-out. Only targets that require an opaque
 * background get a neutral white fill instead of a colour behind the mascot.
 */
const OPAQUE_BACKGROUND = "#FFFFFF";

const source = await readFile(sourcePath);
const adaptiveForegroundSource = await readFile(adaptiveForegroundSourcePath);
const adaptiveTransparentSource = await readFile(adaptiveTransparentSourcePath);

const faviconPath = path.join(projectRoot, "assets/brand/edgeever-favicon.svg");
await copyFile(faviconPath, path.join(projectRoot, "apps/web/public/favicon.svg"));
await copyFile(faviconPath, path.join(projectRoot, "apps/site/public/favicon.svg"));

const pngTargets = [
  ["apps/web/public/pwa-192x192.png", 192, { preserveAlpha: true }],
  ["apps/web/public/pwa-512x512.png", 512, { preserveAlpha: true }],
  ["apps/web/public/maskable-icon-512x512.png", 512, { background: OPAQUE_BACKGROUND }],
  ["apps/web/public/apple-touch-icon.png", 180, { background: OPAQUE_BACKGROUND }],
  ["apps/site/public/icon-192.png", 192, { preserveAlpha: true }],
  ["apps/site/public/icon-512.png", 512, { preserveAlpha: true }],
  ["apps/site/public/apple-touch-icon.png", 180, { background: OPAQUE_BACKGROUND }],
  ["apps/mobile/assets/icon.png", 512, { preserveAlpha: true }],
  ["apps/ios/EdgeEver/Resources/Assets.xcassets/AppIcon.appiconset/icon.png", 1024, { background: OPAQUE_BACKGROUND }],
  ["apps/extension/public/icons/icon-16.png", 16, { preserveAlpha: true }],
  ["apps/extension/public/icons/icon-32.png", 32, { preserveAlpha: true }],
  ["apps/extension/public/icons/icon-48.png", 48, { preserveAlpha: true }],
  ["apps/extension/public/icons/icon-128.png", 128, { preserveAlpha: true }],
];

const renderPng = async (input, destination, size, { preserveAlpha = false, background = OPAQUE_BACKGROUND } = {}) => {
  const outputPath = path.join(projectRoot, destination);
  await mkdir(path.dirname(outputPath), { recursive: true });
  const pipeline = sharp(input, { density: 384 }).resize(size, size, {
    fit: "contain",
    kernel: sharp.kernel.lanczos3,
  });
  if (!preserveAlpha) {
    pipeline.flatten({ background }).removeAlpha();
  }
  await pipeline.png({ compressionLevel: 9 }).toFile(outputPath);
};

for (const [destination, size, options] of pngTargets) {
  await renderPng(source, destination, size, options);
}

await renderPng(adaptiveForegroundSource, "apps/mobile/assets/adaptive-icon-foreground.png", 1024, {
  preserveAlpha: true,
});
await renderPng(adaptiveTransparentSource, "apps/mobile/assets/adaptive-icon-transparent.png", 1024, {
  preserveAlpha: true,
});

const faviconPng = await sharp(source, { density: 384 }).resize(32, 32).png().toBuffer();
const icoHeader = Buffer.alloc(22);
icoHeader.writeUInt16LE(0, 0);
icoHeader.writeUInt16LE(1, 2);
icoHeader.writeUInt16LE(1, 4);
icoHeader.writeUInt8(32, 6);
icoHeader.writeUInt8(32, 7);
icoHeader.writeUInt16LE(1, 10);
icoHeader.writeUInt16LE(32, 12);
icoHeader.writeUInt32LE(faviconPng.length, 14);
icoHeader.writeUInt32LE(22, 18);
await writeFile(path.join(projectRoot, "apps/site/public/favicon.ico"), Buffer.concat([icoHeader, faviconPng]));

await prepareDesktopIcons();
console.log("[prepare-brand-icons] updated shared brand icons");
