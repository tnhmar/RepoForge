import fs from 'node:fs';
import sharp from 'sharp';
fs.mkdirSync('assets/generated', { recursive: true });
const svg = fs.readFileSync('assets/svg/icon.svg');
for (const name of ['icon', 'adaptive-icon', 'splash']) {
  await sharp(svg).resize(1024, 1024).png().toFile(`assets/generated/${name}.png`);
}
