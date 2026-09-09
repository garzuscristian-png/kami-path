import * as THREE from "three";

function makeCanvas(size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function finish(canvas: HTMLCanvasElement, repeat = 1) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  return tex;
}

/** Arena volcánica con ceniza y guijarros */
export function createAshSandTexture() {
  const c = makeCanvas(512);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#3b3833";
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 26000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const l = 26 + Math.random() * 34;
    ctx.fillStyle = `rgba(${l + 20},${l + 16},${l + 10},0.5)`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // guijarros
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const r = 1.5 + Math.random() * 3.5;
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * 0.7, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${90 + Math.random() * 40},${86 + Math.random() * 35},${80 + Math.random() * 30},0.7)`;
    ctx.fill();
  }
  return finish(c, 14);
}

/** Madera envejecida para el muelle */
export function createWoodTexture() {
  const c = makeCanvas(512);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#5b4736";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 220; i++) {
    const y = Math.random() * 512;
    ctx.strokeStyle = `rgba(${30 + Math.random() * 60},${22 + Math.random() * 45},${14 + Math.random() * 35},0.35)`;
    ctx.lineWidth = 0.6 + Math.random() * 2.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= 512; x += 32) {
      ctx.lineTo(x, y + Math.sin((x + i) * 0.04) * 3);
    }
    ctx.stroke();
  }
  // nudos
  for (let i = 0; i < 8; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    for (let r = 10; r > 0; r -= 2) {
      ctx.beginPath();
      ctx.ellipse(x, y, r, r * 0.55, 0.3, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(35,25,16,0.4)";
      ctx.stroke();
    }
  }
  return finish(c, 4);
}

/** Roca / hormigón erosionado */
export function createStoneTexture() {
  const c = makeCanvas(512);
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#6a675f";
  ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 18000; i++) {
    const l = 70 + Math.random() * 60;
    ctx.fillStyle = `rgba(${l},${l - 3},${l - 10},0.35)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2.4, 2.4);
  }
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = "rgba(40,38,34,0.35)";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(Math.random() * 512, Math.random() * 512);
    ctx.lineTo(Math.random() * 512, Math.random() * 512);
    ctx.stroke();
  }
  return finish(c, 6);
}
