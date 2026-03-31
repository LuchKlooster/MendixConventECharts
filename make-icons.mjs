/**
 * Generates icon.png (64×64) and tile.png (256×192) for each chart widget.
 * Saves them directly into src/ as:
 *   EChartsBarChart.icon.png / .icon.dark.png / .tile.png / .tile.dark.png
 *   EChartsLineChart.*
 *   EChartsPieChart.*
 *   EChartsGaugeChart.*
 *   EChartsThemeLoader.*
 *
 * Run: node make-icons.mjs
 */

import zlib from 'zlib';
import fs   from 'fs';
import path from 'path';

// ─── Palette ──────────────────────────────────────────────────────────────────
const NAVY   = [45,  64,  89,  255];   // #2D4059
const RED    = [179, 48,  48,  255];   // #B33030
const GRAY   = [200, 200, 200, 255];   // #C8C8C8
const CREAM  = [240, 218, 175, 255];   // palette body
const ORANGE = [220, 105, 40,  255];   // orange blob
const GREEN  = [55,  140, 65,  255];   // green blob
const YELLOW = [225, 195, 50,  255];   // yellow blob
const BROWN  = [110, 72,  30,  255];   // brush handle
const DARK   = [40,  40,  40,  255];   // brush bristles

const DEG = Math.PI / 180;

// ─── Minimal PNG encoder ──────────────────────────────────────────────────────
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
}
function crc32(buf) {
    let c = 0xFFFFFFFF;
    for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8);
    const v = (c ^ 0xFFFFFFFF) >>> 0;
    return Buffer.from([(v>>>24)&0xFF,(v>>>16)&0xFF,(v>>>8)&0xFF,v&0xFF]);
}
function pngChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const td  = Buffer.concat([Buffer.from(type,'ascii'), data]);
    return Buffer.concat([len, td, crc32(td)]);
}
function makePNG(W, H, pixels) {
    const sig  = Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(W,0); ihdr.writeUInt32BE(H,4); ihdr[8]=8; ihdr[9]=6;
    const raw = Buffer.alloc(H*(1+W*4));
    for (let y=0;y<H;y++){
        raw[y*(1+W*4)]=0;
        for(let x=0;x<W;x++){
            const s=(y*W+x)*4, d=y*(1+W*4)+1+x*4;
            raw[d]=pixels[s];raw[d+1]=pixels[s+1];raw[d+2]=pixels[s+2];raw[d+3]=pixels[s+3];
        }
    }
    const idat = zlib.deflateSync(raw,{level:9});
    return Buffer.concat([sig,pngChunk('IHDR',ihdr),pngChunk('IDAT',idat),pngChunk('IEND',Buffer.alloc(0))]);
}

// ─── Drawing helpers (all coordinates are floating-point, W/H passed in) ─────

function newPixels(W, H) { return new Uint8Array(W * H * 4); }

function put(px, W, H, x, y, col) {
    x = Math.round(x); y = Math.round(y);
    if (x<0||x>=W||y<0||y>=H) return;
    const i=(y*W+x)*4, a=col[3]/255, ia=1-a;
    px[i]  =Math.round(col[0]*a+px[i]  *ia);
    px[i+1]=Math.round(col[1]*a+px[i+1]*ia);
    px[i+2]=Math.round(col[2]*a+px[i+2]*ia);
    px[i+3]=Math.min(255,Math.round(col[3]+px[i+3]*ia));
}

function fillRect(px,W,H,x0,y0,x1,y1,col){
    for(let y=Math.floor(y0);y<=Math.ceil(y1);y++)
        for(let x=Math.floor(x0);x<=Math.ceil(x1);x++)
            put(px,W,H,x,y,col);
}

function drawLine(px,W,H,x0,y0,x1,y1,col,t=1){
    x0=Math.round(x0);y0=Math.round(y0);x1=Math.round(x1);y1=Math.round(y1);
    const r=(t-1)/2;
    let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0);
    let sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;
    for(;;){
        for(let ty=-Math.ceil(r);ty<=Math.ceil(r);ty++)
            for(let tx=-Math.ceil(r);tx<=Math.ceil(r);tx++)
                if(tx*tx+ty*ty<=(r+0.5)*(r+0.5)) put(px,W,H,x0+tx,y0+ty,col);
        if(x0===x1&&y0===y1) break;
        const e2=2*err;
        if(e2>-dy){err-=dy;x0+=sx;}
        if(e2< dx){err+=dx;y0+=sy;}
    }
}

