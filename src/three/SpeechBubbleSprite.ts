import * as THREE from 'three';

export type SpeechRole = 'passenger' | 'pedestrian' | 'motorbike' | 'police';

export interface SpeechBubbleRig {
  sprite: THREE.Sprite;
  setContent: (speaker: string, role: SpeechRole, text: string) => void;
  clear: () => void;
  dispose: () => void;
}

const ROLE_STYLES: Record<SpeechRole, { badgeBg: string; badgeText: string; border: string; label: string }> = {
  passenger: {
    badgeBg: '#10b981',
    badgeText: '#052e16',
    border: '#10b981',
    label: 'Hành khách'
  },
  pedestrian: {
    badgeBg: '#38bdf8',
    badgeText: '#082f49',
    border: '#0284c7',
    label: 'Người đi bộ'
  },
  motorbike: {
    badgeBg: '#f59e0b',
    badgeText: '#451a03',
    border: '#d97706',
    label: 'Xe máy'
  },
  police: {
    badgeBg: '#ef4444',
    badgeText: '#ffffff',
    border: '#dc2626',
    label: 'CSGT'
  }
};

function wrapTextLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 3);
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

export function createSpeechBubbleRig(scaleFactor = 1.0): SpeechBubbleRig {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 224;
  const ctx = canvas.getContext('2d')!;

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false
  });

  const sprite = new THREE.Sprite(material);
  sprite.center.set(0.5, 0.0); // Anchor bottom-center directly above character's head
  sprite.scale.set(5.2 * scaleFactor, 2.28 * scaleFactor, 1);
  sprite.renderOrder = 25;
  sprite.visible = false;

  let lastKey = '';

  const setContent = (speaker: string, role: SpeechRole, text: string) => {
    const key = `${role}|${speaker}|${text}`;
    sprite.visible = true;
    if (key === lastKey) return;
    lastKey = key;

    const style = ROLE_STYLES[role];
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const padX = 20;
    const boxX = padX;
    const boxY = 12;
    const boxW = canvas.width - padX * 2;
    const boxH = 166;
    const tailY = boxY + boxH;

    // Subtle drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(2, 6, 23, 0.55)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetY = 5;

    // Bubble body
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
    ctx.fill();
    ctx.restore();

    // Colored outer border
    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 28);
    ctx.lineWidth = 6;
    ctx.strokeStyle = style.border;
    ctx.stroke();

    // Downward speech tail pointing toward character head
    const cx = canvas.width / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 20, tailY - 4);
    ctx.lineTo(cx, tailY + 34);
    ctx.lineTo(cx + 20, tailY - 4);
    ctx.closePath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.97)';
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(cx - 20, tailY - 1);
    ctx.lineTo(cx, tailY + 34);
    ctx.lineTo(cx + 20, tailY - 1);
    ctx.lineWidth = 5;
    ctx.strokeStyle = style.border;
    ctx.stroke();

    // Speaker header badge
    const headerText = speaker || style.label;
    ctx.font = '700 22px "Plus Jakarta Sans", system-ui, sans-serif';
    const badgeW = Math.min(boxW - 44, ctx.measureText(headerText).width + 28);
    drawRoundedRect(ctx, boxX + 20, boxY + 16, badgeW, 34, 12);
    ctx.fillStyle = style.badgeBg;
    ctx.fill();

    ctx.fillStyle = style.badgeText;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(headerText, boxX + 34, boxY + 34, badgeW - 24);

    // Dialogue text
    ctx.font = '700 27px "Plus Jakarta Sans", system-ui, sans-serif';
    const lines = wrapTextLines(ctx, text, boxW - 48);
    ctx.fillStyle = '#0f172a';
    const lineHeight = 33;
    const startY = boxY + 76 + (lines.length === 1 ? 16 : lines.length === 2 ? 6 : 0);
    lines.forEach((line, idx) => {
      ctx.fillText(line, boxX + 24, startY + idx * lineHeight);
    });

    texture.needsUpdate = true;
  };

  const clear = () => {
    sprite.visible = false;
  };

  const dispose = () => {
    texture.dispose();
    material.dispose();
  };

  return { sprite, setContent, clear, dispose };
}
