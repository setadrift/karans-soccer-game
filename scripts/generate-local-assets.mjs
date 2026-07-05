import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const root = process.cwd();

function ensureDir(dir) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
}

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function writePng(file, width, height, pixelFn) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    for (let x = 0; x < width; x += 1) {
      const [r, g, b, a] = pixelFn(x, y, width, height);
      const offset = 1 + x * 4;
      row[offset] = r;
      row[offset + 1] = g;
      row[offset + 2] = b;
      row[offset + 3] = a;
    }
    rows.push(row);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  fs.writeFileSync(path.join(root, file), png);
}

function writeWav(file, frequency, seconds = 0.16) {
  const sampleRate = 22050;
  const sampleCount = Math.floor(sampleRate * seconds);
  const data = Buffer.alloc(sampleCount * 2);
  for (let i = 0; i < sampleCount; i += 1) {
    const fade = 1 - i / sampleCount;
    const sample = Math.sin((i / sampleRate) * frequency * Math.PI * 2) * 0.28 * fade;
    data.writeInt16LE(Math.max(-1, Math.min(1, sample)) * 32767, i * 2);
  }
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data.length, 40);
  fs.writeFileSync(path.join(root, file), Buffer.concat([header, data]));
}

ensureDir("assets/sprites");
ensureDir("assets/pitch");
ensureDir("assets/ui");
ensureDir("assets/audio");

writePng("assets/sprites/player-base.png", 64, 80, (x, y) => {
  const body = x > 24 && x < 40 && y > 26 && y < 55;
  const head = (x - 32) ** 2 + (y - 18) ** 2 < 90;
  const leg = ((x > 25 && x < 31) || (x > 34 && x < 40)) && y >= 54 && y < 72;
  if (head) return [216, 164, 122, 255];
  if (body) return [248, 250, 252, 255];
  if (leg) return [37, 99, 235, 255];
  return [0, 0, 0, 0];
});

writePng("assets/sprites/keeper-base.png", 64, 80, (x, y) => {
  const body = x > 24 && x < 40 && y > 26 && y < 55;
  const head = (x - 32) ** 2 + (y - 18) ** 2 < 90;
  const gloves = ((x > 15 && x < 24) || (x > 40 && x < 49)) && y > 37 && y < 48;
  if (head) return [216, 164, 122, 255];
  if (gloves) return [250, 204, 21, 255];
  if (body) return [248, 250, 252, 255];
  return [0, 0, 0, 0];
});

writePng("assets/sprites/ball.png", 32, 32, (x, y) => {
  const dx = x - 16;
  const dy = y - 16;
  const inside = dx * dx + dy * dy <= 13 * 13;
  if (!inside) return [0, 0, 0, 0];
  const seam = Math.abs(dx + dy) < 2 || Math.abs(dx - dy) < 2;
  return seam ? [15, 23, 42, 255] : [248, 250, 252, 255];
});

writePng("assets/pitch/grass-texture.png", 128, 128, (x, y) => {
  const stripe = Math.floor(x / 16) % 2;
  const noise = (x * 7 + y * 13) % 9;
  return stripe ? [24, 128 + noise, 75, 255] : [31, 148 + noise, 88, 255];
});

writePng("assets/pitch/line-overlay.png", 128, 128, (x, y) => {
  const line = Math.abs(x - 64) < 2 || Math.abs(y - 64) < 2 || Math.abs((x - 64) ** 2 + (y - 64) ** 2 - 32 ** 2) < 90;
  return line ? [232, 255, 241, 210] : [0, 0, 0, 0];
});

writePng("assets/pitch/goal.png", 96, 48, (x, y) => {
  const frame = x < 5 || x > 90 || y < 5 || y > 42;
  const net = (x + y) % 12 < 2;
  if (frame) return [248, 250, 252, 255];
  if (net) return [203, 213, 225, 160];
  return [0, 0, 0, 0];
});

writePng("assets/ui/radar-icons.png", 64, 32, (x, y) => {
  const left = (x - 16) ** 2 + (y - 16) ** 2 < 45;
  const right = (x - 48) ** 2 + (y - 16) ** 2 < 45;
  if (left) return [248, 250, 252, 255];
  if (right) return [239, 68, 68, 255];
  return [0, 0, 0, 0];
});

writePng("assets/ui/action-icons.png", 96, 32, (x, y) => {
  const section = Math.floor(x / 32);
  const localX = x % 32;
  const active = section === 0 ? localX > 8 && localX < 24 && y > 12 && y < 20 : section === 1 ? (localX - 16) ** 2 + (y - 16) ** 2 < 52 : Math.abs(localX - y) < 3;
  if (!active) return [0, 0, 0, 0];
  return section === 0 ? [56, 189, 248, 255] : section === 1 ? [250, 204, 21, 255] : [239, 68, 68, 255];
});

writeWav("assets/audio/kick.wav", 220, 0.12);
writeWav("assets/audio/pass.wav", 330, 0.1);
writeWav("assets/audio/tackle.wav", 110, 0.14);
writeWav("assets/audio/save.wav", 392, 0.16);
writeWav("assets/audio/post.wav", 660, 0.12);
writeWav("assets/audio/goal.wav", 880, 0.28);

fs.writeFileSync(
  path.join(root, "assets/audio/crowd-loop.ogg"),
  Buffer.concat([Buffer.from("OggS"), Buffer.alloc(128, 0)]),
);

console.log("Generated local assets.");