// Fill circular sector: a1_cwTop = start angle in CW-from-top notation, span in radians
function fillSector(px,W,H,cx,cy,r,a1_cwTop,span,col){
    const a1=a1_cwTop-Math.PI/2;
    for(let y=Math.floor(cy-r-1);y<=Math.ceil(cy+r+1);y++)
        for(let x=Math.floor(cx-r-1);x<=Math.ceil(cx+r+1);x++){
            const dx=x-cx,dy=y-cy;
            if(dx*dx+dy*dy>(r+0.5)*(r+0.5)) continue;
            let d=((Math.atan2(dy,dx)-a1)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
            if(d<=span) put(px,W,H,x,y,col);
        }
}

// Draw ring arc (annular sector)
function drawArc(px,W,H,cx,cy,ri,ro,a1_cwTop,span,col){
    const a1=a1_cwTop-Math.PI/2;
    for(let y=Math.floor(cy-ro-1);y<=Math.ceil(cy+ro+1);y++)
        for(let x=Math.floor(cx-ro-1);x<=Math.ceil(cx+ro+1);x++){
            const dx=x-cx,dy=y-cy,d2=dx*dx+dy*dy;
            if(d2<(ri-0.5)*(ri-0.5)||d2>(ro+0.5)*(ro+0.5)) continue;
            let d=((Math.atan2(dy,dx)-a1)%(2*Math.PI)+2*Math.PI)%(2*Math.PI);
            if(d<=span) put(px,W,H,x,y,col);
        }
}

// Fill axis-aligned ellipse
function fillEllipse(px,W,H,cx,cy,rx,ry,col){
    for(let y=Math.floor(cy-ry-1);y<=Math.ceil(cy+ry+1);y++)
        for(let x=Math.floor(cx-rx-1);x<=Math.ceil(cx+rx+1);x++){
            const dx=x-cx, dy=y-cy;
            if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<=1.0) put(px,W,H,x,y,col);
        }
}

// Punch a transparent hole (ellipse-shaped)
function eraseEllipse(px,W,H,cx,cy,rx,ry){
    for(let y=Math.floor(cy-ry-1);y<=Math.ceil(cy+ry+1);y++)
        for(let x=Math.floor(cx-rx-1);x<=Math.ceil(cx+rx+1);x++){
            const dx=x-cx, dy=y-cy;
            if((dx*dx)/(rx*rx)+(dy*dy)/(ry*ry)<=1.0){
                if(x>=0&&x<W&&y>=0&&y<H) px[(y*W+x)*4+3]=0;
            }
        }
}

// ─── Chart renderers (s = scale factor relative to 32×32 grid) ───────────────

function renderBar(px, W, H, s) {
    // 4 bars: navy, red, navy, red
    fillRect(px,W,H,  1*s, 10*s,  7*s, 31*s, NAVY);
    fillRect(px,W,H,  9*s,  1*s, 15*s, 31*s, RED);
    fillRect(px,W,H, 17*s,  5*s, 23*s, 31*s, NAVY);
    fillRect(px,W,H, 25*s, 19*s, 31*s, 31*s, RED);
}

function renderLine(px, W, H, s) {
    const t = Math.max(1, Math.round(s * 2.5));
    drawLine(px,W,H,  3*s,  0,    3*s, 30*s, NAVY, t);   // Y-axis
    drawLine(px,W,H,  3*s, 30*s, 31*s, 30*s, NAVY, t);   // X-axis
    drawLine(px,W,H,  3*s, 28*s,  9*s, 16*s, RED, t);
    drawLine(px,W,H,  9*s, 16*s, 15*s, 22*s, RED, t);
    drawLine(px,W,H, 15*s, 22*s, 21*s,  8*s, RED, t);
    drawLine(px,W,H, 21*s,  8*s, 29*s, 13*s, RED, t);
}

function renderPie(px, W, H, s) {
    const cx=16*s, cy=16*s, r=14*s;
    // White separator lines between slices
    const WHITE=[255,255,255,255];
    fillSector(px,W,H,cx,cy,r,   0*DEG, 216*DEG, RED);
    fillSector(px,W,H,cx,cy,r, 216*DEG, 108*DEG, NAVY);
    fillSector(px,W,H,cx,cy,r, 324*DEG,  36*DEG, GRAY);
    const lw = Math.max(1, Math.round(s * 1.5));
    drawLine(px,W,H,cx,cy,cx+r*Math.sin(0),           cy-r*Math.cos(0),            WHITE,lw);
    drawLine(px,W,H,cx,cy,cx+r*Math.sin(216*DEG), cy-r*Math.cos(216*DEG), WHITE,lw);
    drawLine(px,W,H,cx,cy,cx+r*Math.sin(324*DEG), cy-r*Math.cos(324*DEG), WHITE,lw);
}

