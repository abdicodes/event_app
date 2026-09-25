import fs from "node:fs";
import path from "node:path";
import QRCode from "qrcode";
const out=path.resolve("public/mock-qr"); fs.mkdirSync(out,{recursive:true});
const items={
  "amina-noor":"demo_AMINA_7M5dRWm7vFx2K9Pt",
  "leo-martin":"demo_LEO_B4k7nJ2vQ9mT6xWp",
  "sara-chen":"demo_SARA_N8p2cR5yH7kL4mQz",
  "omar-hassan":"demo_OMAR_T3w9bF6nK2qP8xLs",
  "maya-singh":"demo_MAYA_J6r2vC9mW4pN8kTx",
  "daniel-kim":"demo_DANIEL_Q5n8xL2cV7mR4pKw"
};
for(const [name,token] of Object.entries(items)) await QRCode.toFile(path.join(out,`${name}.png`),token,{width:520,margin:2,errorCorrectionLevel:"M"});
console.log(`Generated ${Object.keys(items).length} QR PNGs in public/mock-qr/.`);
