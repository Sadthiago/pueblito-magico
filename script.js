/**
 * script.js
 * Ciclo celeste, atmósfera, flores SVG, riego, scrapbook, ceremonia de brote,
 * música, lluvia, mariposas, recuerdos descargables y panel secreto.
 */

// ================= GENERADOR DE FLORES SVG =================
// Sin contorno de tinta: el volumen lo dan los degradados de cada pétalo. Cada flor vive en su macetita y es lo que más resalta.
function shade(hex, amount) {
  const value = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const mix = (channel) => Math.round(channel + (target - channel) * Math.abs(amount));
  const r = mix((value >> 16) & 255);
  const g = mix((value >> 8) & 255);
  const b = mix(value & 255);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function hashString(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2246822507) + 0x6d2b79f5;
    return ((state ^ (state >>> 13)) >>> 0) / 4294967296;
  };
}

function hexToHsl(hex) {
  const value = parseInt(hex.slice(1), 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [40, 0, l];
  const d = max - min;
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

function flowerPalette(hex) {
  const [hue, rawS, rawL] = hexToHsl(hex);
  // Lo pálido sigue pálido; lo que tiene color sale vivo, para que resalte sobre el pasto
  const pale = rawS < 0.2 || rawL > 0.9;
  const s = pale ? rawS : Math.max(rawS, 0.82);
  const l = pale ? Math.min(rawL, 0.95) : Math.min(Math.max(rawL, 0.46), 0.68);
  const toward = (target, t) => (hue + (((target - hue + 540) % 360) - 180) * t + 360) % 360;
  const tone = (h, light) => `hsl(${h.toFixed(0)},${(s * 100).toFixed(0)}%,${(light * 100).toFixed(0)}%)`;
  const yellowish = hue > 24 && hue < 72 && rawS > 0.25;
  return {
    tip: tone(toward(56, 0.2), Math.min(0.97, l + 0.17)),
    base: tone(hue, l),
    deep: tone(toward(12, 0.25), l - 0.16),
    core: tone(toward(12, 0.45), Math.max(0.16, l - 0.3)),
    // El corazón contrasta con los pétalos: marrón en las amarillas, dorado en las demás
    heart: yellowish ? ['#8a5a1e', '#5a3715', '#2f1c0c'] : ['#ffe27a', '#f0ac2a', '#b5660f'],
    pollen: yellowish ? '#e0a93a' : '#8f4f0c'
  };
}

const STEM = '#2f4a33';
const f1 = (value) => value.toFixed(1);
let flowerUid = 0;

// Degradado que nace en el centro de la flor: cada pétalo va de oscuro en la base a luminoso en la punta
function radial(id, radius, stops) {
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="${radius}">${stops.map(([at, color]) => `<stop offset="${at}" stop-color="${color}"/>`).join('')}</radialGradient>`;
}

// Puntos de un pétalo que crece hacia arriba desde el origen
const PETALS = {
  pointed: (L, W) => [[0, 0], [-W, -L * 0.3], [-W * 0.72, -L * 0.82], [0, -L], [W * 0.72, -L * 0.82], [W, -L * 0.3], [0, 0]],
  round: (L, W) => [[0, 0], [-W * 1.2, -L * 0.4], [-W * 1.05, -L], [0, -L], [W * 1.05, -L], [W * 1.2, -L * 0.4], [0, 0]],
  tepal: (L, W) => [[0, 0], [-W * 0.7, -L * 0.25], [-W * 1.2, -L * 0.85], [0, -L], [W * 1.2, -L * 0.85], [W * 0.7, -L * 0.25], [0, 0]],
  notched: (L, W) => [[0, 0], [-W * 0.5, -L * 0.3], [-W * 1.3, -L * 1.1], [0, -L * 0.93], [W * 1.3, -L * 1.1], [W * 0.5, -L * 0.3], [0, 0]]
};

function petalRing(count, shape, length, width, random, { from = 0, offset = 0, start = 0, every = 1 } = {}) {
  let d = '';
  for (let i = start; i < count; i += every) {
    const angle = ((offset + (360 / count) * i + (random() - 0.5) * 3) * Math.PI) / 180;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const L = length * (1 + (random() - 0.5) * 0.1);
    const p = PETALS[shape](L, width).map(([x, y]) => `${f1(x * cos - (y - from) * sin)},${f1(x * sin + (y - from) * cos)}`);
    d += `M${p[0]}C${p[1]} ${p[2]} ${p[3]}C${p[4]} ${p[5]} ${p[6]}Z`;
  }
  return d;
}

// Pétalos sueltos, para que cada uno pise al anterior
function separatePetals(ring) {
  return ring.split('M').slice(1).map((d) => `<path d="M${d}"/>`).join('');
}

// Nervaduras que van del centro hacia la punta de cada pétalo
function petalVeins(count, inner, outer, offset = 0) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const angle = ((offset + (360 / count) * i) * Math.PI) / 180;
    const x = Math.sin(angle);
    const y = -Math.cos(angle);
    d += `M${f1(x * inner)},${f1(y * inner)}L${f1(x * outer)},${f1(y * outer)}`;
  }
  return d;
}

// Semillas en espiral, como en un girasol de verdad
function seedDots(count, radius) {
  let d = '';
  for (let i = 0; i < count; i++) {
    const r = radius * Math.sqrt((i + 0.5) / count);
    const angle = i * 2.39996;
    d += `M${f1(Math.cos(angle) * r)},${f1(Math.sin(angle) * r)}h.01`;
  }
  return d;
}

const BLOSSOMS = {
  astromelia(p, random, id) {
    // Un solo tallo que se abre en un ramito, como la astromelia de verdad
    let streaks = '';
    [60, 300].forEach((center) => {
      [-16, -8, 0, 8, 16].forEach((spread, i) => {
        const angle = ((center + spread) * Math.PI) / 180;
        const outer = 19 - Math.abs(i - 2) * 2;
        streaks += `M${f1(Math.sin(angle) * 8)},${f1(-Math.cos(angle) * 8)}L${f1(Math.sin(angle) * outer)},${f1(-Math.cos(angle) * outer)}`;
      });
    });
    const blossom = (x, y, rotation, scale) => `<use href="#${id}f" transform="translate(${x},${y}) rotate(${f1(rotation + (random() - 0.5) * 18)}) scale(${scale})"/>`;
    return `<defs>${radial(`${id}a`, 33, [[0.1, p.core], [0.42, p.deep], [0.78, p.base], [1, p.tip]])}${radial(`${id}b`, 30, [[0.08, p.core], [0.34, p.deep], [0.62, p.base], [1, p.tip]])}
      <g id="${id}f"><path fill="url(#${id}a)" stroke="${p.deep}" stroke-width=".5" d="${petalRing(3, 'tepal', 33, 13.5, random)}"/>
      <path fill="url(#${id}b)" stroke="${p.deep}" stroke-width=".5" d="${petalRing(3, 'tepal', 30, 10.5, random, { offset: 60 })}"/>
      <path fill="none" stroke="${p.core}" stroke-width="1" stroke-linecap="round" d="${streaks}"/>
      <circle r="4.5" fill="${p.core}"/>
      <path fill="none" stroke="#f3e2a6" stroke-width=".9" stroke-linecap="round" d="M0,1Q-3,8 -6,14M0,1Q-1,9 -1,16M0,1Q2,9 4,15M0,1Q4,6 8,11"/>
      <path fill="none" stroke="#7a4a1a" stroke-width="2" stroke-linecap="round" d="M-6,14h.01M-1,16h.01M4,15h.01M8,11h.01"/></g></defs>
      <g class="flower-leaves" fill="${STEM}">${leaf(-16, 24, 158, 34, 7)}${leaf(16, 26, 22, 34, 7)}</g>
      <path class="flower-stem" fill="none" stroke="${STEM}" stroke-width="2" stroke-linecap="round" d="M0,46Q-16,20 -27,4M0,46Q15,20 27,3M0,46Q0,10 2,-28M0,46Q-30,-4 -40,-36M0,46Q28,-8 42,-34"/>
      <ellipse cx="-40" cy="-39" rx="5" ry="9" transform="rotate(-28 -40 -39)" fill="${p.deep}"/><ellipse cx="42" cy="-37" rx="4.5" ry="8.5" transform="rotate(32 42 -37)" fill="${p.base}"/>
      ${blossom(2, -27, 0, 0.82)}${blossom(-27, 2, -28, 0.92)}${blossom(27, 2, 28, 0.92)}${blossom(0, 22, 180, 1)}`;
  },
  sunflower(p, random, id) {
    return `<defs>${radial(`${id}a`, 52, [[0.3, p.core], [0.7, p.deep], [1, p.base]])}${radial(`${id}b`, 50, [[0.3, p.deep], [0.62, p.base], [1, p.tip]])}${radial(`${id}c`, 22, [[0, '#2b190c'], [0.6, '#4d2e14'], [0.86, '#8a5a1e'], [1, '#3a2210']])}</defs>
      <path fill="url(#${id}a)" d="${petalRing(17, 'pointed', 38, 8.6, random, { from: 14, offset: 10.6 })}"/>
      <path fill="url(#${id}b)" stroke="${p.deep}" stroke-width=".5" stroke-opacity=".5" d="${petalRing(17, 'pointed', 35, 8.6, random, { from: 14 })}"/>
      <path fill="none" stroke="${p.deep}" stroke-width=".7" stroke-opacity=".4" stroke-linecap="round" d="${petalVeins(17, 24, 42)}"/>
      <circle r="21" fill="url(#${id}c)"/>
      <path fill="none" stroke="#e0a93a" stroke-width="1.5" stroke-linecap="round" d="${seedDots(46, 19)}"/>`;
  },
  rose(p, random, id) {
    const ring = (key, radius, stops) => radial(`${id}${key}`, radius, stops);
    const layer = (key, petals) => `<g fill="url(#${id}${key})" stroke="${p.core}" stroke-width=".6" stroke-opacity=".55">${separatePetals(petals)}</g>`;
    return `<defs>${ring('a', 50, [[0.4, p.core], [0.78, p.base], [1, p.tip]])}${ring('b', 40, [[0.35, p.core], [0.78, p.base], [1, p.tip]])}${ring('c', 29, [[0.3, p.core], [0.75, p.base], [1, p.tip]])}${ring('d', 19, [[0.2, p.core], [1, p.base]])}</defs>
      ${layer('a', petalRing(7, 'round', 50, 24, random))}
      ${layer('b', petalRing(6, 'round', 40, 20, random, { offset: 26 }))}
      ${layer('c', petalRing(5, 'round', 29, 15, random, { offset: 10 }))}
      ${layer('d', petalRing(4, 'round', 19, 10, random, { offset: 50 }))}
      <path d="M-7,2 C-9,-6 4,-10 7,-3 C9,4 1,8 -3,4 C-6,1 -2,-3 1,-2" fill="none" stroke="${p.tip}" stroke-opacity=".75" stroke-width="1.5" stroke-linecap="round"/>`;
  },
  tulip(p, random, id) {
    const up = (key, stops) => `<linearGradient id="${id}${key}" gradientUnits="userSpaceOnUse" x1="0" y1="-56" x2="0" y2="36">${stops.map(([at, color]) => `<stop offset="${at}" stop-color="${color}"/>`).join('')}</linearGradient>`;
    return `<defs>${up('a', [[0, p.base], [1, p.core]])}${up('b', [[0, p.tip], [0.5, p.base], [1, p.deep]])}${up('c', [[0, p.tip], [0.55, p.base], [1, p.core]])}</defs>
      <path fill="url(#${id}a)" d="M-29,-8 C-33,-30 -28,-46 -19,-56 C-13,-44 -6,-40 0,-57 C6,-40 13,-44 19,-56 C28,-46 33,-30 29,-8 C27,20 14,34 0,34 C-14,34 -27,20 -29,-8 Z"/>
      <path fill="url(#${id}b)" stroke="${p.core}" stroke-width=".6" stroke-opacity=".5" d="M2,34 C-22,35 -37,18 -37,-8 C-37,-27 -33,-42 -27,-51 C-14,-38 -3,-14 2,34 Z"/>
      <path fill="url(#${id}b)" stroke="${p.core}" stroke-width=".6" stroke-opacity=".5" d="M-2,34 C22,35 37,18 37,-8 C37,-27 33,-42 27,-51 C14,-38 3,-14 -2,34 Z"/>
      <path fill="url(#${id}c)" stroke="${p.core}" stroke-width=".6" stroke-opacity=".5" d="M0,-43 C-15,-26 -20,-4 -15,14 C-11,28 -4,33 0,35 C4,33 11,28 15,14 C20,-4 15,-26 0,-43 Z"/>
      <path fill="none" stroke="${p.tip}" stroke-opacity=".6" stroke-width="1" stroke-linecap="round" d="M-2,28 C-5,10 -5,-10 -1,-30 M-24,14 C-29,0 -29,-16 -26,-34 M24,14 C29,0 29,-16 26,-34"/>`;
  },
  daisy(p, random, id) {
    return `<defs>${radial(`${id}a`, 50, [[0.2, p.core], [0.6, p.deep], [1, p.base]])}${radial(`${id}b`, 48, [[0.2, p.deep], [0.5, p.base], [1, p.tip]])}${radial(`${id}c`, 15, [[0, p.heart[0]], [0.65, p.heart[1]], [1, p.heart[2]]])}</defs>
      <path fill="url(#${id}a)" d="${petalRing(13, 'round', 42, 7.4, random, { from: 8, offset: 13.8 })}"/>
      <path fill="url(#${id}b)" stroke="${p.deep}" stroke-width=".5" stroke-opacity=".45" d="${petalRing(13, 'round', 40, 7.4, random, { from: 8 })}"/>
      <circle r="15" fill="url(#${id}c)"/>
      <path fill="none" stroke="${p.pollen}" stroke-width="1.2" stroke-linecap="round" d="${seedDots(26, 13)}"/>`;
  },
  wildflower(p, random, id) {
    return `<defs>${radial(`${id}a`, 52, [[0.12, p.core], [0.5, p.deep], [1, p.base]])}${radial(`${id}b`, 52, [[0.12, p.core], [0.6, p.base], [1, p.tip]])}${radial(`${id}c`, 11, [[0, p.heart[0]], [0.7, p.heart[1]], [1, p.heart[2]]])}</defs>
      <path fill="url(#${id}a)" stroke="${p.core}" stroke-width=".5" stroke-opacity=".5" d="${petalRing(8, 'notched', 50, 16, random, { from: 2, start: 1, every: 2 })}"/>
      <path fill="url(#${id}b)" stroke="${p.core}" stroke-width=".5" stroke-opacity=".5" d="${petalRing(8, 'notched', 50, 16, random, { from: 2, every: 2 })}"/>
      <path fill="none" stroke="${p.core}" stroke-width=".7" stroke-opacity=".35" stroke-linecap="round" d="${petalVeins(24, 13, 36, 7.5)}"/>
      <circle r="11" fill="url(#${id}c)"/>
      <path fill="none" stroke="${p.pollen}" stroke-width="1.4" stroke-linecap="round" d="${seedDots(16, 9.5)}"/>`;
  }
};

const BLOSSOM_Y = { astromelia: 62, sunflower: 58, rose: 56, tulip: 62, daisy: 56, wildflower: 56 };

function leaf(x, y, rotation, length, width) {
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rotation)})"><path d="M0,0C${f1(length * 0.25)},${f1(-width)} ${f1(length * 0.7)},${f1(-width)} ${f1(length)},0C${f1(length * 0.7)},${f1(width * 0.6)} ${f1(length * 0.25)},${f1(width * 0.6)} 0,0Z"/><path d="M2,0H${f1(length * 0.85)}" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width=".8"/></g>`;
}

// Cada flor vive en su maceta de urna, pintada a mano. La semilla elige el barro, el adorno y de qué lado cae la hiedra.
function flowerPot(id, random, palette) {
  const clay = [
    ['#f2ad80', '#d0763f', '#8e4323', '#fff3d6'],
    ['#f2ad80', '#d0763f', '#8e4323', '#fff3d6'],
    ['#f5b79a', '#d97f63', '#98493a', '#fff3d6'],
    ['#fff8e8', '#efdfc0', '#b39a72', '#c9703f']
  ][Math.floor(random() * 4)];
  const paint = clay[3];
  const sprigs = `<path fill="none" stroke="${paint}" stroke-width="1.5" stroke-linecap="round" d="M50,205q-6,3 -13,-1M70,205q6,3 13,-1M44,206q0,-4 -3,-5M76,206q0,-4 3,-5"/><path fill="none" stroke="${paint}" stroke-width="3" stroke-linecap="round" d="M36,203h.01M84,203h.01"/>`;
  const adorn = [
    `${sprigs}<path fill="${paint}" d="M60,199c-3,-4 -9,-2 -7,3.5l7,7l7,-7c2,-5.5 -4,-7.5 -7,-3.5Z"/>`,
    `${sprigs}<path fill="none" stroke="${paint}" stroke-width="5" stroke-linecap="round" d="M60,199.5h.01M64.3,202.6h.01M62.7,207.6h.01M57.3,207.6h.01M55.7,202.6h.01"/><circle cx="60" cy="204.3" r="2.2" fill="#f4c542"/>`,
    `<path fill="none" stroke="${paint}" stroke-width="1.7" stroke-linecap="round" d="M34,199q4.3,7 8.7,0q4.3,7 8.7,0q4.3,7 8.6,0q4.3,7 8.6,0q4.3,7 8.7,0q4.3,7 8.7,0"/><path fill="none" stroke="${paint}" stroke-width="3" stroke-linecap="round" d="M38.3,207.5h.01M47,208.5h.01M55.7,209h.01M64.3,209h.01M73,208.5h.01M81.7,207.5h.01"/>`
  ][Math.floor(random() * 3)];
  const side = random() > 0.5 ? 1 : -1;
  const at = (dx) => 60 + side * dx;
  const ivy = (dx, y, turn) => `<path transform="translate(${at(dx)},${y}) rotate(${side > 0 ? turn : 180 - turn})" d="M0,0c3,-4.5 8,-4.5 11,0c-3,4 -8,4 -11,0Z"/>`;
  const tiny = (dx, y) => `<path fill="none" stroke="${palette.base}" stroke-width="3.4" stroke-linecap="round" d="M${at(dx)},${y - 3}h.01M${at(dx) + 3},${y - 1}h.01M${at(dx) + 2},${y + 2.5}h.01M${at(dx) - 2},${y + 2.5}h.01M${at(dx) - 3},${y - 1}h.01"/><circle cx="${at(dx)}" cy="${y}" r="1.4" fill="#f4c542"/>`;
  return {
    back: `<ellipse cx="60" cy="217" rx="34" ry="6" fill="#0b2415" opacity=".38"/><ellipse cx="60" cy="175" rx="27" ry="5.5" fill="#3a2415"/>`,
    front: `<linearGradient id="${id}p"><stop offset="0" stop-color="${clay[0]}"/><stop offset=".45" stop-color="${clay[1]}"/><stop offset="1" stop-color="${clay[2]}"/></linearGradient>
      <path fill="${clay[2]}" d="M43,214H77L80,220H40Z"/>
      <path fill="url(#${id}p)" d="M36,186C24,194 25,209 43,216H77C95,209 96,194 84,186Z"/>
      <path fill="${clay[2]}" opacity=".3" d="M31,207C37,212 83,212 89,207C87,211 83,214 77,216H43C37,214 33,211 31,207Z"/>
      <path fill="#fff" opacity=".24" d="M36,194C32,199 33,205 37,208C36,203 37,198 40,193Z"/>
      ${adorn}
      <path fill="${clay[2]}" d="M35,184H85L84,190H36Z"/>
      <rect x="29" y="173" width="62" height="12" rx="5" fill="url(#${id}p)"/>
      <path fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.5" stroke-linecap="round" d="M34,176.5H72"/>
      <g fill="#3f8345">${ivy(8, 175, -10)}${ivy(21, 177, 35)}${ivy(26, 186, 75)}${ivy(28, 195, 100)}</g>
      ${tiny(13, 176)}${tiny(30, 186)}
      <path class="flower-stem" fill="none" stroke="${STEM}" stroke-width="2" stroke-linecap="round" d="M38,220q-4,-8 -9,-11M43,220q-2,-8 -1,-13M77,220q2,-8 1,-12M82,220q4,-7 9,-10"/>`
  };
}

function createFlowerSVG(type, color = '#e3ae2b', { seed = 1, sprouting = false, head = false } = {}) {
  const random = seededRandom(typeof seed === 'string' ? hashString(seed) : seed);
  const palette = flowerPalette(color);
  const top = BLOSSOM_Y[type] ?? 56;
  const bend = (random() - 0.5) * 12;
  const tilt = (random() - 0.5) * 10;
  const side = random() > 0.5 ? 1 : -1;
  const id = `fl${++flowerUid}`;
  const blossom = (BLOSSOMS[type] || BLOSSOMS.wildflower)(palette, random, id);

  if (head) {
    return `<svg class="flower-svg" xmlns="http://www.w3.org/2000/svg" viewBox="-68 -68 136 136"><g transform="${type === 'tulip' ? 'translate(0,11)' : ''}">${blossom}</g></svg>`;
  }

  const stemX = (y) => {
    const t = (180 - y) / (180 - top);
    return 60 + 2 * (1 - t) * t * bend;
  };
  const leafAngle = (direction, lift) => (direction > 0 ? -lift : 180 + lift);

  let leaves = '';
  let extra = '';
  if (type === 'tulip') {
    leaves = `<path d="M58,180 C38,160 28,130 32,100 C46,122 56,150 61,174 Z"/><path d="M62,180 C82,160 92,134 88,108 C74,128 64,152 59,174 Z"/>`;
  } else if (type === 'wildflower') {
    const budX = stemX(152) + side * 30;
    leaves = leaf(stemX(166), 166, leafAngle(-side, 30), 30, 6.5);
    extra = `<path class="flower-stem" d="M${f1(stemX(152))},152 Q${f1(stemX(152) + side * 22)},148 ${f1(budX)},128" fill="none" stroke="${STEM}" stroke-width="2.2" stroke-linecap="round"/>
      <ellipse cx="${f1(budX)}" cy="120" rx="6.5" ry="10" fill="${palette.base}"/>`;
  } else {
    leaves = leaf(stemX(160), 160, leafAngle(side, 22), 36, 10) + leaf(stemX(136), 136, leafAngle(-side, 26), 32, 9);
  }

  const stem = `<path class="flower-stem" d="M60,180 Q${f1(60 + bend)},${f1((180 + top) / 2)} 60,${top}" fill="none" stroke="${STEM}" stroke-width="3.4" stroke-linecap="round"/>`;
  const pot = flowerPot(id, random, palette);

  return `<svg class="flower-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 220">
    ${pot.back}
    <g class="stem-container ${sprouting ? 'sprouting-stem' : ''}">${stem}<g class="flower-leaves" fill="${STEM}">${leaves}</g>${extra}</g>
    ${pot.front}
    <g transform="translate(60,${top}) rotate(${tilt.toFixed(1)})">
      <g class="flower-blossom ${sprouting ? 'sprouting-head' : ''}">${blossom}</g>
    </g>
  </svg>`;
}

function svgDataURI(svg, width, height) {
  const sized = svg.replace('<svg ', `<svg width="${width}" height="${height}" `);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(sized)}`;
}

function innerSVG(type, color, seed, x, y, width) {
  const height = (width * 220) / 120;
  return createFlowerSVG(type, color, { seed }).replace('<svg ', `<svg x="${x}" y="${y}" width="${width}" height="${height}" overflow="visible" `);
}

// Si no hay foto, la polaroid muestra un dibujo hecho con la propia flor.
function placeholderPhoto(flower, kind) {
  const { type, color, id } = flower;
  if (kind === 'real') {
    return svgDataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
      <rect width="400" height="500" fill="#efeadb"/>
      ${innerSVG(type, shade(color, -0.08), id + 'a', 60, 120, 165)}
      ${innerSVG(type, shade(color, 0.1), id + 'c', 176, 124, 165)}
      ${innerSVG(type, color, id + 'b', 112, 76, 180)}</svg>`, 400, 500);
  }
  return svgDataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="#e8e4d3"/><rect y="330" width="400" height="170" fill="#7a9166"/>
    ${innerSVG(type, color, id + 'd', 66, 130, 160)}
    ${innerSVG(type, shade(color, 0.12), id + 'e', 174, 156, 150)}
    </svg>`, 400, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = $('scene');
  const meadow = $('meadow');
  const flowersContainer = $('flowersContainer');
  const flowerModal = $('flowerModal');
  const sproutModal = $('sproutCelebrationModal');
  const adminModal = $('adminModal');
  const benchModal = $('benchModal');
  const lettersModal = $('lettersModal');
  const chestModal = $('chestModal');

  const HEART_SVG = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21C5 15.5 2 12 2 8a5 5 0 0 1 10-1.5A5 5 0 0 1 22 8c0 4-3 7.5-10 13z"/></svg>';
  const CAN_SVG = '<svg viewBox="0 0 24 24"><path d="M8.6 11.2c3.6-.2 7.4-.2 11 0l.4 9c-3.8.2-7.8.2-11.6 0z" fill="#7c9aa0"/><path d="M8.6 11.2c3.6-.2 7.4-.2 11 0l.4 9c-3.8.2-7.8.2-11.6 0zM8.6 13.4 3.6 9.2M1.8 10.8l3.6-3.4M19.8 13c2.6-.6 3.2 4.2.2 5M11 11c0-4.4 6-4.4 6 0" fill="none" stroke="#2f2a24" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const state = { time: 'day', raining: false, watering: false, activeFlower: null };

  // ================= UTILIDADES =================
  function formatDate(iso) {
    const [year, month, day] = iso.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function slug(text) {
    return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'flor';
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  let toastTimer = null;
  function toast(message) {
    document.querySelectorAll('.toast').forEach((el) => el.remove());
    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'status');
    el.textContent = message;
    (document.querySelector('dialog[open]') || document.body).appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 320);
    }, 3800);
  }

  function showError(element, message) {
    element.textContent = message || '';
    element.hidden = !message;
  }

  function openSheet(dialog) {
    if (!dialog.open) dialog.showModal();
    // El foco cae en la hoja mientras aún viene subiendo y arrastraría el scroll hasta abajo.
    dialog.scrollTop = 0;
  }

  function closeSheet(dialog) {
    return new Promise((resolve) => {
      if (!dialog.open) return resolve();
      dialog.classList.add('is-closing');
      setTimeout(() => {
        dialog.close();
        dialog.classList.remove('is-closing');
        resolve();
      }, 180);
    });
  }

  [flowerModal, adminModal, benchModal, lettersModal, chestModal].forEach((dialog) => {
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog) closeSheet(dialog);
    });
  });

  [flowerModal, adminModal, benchModal, lettersModal, chestModal].forEach((dialog) => {
    const card = dialog.querySelector('.card');
    const grab = document.createElement('div');
    grab.className = 'sheet-grab';
    grab.setAttribute('aria-hidden', 'true');
    card.prepend(grab);
    let startY = null;
    grab.addEventListener('pointerdown', (event) => {
      startY = event.clientY;
      grab.setPointerCapture(event.pointerId);
      card.style.animation = 'none';
    });
    grab.addEventListener('pointermove', (event) => {
      if (startY === null) return;
      card.style.transform = `translateY(${Math.max(0, event.clientY - startY)}px)`;
    });
    const release = async (event) => {
      if (startY === null) return;
      const moved = event.clientY - startY;
      startY = null;
      if (moved > 90) await closeSheet(dialog);
      card.style.transform = '';
      card.style.animation = '';
    };
    grab.addEventListener('pointerup', release);
    grab.addEventListener('pointercancel', release);
  });

  function celebrate(options, dialog = null) {
    if (!window.confetti) return;
    const canvas = dialog && dialog.querySelector('.fx-canvas');
    let fire = window.confetti;
    if (canvas) {
      canvas._confetti = canvas._confetti || window.confetti.create(canvas, { resize: true, useWorker: false });
      fire = canvas._confetti;
    }
    fire({ disableForReducedMotion: true, zIndex: 150, shapes: ['circle'], scalar: 0.8, gravity: 0.7, ticks: 150, ...options });
  }

  // ================= SONIDO =================
  const Sound = (() => {
    let ctx = null;
    let master = null;
    let musicBus = null;
    let reverb = null;
    let noise = null;
    let rainNodes = null;
    let rainTimer = null;
    let enabled = true;
    try { enabled = localStorage.getItem('jardin_magico_sfx') !== '0'; } catch (e) {}

    function ensure() {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return null;
      if (!ctx) {
        ctx = new Context();
        master = ctx.createGain();
        master.connect(ctx.destination);
        musicBus = ctx.createGain();
        musicBus.gain.value = 0;
        reverb = ctx.createConvolver();
        reverb.buffer = impulse(2.4);
        const wet = ctx.createGain();
        wet.gain.value = 0.32;
        reverb.connect(wet);
        wet.connect(master);
        musicBus.connect(master);
        musicBus.connect(reverb);
        noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
        const samples = noise.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    }

    function impulse(seconds) {
      const length = ctx.sampleRate * seconds;
      const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = buffer.getChannelData(channel);
        for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }
      return buffer;
    }

    function bell(frequency, time, volume, length) {
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const gain = ctx.createGain();
      const overtoneGain = ctx.createGain();
      osc.frequency.value = frequency;
      overtone.frequency.value = frequency * 2.76;
      overtoneGain.gain.value = 0.22;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
      osc.connect(gain);
      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      gain.connect(master);
      gain.connect(reverb);
      osc.start(time);
      overtone.start(time);
      osc.stop(time + length + 0.05);
      overtone.stop(time + length + 0.05);
    }

    function noiseBurst(time, length, frequency, q, volume, destination = master) {
      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = frequency;
      filter.Q.value = q;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.exponentialRampToValueAtTime(volume, time + Math.min(0.12, length / 3));
      gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
      source.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      source.start(time, Math.random());
      source.stop(time + length + 0.05);
    }

    function drop(time, volume) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const start = 500 + Math.random() * 500;
      osc.frequency.setValueAtTime(start, time);
      osc.frequency.exponentialRampToValueAtTime(start * 2.2, time + 0.07);
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.09);
      osc.connect(gain);
      gain.connect(master);
      osc.start(time);
      osc.stop(time + 0.11);
    }

    function water() {
      if (!enabled || !ensure()) return;
      const now = ctx.currentTime;
      noiseBurst(now + 0.2, 1.0, 2600, 0.8, 0.06);
      for (let i = 0; i < 9; i++) drop(now + 0.25 + Math.random() * 0.8, 0.05 + Math.random() * 0.05);
      [1046.5, 1318.5, 1568].forEach((note, i) => bell(note, now + 0.95 + i * 0.1, 0.06, 1.1));
    }

    function chime() {
      if (!enabled || !ensure()) return;
      const now = ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((note, i) => bell(note, now + i * 0.11, 0.08, 1.6));
    }

    function tinkle() {
      if (!enabled || !ensure()) return;
      bell(1568 + Math.random() * 400, ctx.currentTime, 0.05, 0.7);
    }

    function startRain() {
      if (!enabled || !ensure() || rainNodes) return;
      const source = ctx.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const high = ctx.createBiquadFilter();
      high.type = 'highpass';
      high.frequency.value = 700;
      const low = ctx.createBiquadFilter();
      low.type = 'lowpass';
      low.frequency.value = 5200;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.055, ctx.currentTime + 1.6);
      source.connect(high);
      high.connect(low);
      low.connect(gain);
      gain.connect(master);
      source.start();
      rainNodes = { source, gain };
      // Gotas sueltas sobre el tejado
      const tap = () => {
        if (!rainNodes) return;
        noiseBurst(ctx.currentTime, 0.05 + Math.random() * 0.05, 500 + Math.random() * 1100, 4, 0.03 + Math.random() * 0.05);
        rainTimer = setTimeout(tap, 70 + Math.random() * 240);
      };
      tap();
    }

    function stopRain() {
      clearTimeout(rainTimer);
      if (!rainNodes) return;
      const { source, gain } = rainNodes;
      rainNodes = null;
      gain.gain.cancelScheduledValues(ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);
      source.stop(ctx.currentTime + 1.1);
    }

    // Una nota de piano o de cajita de música, hecha de armónicos que se apagan.
    function playNote(midi, time, volume, kind) {
      const frequency = 440 * Math.pow(2, (midi - 69) / 12);
      const partials = kind === 'bell'
        ? [[1, 1, 2.2], [3.01, 0.28, 0.9], [6.2, 0.1, 0.4]]
        : [[1, 1, 3.4], [2, 0.42, 2.2], [3, 0.16, 1.3], [4, 0.07, 0.8]];
      partials.forEach(([ratio, amount, length]) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.value = frequency * ratio;
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.exponentialRampToValueAtTime(volume * amount, time + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + length);
        osc.connect(gain);
        gain.connect(musicBus);
        osc.start(time);
        osc.stop(time + length + 0.05);
      });
    }

    function fadeMusic(target, seconds) {
      if (!ctx) return;
      const now = ctx.currentTime;
      musicBus.gain.cancelScheduledValues(now);
      musicBus.gain.setValueAtTime(musicBus.gain.value, now);
      musicBus.gain.linearRampToValueAtTime(target, now + seconds);
    }

    document.addEventListener('visibilitychange', () => {
      if (!ctx) return;
      if (document.hidden) ctx.suspend();
      else ctx.resume();
    });

    return {
      ensure, water, chime, tinkle, startRain, stopRain, playNote, fadeMusic,
      now: () => (ctx ? ctx.currentTime : 0),
      get enabled() { return enabled; },
      setEnabled(value) {
        enabled = value;
        try { localStorage.setItem('jardin_magico_sfx', value ? '1' : '0'); } catch (e) {}
        if (!value) stopRain();
        else if (state.raining) startRain();
      }
    };
  })();

  // ================= MÚSICA =================
  const CHORDS = {
    C: [48, 55, 64, 67, 72], Am: [45, 52, 60, 64, 69], F: [41, 48, 57, 60, 65],
    G: [43, 50, 59, 62, 67], Em: [40, 47, 55, 59, 64], D: [50, 57, 62, 66, 69],
    Cs: [48, 55, 60, 64, 67], Gh: [55, 62, 67, 71, 74], Emh: [52, 59, 64, 67, 71]
  };

  const TRACKS = {
    casita: {
      bpm: 66, kind: 'piano', volume: 0.1,
      bars: [
        ['C', [[0, 76], [2, 79], [3, 76]]], ['Am', [[0, 72], [2, 76]]],
        ['F', [[0, 77], [1.5, 76], [2, 74]]], ['G', [[0, 74], [1, 76], [2, 79]]],
        ['C', [[0, 84], [2, 83], [3, 79]]], ['Em', [[0, 79], [2, 76]]],
        ['F', [[0, 77], [1, 76], [2, 74], [3, 72]]], ['G', [[0, 74]]]
      ]
    },
    cajita: {
      bpm: 92, kind: 'bell', volume: 0.09, octave: 12,
      bars: [
        ['Gh', [[0, 83], [1, 86], [2, 83]]], ['Emh', [[0, 79], [2, 83]]],
        ['C', [[0, 84], [1, 83], [2, 81]]], ['D', [[0, 81], [1, 83], [2, 86]]],
        ['Gh', [[0, 91], [2, 90], [3, 86]]], ['Emh', [[0, 86], [2, 83]]],
        ['C', [[0, 84], [1, 83], [2, 81], [3, 79]]], ['D', [[0, 81]]]
      ]
    },
    atardecer: {
      bpm: 54, kind: 'piano', volume: 0.1,
      bars: [
        ['Am', [[0, 76], [3, 72]]], ['F', [[0, 77], [2, 76]]],
        ['Cs', [[0, 79], [3, 76]]], ['G', [[0, 74]]],
        ['Am', [[0, 76], [1.5, 79], [2, 81]]], ['F', [[0, 77], [2, 81]]],
        ['Cs', [[0, 79], [2, 76], [3, 72]]], ['G', [[0, 74]]]
      ]
    }
  };

  const ARPEGGIO = [0, 1, 2, 3, 4, 3, 2, 1];

  const Music = (() => {
    const audio = $('bgAudio');
    let current = '';
    let timer = null;
    let wantedByUser = false;

    function startTrack(name) {
      const track = TRACKS[name];
      const beat = 60 / track.bpm;
      let barIndex = 0;
      let barStart = Sound.now() + 0.15;
      Sound.fadeMusic(1, 1.2);
      const schedule = () => {
        while (barStart < Sound.now() + 0.6) {
          const [chordName, melody] = track.bars[barIndex];
          const chord = CHORDS[chordName];
          const shift = track.octave || 0;
          Sound.playNote(chord[0] + shift, barStart, track.volume * 0.9, track.kind);
          ARPEGGIO.forEach((step, i) => {
            if (i === 0) return;
            Sound.playNote(chord[step] + shift, barStart + i * beat * 0.5, track.volume * 0.46, track.kind);
          });
          melody.forEach(([at, note]) => Sound.playNote(note, barStart + at * beat, track.volume * 1.1, track.kind));
          barStart += beat * 4;
          barIndex = (barIndex + 1) % track.bars.length;
        }
      };
      schedule();
      timer = setInterval(schedule, 150);
    }

    function stop() {
      clearInterval(timer);
      timer = null;
      Sound.fadeMusic(0, 0.9);
      audio.pause();
      current = '';
      updateUI();
    }

    async function play(spec) {
      Sound.ensure();
      clearInterval(timer);
      timer = null;
      audio.pause();
      current = spec;
      updateUI();
      if (TRACKS[spec]) {
        startTrack(spec);
        return true;
      }
      Sound.fadeMusic(0, 0.4);
      try {
        const url = await Media.url(spec);
        if (!url) throw new Error('sin archivo');
        audio.src = url;
        audio.volume = 0.65;
        await audio.play();
        return true;
      } catch (e) {
        console.error('No se pudo reproducir la melodía', e);
        current = '';
        updateUI();
        toast('No pude abrir esa canción. Revisa el archivo o el enlace.');
        return false;
      }
    }

    function updateUI() {
      $('btnMusic').setAttribute('aria-pressed', String(Boolean(current)));
      const flower = state.activeFlower;
      if (flower && flower.music) {
        $('btnFlowerMelody').querySelector('span').textContent = current === flower.music ? 'Pausar su melodía' : 'Escuchar su melodía';
      }
    }

    document.addEventListener('visibilitychange', () => {
      if (audio.src && !TRACKS[current] && current) {
        if (document.hidden) { wantedByUser = !audio.paused; audio.pause(); }
        else if (wantedByUser) audio.play().catch(() => {});
      }
    });

    return { play, stop, updateUI, get current() { return current; } };
  })();

  $('btnMusic').addEventListener('click', () => {
    if (Music.current) Music.stop();
    else Music.play('casita');
  });

  $('btnFlowerMelody').addEventListener('click', () => {
    const flower = state.activeFlower;
    if (!flower || !flower.music) return;
    if (Music.current === flower.music) Music.stop();
    else Music.play(flower.music);
  });

  // ================= 1. CICLO DÍA / TARDE / NOCHE =================
  const celestialOrbit = $('celestialOrbit');
  const timeAngles = { day: 0, sunset: 70, night: 180 };
  const skyThemeColor = { day: '#6db5f5', sunset: '#4c2a85', night: '#070b1e' };
  const TIME_BUTTON = { day: ['sun', 'Día'], sunset: ['sunset', 'Tarde'], night: ['moon', 'Noche'], auto: ['timer', 'Auto'] };
  const CYCLE_SECONDS = 15;
  let orbitAngle = 0;
  let isAutoCycling = false;
  let autoCycleInterval = null;

  function setTimeMode(mode) {
    state.time = mode;
    document.body.classList.remove('time-day', 'time-sunset', 'time-night');
    document.body.classList.add(`time-${mode}`);

    // El sol siempre avanza hacia adelante, nunca retrocede por el cielo.
    let target = timeAngles[mode];
    while (target < orbitAngle) target += 360;
    orbitAngle = target;
    celestialOrbit.style.setProperty('--orbit-angle', `${orbitAngle}deg`);

    paintTimeButton();
    document.querySelector('meta[name="theme-color"]').content = skyThemeColor[mode];
    Ambient.redrawStatic();
    Butterflies.refresh();
  }

  function paintTimeButton() {
    const [icon, label] = TIME_BUTTON[isAutoCycling ? 'auto' : state.time];
    $('timeIcon').setAttribute('href', `#i-${icon}`);
    $('timeLabel').textContent = label;
    $('btnTime').setAttribute('aria-label', `Hora del día: ${label}. Toca para cambiarla.`);
  }

  function stopAutoCycle() {
    isAutoCycling = false;
    clearInterval(autoCycleInterval);
  }

  // Día, tarde, noche y luego "Auto", donde el tiempo pasa solo.
  $('btnTime').addEventListener('click', () => {
    if (isAutoCycling) {
      stopAutoCycle();
      setTimeMode('day');
      return;
    }
    if (state.time === 'night') {
      isAutoCycling = true;
      const modes = ['day', 'sunset', 'night'];
      autoCycleInterval = setInterval(() => {
        setTimeMode(modes[(modes.indexOf(state.time) + 1) % modes.length]);
      }, CYCLE_SECONDS * 1000);
      paintTimeButton();
      return;
    }
    setTimeMode(state.time === 'day' ? 'sunset' : 'night');
  });

  function timeFromClock() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 16) return 'day';
    if (hour >= 16 && hour < 19) return 'sunset';
    return 'night';
  }

  // ================= 2. ATMÓSFERA: ESTRELLAS, LUCIÉRNAGAS Y LLUVIA =================
  const Ambient = (() => {
    const canvas = $('ambientCanvas');
    const ctx = canvas.getContext('2d');
    const starCanvas = $('starCanvas');
    const starCtx = starCanvas.getContext('2d');
    let width = 0;
    let height = 0;
    let ratio = 1;
    let stars = [];
    let fireflies = [];
    let drops = [];
    let splashes = [];
    let burst = [];
    let levels = { star: 0, firefly: 0, rain: 0 };
    let frame = 0;
    let last = 0;

    const random = (min, max) => min + Math.random() * (max - min);
    const PETAL_COLORS = ['#e3ae2b', '#edd27a', '#c8737a', '#d98a2b'];

    function newPetal(anywhere) {
      return {
        x: random(-40, width),
        y: anywhere ? random(0, height) : -20,
        size: random(3.5, 6.5),
        vx: random(8, 26),
        vy: random(12, 30),
        spin: random(0, 6.28),
        spinSpeed: random(-1.4, 1.4),
        sway: random(0, 6.28),
        color: PETAL_COLORS[Math.floor(Math.random() * 4)]
      };
    }

    function resize() {
      ratio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      [canvas, starCanvas].forEach((c) => {
        c.width = width * ratio;
        c.height = height * ratio;
      });
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      starCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const small = width < 720;
      stars = Array.from({ length: small ? 46 : 90 }, () => ({
        x: random(0, width),
        y: random(0, height * 0.5),
        size: random(0.5, 2.6),
        phase: random(0, 6.28),
        speed: random(0.5, 2.2)
      }));
      fireflies = Array.from({ length: small ? 6 : 10 }, () => ({
        x: random(0, width),
        y: random(height * 0.4, height * 0.95),
        size: random(1.2, 1.9),
        vx: random(-16, 16),
        vy: random(-12, 12),
        pulse: random(0, 6.28)
      }));
      drops = Array.from({ length: small ? 90 : 190 }, () => ({
        x: random(-60, width + 60),
        y: random(-height, height),
        length: random(10, 22),
        speed: random(620, 980)
      }));
      redrawStatic();
    }

    function targets() {
      const { time, raining } = state;
      return {
        star: raining ? 0.25 : { day: 0, sunset: 0.3, night: 1 }[time],
        firefly: raining ? 0 : { day: 0, sunset: 0.5, night: 1 }[time],
        rain: raining ? 1 : 0
      };
    }

    function drawStars(seconds) {
      starCtx.clearRect(0, 0, width, height);
      if (levels.star < 0.01) return;
      stars.forEach((star) => {
        const twinkle = 0.45 + Math.sin(seconds * star.speed + star.phase) * 0.45;
        starCtx.globalAlpha = levels.star * Math.max(0.1, twinkle);
        starCtx.fillStyle = '#f6ecd2';
        starCtx.beginPath();
        if (star.size > 1.9) {
          // Las grandes, como estrellitas dibujadas de cuatro puntas
          const s = star.size * 1.9;
          starCtx.moveTo(star.x, star.y - s);
          starCtx.quadraticCurveTo(star.x, star.y, star.x + s, star.y);
          starCtx.quadraticCurveTo(star.x, star.y, star.x, star.y + s);
          starCtx.quadraticCurveTo(star.x, star.y, star.x - s, star.y);
          starCtx.quadraticCurveTo(star.x, star.y, star.x, star.y - s);
        } else {
          starCtx.arc(star.x, star.y, star.size * 0.6, 0, 6.283);
        }
        starCtx.fill();
      });
      starCtx.globalAlpha = 1;
    }

    function tick(now) {
      requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      frame += 1;
      const seconds = now / 1000;

      const goal = targets();
      Object.keys(levels).forEach((key) => { levels[key] += (goal[key] - levels[key]) * Math.min(1, dt * 1.6); });

      if (frame % 4 === 0) drawStars(seconds);
      ctx.clearRect(0, 0, width, height);

      if (levels.firefly > 0.01) {
        const top = height * 0.3;
        fireflies.forEach((fly) => {
          fly.x += fly.vx * dt;
          fly.y += fly.vy * dt;
          fly.pulse += dt * 2.4;
          if (fly.x < 0 || fly.x > width) fly.vx *= -1;
          if (fly.y < top || fly.y > height) fly.vy *= -1;
          ctx.globalAlpha = levels.firefly * (0.2 + ((Math.sin(fly.pulse) + 1) / 2) * 0.8);
          ctx.fillStyle = '#f2d98a';
          ctx.beginPath();
          ctx.arc(fly.x, fly.y, fly.size, 0, 6.283);
          ctx.fill();
        });
        ctx.globalAlpha = 1;
      }

      const drawPetal = (petal) => {
        ctx.save();
        ctx.translate(petal.x, petal.y);
        ctx.rotate(petal.spin);
        ctx.scale(1, 0.55 + Math.sin(petal.spin * 1.6) * 0.3);
        ctx.fillStyle = petal.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, petal.size, petal.size * 0.6, 0, 0, 6.283);
        ctx.fill();
        ctx.restore();
      };

      if (burst.length) {
        burst = burst.filter((petal) => petal.life > 0);
        burst.forEach((petal) => {
          petal.life -= dt;
          petal.vy += 90 * dt;
          petal.x += petal.vx * dt;
          petal.y += petal.vy * dt;
          petal.spin += petal.spinSpeed * dt;
          ctx.globalAlpha = Math.min(1, petal.life);
          drawPetal(petal);
        });
        ctx.globalAlpha = 1;
      }

      if (levels.rain > 0.01) {
        const count = Math.floor(drops.length * levels.rain);
        const groundTop = Math.max(0, meadow.getBoundingClientRect().top);
        ctx.strokeStyle = 'rgba(226,232,226,0.6)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        for (let i = 0; i < count; i++) {
          const drop = drops[i];
          drop.y += drop.speed * dt;
          drop.x += 70 * dt;
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(drop.x + drop.length * 0.08, drop.y + drop.length);
          if (drop.y > groundTop + (i % 12) * ((height - groundTop) / 12)) {
            if (i % 2 === 0 && splashes.length < 60) splashes.push({ x: drop.x, y: drop.y + drop.length, life: 0.28 });
            drop.y = random(-140, -20);
            drop.x = random(-60, width);
          }
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        splashes = splashes.filter((splash) => splash.life > 0);
        splashes.forEach((splash) => {
          splash.life -= dt;
          ctx.globalAlpha = Math.max(0, splash.life * 2.4) * levels.rain;
          ctx.strokeStyle = 'rgba(226,232,226,0.85)';
          ctx.beginPath();
          ctx.ellipse(splash.x, splash.y, (0.3 - splash.life) * 26, (0.3 - splash.life) * 8, 0, 0, 6.283);
          ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
    }

    function redrawStatic() {
      if (!reducedMotion) return;
      levels = targets();
      drawStars(0);
    }

    return {
      redrawStatic,
      burstPetals(x, y) {
        if (reducedMotion) return;
        for (let i = 0; i < 34; i++) {
          burst.push({
            ...newPetal(false),
            x, y,
            vx: random(-170, 170),
            vy: random(-280, -70),
            size: random(4, 9),
            spinSpeed: random(-5, 5),
            life: random(1.2, 2.2)
          });
        }
      },
      start() {
        window.addEventListener('resize', resize);
        resize();
        if (!reducedMotion) requestAnimationFrame(tick);
      }
    };
  })();

  // ================= 3. GUIRNALDA DE LUCES =================
  function drawFairyLights() {
    const svg = $('fairyLights');
    const sceneRect = scene.getBoundingClientRect();
    const roof = $('shopRoof').getBoundingClientRect();
    const left = roof.left - sceneRect.left;
    const right = roof.right - sceneRect.left;
    const eave = roof.bottom - sceneRect.top - roof.height * 0.03;
    const ground = meadow.getBoundingClientRect().top - sceneRect.top;
    const width = sceneRect.width;
    const poleTop = eave - (ground - eave) * 0.1;
    const poleLeft = Math.max(8, left * 0.3);
    const poleRight = Math.min(width - 8, right + (width - right) * 0.7);

    const spans = [];
    if (left > 34) spans.push([poleLeft, poleTop, left, eave, 26]);
    if (width - right > 34) spans.push([right, eave, poleRight, poleTop, 26]);

    let markup = '';
    if (left > 34) markup += `<rect class="fairy-pole" x="${poleLeft - 2.5}" y="${poleTop - 3}" width="5" height="${ground - poleTop + 12}" rx="2"/>`;
    if (width - right > 34) markup += `<rect class="fairy-pole" x="${poleRight - 2.5}" y="${poleTop - 3}" width="5" height="${ground - poleTop + 12}" rx="2"/>`;

    spans.forEach(([x1, y1, x2, y2, sag]) => {
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2 + sag * 2;
      markup += `<path class="fairy-rope" d="M${x1},${y1} Q${midX},${midY} ${x2},${y2}"/>`;
      const count = Math.max(3, Math.round(Math.hypot(x2 - x1, y2 - y1) / 34));
      for (let i = 1; i < count; i++) {
        const t = i / count;
        const x = (1 - t) * (1 - t) * x1 + 2 * (1 - t) * t * midX + t * t * x2;
        const y = (1 - t) * (1 - t) * y1 + 2 * (1 - t) * t * midY + t * t * y2 + 5;
        markup += `<circle class="fairy-glow" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="7"/>`;
        markup += `<circle class="fairy-bulb" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.9"/>`;
      }
    });
    svg.innerHTML = markup;
  }

  // ================= 4. RENDERIZADO DEL JARDÍN =================
  // Las macetas bajan por los dos lados de un caminito que serpentea sin fin.
  const TRAIL_ROWS = 8;
  let gardenColumns = 0;
  let trailWidth = 0;

  function columnsForWidth() {
    return Math.min(8, Math.max(2, 2 * Math.floor(window.innerWidth / 380)));
  }

  function trailAmplitude(columns) {
    return (50 / (columns / 2 + 1)) * 0.4;
  }

  // Una flor nueva no mueve a las demás: siempre queda más abajo que la anterior.
  function flowerSlot(index, columns, id) {
    const row = (index * 2) / columns;
    const side = index % 2 ? 1 : -1;
    const lane = Math.floor((index % columns) / 2) + 1;
    const spacing = 50 / (columns / 2 + 1);
    const center = 50 + trailAmplitude(columns) * Math.sin((2 * Math.PI * (row + 2.11)) / TRAIL_ROWS);
    const random = seededRandom(hashString(id));
    return {
      row,
      x: center + side * lane * spacing + (random() - 0.5) * 3,
      nudge: (random() - 0.5) * 14,
      scale: 0.94 + random() * 0.12
    };
  }

  // El caminito y sus adornos se dibujan una vez, como un fondo que se repite.
  function drawGardenTrail() {
    const width = flowersContainer.clientWidth;
    const probe = document.createElement('i');
    probe.style.cssText = 'position:absolute;width:var(--fw)';
    flowersContainer.appendChild(probe);
    const period = Math.round(probe.offsetWidth * 0.9 * TRAIL_ROWS);
    probe.remove();
    trailWidth = width;
    const amplitude = trailAmplitude(gardenColumns) / 100;
    const centerAt = (y) => width * (0.5 + amplitude * Math.sin((2 * Math.PI * y) / period));
    const random = seededRandom(7);

    let stones = '';
    const count = Math.round(period / 38);
    for (let i = 0; i < count; i++) {
      const y = (i + 0.5) * (period / count);
      stones += `<ellipse cx="${f1(centerAt(y) + (i % 2 ? 7 : -7))}" cy="${f1(y)}" rx="${f1(13 + random() * 6)}" ry="${f1(5.5 + random() * 2)}"/>`;
    }

    const lantern = (x, y) => `<circle cx="${f1(x)}" cy="${f1(y - 25)}" r="20" fill="url(#g)"/><path d="M${f1(x)},${f1(y)}v-20" stroke="#39423c" stroke-width="2.2"/><rect x="${f1(x - 5)}" y="${f1(y - 31)}" width="10" height="12" rx="2.5" fill="#39423c"/><rect x="${f1(x - 3)}" y="${f1(y - 29)}" width="6" height="8" fill="#ffe08a"/>`;
    const mushroom = (x, y, s) => `<g transform="translate(${f1(x)},${f1(y)}) scale(${s})"><path fill="#fbf1dc" d="M-4,0C-3,-6 -3,-10 -3,-12H3C3,-10 3,-6 4,0Z"/><path fill="#e0463c" d="M-13,-10C-12,-23 12,-23 13,-10C6,-8 -6,-8 -13,-10Z"/><circle cx="-6" cy="-14" r="2" fill="#fff6e4"/><circle cx="1" cy="-17" r="2.2" fill="#fff6e4"/><circle cx="6" cy="-13" r="1.7" fill="#fff6e4"/></g>`;
    const fern = (x, y) => `<path fill="none" stroke="#2f7a45" stroke-width="2.4" stroke-linecap="round" d="M${f1(x)},${f1(y)}q-3,-12 -12,-16M${f1(x)},${f1(y)}q0,-14 -2,-22M${f1(x)},${f1(y)}q3,-12 10,-18M${f1(x)},${f1(y)}q5,-8 14,-10"/>`;
    const sparkle = (x, y, r) => `<path fill="#fff4b8" d="M${f1(x)},${f1(y - r)}q${f1(r * 0.14)},${f1(r * 0.86)} ${f1(r)},${f1(r)}q${f1(-r * 0.86)},${f1(r * 0.14)} ${f1(-r)},${f1(r)}q${f1(-r * 0.14)},${f1(-r * 0.86)} ${f1(-r)},${f1(-r)}q${f1(r * 0.86)},${f1(-r * 0.14)} ${f1(r)},${f1(-r)}Z"/>`;

    let decor = '';
    [0.16, 0.66].forEach((at, i) => { decor += lantern(centerAt(period * at) + (i ? -30 : 30), period * at); });
    [[0.06, 0.1], [0.94, 0.3], [0.5, 0.42], [0.05, 0.56], [0.95, 0.8], [0.48, 0.92]].forEach(([x, at], i) => {
      decor += mushroom(width * x, period * at, i % 2 ? 0.9 : 0.7);
      decor += mushroom(width * x + 15, period * at + 4, 0.5);
    });
    [[0.03, 0.34], [0.97, 0.52], [0.02, 0.8], [0.98, 0.06]].forEach(([x, at]) => { decor += fern(width * x, period * at); });
    for (let i = 0; i < 9; i++) decor += sparkle(random() * width, random() * period, 2.5 + random() * 3);

    const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${period}" viewBox="0 0 ${width} ${period}"><radialGradient id="g"><stop offset="0" stop-color="#ffdf8a" stop-opacity=".55"/><stop offset="1" stop-color="#ffdf8a" stop-opacity="0"/></radialGradient><g fill="#fff4dc" fill-opacity=".42">${stones}</g>${decor}</svg>`;
    flowersContainer.style.setProperty('--trail', `url("data:image/svg+xml,${encodeURIComponent(tile)}")`);
    flowersContainer.style.setProperty('--trail-size', `${width}px ${period}px`);
    drawGrass(width, period, centerAt);
  }

  // El pasto: claros de sol, matitas, tréboles y florecitas silvestres que esquivan el caminito.
  function drawGrass(width, period, centerAt) {
    const random = seededRandom(11);
    const area = width * period;
    let patches = '';
    for (let i = 0; i < Math.round(area / 30000); i++) {
      patches += `<ellipse cx="${f1(random() * width)}" cy="${f1(random() * period)}" rx="${f1(50 + random() * 90)}" ry="${f1(22 + random() * 34)}" fill="url(#${i % 3 ? 'l' : 'd'})"/>`;
    }

    let dark = '';
    let light = '';
    for (let i = 0; i < Math.round(area / 1500); i++) {
      const x = random() * width;
      const y = random() * period;
      const s = 0.7 + random() * 0.7;
      const blades = `M${f1(x)},${f1(y)}q${f1(-2 * s)},${f1(-6 * s)} ${f1(-5 * s)},${f1(-9 * s)}M${f1(x)},${f1(y)}q0,${f1(-7 * s)} ${f1(s)},${f1(-11 * s)}M${f1(x)},${f1(y)}q${f1(2 * s)},${f1(-5 * s)} ${f1(6 * s)},${f1(-8 * s)}`;
      if (random() < 0.55) dark += blades;
      else light += blades;
    }

    let clovers = '';
    for (let i = 0; i < Math.round(area / 9000); i++) {
      const x = random() * width;
      const y = random() * period;
      clovers += `M${f1(x)},${f1(y - 2.6)}h.01M${f1(x - 2.4)},${f1(y + 1.4)}h.01M${f1(x + 2.4)},${f1(y + 1.4)}h.01`;
    }

    const colors = [['#ffffff', '#f4c542'], ['#ffffff', '#f4c542'], ['#9cc3ff', '#fff3b0'], ['#ffd84a', '#f29a00'], ['#ffa6cc', '#fff3b0']];
    let blooms = '';
    for (let i = 0; i < Math.round(area / 3200); i++) {
      const x = random() * width;
      const y = random() * period;
      const [petal, heart] = colors[Math.floor(random() * colors.length)];
      if (Math.abs(x - centerAt(y)) < 38) continue;
      const cluster = random() < 0.4 ? 3 : 1;
      for (let k = 0; k < cluster; k++) {
        const cx = x + (k ? (random() - 0.5) * 22 : 0);
        const cy = y + (k ? (random() - 0.5) * 12 : 0);
        const r = 2.2 + random() * 1.2;
        let dots = '';
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * 2 * Math.PI + random();
          dots += `M${f1(cx + Math.cos(a) * r)},${f1(cy + Math.sin(a) * r * 0.8)}h.01`;
        }
        blooms += `<path stroke="${petal}" stroke-width="${f1(r * 1.25)}" d="${dots}"/><circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r * 0.55)}" fill="${heart}"/>`;
      }
    }

    const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${period}" viewBox="0 0 ${width} ${period}"><radialGradient id="l"><stop offset="0" stop-color="#f6ffb8" stop-opacity=".2"/><stop offset="1" stop-color="#f6ffb8" stop-opacity="0"/></radialGradient><radialGradient id="d"><stop offset="0" stop-color="#0b3519" stop-opacity=".2"/><stop offset="1" stop-color="#0b3519" stop-opacity="0"/></radialGradient>${patches}<g fill="none" stroke-linecap="round" stroke-width="1.5"><path stroke="#0f4a26" stroke-opacity=".5" d="${dark}"/><path stroke="#d4f59a" stroke-opacity=".55" d="${light}"/><path stroke="#2c7a3c" stroke-opacity=".6" stroke-width="4" d="${clovers}"/></g><g fill="none" stroke-linecap="round">${blooms}</g></svg>`;
    const ground = meadow.querySelector('.garden-ground');
    ground.style.setProperty('--grass', `url("data:image/svg+xml,${encodeURIComponent(tile)}")`);
    ground.style.setProperty('--grass-size', `${width}px ${period}px`);
    ground.style.setProperty('--grass-y', `${flowersContainer.offsetTop - ground.offsetTop}px`);
  }

  // Solo se mecen las flores cercanas a la pantalla
  const nearWatcher = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => entry.target.classList.toggle('is-near', entry.isIntersecting));
    }, { rootMargin: '120px 0px' })
    : null;

  function levelLabel(level) {
    if (level >= 95) return 'Radiante y florecida';
    if (level >= 75) return 'Contenta';
    return 'Con ganitas de agua';
  }

  function renderGarden(newlyPlantedId = null) {
    const flowers = FlowerStore.getAll();
    if (nearWatcher) nearWatcher.disconnect();
    flowersContainer.innerHTML = '';
    gardenColumns = columnsForWidth();
    flowersContainer.style.setProperty('--rows', Math.max(3, Math.ceil((flowers.length * 2) / gardenColumns) + 2));
    drawGardenTrail();
    $('meadowEmpty').hidden = flowers.length > 0;
    let hintDone = true;
    try { hintDone = localStorage.getItem('jardin_magico_pista') === '1'; } catch (e) {}
    $('meadowHint').hidden = hintDone || flowers.length === 0;

    $('gardenCounterText').textContent = flowers.length === 0
      ? 'Un jardín por estrenar'
      : `${flowers.length} ${flowers.length === 1 ? 'flor eterna' : 'flores eternas'}`;

    flowers.forEach((flower, index) => {
      const slot = flowerSlot(index, gardenColumns, flower.id);
      const level = FlowerStore.levelOf(flower);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = nearWatcher ? 'flower-item' : 'flower-item is-near';
      button.dataset.id = flower.id;
      button.setAttribute('aria-label', `${flower.title}, ${formatDate(flower.date)}`);
      button.style.cssText = `--x:${slot.x.toFixed(2)}%;--r:${slot.row.toFixed(2)};--n:${slot.nudge.toFixed(1)}px;--s:${slot.scale.toFixed(3)};z-index:${20 + index};--sway-delay:-${(index * 1.3) % 5}s;--level:${level}%`;
      button.innerHTML = `<span class="flower-body"><span class="flower-sway">${createFlowerSVG(flower.type, flower.color, { seed: flower.id, sprouting: flower.id === newlyPlantedId })}</span></span><span class="flower-name"></span><span class="flower-meter"><i></i></span>`;
      button.querySelector('.flower-name').textContent = flower.title;
      if (level < 95) button.querySelector('.flower-svg').style.opacity = (0.75 + level / 400).toFixed(2);
      button.addEventListener('click', () => {
        if (state.watering) triggerWaterFlower(flower.id, button);
        else openFlowerDetail(flower.id);
      });
      flowersContainer.appendChild(button);
      if (nearWatcher) nearWatcher.observe(button);
    });
    Butterflies.refresh();
  }

  function sceneBox(element) {
    const box = element.getBoundingClientRect();
    const origin = scene.getBoundingClientRect();
    return { left: box.left - origin.left, top: box.top - origin.top, width: box.width, height: box.height };
  }

  // ================= 5. REGADERA MÁGICA =================
  function makeHappy(element) {
    element.classList.remove('flower-happy');
    void element.offsetWidth;
    element.classList.add('flower-happy');
    setTimeout(() => element.classList.remove('flower-happy'), 900);
  }

  function refreshFlowerLevel(id) {
    const element = flowersContainer.querySelector(`[data-id="${CSS.escape(id)}"]`);
    if (!element) return;
    element.style.setProperty('--level', '100%');
    element.querySelector('.flower-svg').style.opacity = '';
  }

  function floatHearts(layer, x, y) {
    const colors = ['#b4552d', '#c8737a', '#e3ae2b'];
    for (let i = 0; i < 4; i++) {
      const heart = document.createElement('span');
      heart.className = 'floating-heart';
      heart.innerHTML = HEART_SVG;
      heart.style.cssText = `left:${x + (Math.random() - 0.5) * 42}px;top:${y + (Math.random() - 0.5) * 18}px;--heart:${colors[i % 3]};--drift:${(Math.random() - 0.5) * 42}px;animation-delay:${i * 0.14}s`;
      layer.appendChild(heart);
      setTimeout(() => heart.remove(), 2300);
    }
  }

  function triggerWaterFlower(id, element) {
    const layer = $('waterLayer');
    const box = sceneBox(element);
    const blossomX = box.left + box.width / 2;
    const blossomY = box.top + box.height * 0.28;

    Sound.water();

    const can = document.createElement('span');
    can.className = 'watering-can';
    can.innerHTML = CAN_SVG;
    can.style.left = `${blossomX}px`;
    can.style.top = `${blossomY - 22}px`;
    layer.appendChild(can);
    setTimeout(() => can.remove(), 1550);

    for (let i = 0; i < 16; i++) {
      const drop = document.createElement('span');
      drop.className = 'water-droplet';
      drop.style.cssText = `left:${blossomX + Math.random() * 26 - 13}px;top:${blossomY - 18}px;--fall:${box.height * 0.5 + Math.random() * 30}px;animation-delay:${0.34 + Math.random() * 0.62}s`;
      layer.appendChild(drop);
      setTimeout(() => drop.remove(), 1800);
    }

    setTimeout(() => {
      FlowerStore.water(id);
      refreshFlowerLevel(id);
      makeHappy(element);
      floatHearts(layer, blossomX, blossomY);
      const rect = element.getBoundingClientRect();
      celebrate({
        particleCount: 16,
        spread: 42,
        startVelocity: 18,
        origin: { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height * 0.28) / window.innerHeight },
        colors: ['#7fb4c9', '#a9c9c8', '#e3ae2b']
      });
      Butterflies.visit(element);
    }, 950);
  }

  function setWateringMode(on) {
    state.watering = on;
    document.body.classList.toggle('watering-mode', on);
    $('btnWateringCan').setAttribute('aria-pressed', String(on));
    $('wateringLabel').textContent = on ? 'Listo' : 'Regar';
    if (on) toast('Toca una flor para regarla');
  }

  $('btnWateringCan').addEventListener('click', () => setWateringMode(!state.watering));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.watering && !document.querySelector('dialog[open]')) setWateringMode(false);
  });

  // ================= 6. MEMORIA: POLAROID Y CARTICA =================
  const FLOWER_NAMES = {
    astromelia: 'Astromelia eterna',
    sunflower: 'Girasol eterno',
    rose: 'Rosa eterna',
    tulip: 'Tulipán elegante',
    daisy: 'Margarita silvestre',
    wildflower: 'Flor de la casita'
  };

  function setPolaroid(image, ref, flower, kind) {
    const placeholder = placeholderPhoto(flower, kind);
    image.onerror = () => { image.onerror = null; image.src = placeholder; };
    image.src = placeholder;
    if (ref) Media.url(ref).then((url) => { if (url) image.src = url; }).catch(() => {});
  }

  function showWaterLevel(flower) {
    const level = FlowerStore.levelOf(flower);
    $('modalWaterLevel').textContent = `${level}% · ${levelLabel(level)}`;
  }

  function openFlowerDetail(id) {
    const flower = FlowerStore.get(id);
    if (!flower) return;
    state.activeFlower = flower;
    $('meadowHint').hidden = true;
    try { localStorage.setItem('jardin_magico_pista', '1'); } catch (e) {}
    $('modalFlowerArt').innerHTML = createFlowerSVG(flower.type, flower.color, { head: true, seed: flower.id });
    $('modalFlowerTypeTag').textContent = FLOWER_NAMES[flower.type];
    $('modalTitle').textContent = flower.title;
    $('modalDate').textContent = `Regalada con todo mi amor el ${formatDate(flower.date)}`;
    $('modalLetter').textContent = flower.letter;
    $('modalSignature').textContent = `— ${flower.signature}`;
    $('modalMeaning').textContent = flower.meaning;
    setPolaroid($('modalFlowerPhoto'), flower.realPhoto, flower, 'real');
    setPolaroid($('modalCouplePhoto'), flower.couplePhoto, flower, 'couple');
    showWaterLevel(flower);
    $('btnFlowerMelody').hidden = !flower.music;
    Music.updateUI();
    switchModalTab('Carta');
    openSheet(flowerModal);
    flowerModal.scrollTop = 0;
  }

  $('btnCloseModal').addEventListener('click', () => closeSheet(flowerModal));

  const TAB_NAMES = ['Carta', 'Fotos', 'Significado'];

  function switchModalTab(name) {
    TAB_NAMES.forEach((tab) => {
      const active = tab === name;
      const button = $(`tabBtn${tab}`);
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      $(`tabContent${tab}`).hidden = !active;
    });
  }

  TAB_NAMES.forEach((tab, index) => {
    const button = $(`tabBtn${tab}`);
    button.addEventListener('click', () => switchModalTab(tab));
    button.addEventListener('keydown', (event) => {
      const step = { ArrowRight: 1, ArrowLeft: -1 }[event.key];
      if (!step) return;
      const next = TAB_NAMES[(index + step + TAB_NAMES.length) % TAB_NAMES.length];
      switchModalTab(next);
      $(`tabBtn${next}`).focus();
    });
  });

  $('btnWaterSingleFlower').addEventListener('click', () => {
    const flower = state.activeFlower;
    if (!flower) return;
    const updated = FlowerStore.water(flower.id);
    showWaterLevel(updated);
    refreshFlowerLevel(flower.id);
    Sound.water();
    celebrate({ particleCount: 40, spread: 70, origin: { y: 0.65 }, colors: ['#7fb4c9', '#a9c9c8', '#e3ae2b'] }, flowerModal);
    const element = flowersContainer.querySelector(`[data-id="${CSS.escape(flower.id)}"]`);
    if (element) {
      makeHappy(element);
      Butterflies.visit(element);
    }
  });

  // ================= 7. RECUERDO DESCARGABLE (IMAGEN Y PDF) =================
  function loadImage(src, crossOrigin) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      if (crossOrigin) image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  // Una foto en otro dominio sin permiso de CORS se cambia por el dibujo:
  // si no, el navegador se negaría a exportar el lienzo.
  async function loadPhoto(ref, flower, kind) {
    try {
      const url = await Media.url(ref);
      if (url) return await loadImage(url, /^https?:/.test(url));
    } catch (e) {
      console.warn('Foto no disponible para exportar', e);
    }
    return loadImage(placeholderPhoto(flower, kind));
  }

  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    text.split('\n').forEach((paragraph) => {
      if (!paragraph.trim()) { lines.push(''); return; }
      let line = '';
      paragraph.split(/\s+/).forEach((word) => {
        const candidate = line ? `${line} ${word}` : word;
        if (ctx.measureText(candidate).width > maxWidth && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      });
      lines.push(line);
    });
    return lines;
  }

  function drawCover(ctx, image, x, y, width, height) {
    const scale = Math.max(width / image.width, height / image.height);
    const sw = width / scale;
    const sh = height / scale;
    ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, width, height);
  }

  function drawPolaroid(ctx, image, caption, x, y, width, angle) {
    const pad = 20;
    const photoHeight = (width - pad * 2) * 1.2;
    const height = photoHeight + pad + 74;
    ctx.save();
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(angle);
    ctx.translate(-width / 2, -height / 2);
    drawCover(ctx, image, pad, pad, width - pad * 2, photoHeight);
    ctx.fillStyle = '#1f2a20';
    ctx.font = '400 30px Newsreader, serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, width / 2, photoHeight + pad + 50);
    ctx.restore();
    return height;
  }

  async function ensureFonts() {
    if (!document.fonts) return;
    await Promise.all([
      '400 60px Newsreader', 'italic 400 32px Newsreader'
    ].map((font) => document.fonts.load(font).catch(() => {})));
  }

  async function renderScrapbook(flower) {
    await ensureFonts();
    const width = 1080;
    const margin = 72;
    const measure = document.createElement('canvas').getContext('2d');

    // La carta decide la altura; si es muy larga, la letra se encoge un poco.
    let letterSize = 38;
    let letterLines;
    do {
      measure.font = `400 ${letterSize}px Newsreader, serif`;
      letterLines = wrapLines(measure, flower.letter, width - margin * 2 - 72);
      if (letterLines.length * letterSize * 1.5 < 1700) break;
      letterSize -= 3;
    } while (letterSize > 24);
    const letterHeight = letterLines.length * letterSize * 1.5;

    measure.font = '400 60px Newsreader, serif';
    const titleLines = wrapLines(measure, flower.title, width - margin * 2);
    measure.font = 'italic 400 32px Newsreader, serif';
    const meaningLines = wrapLines(measure, flower.meaning, width - margin * 2 - 20);

    const headHeight = 262 + titleLines.length * 68 + 60;
    const photoBlock = 620;
    const letterBlock = letterHeight + 170;
    const meaningBlock = meaningLines.length * 42 + 90;
    const height = Math.ceil(headHeight + photoBlock + letterBlock + meaningBlock + 110);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#faf7ef';
    ctx.fillRect(0, 0, width, height);

    const art = await loadImage(svgDataURI(createFlowerSVG(flower.type, flower.color, { seed: flower.id }), 120, 220));
    ctx.drawImage(art, width / 2 - 60, 38, 120, 220);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2a20';
    ctx.font = '400 60px Newsreader, serif';
    let y = 318;
    titleLines.forEach((line) => { ctx.fillText(line, width / 2, y); y += 68; });
    ctx.fillStyle = '#55604f';
    ctx.font = 'italic 400 32px Newsreader, serif';
    ctx.fillText(formatDate(flower.date), width / 2, y - 12);
    y += 44;

    const [real, couple] = await Promise.all([
      loadPhoto(flower.realPhoto, flower, 'real'),
      loadPhoto(flower.couplePhoto, flower, 'couple')
    ]);
    const polaroidWidth = 420;
    drawPolaroid(ctx, real, 'Las flores que te di', margin + 8, y + 16, polaroidWidth, 0);
    drawPolaroid(ctx, couple, 'Un recuerdo eterno', width - margin - polaroidWidth - 8, y + 16, polaroidWidth, 0);
    y += photoBlock;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(margin, y, width - margin * 2, letterHeight + 140);
    ctx.fillStyle = '#1f2a20';
    ctx.textAlign = 'left';
    ctx.font = `400 ${letterSize}px Newsreader, serif`;
    let lineY = y + 36 + letterSize;
    letterLines.forEach((line) => { ctx.fillText(line, margin + 36, lineY); lineY += letterSize * 1.5; });
    ctx.fillStyle = '#55604f';
    ctx.textAlign = 'right';
    ctx.font = '400 38px Newsreader, serif';
    ctx.fillText(`— ${flower.signature}`, width - margin - 36, lineY + 22);
    y += letterBlock + 30;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#55604f';
    ctx.font = 'italic 400 32px Newsreader, serif';
    meaningLines.forEach((line) => { ctx.fillText(line, width / 2, y); y += 42; });

    ctx.fillStyle = '#55604f';
    ctx.font = '400 40px Newsreader, serif';
    ctx.fillText('Nuestro Jardín · flores eternas', width / 2, height - 44);
    return canvas;
  }

  // Un PDF de una página con la imagen dentro. No hace falta ninguna librería.
  function jpegToPDF(jpegBytes, imageWidth, imageHeight) {
    const pageWidth = 595;
    const pageHeight = (imageHeight / imageWidth) * pageWidth;
    const encoder = new TextEncoder();
    const parts = [];
    const offsets = [];
    let position = 0;
    const push = (chunk) => {
      const bytes = typeof chunk === 'string' ? encoder.encode(chunk) : chunk;
      parts.push(bytes);
      position += bytes.length;
    };
    const content = `q ${pageWidth} 0 0 ${pageHeight.toFixed(2)} 0 0 cm /Im0 Do Q`;
    const open = (number) => { offsets[number] = position; push(`${number} 0 obj\n`); };

    push('%PDF-1.4\n');
    open(1); push('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    open(2); push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    open(3); push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`);
    open(4); push(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`);
    push(jpegBytes);
    push('\nendstream\nendobj\n');
    open(5); push(`<< /Length ${content.length} >>\nstream\n${content}\nendstream\nendobj\n`);
    const xref = position;
    push('xref\n0 6\n0000000000 65535 f \n');
    for (let i = 1; i <= 5; i++) push(`${String(offsets[i]).padStart(10, '0')} 00000 n \n`);
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    return new Blob(parts, { type: 'application/pdf' });
  }

  async function exportMemory(button, format) {
    const flower = state.activeFlower;
    if (!flower) return;
    button.disabled = true;
    try {
      const canvas = await renderScrapbook(flower);
      const name = `recuerdo-${slug(flower.title)}`;
      if (format === 'png') {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        downloadBlob(blob, `${name}.png`);
      } else {
        const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.92));
        const bytes = new Uint8Array(await blob.arrayBuffer());
        downloadBlob(jpegToPDF(bytes, canvas.width, canvas.height), `${name}.pdf`);
      }
      toast('Tu recuerdo ya se está descargando');
    } catch (e) {
      console.error('No se pudo crear el recuerdo', e);
      toast('No pude crear el recuerdo. Inténtalo otra vez.');
    } finally {
      button.disabled = false;
    }
  }

  $('btnExportPNG').addEventListener('click', (event) => exportMemory(event.currentTarget, 'png'));
  $('btnExportPDF').addEventListener('click', (event) => exportMemory(event.currentTarget, 'pdf'));

  // ================= 8. CEREMONIA DE BROTE =================
  function handleQRScan(flower) {
    const stage = $('sproutAnimationStage');
    const finish = $('btnFinishSprout');
    let started = false;

    stage.dataset.phase = 'seed';
    stage.disabled = false;
    $('sproutFlower').innerHTML = '';
    $('sproutTitle').textContent = 'Llegó una semillita';
    $('sproutSubtitle').textContent = 'Toca la tierra para plantarla.';
    finish.hidden = true;
    openSheet(sproutModal);

    const begin = (touched) => {
      if (started) return;
      started = true;
      clearTimeout(autoStart);
      // El navegador solo deja sonar el audio después de un toque.
      if (touched) {
        Sound.tinkle();
        if (flower.music) Music.play(flower.music);
      }
      stage.dataset.phase = 'sprout';
      stage.setAttribute('aria-label', 'La semilla está brotando');
      $('sproutTitle').textContent = 'Está brotando';
      $('sproutSubtitle').textContent = 'Mira cómo sale de la tierra.';

      setTimeout(() => {
        stage.dataset.phase = 'bloom';
        stage.querySelector('.sprout-seedling').style.opacity = 0;
        $('sproutFlower').innerHTML = createFlowerSVG(flower.type, flower.color, { seed: flower.id, sprouting: true });
      }, 1300);

      setTimeout(() => {
        if (touched) Sound.chime();
        celebrate({ particleCount: 110, spread: 90, startVelocity: 38, origin: { y: 0.55 }, colors: ['#e3ae2b', '#d98a2b', '#edd27a', '#6a8742', '#c8737a'] }, sproutModal);
        $('sproutTitle').textContent = 'Ya nació tu flor';
        $('sproutSubtitle').textContent = `${flower.title}. Vivirá aquí para siempre.`;
        finish.hidden = false;
        finish.focus();
      }, 3100);
    };

    const autoStart = setTimeout(() => begin(false), 6000);
    stage.onclick = () => begin(true);

    finish.onclick = async () => {
      await closeSheet(sproutModal);
      stage.querySelector('.sprout-seedling').style.opacity = '';
      renderGarden(flower.id);
      const element = flowersContainer.querySelector(`[data-id="${CSS.escape(flower.id)}"]`);
      if (!element) return;
      element.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
      setTimeout(() => {
        const rect = element.getBoundingClientRect();
        Ambient.burstPetals(rect.left + rect.width / 2, rect.top + rect.height * 0.3);
        Butterflies.visit(element);
      }, 1400);
      setTimeout(() => openFlowerDetail(flower.id), 2500);
    };
  }

  async function receiveFlower(flower) {
    const alreadyPlanted = Boolean(FlowerStore.get(flower.id));
    const saved = await FlowerStore.add(flower);
    if (!saved) {
      toast('Tu teléfono no tiene espacio para guardar esta flor. Libera un poquito e inténtalo otra vez.');
      return;
    }
    renderGarden();
    if (alreadyPlanted) {
      toast('Esta flor ya vive en tu jardín');
      openFlowerDetail(flower.id);
      return;
    }
    // Se esconde hasta que termine la ceremonia, aunque ya esté guardada.
    const element = flowersContainer.querySelector(`[data-id="${CSS.escape(flower.id)}"]`);
    if (element) element.style.visibility = 'hidden';
    handleQRScan(saved);
  }

  async function checkURLForFlower() {
    const params = new URLSearchParams(window.location.search);
    const packagedId = params.get('f');
    const hasCode = params.has('flor');
    const scannedFlower = FlowerStore.decodeFlowerFromURL();
    if (params.has('panel')) unlockPanel(true);
    // Se limpia la barra para que recargar la página no repita la ceremonia.
    if (hasCode || packagedId || params.has('panel')) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    if (hasCode) {
      if (scannedFlower) await receiveFlower(scannedFlower);
      else toast('No pude leer esta semillita. Prueba a escanear el código otra vez.');
    } else if (packagedId) {
      try {
        const flower = await FlowerStore.fetchPackagedFlower(packagedId);
        if (flower) await receiveFlower(flower);
        else toast('Esta flor aún no ha llegado al jardín. Prueba otra vez en un ratito.');
      } catch (e) {
        console.error('No se pudo traer la flor', e);
        toast('No pude traer tu flor. Revisa tu conexión y vuelve a escanear el código.');
      }
    }
  }

  // ================= 9. BANQUITA Y BUZÓN =================
  $('btnBench').addEventListener('click', () => openSheet(benchModal));
  $('btnCloseBench').addEventListener('click', () => closeSheet(benchModal));

  function waterEverything() {
    FlowerStore.waterAll();
    flowersContainer.querySelectorAll('.flower-item').forEach((element, index) => {
      refreshFlowerLevel(element.dataset.id);
      setTimeout(() => makeHappy(element), index * 60);
    });
  }

  $('btnBenchWaterAll').addEventListener('click', async () => {
    await closeSheet(benchModal);
    Sound.water();
    waterEverything();
    celebrate({ particleCount: 70, spread: 100, origin: { y: 0.7 }, colors: ['#7fb4c9', '#a9c9c8', '#e3ae2b'] });
    toast('Todo el jardín quedó radiante');
  });

  $('btnLoveLetters').addEventListener('click', () => openSheet(lettersModal));
  $('btnCloseLetters').addEventListener('click', () => closeSheet(lettersModal));

  QUICK_LETTERS.forEach((letter) => {
    const details = document.createElement('details');
    details.className = 'envelope';
    details.innerHTML = `<summary><svg viewBox="0 0 30 22" aria-hidden="true"><rect x="1" y="1" width="28" height="20" rx="2" fill="none" stroke="currentColor" stroke-width="1.4"/><path class="flap" d="M1.5,2 L15,12 L28.5,2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg><span></span></summary><p></p>`;
    details.querySelector('span').textContent = letter.label;
    details.querySelector('p').textContent = letter.text;
    details.addEventListener('toggle', () => { if (details.open) Sound.tinkle(); });
    $('quickLettersList').appendChild(details);
  });

  // ================= 10. LLUVIA =================
  let rainWaterTimer = null;
  $('btnRain').addEventListener('click', () => {
    state.raining = !state.raining;
    document.body.classList.toggle('is-raining', state.raining);
    $('btnRain').setAttribute('aria-pressed', String(state.raining));
    clearTimeout(rainWaterTimer);
    if (state.raining) {
      Sound.startRain();
      // Si llueve un ratico, las flores quedan regadas solas.
      rainWaterTimer = setTimeout(() => {
        waterEverything();
        toast('La lluvia regó todas tus flores');
      }, 9000);
    } else {
      Sound.stopRain();
    }
    Butterflies.refresh();
  });

  // ================= 11. EL HADA Y LAS MARIPOSAS =================
  const Butterflies = (() => {
    const layer = $('butterflies');
    const COLORS = ['#f7f3e6', '#e8a93a', '#b4552d'];
    let flock = [];
    let last = 0;
    let running = false;

    function create(index) {
      const main = COLORS[index % COLORS.length];
      const el = document.createElement('button');
      el.type = 'button';
      el.tabIndex = -1;
      // La primera siempre es un hada, con su luz; las demás son mariposas.
      const isFairy = index === 0;
      el.className = isFairy ? 'butterfly is-fairy' : 'butterfly';
      const wings = (fill) => `<path class="wing wing--l" d="M19,16 C14,2 3,0 2,8 C1,15 9,17 19,16 C10,18 5,24 9,28 C13,31 18,24 19,16 Z" fill="${fill}"/><path class="wing wing--r" d="M19,16 C24,2 35,0 36,8 C37,15 29,17 19,16 C28,18 33,24 29,28 C25,31 20,24 19,16 Z" fill="${fill}"/>`;
      el.innerHTML = isFairy
        ? `<svg viewBox="0 0 38 32"><radialGradient id="fairyGlow"><stop offset="0" stop-color="#fff2a8" stop-opacity=".85"/><stop offset="1" stop-color="#fff2a8" stop-opacity="0"/></radialGradient><circle cx="19" cy="16" r="22" fill="url(#fairyGlow)"/>${wings('#eaf8ff')}<path fill="#f76aa8" d="M19,13 C16,18 15,23 14,27 C17,29 21,29 24,27 C23,23 22,18 19,13 Z"/><circle cx="19" cy="10" r="3.8" fill="#f8d7bb"/><path fill="#a0522d" d="M15,10 C15,4 23,4 23,10 C21,7 17,7 15,10 Z"/><path fill="#fff4b8" d="M28,20 l1,3 l3,1 l-3,1 l-1,3 l-1,-3 l-3,-1 l3,-1 Z"/></svg>`
        : `<svg viewBox="0 0 38 32">${wings(main)}</svg>`;
      const butterfly = {
        el, x: Math.random() * window.innerWidth, y: Math.random() * 300 + 100,
        tx: 0, ty: 0, phase: Math.random() * 6.28, speed: 42 + Math.random() * 30,
        perchedFor: 0, perched: false, target: null, facing: 1
      };
      el.addEventListener('pointerdown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        Sound.tinkle();
        flee(butterfly);
      });
      el.addEventListener('click', (event) => event.stopPropagation());
      layer.appendChild(el);
      wander(butterfly);
      return butterfly;
    }

    function wander(butterfly) {
      const box = scene.getBoundingClientRect();
      butterfly.perched = false;
      butterfly.target = null;
      butterfly.el.classList.remove('is-perched');
      butterfly.tx = Math.random() * box.width;
      const viewTop = Math.max(0, -box.top);
      const top = Math.max(viewTop, meadow.offsetTop * 0.65);
      butterfly.ty = top + Math.random() * Math.max(40, viewTop + window.innerHeight - 100 - top);
    }

    function flee(butterfly) {
      wander(butterfly);
      butterfly.ty = Math.max(0, -scene.getBoundingClientRect().top) + 50;
      butterfly.boost = 3.2;
    }

    function goTo(butterfly, flower) {
      const box = sceneBox(flower);
      butterfly.perched = false;
      butterfly.target = flower;
      butterfly.el.classList.remove('is-perched');
      butterfly.tx = box.left + box.width / 2;
      butterfly.ty = box.top + box.height * 0.2;
    }

    function pickFlower(butterfly) {
      const flowers = flowersContainer.querySelectorAll('.flower-item.is-near');
      if (flowers.length && Math.random() < 0.6) goTo(butterfly, flowers[Math.floor(Math.random() * flowers.length)]);
      else wander(butterfly);
    }

    function active() {
      return !reducedMotion && !state.raining && state.time !== 'night' && flowersContainer.childElementCount > 0;
    }

    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      flock.forEach((butterfly) => {
        if (butterfly.perched) {
          butterfly.perchedFor -= dt;
          if (butterfly.perchedFor <= 0 || !butterfly.target.isConnected) pickFlower(butterfly);
        } else {
          const dx = butterfly.tx - butterfly.x;
          const dy = butterfly.ty - butterfly.y;
          const distance = Math.hypot(dx, dy);
          if (distance < 6) {
            if (butterfly.target) {
              butterfly.perched = true;
              butterfly.perchedFor = 4 + Math.random() * 6;
              butterfly.el.classList.add('is-perched');
            } else {
              pickFlower(butterfly);
            }
          } else {
            butterfly.boost = Math.max(1, (butterfly.boost || 1) - dt * 1.4);
            const step = butterfly.speed * butterfly.boost * dt;
            butterfly.phase += dt * 5;
            const wobble = distance > 30 ? Math.sin(butterfly.phase) * 26 * dt : 0;
            butterfly.x += (dx / distance) * step + (-dy / distance) * wobble;
            butterfly.y += (dy / distance) * step + (dx / distance) * wobble;
            if (Math.abs(dx) > 4) butterfly.facing = dx > 0 ? 1 : -1;
          }
        }
        const tilt = butterfly.perched ? 0 : butterfly.facing * 16;
        butterfly.el.style.transform = `translate3d(${butterfly.x.toFixed(1)}px,${butterfly.y.toFixed(1)}px,0) rotate(${tilt}deg)`;
      });
    }

    return {
      refresh() {
        const on = active();
        const wanted = Math.min(3, 1 + Math.floor(flowersContainer.childElementCount / 2));
        while (flock.length < wanted && !reducedMotion) flock.push(create(flock.length));
        flock.forEach((butterfly) => butterfly.el.classList.toggle('is-gone', !on));
        if (on && !running) {
          running = true;
          last = performance.now();
          requestAnimationFrame(tick);
        } else if (!on) {
          running = false;
        }
      },
      // Una mariposa siempre llega a la flor recién regada.
      visit(flower) {
        if (!active() || !flock.length) return;
        const box = sceneBox(flower);
        const nearest = flock.reduce((best, butterfly) => {
          const distance = Math.hypot(butterfly.x - box.left, butterfly.y - box.top);
          return distance < best.distance ? { butterfly, distance } : best;
        }, { butterfly: flock[0], distance: Infinity }).butterfly;
        goTo(nearest, flower);
        nearest.boost = 2;
      }
    };
  })();

  // ================= 12. RECUERDOS Y COPIA DE SEGURIDAD =================
  function renderChest() {
    const list = $('chestList');
    list.innerHTML = '';
    const flowers = FlowerStore.getAll().sort((a, b) => b.date.localeCompare(a.date));
    if (!flowers.length) {
      const empty = document.createElement('li');
      empty.className = 'card-note';
      empty.textContent = 'Todavía no hay flores. La primera llegará con un código QR.';
      list.appendChild(empty);
    }
    flowers.forEach((flower) => {
      const item = document.createElement('li');
      item.innerHTML = `<button class="memory-row" type="button"><span class="memory-row__art">${createFlowerSVG(flower.type, flower.color, { head: true })}</span><span class="memory-row__text"><strong></strong><small></small></span></button>`;
      item.querySelector('strong').textContent = flower.title;
      item.querySelector('small').textContent = formatDate(flower.date);
      item.querySelector('button').addEventListener('click', async () => {
        await closeSheet(chestModal);
        openFlowerDetail(flower.id);
      });
      list.appendChild(item);
    });
  }

  $('btnChest').addEventListener('click', () => {
    renderChest();
    showError($('backupError'), '');
    $('toggleSfx').checked = Sound.enabled;
    openSheet(chestModal);
  });
  $('btnCloseChest').addEventListener('click', () => closeSheet(chestModal));
  $('toggleSfx').addEventListener('change', (event) => Sound.setEnabled(event.target.checked));

  $('btnExportBackup').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const backup = await FlowerStore.exportBackup();
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
      downloadBlob(blob, `nuestro-jardin-${todayISO()}.json`);
      toast('Copia guardada. Consérvala en un lugar seguro.');
    } catch (e) {
      console.error('No se pudo crear la copia', e);
      showError($('backupError'), 'No pude crear la copia. Inténtalo otra vez.');
    } finally {
      button.disabled = false;
    }
  });

  $('fileImportBackup').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (!file) return;
    showError($('backupError'), '');
    try {
      const restored = await FlowerStore.importBackup(JSON.parse(await file.text()));
      renderGarden();
      renderChest();
      toast(restored === 1 ? 'Recuperé 1 flor' : `Recuperé ${restored} flores`);
    } catch (e) {
      console.error('No se pudo recuperar la copia', e);
      showError($('backupError'), e.message === 'espacio'
        ? 'Este teléfono no tiene espacio para toda la copia. Libera un poco e inténtalo otra vez.'
        : 'Ese archivo no es una copia del jardín. Elige el .json que descargaste con «Guardar copia».');
    }
  });

  // ================= 13. PANEL SECRETO =================
  const form = $('formCreateFlower');
  const PANEL_KEY = 'jardin_magico_panel';
  const SITE_KEY = 'jardin_magico_url';
  const media = { real: '', couple: '', music: '' };
  const pending = new Set();
  let currentFlowerId = newFlowerId();
  let currentURL = '';
  let currentPackage = null;
  let qrImageURL = '';

  function unlockPanel(announce) {
    $('btnOpenAdmin').hidden = false;
    try { localStorage.setItem(PANEL_KEY, '1'); } catch (e) {}
    if (announce) toast('Panel secreto desbloqueado en este dispositivo');
  }

  try {
    if (localStorage.getItem(PANEL_KEY) === '1') $('btnOpenAdmin').hidden = false;
  } catch (e) {}

  // Cinco toques seguidos a la casita abren el panel
  let signTaps = 0;
  let signTimer = null;
  $('shopSign').addEventListener('click', () => {
    signTaps += 1;
    clearTimeout(signTimer);
    signTimer = setTimeout(() => { signTaps = 0; }, 1800);
    if (signTaps >= 5) {
      signTaps = 0;
      unlockPanel(true);
    }
  });

  const TYPE_LABELS = { astromelia: 'Astromelia', sunflower: 'Girasol', rose: 'Rosa', tulip: 'Tulipán', daisy: 'Margarita', wildflower: 'Flor silvestre' };
  FLOWER_TYPES.forEach((type, index) => {
    const label = document.createElement('label');
    label.className = 'type-option';
    label.innerHTML = `<input type="radio" name="flowerType" value="${type}" ${index === 0 ? 'checked' : ''}><span></span>`;
    label.querySelector('span').textContent = TYPE_LABELS[type];
    $('typePicker').appendChild(label);
  });

  function selectedType() {
    return form.elements.flowerType.value;
  }

  function updatePreview() {
    const color = $('inputFlowerColor').value;
    $('panelPreview').innerHTML = createFlowerSVG(selectedType(), color, { seed: currentFlowerId });
    document.querySelectorAll('.color-preset').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.color === color));
    });
  }

  $('typePicker').addEventListener('change', updatePreview);
  $('inputFlowerColor').addEventListener('input', updatePreview);
  document.querySelectorAll('.color-preset').forEach((button) => {
    button.addEventListener('click', () => {
      $('inputFlowerColor').value = button.dataset.color;
      updatePreview();
    });
  });

  // Reduce la foto antes de guardarla: ocupa mucho menos y se ve igual en un celular.
  async function compressImage(file, maxSide = 1200, quality = 0.8) {
    const url = URL.createObjectURL(file);
    try {
      const image = await loadImage(url);
      const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', quality);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  function watchPhoto(inputId, key) {
    const errorEl = $(`${inputId}Error`);
    $(inputId).addEventListener('change', (event) => {
      const file = event.target.files[0];
      media[key] = '';
      showError(errorEl, '');
      if (!file) return;
      const job = compressImage(file)
        .then((dataURL) => { media[key] = dataURL; })
        .catch(() => {
          event.target.value = '';
          showError(errorEl, 'No pude abrir esa foto. Si es HEIC, expórtala como JPG y prueba otra vez.');
        })
        .finally(() => pending.delete(job));
      pending.add(job);
    });
  }
  watchPhoto('fileFlowerPhoto', 'real');
  watchPhoto('fileCouplePhoto', 'couple');

  const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
  $('inputFlowerMusic').addEventListener('change', (event) => {
    $('customMusicFields').hidden = event.target.value !== 'custom';
    showError($('musicError'), '');
  });

  $('fileFlowerMusic').addEventListener('change', (event) => {
    const file = event.target.files[0];
    media.music = '';
    showError($('musicError'), '');
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      event.target.value = '';
      showError($('musicError'), 'Esa canción pesa más de 8 MB. Usa una versión más ligera o un enlace directo.');
      return;
    }
    const job = blobToDataURL(file)
      .then((dataURL) => { media.music = dataURL; })
      .catch(() => showError($('musicError'), 'No pude leer ese archivo de audio.'))
      .finally(() => pending.delete(job));
    pending.add(job);
  });

  function photoFromLink(inputId, errorId) {
    const value = $(inputId).value.trim();
    if (!value) return '';
    if (!/^https?:\/\//i.test(value)) {
      showError($(errorId), 'El enlace de la foto debe empezar por https://');
      return null;
    }
    return value;
  }

  function musicFromForm() {
    const choice = $('inputFlowerMusic').value;
    if (choice !== 'custom') return choice;
    if (media.music) return media.music;
    const link = $('inputFlowerMusicUrl').value.trim();
    if (!link) {
      showError($('musicError'), 'Elige un archivo o pega un enlace directo a la canción.');
      return null;
    }
    if (!/^https?:\/\//i.test(link) || /youtube\.com|youtu\.be|spotify\.com/i.test(link)) {
      showError($('musicError'), 'Necesito un enlace directo a un .mp3. YouTube y Spotify no dejan reproducirse aquí: sube el archivo.');
      return null;
    }
    return link;
  }

  // Devuelve la flor del formulario, o null si algo necesita corrección.
  async function flowerFromForm({ strict }) {
    await Promise.all(pending);
    const title = $('inputFlowerTitle').value.trim();
    const letter = $('inputFlowerLetter').value.trim();
    showError($('titleError'), strict && !title ? 'Ponle un título a esta flor.' : '');
    showError($('letterError'), strict && !letter ? 'Escríbele su cartica antes de generar el QR.' : '');
    showError($('fileFlowerPhotoError'), '');
    showError($('fileCouplePhotoError'), '');
    showError($('musicError'), '');
    const realLink = media.real || photoFromLink('inputFlowerPhotoUrl', 'fileFlowerPhotoError');
    const coupleLink = media.couple || photoFromLink('inputCouplePhotoUrl', 'fileCouplePhotoError');
    const music = musicFromForm();
    const firstError = form.querySelector('.field-error:not([hidden])');
    if (firstError) {
      firstError.closest('.field').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return null;
    }
    return normalizeFlower({
      id: currentFlowerId,
      type: selectedType(),
      color: $('inputFlowerColor').value,
      title,
      date: $('inputFlowerDate').value,
      letter,
      meaning: $('inputFlowerMeaning').value.trim(),
      signature: $('inputFlowerSignature').value.trim(),
      realPhoto: realLink,
      couplePhoto: coupleLink,
      music
    });
  }

  function isLocalAddress(url) {
    return /^https?:\/\/(localhost|127\.|192\.168\.|10\.|\[::1\])/i.test(url) || /^file:/i.test(url);
  }

  function siteBaseURL() {
    const typed = $('inputSiteUrl').value.trim();
    if (!typed) return window.location.origin + window.location.pathname;
    try {
      const url = new URL(typed);
      if (!/^https?:$/.test(url.protocol)) throw new Error('protocolo');
      url.search = '';
      url.hash = '';
      return url.href.replace(/index\.html$/, '').replace(/([^/])$/, '$1/');
    } catch (e) {
      return null;
    }
  }

  function updateSiteHelp() {
    const base = siteBaseURL();
    const help = $('siteUrlHelp');
    showError($('siteUrlError'), base ? '' : 'Esa dirección no es válida. Debe empezar por https://');
    const local = base && isLocalAddress(base);
    help.classList.toggle('is-warning', Boolean(local));
    help.textContent = local
      ? 'Esta dirección solo existe en tu computadora: en su celular el QR no abrirá. Escribe la de tu sitio publicado.'
      : 'El QR abrirá esta dirección en su celular.';
    if (base) {
      try { localStorage.setItem(SITE_KEY, $('inputSiteUrl').value.trim()); } catch (e) {}
    }
  }
  $('inputSiteUrl').addEventListener('input', updateSiteHelp);

  function drawQR(text) {
    const box = $('qrcodeContainer');
    box.innerHTML = '';
    new QRCode(box, {
      text,
      width: 720,
      height: 720,
      colorDark: '#3f1d06',
      colorLight: '#ffffff',
      correctLevel: text.length > 500 ? QRCode.CorrectLevel.L : QRCode.CorrectLevel.M
    });
    box.removeAttribute('title');
    return box.querySelector('canvas').toDataURL('image/png');
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!window.QRCode) {
      toast('No cargó el generador de QR. Revisa tu conexión y recarga la página.');
      return;
    }
    const base = siteBaseURL();
    if (!base) {
      updateSiteHelp();
      $('inputSiteUrl').focus();
      return;
    }
    const flower = await flowerFromForm({ strict: true });
    if (!flower) return;

    const hasFiles = [flower.realPhoto, flower.couplePhoto, flower.music].some((value) => value.startsWith('data:'));
    const directURL = FlowerStore.encodeFlowerToURL(flower, base);
    const packaged = hasFiles || directURL.length > QR_DIRECT_LIMIT;

    currentPackage = packaged ? flower : null;
    currentURL = packaged ? FlowerStore.packagedFlowerURL(flower, base) : directURL;

    try {
      qrImageURL = drawQR(currentURL);
    } catch (e) {
      console.error('No se pudo dibujar el QR', e);
      toast('No pude dibujar el QR. Prueba otra vez.');
      return;
    }

    $('btnDownloadQR').href = qrImageURL;
    $('packageSteps').hidden = !packaged;
    $('btnDownloadPackage').hidden = !packaged;
    $('btnCheckPackage').hidden = !packaged;
    $('qrQuality').textContent = packaged
      ? 'Las fotos y las cartas largas no caben en un QR, así que esta flor vive en un archivo aparte y el código solo la llama.'
      : currentURL.length <= 400
        ? 'Toda la flor va dentro del código y es fácil de escanear, incluso impreso pequeñito.'
        : 'Toda la flor va dentro del código. Está algo denso: imprímelo de al menos 5 cm.';
    if (isLocalAddress(currentURL)) {
      $('qrQuality').textContent += ' Ojo: apunta a esta computadora, así que en su celular no abrirá.';
    }
    $('qrResultSection').hidden = false;
    $('qrResultSection').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' });
  });

  $('btnDownloadPackage').addEventListener('click', async () => {
    if (!currentPackage) return;
    const data = await FlowerStore.packageFlower(currentPackage);
    downloadBlob(new Blob([JSON.stringify(data)], { type: 'application/json' }), `${currentPackage.id}.json`);
  });

  $('btnCheckPackage').addEventListener('click', async () => {
    const target = new URL(currentURL);
    if (target.origin !== window.location.origin) {
      window.open(currentURL, '_blank', 'noopener');
      return;
    }
    const found = await FlowerStore.fetchPackagedFlower(currentPackage.id).catch(() => null);
    toast(found ? 'Ya está publicada. El QR funcionará.' : `Todavía no encuentro flores/${currentPackage.id}.json. ¿Ya publicaste?`);
  });

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const area = document.createElement('textarea');
    area.value = text;
    adminModal.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) throw new Error('copy');
  }

  $('btnCopyQRLink').addEventListener('click', async () => {
    try {
      await copyText(currentURL);
      toast('Enlace copiado');
    } catch (e) {
      toast('No pude copiar el enlace en este navegador.');
    }
  });

  $('btnDownloadCard').addEventListener('click', async () => {
    await ensureFonts();
    const width = 900;
    const height = 1200;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#faf7ef';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#1f2a20';
    ctx.font = '400 104px Newsreader, serif';
    ctx.fillText('Para ti', width / 2, 190);
    const art = await loadImage(svgDataURI(createFlowerSVG(selectedType(), $('inputFlowerColor').value, { head: true }), 160, 160));
    ctx.drawImage(art, width / 2 - 60, 212, 120, 120);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.roundRect(width / 2 - 300, 350, 600, 600, 24);
    ctx.fill();
    const qr = await loadImage(qrImageURL);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(qr, width / 2 - 264, 386, 528, 528);
    ctx.fillStyle = '#1f2a20';
    ctx.font = '400 50px Newsreader, serif';
    ctx.fillText('Escanéame y nacerá tu flor', width / 2, 1050);
    ctx.fillStyle = '#55604f';
    ctx.font = 'italic 400 32px Newsreader, serif';
    ctx.fillText('Las flores reales se marchitan. Esta no.', width / 2, 1110);
    canvas.toBlob((blob) => downloadBlob(blob, `tarjetita-${slug($('inputFlowerTitle').value)}.png`), 'image/png');
  });

  function resetForm() {
    form.reset();
    media.real = media.couple = media.music = '';
    currentFlowerId = newFlowerId();
    currentPackage = null;
    currentURL = '';
    $('inputFlowerDate').value = todayISO();
    $('customMusicFields').hidden = true;
    $('qrResultSection').hidden = true;
    let site = '';
    try { site = localStorage.getItem(SITE_KEY) || ''; } catch (e) {}
    $('inputSiteUrl').value = site;
    updateSiteHelp();
    updatePreview();
  }

  $('btnNewFlower').addEventListener('click', () => {
    resetForm();
    adminModal.scrollTop = 0;
  });

  $('btnDirectPlant').addEventListener('click', async () => {
    const flower = await flowerFromForm({ strict: false });
    if (!flower) return;
    const saved = await FlowerStore.add(flower);
    if (!saved) {
      toast('No queda espacio para guardar esta flor en este navegador.');
      return;
    }
    await closeSheet(adminModal);
    renderGarden(saved.id);
    const planted = flowersContainer.querySelector(`[data-id="${CSS.escape(saved.id)}"]`);
    if (planted) planted.scrollIntoView({ block: 'center', behavior: reducedMotion ? 'auto' : 'smooth' });
    celebrate({ particleCount: 80, spread: 80, origin: { y: 0.65 }, colors: ['#e3ae2b', '#d98a2b', '#edd27a', '#6a8742'] });
    resetForm();
  });

  function renderAdminList() {
    const list = $('adminFlowerList');
    list.innerHTML = '';
    FlowerStore.getAll().forEach((flower) => {
      const item = document.createElement('li');
      item.className = 'memory-row';
      item.innerHTML = `<span class="memory-row__art">${createFlowerSVG(flower.type, flower.color, { head: true })}</span><span class="memory-row__text"><strong></strong><small></small></span><button class="btn-link" type="button">Quitar</button>`;
      item.querySelector('strong').textContent = flower.title;
      item.querySelector('small').textContent = formatDate(flower.date);
      const remove = item.querySelector('button');
      remove.addEventListener('click', async () => {
        if (remove.dataset.confirm !== '1') {
          remove.dataset.confirm = '1';
          remove.textContent = '¿Seguro?';
          return;
        }
        await FlowerStore.remove(flower.id);
        renderGarden();
        renderAdminList();
      });
      list.appendChild(item);
    });
  }

  $('btnOpenAdmin').addEventListener('click', () => {
    renderAdminList();
    openSheet(adminModal);
  });
  $('btnCloseAdmin').addEventListener('click', () => closeSheet(adminModal));

  // ================= 14. INICIO =================
  Ambient.start();
  setTimeMode(timeFromClock());
  resetForm();
  renderGarden();
  drawFairyLights();
  window.addEventListener('resize', drawFairyLights);
  if (document.fonts) document.fonts.ready.then(drawFairyLights);
  window.addEventListener('resize', () => {
    if (columnsForWidth() !== gardenColumns) renderGarden();
    else if (flowersContainer.clientWidth !== trailWidth) drawGardenTrail();
  });
  FlowerStore.migrate().then(() => renderGarden()).catch((e) => console.error(e)).finally(checkURLForFlower);
});