function renderGauge(px, W, H, s) {
    const cx=16*s, cy=19*s, r=12*s, ri=9*s;
    // Arc: 270° span starting at 315° CW from top (lower-right side), gap at bottom
    drawArc(px,W,H,cx,cy,ri,r, 315*DEG, 270*DEG, NAVY);
    // Needle pointing at ~70% = 315 + 270*0.7 = 504 mod 360 = 144° CW from top
    // In atan2: 144 - 90 = 54° → upper-right direction
    const ang = 54*DEG;
    const nx = cx + 10*s*Math.cos(ang);
    const ny = cy + 10*s*Math.sin(ang);
    const t = Math.max(2, Math.round(s * 3));
    drawLine(px,W,H,cx,cy,nx,ny,RED,t);
    fillSector(px,W,H,cx,cy,3*s,0,2*Math.PI,RED);   // center cap
}

function renderPalette(px, W, H, s) {
    // Palette body: wide oval, lower-left area of canvas
    fillEllipse(px,W,H, 14*s, 19*s, 12*s, 9*s, CREAM);
    // Thumb hole: punched out of the upper-left of the palette
    eraseEllipse(px,W,H, 8*s, 14*s, 2.5*s, 2.5*s);
    // Color blobs arranged along the top edge of the palette
    fillEllipse(px,W,H, 10*s, 11*s, 2*s, 2*s, RED);
    fillEllipse(px,W,H, 16*s,  9*s, 2*s, 2*s, ORANGE);
    fillEllipse(px,W,H, 21*s, 11*s, 2*s, 2*s, GREEN);
    fillEllipse(px,W,H, 24*s, 17*s, 2*s, 2*s, NAVY);
    fillEllipse(px,W,H, 22*s, 24*s, 2*s, 2*s, YELLOW);
    // Brush: handle diagonally from top-right toward the palette
    const th = Math.max(2, Math.round(s * 2));
    drawLine(px,W,H, 30*s, 1*s, 22*s, 13*s, BROWN, th);
    // Ferrule (metal band between handle and bristles)
    drawLine(px,W,H, 22*s, 13*s, 20*s, 16*s, GRAY, Math.max(3, Math.round(s * 3)));
    // Bristles: slightly wider, darker tip
    drawLine(px,W,H, 20*s, 16*s, 17*s, 20*s, DARK, Math.max(3, Math.round(s * 3)));
}

// ─── Generate icon (64×64) ────────────────────────────────────────────────────
function makeIcon(renderFn) {
    const W=64,H=64,s=2;
    const px=newPixels(W,H);
    renderFn(px,W,H,s);
    return makePNG(W,H,px);
}

