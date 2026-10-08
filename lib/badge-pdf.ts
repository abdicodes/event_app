import fs from "node:fs/promises";
import path from "node:path";
import QRCode from "qrcode";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage } from "pdf-lib";
import { ROLE_STYLE, resolveBadgeRole, type RoleCode } from "@/lib/roles";

export type BadgeGuest={id:number;name:string;badge_code:string;roles:RoleCode[]};

// Exact Figma artboard metrics from the supplied design export.
const PAGE_W=150.15;
const PAGE_H=243.64;
const CONTENT_X=15;
const ROLE_TOP=73;
const ROLE_GAP=2;
const NAME_TOP=105;
const NAME_W=120;
const QR_TOP=145;
const QR_SIZE=56;

const rgbHex=(hex:string)=>{const n=parseInt(hex.slice(1),16);return rgb(((n>>16)&255)/255,((n>>8)&255)/255,(n&255)/255);};

function wrapName(name:string,font:PDFFont,size:number,maxWidth:number){
  const words=name.trim().split(/\s+/).filter(Boolean);
  const lines:string[]=[];
  let current="";
  for(const word of words){
    const next=current?`${current} ${word}`:word;
    if(font.widthOfTextAtSize(next,size)<=maxWidth||!current) current=next;
    else {lines.push(current);current=word;}
  }
  if(current) lines.push(current);
  if(lines.length<=2) return lines;
  const first=lines[0];
  let second=lines.slice(1).join(" ");
  while(second.length>1&&font.widthOfTextAtSize(`${second}…`,size)>maxWidth) second=second.slice(0,-1);
  return [first,`${second}…`];
}

function topBaseline(font:PDFFont,size:number,top:number){
  return PAGE_H-top-font.heightAtSize(size,{descender:false});
}

async function addBadgePage(doc:PDFDocument,guest:BadgeGuest,bold:PDFFont,templates:Map<RoleCode,PDFImage>){
  const primary=resolveBadgeRole(guest.roles);
  const visual=ROLE_STYLE[primary];
  let template=templates.get(primary);
  if(!template){
    const templatePath=path.join(process.cwd(),"public",visual.template.replace(/^\//,""));
    template=await doc.embedPng(await fs.readFile(templatePath));
    templates.set(primary,template);
  }

  const page=doc.addPage([PAGE_W,PAGE_H]);
  page.drawImage(template,{x:0,y:0,width:PAGE_W,height:PAGE_H});

  // Figma role typography: 12px, 700, 90% line height, -2% tracking.
  // The browser requests SuperX Sans exactly. PDF output uses a safe fallback
  // until a licensed SuperX Sans font resource is supplied to the app.
  const roleSize=12;
  const roleBoxHeight=12.6;
  const rolePadX=1.2;
  guest.roles.slice(0,2).forEach((role,index)=>{
    const roleStyle=ROLE_STYLE[role];
    const label=roleStyle.label;
    const labelWidth=Math.min(NAME_W,bold.widthOfTextAtSize(label,roleSize)+(rolePadX*2));
    const top=ROLE_TOP+(index*(roleBoxHeight+ROLE_GAP));
    const boxY=PAGE_H-top-roleBoxHeight;
    const glyphHeight=bold.heightAtSize(roleSize,{descender:false});
    const textY=boxY+((roleBoxHeight-glyphHeight)/2);
    page.drawRectangle({
      x:CONTENT_X,
      y:boxY,
      width:labelWidth,
      height:roleBoxHeight,
      color:rgbHex(roleStyle.color),
    });
    page.drawText(label,{
      x:CONTENT_X+rolePadX,
      y:textY,
      size:roleSize,
      font:bold,
      color:roleStyle.textColor==="#FFFFFF"?rgb(1,1,1):rgb(0.075,0.11,0.09),
      maxWidth:NAME_W,
    });
  });

  // Figma name typography: 16px, 700, 100% line height, -2% tracking.
  const nameSize=16;
  const lines=wrapName(guest.name,bold,nameSize,NAME_W);
  const firstY=topBaseline(bold,nameSize,NAME_TOP);
  lines.forEach((line,index)=>page.drawText(line,{
    x:CONTENT_X,
    y:firstY-index*16,
    size:nameSize,
    font:bold,
    color:rgb(0.075,0.11,0.09),
    maxWidth:NAME_W,
  }));

  // A single crisp QR image. The clean background template contains no sample
  // QR, so there is nothing underneath this generated code.
  const qrPng=await QRCode.toBuffer(guest.badge_code,{
    type:"png",
    width:896,
    margin:1,
    errorCorrectionLevel:"M",
  });
  const qr=await doc.embedPng(qrPng);
  page.drawImage(qr,{
    x:CONTENT_X,
    y:PAGE_H-QR_TOP-QR_SIZE,
    width:QR_SIZE,
    height:QR_SIZE,
  });
}

export async function createBadgesPdf(guests:BadgeGuest[]){
  const doc=await PDFDocument.create();
  doc.setTitle(guests.length===1?`${guests[0].name} badge`:"Congress badges");
  const bold=await doc.embedFont(StandardFonts.HelveticaBold);
  const templates=new Map<RoleCode,PDFImage>();
  for(const guest of guests) await addBadgePage(doc,guest,bold,templates);
  return doc.save();
}
