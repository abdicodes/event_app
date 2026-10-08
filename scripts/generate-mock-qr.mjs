import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";

const out=path.resolve("public/mock-qr");
fs.mkdirSync(out,{recursive:true});

// Production badges encode only the short guest badge code — never a URL.
const items={
  "amina-noor":"G-A1B2C3D4E5",
  "leo-martin":"G-B1C2D3E4F5",
  "sara-chen":"G-C1D2E3F4A5",
  "omar-hassan":"G-D1E2F3A4B5",
  "maya-singh":"G-E1F2A3B4C5",
  "daniel-kim":"G-F1A2B3C4D5"
};

for(const [name,badgeCode] of Object.entries(items)) {
  await QRCode.toFile(path.join(out,`${name}.png`),badgeCode,{width:520,margin:2,errorCorrectionLevel:"M"});
}
console.log(`Generated ${Object.keys(items).length} badge-code QR PNGs in public/mock-qr/.`);