// ─── Generate tile (256×192) ──────────────────────────────────────────────────
function makeTile(renderFn) {
    // Draw on a centered 192×192 canvas (leaving 32px margins left/right)
    // We'll shift by offsetX=32 and use scale=6
    const W=256,H=192,s=6;
    const px=newPixels(W,H);
    const ox=(W-32*s)/2, oy=(H-32*s)/2;

    // Wrapper that offsets drawing calls
    const pxProxy = new Proxy({}, {
        get: () => () => {}   // no-op by default
    });

    // We'll use a shifted drawing approach: wrap each primitive
    function shiftFillRect(x0,y0,x1,y1,col){ fillRect(px,W,H,ox+x0,oy+y0,ox+x1,oy+y1,col); }
    function shiftLine(x0,y0,x1,y1,col,t)  { drawLine(px,W,H,ox+x0,oy+y0,ox+x1,oy+y1,col,t); }
    function shiftSector(cx,cy,r,a1,sp,col) { fillSector(px,W,H,ox+cx,oy+cy,r,a1,sp,col); }
    function shiftArc(cx,cy,ri,ro,a1,sp,col){ drawArc(px,W,H,ox+cx,oy+cy,ri,ro,a1,sp,col); }
    function shiftEllipse(cx,cy,rx,ry,col)  { fillEllipse(px,W,H,ox+cx,oy+cy,rx,ry,col); }
    function shiftEraseEllipse(cx,cy,rx,ry) { eraseEllipse(px,W,H,ox+cx,oy+cy,rx,ry); }

    if (renderFn === renderBar) {
        shiftFillRect( 1*s, 10*s,  7*s, 31*s, NAVY);
        shiftFillRect( 9*s,  1*s, 15*s, 31*s, RED);
        shiftFillRect(17*s,  5*s, 23*s, 31*s, NAVY);
        shiftFillRect(25*s, 19*s, 31*s, 31*s, RED);
    } else if (renderFn === renderLine) {
        const t = Math.round(s*2.5);
        shiftLine( 3*s,  0,    3*s, 30*s, NAVY, t);
        shiftLine( 3*s, 30*s, 31*s, 30*s, NAVY, t);
        shiftLine( 3*s, 28*s,  9*s, 16*s, RED, t);
        shiftLine( 9*s, 16*s, 15*s, 22*s, RED, t);
        shiftLine(15*s, 22*s, 21*s,  8*s, RED, t);
        shiftLine(21*s,  8*s, 29*s, 13*s, RED, t);
    } else if (renderFn === renderPie) {
        const cx=16*s,cy=16*s,r=14*s;
        const WHITE=[255,255,255,255];
        shiftSector(cx,cy,r,   0*DEG,216*DEG,RED);
        shiftSector(cx,cy,r,216*DEG,108*DEG,NAVY);
        shiftSector(cx,cy,r,324*DEG, 36*DEG,GRAY);
        const lw=Math.round(s*1.5);
        shiftLine(cx,cy,cx+r*Math.sin(0),           cy-r*Math.cos(0),            WHITE,lw);
        shiftLine(cx,cy,cx+r*Math.sin(216*DEG),cy-r*Math.cos(216*DEG),WHITE,lw);
        shiftLine(cx,cy,cx+r*Math.sin(324*DEG),cy-r*Math.cos(324*DEG),WHITE,lw);
    } else if (renderFn === renderGauge) {
        const cx=16*s,cy=19*s,r=12*s,ri=9*s;
        shiftArc(cx,cy,ri,r,315*DEG,270*DEG,NAVY);
        const ang=54*DEG;
        const nx=cx+10*s*Math.cos(ang),ny=cy+10*s*Math.sin(ang);
        const t=Math.round(s*3);
        shiftLine(cx,cy,nx,ny,RED,t);
        shiftSector(cx,cy,3*s,0,2*Math.PI,RED);
    } else if (renderFn === renderPalette) {
        shiftEllipse(14*s, 19*s, 12*s, 9*s, CREAM);
        shiftEraseEllipse(8*s, 14*s, 2.5*s, 2.5*s);
        shiftEllipse(10*s, 11*s, 2*s, 2*s, RED);
        shiftEllipse(16*s,  9*s, 2*s, 2*s, ORANGE);
        shiftEllipse(21*s, 11*s, 2*s, 2*s, GREEN);
        shiftEllipse(24*s, 17*s, 2*s, 2*s, NAVY);
        shiftEllipse(22*s, 24*s, 2*s, 2*s, YELLOW);
        const th = Math.round(s*2);
        shiftLine(30*s, 1*s, 22*s, 13*s, BROWN, th);
        shiftLine(22*s, 13*s, 20*s, 16*s, GRAY, Math.round(s*3));
        shiftLine(20*s, 16*s, 17*s, 20*s, DARK, Math.round(s*3));
    }
    return makePNG(W,H,px);
}

// ─── Write files ──────────────────────────────────────────────────────────────
const srcDir = path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'src');

const widgets = [
    { name: 'EChartsBarChart',     render: renderBar     },
    { name: 'EChartsLineChart',    render: renderLine    },
    { name: 'EChartsPieChart',     render: renderPie     },
    { name: 'EChartsGaugeChart',   render: renderGauge   },
    { name: 'EChartsThemeLoader',  render: renderPalette },
];

for (const { name, render } of widgets) {
    const icon = makeIcon(render);
    const tile = makeTile(render);
    for (const suffix of ['icon.png', 'icon.dark.png']) {
        const p = path.join(srcDir, `${name}.${suffix}`);
        fs.writeFileSync(p, icon);
        console.log('wrote', p);
    }
    for (const suffix of ['tile.png', 'tile.dark.png']) {
        const p = path.join(srcDir, `${name}.${suffix}`);
        fs.writeFileSync(p, tile);
        console.log('wrote', p);
    }
}
console.log('\nDone!');
