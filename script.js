/**
 * script.js
 * Ciclo celeste, atmósfera, flores SVG, riego, scrapbook, ceremonia de brote,
 * música, lluvia, mariposas, recuerdos descargables y panel secreto.
 */

// ================= GENERADOR DE FLORES SVG =================
// Al estilo de nuestras mascoticas: colores planos y vivos con un contorno grueso color chocolate. Cada flor vive en su macetita y es lo que más resalta.
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

const STEM = '#4aa152';
const INK = '#4a3226';
const OUTLINE = `stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"`;
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

// Una flor de astromelia: seis pétalos con sus rayitas y los estambres curvos.
function astromeliaDef(p, random, id) {
  let streaks = '';
  [60, 300].forEach((center) => {
    [-16, -8, 0, 8, 16].forEach((spread, i) => {
      const angle = ((center + spread) * Math.PI) / 180;
      const outer = 19 - Math.abs(i - 2) * 2;
      streaks += `M${f1(Math.sin(angle) * 8)},${f1(-Math.cos(angle) * 8)}L${f1(Math.sin(angle) * outer)},${f1(-Math.cos(angle) * outer)}`;
    });
  });
  return `<g id="${id}f"><path fill="${p.base}" ${OUTLINE} d="${petalRing(3, 'tepal', 33, 13.5, random)}"/>
      <path fill="${p.tip}" ${OUTLINE} d="${petalRing(3, 'tepal', 30, 10.5, random, { offset: 60 })}"/>
      <path fill="none" stroke="${p.core}" stroke-width="1" stroke-linecap="round" d="${streaks}"/>
      <circle r="4.5" fill="${p.core}" ${OUTLINE}/>
      <path fill="none" stroke="#f3e2a6" stroke-width=".9" stroke-linecap="round" d="M0,1Q-3,8 -6,14M0,1Q-1,9 -1,16M0,1Q2,9 4,15M0,1Q4,6 8,11"/>
      <path fill="none" stroke="#7a4a1a" stroke-width="2" stroke-linecap="round" d="M-6,14h.01M-1,16h.01M4,15h.01M8,11h.01"/></g>`;
}

// El ramo de astromelias amarillas envuelto en papel blanco con rayas doradas, moño rojo
// y su globito dorado de corazón, como el de la foto.
function bouquetSVG(p, random, id, { head = false, sprouting = false } = {}) {
  const blossom = (x, y, rotation, scale) => `<use href="#${id}f" transform="translate(${x},${y}) rotate(${f1(rotation + (random() - 0.5) * 20)}) scale(${scale})"/>`;
  const balloon = `<g class="ramo-balloon">
      <path fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round" d="M84,56 C82,72 72,88 64,112"/>
      <g transform="translate(86,30) rotate(-10) scale(1.15)" stroke="${INK}" stroke-width="2" stroke-linejoin="round">
        <path fill="#f4c542" d="M0,20 C-22,6 -26,-12 -14,-19 C-7,-23 -2,-19 0,-14 C2,-19 7,-23 14,-19 C26,-12 22,6 0,20 Z"/>
        <path fill="#e0a52a" stroke="none" d="M0,20 C10,13 17,5 19,-3 C20,6 12,13 0,20 Z"/>
        <path fill="none" stroke="#fff6c8" stroke-width="3" stroke-linecap="round" d="M-15,-9 C-14,-14 -10,-16 -7,-15"/>
        <path fill="#e0a52a" d="M-2,20 L2,20 L1.4,24 L-1.4,24 Z"/>
      </g>
    </g>`;
  const leaves = `<g class="flower-leaves" fill="${STEM}" ${OUTLINE}>${leaf(40, 106, 215, 34, 8)}${leaf(80, 106, -35, 34, 8)}${leaf(32, 98, 240, 30, 7)}${leaf(88, 98, -60, 30, 7)}${leaf(60, 92, 272, 26, 6)}${leaf(26, 124, 192, 26, 6)}${leaf(94, 124, -12, 26, 6)}</g>`;
  const flowers = `${blossom(60, 92, 0, 0.6)}${blossom(40, 101, -35, 0.56)}${blossom(80, 101, 35, 0.56)}${blossom(25, 117, -55, 0.48)}${blossom(95, 117, 55, 0.48)}${blossom(48, 114, -10, 0.6)}${blossom(72, 114, 12, 0.6)}${blossom(60, 125, 180, 0.55)}${blossom(34, 129, -40, 0.48)}${blossom(86, 129, 40, 0.48)}`;
  const paperBack = `<path fill="#fffaf0" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round" d="M24,132 C20,118 26,104 32,100 C36,112 42,120 50,126 L70,126 C78,120 84,112 88,100 C94,104 100,118 96,132 Z"/>`;
  const paperFront = `<g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round">
      <path fill="#fffaf0" d="M26,132 C34,128 42,136 50,131 C56,136 64,136 70,131 C78,136 86,128 94,132 L84,206 C76,212 44,212 36,206 Z"/>
      <path fill="none" stroke="#e0b04a" stroke-width="3" stroke-linecap="round" d="M30,148 C44,142 54,154 66,148 C76,143 84,148 91,146 M33,166 C46,160 56,172 68,166 C78,161 84,166 89,164 M36,188 C48,182 58,194 70,188 C78,184 82,188 86,186"/>
      <path fill="none" stroke="#fff" stroke-opacity=".8" stroke-width="2.4" stroke-linecap="round" d="M36,140 C35,156 37,176 40,196"/>
      <path fill="#e8413c" d="M37,170 C52,174 68,174 83,170 L82,178 C68,182 52,182 38,178 Z"/>
      <path fill="#e8413c" d="M60,175 C50,164 38,164 40,172 C41,180 52,180 60,175 Z"/>
      <path fill="#e8413c" d="M60,175 C70,164 82,164 80,172 C79,180 68,180 60,175 Z"/>
      <path fill="#e8413c" d="M58,176 L50,198 L55,196 L57,201 Z M62,176 L70,198 L65,196 L63,201 Z"/>
      <circle cx="60" cy="175" r="3.6" fill="#c92f2b"/>
    </g>`;
  const defs = `<defs>${astromeliaDef(p, random, id)}</defs>`;
  if (head) {
    return `<svg class="flower-svg" xmlns="http://www.w3.org/2000/svg" viewBox="6 4 108 136">${defs}${balloon}${paperBack}${leaves}${flowers}</svg>`;
  }
  return `<svg class="flower-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 220">${defs}
    <ellipse cx="60" cy="214" rx="34" ry="5.5" fill="#1f5a2a" opacity=".22"/>
    <g class="stem-container ${sprouting ? 'sprouting-stem' : ''}">${paperBack}${paperFront}</g>
    <g class="flower-blossom ${sprouting ? 'sprouting-head' : ''}">${leaves}${flowers}${balloon}</g>
    <path fill="none" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round" d="M26,132 C34,128 42,136 50,131 C56,136 64,136 70,131 C78,136 86,128 94,132"/>
  </svg>`;
}

const BLOSSOMS = {
  astromelia(p, random, id) {
    // Un solo tallo que se abre en un ramito, como la astromelia de verdad
    const blossom = (x, y, rotation, scale) => `<use href="#${id}f" transform="translate(${x},${y}) rotate(${f1(rotation + (random() - 0.5) * 18)}) scale(${scale})"/>`;
    return `<defs>
      ${astromeliaDef(p, random, id)}</defs>
      <g class="flower-leaves" fill="${STEM}" ${OUTLINE}>${leaf(-16, 24, 158, 34, 7)}${leaf(16, 26, 22, 34, 7)}</g>
      <path fill="none" stroke="${INK}" stroke-width="5.4" stroke-linecap="round" d="M0,46Q-16,20 -27,4M0,46Q15,20 27,3M0,46Q0,10 2,-28M0,46Q-30,-4 -40,-36M0,46Q28,-8 42,-34"/>
      <path class="flower-stem" fill="none" stroke="${STEM}" stroke-width="2.2" stroke-linecap="round" d="M0,46Q-16,20 -27,4M0,46Q15,20 27,3M0,46Q0,10 2,-28M0,46Q-30,-4 -40,-36M0,46Q28,-8 42,-34"/>
      <ellipse cx="-40" cy="-39" rx="5" ry="9" transform="rotate(-28 -40 -39)" fill="${p.deep}" ${OUTLINE}/><ellipse cx="42" cy="-37" rx="4.5" ry="8.5" transform="rotate(32 42 -37)" fill="${p.base}" ${OUTLINE}/>
      ${blossom(2, -27, 0, 0.82)}${blossom(-27, 2, -28, 0.92)}${blossom(27, 2, 28, 0.92)}${blossom(0, 22, 180, 1)}`;
  },
  sunflower(p, random, id) {
    return `<path fill="${p.deep}" ${OUTLINE} d="${petalRing(17, 'pointed', 38, 8.6, random, { from: 14, offset: 10.6 })}"/>
      <path fill="${p.base}" ${OUTLINE} d="${petalRing(17, 'pointed', 35, 8.6, random, { from: 14 })}"/>
      <path fill="none" stroke="${p.tip}" stroke-width="1.4" stroke-linecap="round" d="${petalVeins(17, 26, 38)}"/>
      <circle r="21" fill="#8a5a2b" stroke="${INK}" stroke-width="2.2"/><circle r="14" fill="#6b4220"/>
      <path fill="none" stroke="#e0a93a" stroke-width="1.5" stroke-linecap="round" d="${seedDots(46, 19)}"/>`;
  },
  rose(p, random, id) {
    const layer = (fill, petals) => `<g fill="${fill}" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round">${separatePetals(petals)}</g>`;
    return `${layer(p.deep, petalRing(7, 'round', 50, 24, random))}
      ${layer(p.base, petalRing(6, 'round', 40, 20, random, { offset: 26 }))}
      ${layer(p.tip, petalRing(5, 'round', 29, 15, random, { offset: 10 }))}
      ${layer(p.base, petalRing(4, 'round', 19, 10, random, { offset: 50 }))}
      <path d="M-7,2 C-9,-6 4,-10 7,-3 C9,4 1,8 -3,4 C-6,1 -2,-3 1,-2" fill="none" stroke="${INK}" stroke-opacity=".7" stroke-width="1.6" stroke-linecap="round"/>`;
  },
  tulip(p, random, id) {
    return `<path fill="${p.deep}" ${OUTLINE} d="M-29,-8 C-33,-30 -28,-46 -19,-56 C-13,-44 -6,-40 0,-57 C6,-40 13,-44 19,-56 C28,-46 33,-30 29,-8 C27,20 14,34 0,34 C-14,34 -27,20 -29,-8 Z"/>
      <path fill="${p.base}" ${OUTLINE} d="M2,34 C-22,35 -37,18 -37,-8 C-37,-27 -33,-42 -27,-51 C-14,-38 -3,-14 2,34 Z"/>
      <path fill="${p.base}" ${OUTLINE} d="M-2,34 C22,35 37,18 37,-8 C37,-27 33,-42 27,-51 C14,-38 3,-14 -2,34 Z"/>
      <path fill="${p.tip}" ${OUTLINE} d="M0,-43 C-15,-26 -20,-4 -15,14 C-11,28 -4,33 0,35 C4,33 11,28 15,14 C20,-4 15,-26 0,-43 Z"/>
      <path fill="none" stroke="${p.tip}" stroke-opacity=".6" stroke-width="1" stroke-linecap="round" d="M-2,28 C-5,10 -5,-10 -1,-30 M-24,14 C-29,0 -29,-16 -26,-34 M24,14 C29,0 29,-16 26,-34"/>`;
  },
  daisy(p, random, id) {
    return `<path fill="${p.deep}" ${OUTLINE} d="${petalRing(13, 'round', 42, 7.4, random, { from: 8, offset: 13.8 })}"/>
      <path fill="${p.base}" ${OUTLINE} d="${petalRing(13, 'round', 40, 7.4, random, { from: 8 })}"/>
      <circle r="15" fill="${p.heart[1]}" stroke="${INK}" stroke-width="2.2"/><circle cx="-4" cy="-5" r="4" fill="${p.heart[0]}"/>
      <path fill="none" stroke="${p.pollen}" stroke-width="1.2" stroke-linecap="round" d="${seedDots(26, 13)}"/>`;
  },
  wildflower(p, random, id) {
    return `<path fill="${p.deep}" ${OUTLINE} d="${petalRing(8, 'notched', 50, 16, random, { from: 2, start: 1, every: 2 })}"/>
      <path fill="${p.base}" ${OUTLINE} d="${petalRing(8, 'notched', 50, 16, random, { from: 2, every: 2 })}"/>
      <path fill="none" stroke="${p.tip}" stroke-width="1.3" stroke-linecap="round" d="${petalVeins(8, 16, 34, 0)}"/>
      <circle r="11" fill="${p.heart[1]}" stroke="${INK}" stroke-width="2.2"/>
      <path fill="none" stroke="${p.pollen}" stroke-width="1.4" stroke-linecap="round" d="${seedDots(16, 9.5)}"/>`;
  }
};

const BLOSSOM_Y = { astromelia: 62, sunflower: 58, rose: 56, tulip: 62, daisy: 56, wildflower: 56 };

function leaf(x, y, rotation, length, width) {
  return `<g transform="translate(${f1(x)},${f1(y)}) rotate(${f1(rotation)})"><path d="M0,0C${f1(length * 0.25)},${f1(-width)} ${f1(length * 0.7)},${f1(-width)} ${f1(length)},0C${f1(length * 0.7)},${f1(width * 0.6)} ${f1(length * 0.25)},${f1(width * 0.6)} 0,0Z"/><path d="M3,0H${f1(length * 0.8)}" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/></g>`;
}

// Cada flor vive en su macetita redonda, pintada a mano. La semilla elige el color, el adorno y de qué lado cae la hiedra.
function flowerPot(id, random, palette) {
  const clay = [
    ['#ffc3a0', '#f6a173', '#fffaf0'],
    ['#ffc3a0', '#f6a173', '#fffaf0'],
    ['#ffd0da', '#ff9fb1', '#fffaf0'],
    ['#fff6e2', '#fbe0b0', '#f6a173'],
    ['#d6f5e4', '#9edfc0', '#fffaf0'],
    ['#eadcff', '#c9a2f0', '#fffaf0'],
    ['#d8f1ff', '#a8e0f7', '#fffaf0']
  ][Math.floor(random() * 7)];
  const paint = clay[2];
  const adorn = [
    `<path fill="${paint}" stroke="${INK}" stroke-width="1.4" d="M60,196c-3,-4.5 -10,-2.5 -8,3.5l8,8l8,-8c2,-6 -5,-8 -8,-3.5Z"/>`,
    `<path fill="none" stroke="${paint}" stroke-width="5.4" stroke-linecap="round" d="M60,195.5h.01M64.6,198.9h.01M62.9,204.3h.01M57.1,204.3h.01M55.4,198.9h.01"/><circle cx="60" cy="200.6" r="2.4" fill="#ffd36b"/>`,
    `<path fill="none" stroke="${paint}" stroke-width="5" stroke-linecap="round" d="M42,199h.01M51,201h.01M60,202h.01M69,201h.01M78,199h.01"/>`
  ][Math.floor(random() * 3)];
  const side = random() > 0.5 ? 1 : -1;
  const at = (dx) => 60 + side * dx;
  const ivy = (dx, y, turn) => `<path transform="translate(${at(dx)},${y}) rotate(${side > 0 ? turn : 180 - turn})" d="M0,0c3,-5 9,-5 12,0c-3,4.5 -9,4.5 -12,0Z"/>`;
  const tiny = (dx, y) => `<circle cx="${at(dx)}" cy="${y}" r="4.2" fill="${palette.tip}" stroke="${INK}" stroke-width="1.4"/><circle cx="${at(dx)}" cy="${y}" r="1.6" fill="#ffd36b"/>`;
  return {
    back: `<ellipse cx="60" cy="217" rx="33" ry="5.5" fill="#1f5a2a" opacity=".22"/><ellipse cx="60" cy="176" rx="27" ry="5.5" fill="#7a4a2e"/>`,
    front: `<g stroke="${INK}" stroke-width="2.4" stroke-linejoin="round">
      <path fill="${clay[1]}" d="M33,182C28,200 32,214 46,217H74C88,214 92,200 87,182Z"/>
      <path fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="3" stroke-linecap="round" d="M38,192C36,200 37,206 41,210"/>
      ${adorn}
      <rect x="27" y="171" width="66" height="15" rx="7.5" fill="${clay[0]}"/>
      <path fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="2.4" stroke-linecap="round" d="M34,176H62"/>
      <g fill="#7cc865" stroke-width="1.4">${ivy(10, 174, -10)}${ivy(23, 178, 40)}${ivy(28, 189, 80)}${ivy(30, 200, 104)}</g>
      ${tiny(15, 176)}${tiny(31, 190)}
    </g>
      <path class="flower-stem" fill="none" stroke="${STEM}" stroke-width="2.2" stroke-linecap="round" d="M38,219q-4,-8 -9,-11M43,219q-2,-8 -1,-13M77,219q2,-8 1,-12M82,219q4,-7 9,-10"/>`
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
  if (type === 'ramo') return bouquetSVG(palette, random, id, { head, sprouting });
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
      <ellipse cx="${f1(budX)}" cy="120" rx="6.5" ry="10" fill="${palette.base}" ${OUTLINE}/>`;
  } else {
    leaves = leaf(stemX(160), 160, leafAngle(side, 22), 36, 10) + leaf(stemX(136), 136, leafAngle(-side, 26), 32, 9);
  }

  const stemPath = `M60,180 Q${f1(60 + bend)},${f1((180 + top) / 2)} 60,${top}`;
  const stem = `<path d="${stemPath}" fill="none" stroke="${INK}" stroke-width="7.2" stroke-linecap="round"/><path class="flower-stem" d="${stemPath}" fill="none" stroke="${STEM}" stroke-width="3.6" stroke-linecap="round"/>`;
  const pot = flowerPot(id, random, palette);

  return `<svg class="flower-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 220">
    ${pot.back}
    <g class="stem-container ${sprouting ? 'sprouting-stem' : ''}">${stem}<g class="flower-leaves" fill="${STEM}" ${OUTLINE}>${leaves}</g>${extra}</g>
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
      <rect width="400" height="500" fill="#fff0d4"/>
      ${innerSVG(type, shade(color, -0.08), id + 'a', 60, 120, 165)}
      ${innerSVG(type, shade(color, 0.1), id + 'c', 176, 124, 165)}
      ${innerSVG(type, color, id + 'b', 112, 76, 180)}</svg>`, 400, 500);
  }
  return svgDataURI(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500">
    <rect width="400" height="500" fill="#cfeeff"/><rect y="330" width="400" height="170" fill="#a6e08a"/>
    ${innerSVG(type, color, id + 'd', 66, 130, 160)}
    ${innerSVG(type, shade(color, 0.12), id + 'e', 174, 156, 150)}
    </svg>`, 400, 500);
}

document.addEventListener('DOMContentLoaded', () => {
  const $ = (id) => document.getElementById(id);
  // El jardín se mueve siempre, aunque Windows o el celular tengan las animaciones apagadas:
  // quien lo quiera quieto lo apaga en Recuerdos > Animaciones del jardín.
  const STILL_KEY = 'jardin_magico_quieto';
  const reducedMotion = (() => {
    try { return localStorage.getItem(STILL_KEY) === '1'; } catch (e) { return false; }
  })();
  document.documentElement.classList.toggle('is-still', reducedMotion);

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
    if (reducedMotion) return;
    fire({ zIndex: 150, shapes: ['circle'], scalar: 0.8, gravity: 0.7, ticks: 150, ...options });
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

    let onStop = null;

    function stop() {
      clearInterval(timer);
      timer = null;
      Sound.fadeMusic(0, 0.9);
      audio.pause();
      const was = current;
      current = '';
      updateUI();
      if (was && onStop) onStop();
    }

    // loop: false para las canciones del jardín, que suenan una vez y paran.
    async function play(spec, { loop = true, quiet = false } = {}) {
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
        if (current !== spec) return false;
        audio.loop = loop;
        audio.src = url;
        audio.volume = 0.65;
        await audio.play();
        return true;
      } catch (e) {
        console.error('No se pudo reproducir la melodía', e);
        current = '';
        updateUI();
        if (!quiet) toast('No pude abrir esa canción. Revisa el archivo o el enlace.');
        return false;
      }
    }

    audio.addEventListener('ended', () => {
      if (!audio.loop) stop();
    });

    // Safari solo deja sonar un audio sin tocar la pantalla si ya sonó una vez con un toque:
    // el primer toque reproduce un silencio cortito y lo deja listo.
    let unlocked = false;
    function unlock() {
      if (unlocked || current) return;
      unlocked = true;
      const bytes = new Uint8Array(44 + 400);
      const view = new DataView(bytes.buffer);
      const write = (at, text) => [...text].forEach((c, i) => { bytes[at + i] = c.charCodeAt(0); });
      write(0, 'RIFF'); view.setUint32(4, 36 + 400, true); write(8, 'WAVEfmt ');
      view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
      view.setUint32(24, 8000, true); view.setUint32(28, 8000, true); view.setUint16(32, 1, true); view.setUint16(34, 8, true);
      write(36, 'data'); view.setUint32(40, 400, true); bytes.fill(128, 44);
      const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }));
      audio.src = url;
      audio.play().then(() => { if (!current) audio.pause(); }).catch(() => {}).finally(() => URL.revokeObjectURL(url));
    }

    function updateUI() {
      // Las mascoticas bailan mientras suena música.
      $('petsLayer').classList.toggle('is-dancing', Boolean(current));
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

    return {
      play, stop, updateUI, unlock,
      get current() { return current; },
      set onStop(fn) { onStop = fn; }
    };
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

  // ================= CANCIONES DEL JARDÍN =================
  // Las canciones que Santiago sube en el panel suenan solas cada cierto tiempo
  // mientras el jardín está abierto. Cada dispositivo elige cada cuánto (o nunca).
  const Radio = (() => {
    const EVERY_KEY = 'jardin_magico_radio';
    const LIST_KEY = 'jardin_magico_canciones';
    let minutes = 10;
    let songs = [];
    let quietSince = Date.now();
    let lastId = '';
    let playingSong = null;
    try {
      const saved = localStorage.getItem(EVERY_KEY);
      if (saved !== null) minutes = Number(saved) || 0;
      songs = JSON.parse(localStorage.getItem(LIST_KEY) || '[]');
    } catch (e) {}

    const playable = () => songs.filter((song) => safeMusic(song.ref));

    async function playOne({ auto }) {
      const pool = playable();
      if (!pool.length) {
        if (!auto) toast('Todavía no hay canciones. Santiago las agrega desde el panel.');
        return false;
      }
      const choices = pool.length > 1 ? pool.filter((song) => song.id !== lastId) : pool;
      const song = choices[Math.floor(Math.random() * choices.length)];
      lastId = song.id;
      playingSong = song;
      const ok = await Music.play(song.ref, { loop: false, quiet: auto });
      if (ok) toast(`Sonando: ${song.title}`);
      else playingSong = null;
      return ok;
    }

    // Cuando para cualquier música, el reloj vuelve a empezar.
    Music.onStop = () => {
      playingSong = null;
      quietSince = Date.now();
    };

    setInterval(() => {
      if (!minutes || document.hidden || Music.current || document.querySelector('dialog[open]')) return;
      if (Date.now() - quietSince < minutes * 60000) return;
      quietSince = Date.now();
      playOne({ auto: true });
    }, 15000);

    // Safari necesita un primer toque para dejar sonar audio después.
    document.addEventListener('pointerdown', () => Music.unlock(), { once: true, capture: true });

    return {
      playOne,
      get minutes() { return minutes; },
      setMinutes(value) {
        minutes = Number(value) || 0;
        quietSince = Date.now();
        try { localStorage.setItem(EVERY_KEY, String(minutes)); } catch (e) {}
      },
      get songs() { return songs; },
      setSongs(list) {
        songs = list;
        try { localStorage.setItem(LIST_KEY, JSON.stringify(list)); } catch (e) {}
      },
      get playing() { return playingSong; }
    };
  })();

  // ================= 1. CICLO DÍA / TARDE / NOCHE =================
  const celestialOrbit = $('celestialOrbit');
  const timeAngles = { day: 0, sunset: 55, night: 180 };
  const skyThemeColor = { day: '#6db5f5', sunset: '#4c2a85', night: '#070b1e' };
  const TIME_BUTTON = { day: ['sun', 'Día'], sunset: ['sunset', 'Tarde'], night: ['moon', 'Noche'], auto: ['timer', 'Auto'] };
  // En "Auto" el cielo gira sin parar: el sol baja, llega la tarde, sale la luna y vuelve el día.
  // Grados por segundo en cada parte del día: un día entero dura unos 5 minutos y medio.
  const FLOW_SPEED = { day: 70 / 150, sunset: 90 / 60, night: 200 / 120 };
  const FLOW_STEP_MS = 250;
  const RESUME_AUTO_MS = 2 * 60 * 1000;
  let orbitAngle = 0;
  let isAutoCycling = true;
  let autoCycleInterval = null;
  let resumeAutoTimer = null;

  function paintTime(mode) {
    state.time = mode;
    document.body.classList.remove('time-day', 'time-sunset', 'time-night');
    document.body.classList.add(`time-${mode}`);
    Pets.refresh();
    paintTimeButton();
    document.querySelector('meta[name="theme-color"]').content = skyThemeColor[mode];
    Ambient.redrawStatic();
    Butterflies.refresh();
  }

  function setTimeMode(mode, { nearest = false } = {}) {
    // El sol siempre avanza hacia adelante, nunca retrocede por el cielo; si lo soltaste con el dedo, se acomoda donde quedó.
    let target = timeAngles[mode];
    if (nearest) target += Math.round((orbitAngle - target) / 360) * 360;
    else while (target < orbitAngle) target += 360;
    orbitAngle = target;
    celestialOrbit.classList.remove('is-flowing');
    celestialOrbit.style.setProperty('--orbit-angle', `${orbitAngle}deg`);
    paintTime(mode);
  }

  function flowStep() {
    orbitAngle += FLOW_SPEED[state.time] * (FLOW_STEP_MS / 1000);
    celestialOrbit.classList.add('is-flowing');
    celestialOrbit.style.setProperty('--orbit-angle', `${orbitAngle.toFixed(2)}deg`);
    const mode = modeForAngle(orbitAngle);
    if (mode !== state.time) paintTime(mode);
  }

  function startAutoCycle() {
    clearTimeout(resumeAutoTimer);
    clearInterval(autoCycleInterval);
    isAutoCycling = true;
    autoCycleInterval = setInterval(() => { if (!document.hidden) flowStep(); }, FLOW_STEP_MS);
    paintTimeButton();
  }

  function paintTimeButton() {
    const [icon, label] = TIME_BUTTON[isAutoCycling ? 'auto' : state.time];
    $('timeIcon').setAttribute('href', `#i-${icon}`);
    $('timeLabel').textContent = label;
    $('btnTime').setAttribute('aria-label', `Hora del día: ${label}. Toca para cambiarla.`);
  }

  // Si alguien escoge la hora a mano, el tiempo vuelve a correr solo a los dos minutos.
  function stopAutoCycle() {
    isAutoCycling = false;
    clearInterval(autoCycleInterval);
    clearTimeout(resumeAutoTimer);
    resumeAutoTimer = setTimeout(startAutoCycle, RESUME_AUTO_MS);
    celestialOrbit.classList.remove('is-flowing');
    paintTimeButton();
  }

  // "Auto" (el tiempo pasa solo), y si se toca: día, tarde, noche y de vuelta a "Auto".
  $('btnTime').addEventListener('click', () => {
    if (isAutoCycling) {
      stopAutoCycle();
      setTimeMode('day');
      return;
    }
    if (state.time === 'night') {
      startAutoCycle();
      return;
    }
    setTimeMode(state.time === 'day' ? 'sunset' : 'night');
    stopAutoCycle();
  });

  // El sol y la luna se agarran: arrastrarlos por el cielo cambia la hora, y un toque los hace rebotar.
  function modeForAngle(angle) {
    const turn = ((angle % 360) + 360) % 360;
    if (turn < 35 || turn >= 325) return 'day';
    if (turn < 125) return 'sunset';
    return 'night';
  }

  [$('celestialSun'), $('celestialMoon')].forEach((body) => {
    let drag = null;
    body.addEventListener('pointerdown', (event) => {
      event.preventDefault();
      drag = { x: event.clientX, angle: orbitAngle, moved: false };
      try { body.setPointerCapture(event.pointerId); } catch (e) {}
      celestialOrbit.classList.add('is-dragging');
    });
    body.addEventListener('pointermove', (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.x;
      if (Math.abs(dx) > 6) drag.moved = true;
      if (!drag.moved) return;
      orbitAngle = drag.angle + (dx / (window.innerWidth * 0.34)) * 70;
      celestialOrbit.style.setProperty('--orbit-angle', `${orbitAngle}deg`);
      const mode = modeForAngle(orbitAngle);
      if (mode !== state.time) {
        stopAutoCycle();
        state.time = mode;
        document.body.classList.remove('time-day', 'time-sunset', 'time-night');
        document.body.classList.add(`time-${mode}`);
        paintTimeButton();
      }
    });
    const release = () => {
      if (!drag) return;
      const { moved } = drag;
      drag = null;
      celestialOrbit.classList.remove('is-dragging');
      body.classList.remove('is-squish');
      void body.offsetWidth;
      body.classList.add('is-squish');
      Sound.tinkle();
      if (moved) {
        stopAutoCycle();
        setTimeMode(modeForAngle(orbitAngle), { nearest: true });
      } else {
        stopAutoCycle();
        setTimeMode({ day: 'sunset', sunset: 'night', night: 'day' }[state.time]);
      }
    };
    body.addEventListener('pointerup', release);
    body.addEventListener('pointercancel', release);
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

  // El caminito, sus adornos y el pasto se dibujan una vez, como fondos.
  // Cada tramo del caminito trae adornos distintos y las capas del pasto miden distinto, así el piso casi no se repite.
  const TRAIL_SPAN = 3;

  function svgTile(width, height, body, defs = '') {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${defs}${body}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  }

  const circlePath = (x, y, r) => `M${f1(x - r)},${f1(y)}a${f1(r)},${f1(r)} 0 1,0 ${f1(2 * r)},0a${f1(r)},${f1(r)} 0 1,0 ${f1(-2 * r)},0`;

  const Decor = {
    lantern: (x, y) => `<circle cx="${f1(x)}" cy="${f1(y - 28)}" r="22" fill="url(#g)"/><g stroke="${INK}" stroke-width="2" stroke-linejoin="round"><rect x="${f1(x - 2.5)}" y="${f1(y - 22)}" width="5" height="22" rx="2" fill="#8a5a3c"/><rect x="${f1(x - 7)}" y="${f1(y - 37)}" width="14" height="16" rx="4" fill="#ffe08a"/><path fill="#8a5a3c" d="M${f1(x - 9)},${f1(y - 36)}h18l-4,-6h-10Z"/></g>`,
    mushrooms: (x, y, s) => [[0, 0, s], [15, 4, s * 0.62]].map(([dx, dy, k]) => `<g transform="translate(${f1(x + dx)},${f1(y + dy)}) scale(${f1(k)})" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"><path fill="#fff6e6" d="M-4,0C-3,-6 -3,-10 -3,-12H3C3,-10 3,-6 4,0Z"/><path fill="#ff6f61" d="M-13,-10C-12,-24 12,-24 13,-10C6,-8 -6,-8 -13,-10Z"/><circle cx="-5" cy="-15" r="2" fill="#fff6e6" stroke="none"/><circle cx="3" cy="-18" r="2.2" fill="#fff6e6" stroke="none"/></g>`).join(''),
    bush: (x, y, s, random) => {
      const dots = [['#ff8fc0', -8, -12], ['#ffd36b', 3, -18], ['#fff6e6', 10, -9]].map(([c, dx, dy]) => `<circle cx="${f1(x + dx * s)}" cy="${f1(y + dy * s)}" r="${f1(3.4 * s)}" fill="${c}"/>`).join('');
      const tone = random() > 0.5 ? '#79c463' : '#8fd37a';
      return `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path fill="${tone}" d="M${f1(x - 20 * s)},${f1(y)}C${f1(x - 26 * s)},${f1(y - 14 * s)} ${f1(x - 14 * s)},${f1(y - 24 * s)} ${f1(x - 6 * s)},${f1(y - 20 * s)}C${f1(x - 2 * s)},${f1(y - 30 * s)} ${f1(x + 16 * s)},${f1(y - 28 * s)} ${f1(x + 16 * s)},${f1(y - 16 * s)}C${f1(x + 26 * s)},${f1(y - 14 * s)} ${f1(x + 26 * s)},${f1(y)} ${f1(x + 18 * s)},${f1(y)}Z"/>${dots}</g>`;
    },
    rock: (x, y, s) => `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round"><path fill="#e9dcc6" d="M${f1(x - 13 * s)},${f1(y)}C${f1(x - 15 * s)},${f1(y - 10 * s)} ${f1(x - 6 * s)},${f1(y - 15 * s)} ${f1(x + 2 * s)},${f1(y - 13 * s)}C${f1(x + 12 * s)},${f1(y - 12 * s)} ${f1(x + 16 * s)},${f1(y - 4 * s)} ${f1(x + 13 * s)},${f1(y)}Z"/><path fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" d="M${f1(x - 7 * s)},${f1(y - 8 * s)}q4,-3 8,-2"/></g>`,
    snail: (x, y) => `<g stroke="${INK}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path fill="#fff1c4" d="M${f1(x - 14)},${f1(y)}H${f1(x + 12)}C${f1(x + 16)},${f1(y)} ${f1(x + 16)},${f1(y - 8)} ${f1(x + 12)},${f1(y - 8)}L${f1(x + 14)},${f1(y - 14)}"/><circle cx="${f1(x - 2)}" cy="${f1(y - 8)}" r="8" fill="#ff9fb1"/><path fill="none" d="M${f1(x - 2)},${f1(y - 8)}m-3,0a3,3 0 1,1 3,3"/></g>`,
    sprout: (x, y) => `<g stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"><path fill="none" d="M${f1(x)},${f1(y)}v-9"/><path fill="#8fd37a" d="M${f1(x)},${f1(y - 8)}c-3,-6 -10,-6 -11,-2c3,4 8,4 11,2ZM${f1(x)},${f1(y - 9)}c3,-6 10,-7 11,-3c-3,4 -8,5 -11,3Z"/></g>`,
    clump: (x, y, s, random) => {
      const color = ['#ff8fc0', '#ffd36b', '#c9a2f0', '#a8e0f7'][Math.floor(random() * 4)];
      return `<g stroke="${INK}" stroke-width="1.6"><path fill="none" stroke="#3f8a45" stroke-width="2" stroke-linecap="round" d="M${f1(x)},${f1(y)}v-12M${f1(x - 6)},${f1(y)}q-1,-7 -3,-10M${f1(x + 6)},${f1(y)}q1,-7 3,-10"/>${[[0, -14], [-9, -11], [9, -11]].map(([dx, dy]) => `<circle cx="${f1(x + dx * s)}" cy="${f1(y + dy * s)}" r="${f1(4 * s)}" fill="${color}"/>`).join('')}</g>`;
    },
    sparkle: (x, y, r) => `<path fill="#fff4b8" d="M${f1(x)},${f1(y - r)}q${f1(r * 0.14)},${f1(r * 0.86)} ${f1(r)},${f1(r)}q${f1(-r * 0.86)},${f1(r * 0.14)} ${f1(-r)},${f1(r)}q${f1(-r * 0.14)},${f1(-r * 0.86)} ${f1(-r)},${f1(-r)}q${f1(r * 0.86)},${f1(-r * 0.14)} ${f1(r)},${f1(-r)}Z"/>`
  };

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
    const height = period * TRAIL_SPAN;
    const random = seededRandom(7);

    let stones = '';
    const count = Math.round(height / 38);
    for (let i = 0; i < count; i++) {
      const y = (i + 0.5) * (height / count);
      stones += `<ellipse cx="${f1(centerAt(y) + (i % 2 ? 7 : -7))}" cy="${f1(y)}" rx="${f1(13 + random() * 6)}" ry="${f1(6 + random() * 2)}"/>`;
    }

    // En cada tramo los adornos caen en otro lugar y son otros
    const kinds = ['mushrooms', 'bush', 'rock', 'snail', 'sprout', 'clump', 'clump', 'bush'];
    let decor = '';
    for (let k = 0; k < TRAIL_SPAN; k++) {
      const top = k * period;
      [0.1 + random() * 0.25, 0.55 + random() * 0.3].forEach((at, i) => {
        const y = top + period * at;
        decor += Decor.lantern(centerAt(y) + (i === k % 2 ? 34 : -34), y);
      });
      const items = 6 + Math.floor(random() * 3);
      for (let i = 0; i < items; i++) {
        const y = top + random() * period;
        const edge = random() < 0.65;
        const x = edge
          ? (random() < 0.5 ? width * (0.02 + random() * 0.1) : width * (0.88 + random() * 0.1))
          : centerAt(y) + (random() < 0.5 ? -1 : 1) * (36 + random() * 18);
        decor += Decor[kinds[Math.floor(random() * kinds.length)]](x, y, 0.7 + random() * 0.5, random);
      }
      for (let i = 0; i < 4; i++) decor += Decor.sparkle(random() * width, top + random() * period, 2.5 + random() * 3);
    }

    const defs = '<radialGradient id="g"><stop offset="0" stop-color="#ffdf8a" stop-opacity=".55"/><stop offset="1" stop-color="#ffdf8a" stop-opacity="0"/></radialGradient>';
    flowersContainer.style.setProperty('--trail', svgTile(width, height, `<g fill="#fff4dc" stroke="${INK}" stroke-width="2" stroke-opacity=".4">${stones}</g>${decor}`, defs));
    flowersContainer.style.setProperty('--trail-size', `${width}px ${height}px`);
    drawGrass(width, period, centerAt);
  }

  // El pasto en tres capas de alto distinto: claros de sol, matitas con tréboles y florecitas que esquivan el caminito.
  function drawGrass(width, period, centerAt) {
    const random = seededRandom(11);

    const patchHeight = Math.round(period * 1.61);
    let patches = '';
    for (let i = 0; i < Math.round((width * patchHeight) / 26000); i++) {
      const light = i % 3 !== 0;
      patches += `<ellipse cx="${f1(random() * width)}" cy="${f1(random() * patchHeight)}" rx="${f1(40 + random() * 80)}" ry="${f1(18 + random() * 26)}" fill="${light ? '#ffffff' : '#2f6b3a'}" fill-opacity="${light ? '.1' : '.07'}"/>`;
    }

    const tuftHeight = Math.round(period * 1.37);
    let dark = '';
    let light = '';
    let clovers = '';
    for (let i = 0; i < Math.round((width * tuftHeight) / 1700); i++) {
      const x = random() * width;
      const y = random() * tuftHeight;
      const k = 0.7 + random() * 0.7;
      const blades = `M${f1(x)},${f1(y)}q${f1(-2 * k)},${f1(-6 * k)} ${f1(-5 * k)},${f1(-9 * k)}M${f1(x)},${f1(y)}q0,${f1(-7 * k)} ${f1(k)},${f1(-11 * k)}M${f1(x)},${f1(y)}q${f1(2 * k)},${f1(-5 * k)} ${f1(6 * k)},${f1(-8 * k)}`;
      if (random() < 0.6) dark += blades;
      else light += blades;
    }
    for (let i = 0; i < Math.round((width * tuftHeight) / 9000); i++) {
      const x = random() * width;
      const y = random() * tuftHeight;
      clovers += circlePath(x, y - 2.6, 2.7) + circlePath(x - 2.5, y + 1.4, 2.7) + circlePath(x + 2.5, y + 1.4, 2.7);
    }
    const tufts = `<g fill="none" stroke-linecap="round" stroke-width="1.8"><path stroke="#3f8a45" stroke-opacity=".6" d="${dark}"/><path stroke="#eaffc8" stroke-opacity=".6" d="${light}"/></g><path fill="#5fae55" stroke="${INK}" stroke-opacity=".35" stroke-width=".9" d="${clovers}"/>`;

    // Esta capa mide dos tramos del caminito, así las florecitas nunca lo pisan
    const bloomHeight = period * 2;
    const colors = ['#ffffff', '#ffffff', '#a8e0f7', '#ffd36b', '#ff9fb1', '#c9a2f0'];
    const petals = colors.map(() => '');
    let hearts = '';
    for (let i = 0; i < Math.round((width * bloomHeight) / 3600); i++) {
      const x = random() * width;
      const y = random() * bloomHeight;
      const tone = Math.floor(random() * colors.length);
      if (Math.abs(x - centerAt(y)) < 38) continue;
      const cluster = random() < 0.4 ? 3 : 1;
      for (let c = 0; c < cluster; c++) {
        const cx = x + (c ? (random() - 0.5) * 22 : 0);
        const cy = y + (c ? (random() - 0.5) * 12 : 0);
        const r = 2.4 + random() * 1.1;
        const turn = random();
        for (let p = 0; p < 5; p++) {
          const a = (p / 5) * 2 * Math.PI + turn;
          petals[tone] += circlePath(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, r * 0.62);
        }
        hearts += `M${f1(cx)},${f1(cy)}h.01`;
      }
    }
    const blooms = petals.map((d, i) => (d ? `<path fill="${colors[i]}" d="${d}"/>` : '')).join('');
    const bloomLayer = `<g stroke="${INK}" stroke-opacity=".55" stroke-width=".9">${blooms}</g><path fill="none" stroke="#ffb02e" stroke-width="2.6" stroke-linecap="round" d="${hearts}"/>`;

    const ground = meadow.querySelector('.garden-ground');
    const offset = flowersContainer.offsetTop - ground.offsetTop;
    ground.style.setProperty('--grass', `${svgTile(width, bloomHeight, bloomLayer)}, ${svgTile(width, tuftHeight, tufts)}, ${svgTile(width, patchHeight, patches)}`);
    ground.style.setProperty('--grass-size', `${width}px ${bloomHeight}px, ${width}px ${tuftHeight}px, ${width}px ${patchHeight}px`);
    ground.style.setProperty('--grass-pos', `0 ${offset}px, 0 0, 0 0`);
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
    const flowers = FlowerStore.planted();
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
    const colors = ['#ff6f8e', '#ff9fb1', '#ffd36b'];
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
    wildflower: 'Flor de la casita',
    ramo: 'Ramo de astromelias con globito'
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
    ctx.fillStyle = '#4a3226';
    ctx.font = '600 30px Fredoka, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(caption, width / 2, photoHeight + pad + 50);
    ctx.restore();
    return height;
  }

  async function ensureFonts() {
    if (!document.fonts) return;
    await Promise.all([
      '600 58px Fredoka', '600 30px Nunito', '400 32px Nunito'
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
      measure.font = `400 ${letterSize}px Nunito, sans-serif`;
      letterLines = wrapLines(measure, flower.letter, width - margin * 2 - 72);
      if (letterLines.length * letterSize * 1.5 < 1700) break;
      letterSize -= 3;
    } while (letterSize > 24);
    const letterHeight = letterLines.length * letterSize * 1.5;

    measure.font = '600 58px Fredoka, sans-serif';
    const titleLines = wrapLines(measure, flower.title, width - margin * 2);
    measure.font = '600 30px Nunito, sans-serif';
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
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, width, height);

    const art = await loadImage(svgDataURI(createFlowerSVG(flower.type, flower.color, { seed: flower.id }), 120, 220));
    ctx.drawImage(art, width / 2 - 60, 38, 120, 220);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3226';
    ctx.font = '600 58px Fredoka, sans-serif';
    let y = 318;
    titleLines.forEach((line) => { ctx.fillText(line, width / 2, y); y += 68; });
    ctx.fillStyle = '#7a5b47';
    ctx.font = '600 30px Nunito, sans-serif';
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
    ctx.fillStyle = '#4a3226';
    ctx.textAlign = 'left';
    ctx.font = `400 ${letterSize}px Nunito, sans-serif`;
    let lineY = y + 36 + letterSize;
    letterLines.forEach((line) => { ctx.fillText(line, margin + 36, lineY); lineY += letterSize * 1.5; });
    ctx.fillStyle = '#7a5b47';
    ctx.textAlign = 'right';
    ctx.font = '600 38px Fredoka, sans-serif';
    ctx.fillText(`— ${flower.signature}`, width - margin - 36, lineY + 22);
    y += letterBlock + 30;

    ctx.textAlign = 'center';
    ctx.fillStyle = '#7a5b47';
    ctx.font = '600 30px Nunito, sans-serif';
    meaningLines.forEach((line) => { ctx.fillText(line, width / 2, y); y += 42; });

    ctx.fillStyle = '#7a5b47';
    ctx.font = '600 40px Fredoka, sans-serif';
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
  // Llega como una cartica: el sobre se abre, a la izquierda queda la foto y a la derecha la semillita.
  function handleQRScan(flower) {
    const stage = $('sproutAnimationStage');
    const finish = $('btnFinishSprout');
    const ceremony = $('ceremony');
    const envelope = $('ceremonyEnvelope');
    let started = false;
    let opened = false;
    let autoStart = null;

    ceremony.dataset.step = 'closed';
    stage.dataset.phase = 'seed';
    stage.disabled = false;
    stage.querySelector('.sprout-seedling').style.opacity = '';
    $('sproutFlower').innerHTML = '';
    $('sproutTitle').textContent = 'Llegó una cartica';
    $('sproutSubtitle').textContent = 'Tócala para abrirla.';
    finish.hidden = true;

    const photo = $('ceremonyPhoto');
    const photoRef = flower.realPhoto || flower.couplePhoto;
    photo.src = placeholderPhoto(flower, 'real');
    if (photoRef) Media.url(photoRef).then((url) => { if (url) photo.src = url; }).catch(() => {});
    $('ceremonyCaption').textContent = flower.title;
    $('ceremonyDate').textContent = formatDate(flower.date);
    openSheet(sproutModal);

    const playMusic = () => {
      if (flower.music && Music.current !== flower.music) Music.play(flower.music);
    };

    const open = (touched) => {
      if (opened) return;
      opened = true;
      clearTimeout(autoOpen);
      // El navegador solo deja sonar el audio después de un toque.
      if (touched) {
        Sound.tinkle();
        playMusic();
      }
      ceremony.dataset.step = 'opening';
      setTimeout(() => {
        ceremony.dataset.step = 'open';
        $('sproutTitle').textContent = 'Para ti';
        $('sproutSubtitle').textContent = 'Toca la semillita para plantarla.';
        autoStart = setTimeout(() => begin(false), 9000);
      }, reducedMotion ? 0 : 700);
    };
    const autoOpen = setTimeout(() => open(false), 6000);
    envelope.onclick = () => open(true);

    const begin = (touched) => {
      if (started || !opened) return;
      started = true;
      clearTimeout(autoStart);
      if (touched) {
        Sound.tinkle();
        playMusic();
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
    const existing = FlowerStore.get(flower.id);
    const alreadyPlanted = Boolean(existing && !existing.porSembrar);
    const saved = await FlowerStore.add({ ...flower, porSembrar: false });
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
    const COLORS = ['#ffd36b', '#ff9fb1', '#a8e0f7'];
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
      const wings = (fill) => `<path class="wing wing--l" d="M19,16 C14,2 3,0 2,8 C1,15 9,17 19,16 C10,18 5,24 9,28 C13,31 18,24 19,16 Z" fill="${fill}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/><path class="wing wing--r" d="M19,16 C24,2 35,0 36,8 C37,15 29,17 19,16 C28,18 33,24 29,28 C25,31 20,24 19,16 Z" fill="${fill}" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"/>`;
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

  // ================= 11 B. NUESTRAS MASCOTICAS =================
  // Oreo, Panpan y Sky, como en nuestro juego, y Kuromi y Melody, como son de verdad.
  const Pets = (() => {
    const layer = $('petsLayer');
    // Los animalitos llevan el contorno casi negro de nuestro juego
    const DARK = '#2a2427';
    const line = `stroke="${DARK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;
    // Ojitos abiertos y, para cuando duermen, ojitos cerrados
    const sleepy = (lx, rx, y, color = DARK) => `<path class="pet-sleepy" fill="none" stroke="${color}" stroke-width="2.4" d="M${lx - 3.5},${y} q3.5,3 7,0 M${rx - 3.5},${y} q3.5,3 7,0"/>`;
    const dots = (lx, rx, y, rx2, ry, shine, color = DARK) => `<g class="pet-eye">${[lx, rx].map((x) => `<ellipse cx="${x}" cy="${y}" rx="${rx2}" ry="${ry}" fill="${color}" stroke="none"/>${shine ? `<circle cx="${f1(x + rx2 * 0.35)}" cy="${f1(y - ry * 0.4)}" r="${f1(rx2 * 0.38)}" fill="#fff" stroke="none"/>` : ''}`).join('')}</g>${sleepy(lx, rx, y, color)}`;
    const blush = (lx, rx, y, color = '#ffbfcb') => `<ellipse cx="${lx}" cy="${y}" rx="4" ry="2.4" fill="${color}" stroke="none"/><ellipse cx="${rx}" cy="${y}" rx="4" ry="2.4" fill="${color}" stroke="none"/>`;
    const shadow = '<ellipse cx="50" cy="105" rx="26" ry="4.5" fill="#1f5a2a" opacity=".22"/>';
    // Las piezas de un lado se dibujan una vez y se reflejan para el otro (solo coordenadas absolutas)
    const mirror = (d) => d.replace(/(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/g, (m, x, _a, y) => `${f1(100 - Number(x))},${y}`);
    const pair = (d, fill, extra = '') => `<path fill="${fill}" ${extra} d="${d}"/><path fill="${fill}" ${extra} d="${mirror(d)}"/>`;
    // Pelo esponjoso, para Melody
    const fluffy = (cx, cy, rx, ry, bumps) => {
      let d = '';
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * Math.PI * 2;
        const k = 1 + 0.06 * Math.max(0, Math.cos(a * bumps));
        d += `${i ? 'L' : 'M'}${f1(cx + Math.cos(a) * rx * k)},${f1(cy + Math.sin(a) * ry * k)}`;
      }
      return `${d}Z`;
    };
    const KUROMI_HEAD = 'M50,22 C69,22 81,28 83.5,43 C85.5,56 81,71.5 50,72.5 C19,71.5 14.5,56 16.5,43 C19,28 31,22 50,22 Z';
    // Los ojos de Kuromi: verde amarillo, párpado plano y pupila de rayita, como en la foto
    const catEye = (x, y) => `<path fill="#c8c95e" stroke-width="2.4" d="M${x - 5.4},${y - 1.6} Q${x},${y - 3.4} ${x + 5.4},${y - 1.6} C${x + 5.6},${y + 3.6} ${x + 3},${y + 5.8} ${x},${y + 5.8} C${x - 3},${y + 5.8} ${x - 5.6},${y + 3.6} ${x - 5.4},${y - 1.6} Z"/><ellipse cx="${x}" cy="${y + 1.6}" rx="1.5" ry="3.4" fill="${DARK}" stroke="none"/><circle cx="${x + 2}" cy="${y - 0.2}" r="1.1" fill="#fff" stroke="none"/>`;

    const ART = {
      // Oreo: perrito blanco de orejotas negras, chupo azul, camisita celeste y alitas de murciélago
      oreo: `${shadow}<g ${line}>
        ${pair('M28,77 C22,73.5 16,71.5 12,71.5 C8,76 4,80 1.5,84.5 C5,84 8,85.5 9.5,88 C11.5,85.5 15,85.5 17.5,88.5 C19.5,86 23.5,86 27,88.5 Z', '#3a3440')}
        <path fill="none" stroke="#615869" stroke-width="1.5" d="M12,72.5 L16,86.5 M12,72.5 L9.6,86.5 M88,72.5 L84,86.5 M88,72.5 L90.4,86.5"/>
        <path fill="#fff" d="M70,91 C76.5,87.5 82,91.5 79,96.5 C77,99.5 73,99 71,97.5"/>
        <path fill="#fff" d="M29,76 C27,86 27,96 29,101.5 C30,104 34,104.5 40,104.5 H60 C66,104.5 70,104 71,101.5 C73,96 73,86 71,76 Z"/>
        <path fill="#cfe9fb" d="M28.6,76 C27.6,82 27.4,88 27.8,93.5 Q50,97.5 72.2,93.5 C72.6,88 72.4,82 71.4,76 Z"/>
        <path fill="none" d="M50,98.5 V104.5"/>
        ${pair('M37.5,79.5 C33.5,83 33.5,88.5 37,90 C38.6,90.6 40.6,90.2 41.8,89', 'none')}
        <path fill="#fff" d="M50,21.5 C64,21.5 74,24 79,34 C83,42 85,56 84,66 C83,74 76,77.5 50,77.5 C24,77.5 17,74 16,66 C15,56 17,42 21,34 C26,24 36,21.5 50,21.5 Z"/>
        ${pair('M37,22.5 C27,18.5 10,21 4.5,33 C1,42 3,55 12,57.5 C20,59 26,53 29.5,45 C32.5,38 37,29 37,22.5 Z', '#1f1c22')}
        ${dots(40, 60, 57, 2.6, 3.4, false)}
        <g stroke="#62b0e2" stroke-width="1.8">
          <path fill="#d9f0fd" d="M46.5,66.5 C46.5,72.5 53.5,72.5 53.5,66.5"/>
          <path fill="#bfe4fb" d="M43.5,62.5 C43.5,59.2 56.5,59.2 56.5,62.5 C56.5,66 53,67.8 50,67.8 C47,67.8 43.5,66 43.5,62.5 Z"/>
        </g>
        <path fill="#fff" stroke="none" d="M50,62.6 c-1,-1.6 -3.2,-.8 -2.6,.9 l2.6,2.4 l2.6,-2.4 c.6,-1.7 -1.6,-2.5 -2.6,-.9 Z"/>
      </g>`,
      // Panpan: panda con moño rosado, camiseta de rayas rojas, shorts oscuros y su pingüinito de peluche
      panpan: `${shadow}<g ${line}>
        ${pair('M48,17.5 C44,9 36,3 30.5,5.5 C26.5,8 28,17 35,20.5 C40,22.5 45,21 48,17.5 Z', '#f6a6ab')}
        ${pair('M44.5,15.5 C41,10.5 36.5,8 33.5,9.5 C32,12 33.5,15.5 37,17.5 C40,18.5 43,17.5 44.5,15.5 Z', '#fbc7c9', 'stroke="none"')}
        <circle cx="50" cy="18.5" r="4.2" fill="#ee8b93"/>
        <circle cx="31" cy="27" r="9" fill="#3a3a3f"/><circle cx="69" cy="27" r="9" fill="#3a3a3f"/>
        <path fill="#3a3a3f" d="M30,85 C29,93 29.5,99 31,103 C32,104.5 36,104.5 48,104.5 C49.5,104.5 50,103 50,99.5 C50,103 50.5,104.5 52,104.5 C64,104.5 68,104.5 69,103 C70.5,99 71,93 70,85 Z"/>
        ${pair('M27.5,67 C23,69.5 20.8,79.5 21.2,87.5 C21.5,90.5 25.6,91 27,88.5 C28.6,83.5 29.2,76 29.2,70 Z', '#3a3a3f')}
        ${pair('M28.3,66 C24.8,67 23,70.5 22.5,73.8 L29.4,75 Z', '#fff')}
        <path fill="#fff" d="M29,65 C27.5,73 27,80 27.5,87 Q50,89.5 72.5,87 C73,80 72.5,73 71,65 Z"/>
        <path fill="#ea6f63" stroke="none" d="M28.4,68.4 H71.6 V71.6 H28.4 Z M28,74 H72 V77.2 H28 Z M27.7,79.6 H72.3 V82.8 H27.7 Z M27.5,84.6 H72.5 V88 Q50,90 27.5,88 Z"/>
        <path fill="none" d="M29,65 C27.5,73 27,80 27.5,87 Q50,89.5 72.5,87 C73,80 72.5,73 71,65"/>
        <g stroke-width="2.2">
          <ellipse cx="81.5" cy="82" rx="6.4" ry="7.6" transform="rotate(22 81.5 82)" fill="#3a3a3f"/>
          <ellipse cx="82" cy="81" rx="3.9" ry="4.3" fill="#fff"/>
          <ellipse cx="77.5" cy="87.5" rx="3.2" ry="2.6" fill="#f4b3bd"/>
        </g>
        <circle cx="80.6" cy="80.4" r=".9" fill="${DARK}" stroke="none"/><circle cx="83.6" cy="80.4" r=".9" fill="${DARK}" stroke="none"/>
        <path fill="#ffb347" stroke="none" d="M81.1,82 h2 l-1,1.5 Z"/>
        <path fill="#fff" d="M50,21.5 C65,21.5 75,27 78.5,38 C82,49 81,60 72,64.5 C64,67.5 36,67.5 28,64.5 C19,60 18,49 21.5,38 C25,27 35,21.5 50,21.5 Z"/>
        <ellipse cx="38.5" cy="44.5" rx="7.2" ry="9" transform="rotate(14 38.5 44.5)" fill="#1f1c22" stroke="none"/>
        <ellipse cx="61.5" cy="44.5" rx="7.2" ry="9" transform="rotate(-14 61.5 44.5)" fill="#1f1c22" stroke="none"/>
        <g class="pet-eye"><circle cx="39.5" cy="46" r="2.3" fill="#fff" stroke="none"/><circle cx="60.5" cy="46" r="2.3" fill="#fff" stroke="none"/></g>${sleepy(39.5, 60.5, 46, '#fff')}
        <ellipse cx="50" cy="51.5" rx="3.6" ry="2.4" fill="#1f1c22" stroke="none"/>
        <path fill="none" stroke-width="2.2" d="M46.8,56 q3.2,2.4 6.4,0"/>
      </g>`,
      // Sky: pingüino gris con gorrito de calabaza, gafas verdes, cuello de hojas y disfraz de calabaza
      sky: `${shadow}<g ${line}>
        <ellipse cx="36" cy="101.5" rx="8" ry="3.2" fill="#f6a8bb"/><ellipse cx="64" cy="101.5" rx="8" ry="3.2" fill="#f6a8bb"/>
        ${pair('M21,69.5 C14.5,71.5 9.5,76.5 7.5,82.5 C12.5,82.5 17.5,80.5 21,77.5 Z', '#47474f')}
        <path fill="#47474f" d="M25,84 C24,92 30,99.5 50,99.5 C70,99.5 76,92 75,84 Z"/>
        <ellipse cx="50" cy="91.5" rx="16" ry="3.6" fill="#fff" stroke="none"/>
        <path fill="#f6a73c" d="M24,64 C17.5,70 16.5,82 22,88 q5.6,4.2 11.2,0 q5.6,4.2 11.2,0 q5.6,4.2 11.2,0 q5.6,4.2 11.2,0 q5.6,4.2 11.2,0 C83.5,82 82.5,70 76,64 Z"/>
        <path fill="none" stroke="#d9772a" stroke-width="2" d="M35,65 C31,72 31,82 34,89 M65,65 C69,72 69,82 66,89"/>
        <ellipse cx="27.5" cy="76" rx="3.2" ry="2.2" fill="#ffd36b" stroke="none"/><ellipse cx="72.5" cy="76" rx="3.2" ry="2.2" fill="#ffd36b" stroke="none"/>
        <path fill="#c9661f" stroke="none" d="M33,70.5 q4,-3.4 8,0 q-4,1.6 -8,0 Z M59,70.5 q4,-3.4 8,0 q-4,1.6 -8,0 Z M48,71.5 l2,-3.2 l2,3.2 Z M37,75.5 Q50,79 63,75.5 Q61,84.5 50,84.5 Q39,84.5 37,75.5 Z"/>
        <path fill="#f6a73c" stroke="none" d="M44,76.4 h3 v2.6 h-3 Z M53,76.4 h3 v2.6 h-3 Z"/>
        <ellipse cx="50" cy="44" rx="28.5" ry="21.5" fill="#47474f"/>
        <path fill="#fff" d="M50,37 C44,31 28,31 26,44 C25,56 36,63.5 50,63.5 C64,63.5 75,56 74,44 C72,31 56,31 50,37 Z"/>
        <path fill="#7cc25b" stroke="#3f8f3f" stroke-width="2.2" d="M23,60 Q50,55 77,60 L78,64 q-5.4,6 -10.8,0 q-5.4,6 -10.8,0 q-5.4,6 -10.8,0 q-5.4,6 -10.8,0 q-5.4,6 -10.8,0 Z"/>
        <path fill="none" stroke="#3f8f3f" stroke-width="1.4" d="M34,61.5 v4 M45,61 v4.5 M56,61 v4.5 M67,61.5 v4"/>
        ${blush(31, 69, 50)}
        <g fill="#fff" stroke="#3b9a45" stroke-width="2.8"><circle cx="39.5" cy="41" r="8.4"/><circle cx="60.5" cy="41" r="8.4"/></g>
        <path fill="none" stroke="#3b9a45" stroke-width="2.6" d="M47.6,39 Q50,37.6 52.4,39"/>
        ${dots(41.5, 58.5, 41.5, 2.2, 2.5, false)}
        <path fill="#2f2f36" stroke="none" d="M48,44.6 h4 q0,2.6 -2,2.6 q-2,0 -2,-2.6 Z"/>
        <path fill="#f6a73c" d="M29.5,25 C28.5,15 38,11 50,11 C62,11 71.5,15 70.5,25 q-3.4,4.6 -6.8,0.5 q-3.4,4.6 -6.8,0 q-3.4,4.6 -6.8,0 q-3.4,4.6 -6.8,0 q-3.4,4.6 -6.8,0 q-3.4,4.6 -6.8,-0.5 Z"/>
        <path fill="none" stroke="#d9772a" stroke-width="2" d="M41,12.5 C37.5,16.5 37.5,22 39.5,26.5 M59,12.5 C62.5,16.5 62.5,22 60.5,26.5"/>
        <ellipse cx="44" cy="16" rx="3" ry="2" fill="#ffd36b" stroke="none"/>
        <path fill="#6cb84f" stroke-width="2.4" d="M38,25 C32,23 26,26 25.5,33 C28,32 30,34.5 33,33 C36,31.5 37.5,28.5 38,25 Z"/>
        <path fill="#5aa545" stroke-width="2.4" d="M48,13 C48.5,8 52,4.5 57.5,3 L60,6.5 C56,8 53.5,10.5 53.5,13.5 Z"/>
      </g>`,
      // Kuromi: gatica blanca con gorrito negro, raya blanca en la frente, bigote negro, collar morado y cola negra
      kuromi: `${shadow}<defs><clipPath id="kuromiHead"><path d="${KUROMI_HEAD}"/></clipPath></defs><g ${line}>
        <path fill="#232026" d="M66,93 C84,93 91,80 87,66 C86,61.5 80.5,62 81,67 C83,78 78,86 66,87 Z"/>
        <path fill="#fff" d="M30,75 C28,86 28,96 30,101.5 C31,104 35,104.5 41,104.5 H59 C65,104.5 69,104 70,101.5 C72,96 72,86 70,75 Z"/>
        <path fill="none" d="M50,97.5 V104.5"/>
        <path fill="#232026" stroke="none" d="M55.5,101.5 q2.6,-2.4 5.2,0 q-2.6,1.8 -5.2,0 Z M62,99.2 q1.8,-1.7 3.6,0 q-1.8,1.3 -3.6,0 Z"/>
        <path fill="#9d7fd0" d="M29,71 Q50,79 71,71 L71,76.5 Q50,84.5 29,76.5 Z"/>
        <rect x="58.5" y="78.5" width="4.4" height="7.5" rx="2.2" fill="#dfe3ea" stroke-width="2"/>
        ${pair('M18.5,38 C18,26 19.5,13 22.5,5.5 C28,9 36,15.5 43,23 Z', '#232026')}
        ${pair('M24.5,27 C24.5,22.5 25.3,18 26.4,14.5 C29,16.8 31.5,19.5 33.5,22.5 Z', '#e9a3b3', 'stroke="none"')}
        <path fill="#fff" d="${KUROMI_HEAD}"/>
        <g clip-path="url(#kuromiHead)" stroke="none" fill="#232026">
          <path d="M0,0 H47.6 C47.4,10 46.6,22 45.3,33.5 C37,31 27,34 22,42.5 C19.5,47 18.5,53 18,60 H0 Z"/>
          <path d="M52.4,0 H100 V50 H83 C79.5,39 67,30.5 54.7,33.5 C53.4,22 52.6,10 52.4,0 Z"/>
          <path d="M50,42.5 C51.5,47.5 53.5,51 58.5,53 C64.5,55.5 67.5,60 64.5,64.5 C61,69.5 55.5,72 50,72 C44.5,72 39,69.5 35.5,64.5 C32.5,60 35.5,55.5 41.5,53 C46.5,51 48.5,47.5 50,42.5 Z"/>
        </g>
        <path fill="none" d="${KUROMI_HEAD}"/>
        <path fill="#4b4550" stroke="none" d="M46.8,55 h6.4 q-1,3.2 -3.2,3.6 q-2.2,-.4 -3.2,-3.6 Z"/>
        <path fill="none" stroke="#77707f" stroke-width="1.5" d="M50,58.6 v2 M46.5,61.6 q1.75,1.6 3.5,-1 q1.75,2.6 3.5,1"/>
        <g class="pet-eye">${catEye(36, 46)}${catEye(64, 46)}</g>${sleepy(36, 64, 47.5)}
        ${blush(25.5, 74.5, 58)}
        <path fill="none" stroke-width="1.4" d="M19.5,55.5 h-9 M20,59 l-8.5,3 M80.5,55.5 h9 M80,59 l8.5,3"/>
      </g>`,
      // Melody: perrita peludita blanca, orejas largas color caramelo, copete clarito, naricita grande y dientitos
      melody: `${shadow}<g ${line}>
        <path fill="#fff" d="${fluffy(50, 86, 20, 17, 9)}"/>
        <path fill="none" stroke="#e5d3c0" stroke-width="1.6" d="M43.5,79 q-1,5 1,9.5 M56.5,79 q1,5 -1,9.5"/>
        <ellipse cx="41.5" cy="100.5" rx="7" ry="4.6" fill="#d4955f"/><ellipse cx="58.5" cy="100.5" rx="7" ry="4.6" fill="#d4955f"/>
        <path fill="none" stroke="#a9693a" stroke-width="1.3" d="M39.5,98.8 v2.6 M43,98.5 v2.7 M56.5,98.8 v2.6 M60,98.5 v2.7"/>
        <path fill="#fff" d="${fluffy(50, 45, 31, 27, 11)}"/>
        <path fill="#efd0a4" stroke="none" d="M38,25 C41,19 59,19 62,25 C60,28.5 58,28 57,32 C55,29.5 53,32 50,35.5 C47,32 45,29.5 43,32 C42,28 40,28.5 38,25 Z"/>
        <path fill="none" stroke="#d9ae7a" stroke-width="1.4" d="M45,22.5 q1,4 0,7.5 M50,21.5 v9 M55,22.5 q-1,4 0,7.5"/>
        ${pair('M28,24 C20,23 14,30 13,40 C11.5,44 13,47 11.5,51 C10,55 12.5,58 11,62 C10,66 12.5,69 12,73 C14.5,71.5 16,74.5 18.5,72 C20.5,74.5 23,71.5 24.5,69 C26.5,59 28.5,48 31,38 C32.5,31 32,25 28,24 Z', '#e8bd8a')}
        <path fill="none" stroke="#c99560" stroke-width="1.5" d="M19,33 q-3,13 -2,30 M25,31 q-3,14 -2.5,32 M81,33 q3,13 2,30 M75,31 q3,14 2.5,32"/>
        <ellipse cx="44.5" cy="51.8" rx="2.6" ry="1.8" fill="#f0d2b0" stroke="none"/><ellipse cx="55.5" cy="51.8" rx="2.6" ry="1.8" fill="#f0d2b0" stroke="none"/>
        ${dots(39.5, 60.5, 46.5, 3.6, 4.2, true, '#2b1a14')}
        ${blush(34, 66, 56)}
        <ellipse cx="50" cy="54.5" rx="5" ry="3.7" fill="#8c5d66" stroke-width="2.2"/>
        <ellipse cx="48.4" cy="53.3" rx="1.6" ry="1" fill="#fff" fill-opacity=".6" stroke="none"/>
        <path fill="none" stroke-width="2" d="M45.6,60 q4.4,3.6 8.8,0"/>
        <path fill="#fff" stroke-width="1.3" d="M47.4,61.4 l.9,-2.3 l.9,2.3 Z M50.8,61.4 l.9,-2.3 l.9,2.3 Z"/>
      </g>`
    };

    const BUBBLES = {
      heart: `<svg viewBox="0 0 24 24"><path fill="#ff6f8e" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" d="M12,20 C5,15 3,11 3,8.5 A4.5,4.5 0 0 1 12,6.5 A4.5,4.5 0 0 1 21,8.5 C21,11 19,15 12,20 Z"/></svg>`,
      bone: `<svg viewBox="0 0 24 24"><path fill="#fff6e6" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" d="M7,9 C4,6 1,9 3.5,11 C1,13 4,17 7,14 H17 C20,17 23,13 20.5,11 C23,9 20,6 17,9 Z"/></svg>`,
      fish: `<svg viewBox="0 0 24 24"><path fill="#a8e0f7" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" d="M3,12 C7,6 14,6 18,12 C14,18 7,18 3,12 Z M18,12 L22,8 V16 Z"/><circle cx="8" cy="11" r="1.2" fill="${INK}"/></svg>`,
      bamboo: `<svg viewBox="0 0 24 24"><g stroke="${INK}" stroke-width="1.8" stroke-linejoin="round"><rect x="9" y="3" width="5" height="18" rx="2" fill="#8fd37a"/><path fill="none" d="M9,9h5M9,15h5"/><path fill="#7cc865" d="M14,8 C18,4 22,5 22,7 C19,9 16,9 14,8 Z"/></g></svg>`,
      star: `<svg viewBox="0 0 24 24"><path fill="#ffd36b" stroke="${INK}" stroke-width="1.8" stroke-linejoin="round" d="M12,2.5 l2.8,5.8 l6.3,.8 l-4.6,4.4 l1.2,6.3 l-5.7,-3.1 l-5.7,3.1 l1.2,-6.3 l-4.6,-4.4 l6.3,-.8 Z"/></svg>`,
      flower: `<svg viewBox="0 0 24 24"><g stroke="${INK}" stroke-width="1.6"><circle cx="12" cy="6" r="4" fill="#ff9fb1"/><circle cx="18" cy="11" r="4" fill="#ff9fb1"/><circle cx="15.5" cy="18" r="4" fill="#ff9fb1"/><circle cx="8.5" cy="18" r="4" fill="#ff9fb1"/><circle cx="6" cy="11" r="4" fill="#ff9fb1"/><circle cx="12" cy="12.5" r="3.4" fill="#ffd36b"/></g></svg>`
    };

    const CREW = [
      { key: 'oreo', name: 'Oreo', likes: ['bone', 'heart', 'star'] },
      { key: 'panpan', name: 'Panpan', likes: ['bamboo', 'heart', 'flower'] },
      { key: 'sky', name: 'Sky', likes: ['fish', 'star', 'heart'] },
      { key: 'kuromi', name: 'Kuromi', likes: ['fish', 'heart', 'flower'] },
      { key: 'melody', name: 'Melody', likes: ['bone', 'flower', 'heart'] }
    ];

    let crew = [];
    let running = false;
    let last = 0;

    // ---------- Dónde queda cada cosa ----------
    // La casita es un SVG de 720×700; sus puntos se pasan a coordenadas de la pradera.
    const HOUSE_SPOTS = {
      door: [360, 690],
      left: [216, 470],
      right: [504, 470],
      attic: [360, 262]
    };
    const WINDOW_KEYS = ['left', 'right', 'attic'];

    function housePoint(key) {
      const cottage = document.querySelector('.cottage');
      if (!cottage) return null;
      const house = cottage.getBoundingClientRect();
      const field = meadow.getBoundingClientRect();
      const [sx, sy] = HOUSE_SPOTS[key];
      return {
        x: house.left - field.left + (sx / 720) * house.width,
        y: house.top - field.top + (sy / 700) * house.height,
        scale: Math.max(0.35, Math.min(1, house.width / 720 * 1.15))
      };
    }

    function bounds() {
      const box = meadow.getBoundingClientRect();
      const width = meadow.clientWidth;
      const viewTop = Math.max(0, -box.top);
      const dock = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dock-space')) || 76;
      const top = Math.max(110, viewTop + 90);
      const bottom = Math.min(meadow.clientHeight - 30, viewTop + window.innerHeight - box.top * (box.top > 0 ? 1 : 0) - dock - 30);
      return { left: width * 0.08, right: width * 0.92, top, bottom: Math.max(top + 60, bottom) };
    }

    function meadowPoint(event) {
      const field = meadow.getBoundingClientRect();
      return { x: event.clientX - field.left, y: event.clientY - field.top };
    }

    // ---------- Piezas pequeñas ----------
    function place(pet) {
      const scale = pet.scale ?? 1;
      pet.el.style.transform = `translate3d(${pet.x.toFixed(1)}px,${pet.y.toFixed(1)}px,0)${scale !== 1 ? ` scale(${scale.toFixed(3)})` : ''}`;
      pet.el.style.zIndex = String(Math.round(pet.y) + (pet.mode === 'held' ? 5000 : 1000));
    }

    function flash(pet, className, ms) {
      pet.el.classList.add(className);
      clearTimeout(pet[className]);
      pet[className] = setTimeout(() => pet.el.classList.remove(className), ms);
    }

    function think(pet, like) {
      const pick = like || pet.def.likes[Math.floor(Math.random() * pet.def.likes.length)];
      pet.el.querySelector('.pet-bubble').innerHTML = BUBBLES[pick];
      flash(pet, 'show-bubble', 2200);
    }

    function hop(pet) {
      pet.el.classList.remove('is-hop');
      void pet.el.offsetWidth;
      flash(pet, 'is-hop', 700);
    }

    function setFace(pet, face) {
      if (face === pet.face) return;
      pet.face = face;
      pet.el.style.setProperty('--face', face);
    }

    function setMode(pet, mode) {
      pet.mode = mode;
      pet.el.classList.toggle('is-walking', mode === 'walk');
      pet.el.classList.toggle('is-sitting', mode === 'sit');
      pet.el.classList.toggle('is-held', mode === 'held');
      pet.el.classList.toggle('is-inside', mode === 'inside');
      pet.el.classList.toggle('is-peeking', mode === 'peek');
    }

    function idle(pet, rest = 1 + Math.random() * 3) {
      pet.next = null;
      pet.rest = rest;
      pet.scale = 1;
      setMode(pet, 'idle');
      place(pet);
    }

    function walkTo(pet, x, y, next = null) {
      pet.tx = x;
      pet.ty = y;
      pet.next = next;
      // Con "reducir movimiento" no caminan: aparecen donde iban.
      if (reducedMotion) {
        if (Math.abs(x - pet.x) > 2) setFace(pet, x > pet.x ? 1 : -1);
        pet.x = x;
        pet.y = y;
        place(pet);
        arrive(pet);
        return;
      }
      setMode(pet, 'walk');
    }

    // Se sienta mirando hacia algo: una flor, la casita o simplemente el jardín.
    function sit(pet, seconds, lookAtX = null) {
      pet.timer = seconds;
      pet.nextThought = 4 + Math.random() * 6;
      if (lookAtX !== null && Math.abs(lookAtX - pet.x) > 4) setFace(pet, lookAtX > pet.x ? 1 : -1);
      setMode(pet, 'sit');
    }

    function outside() {
      return crew.filter((pet) => !['inside', 'peek', 'jump'].includes(pet.mode));
    }

    // Una flor que se vea en pantalla, para ir a mirarla.
    function visibleFlower() {
      const b = bounds();
      const field = meadow.getBoundingClientRect();
      const options = [...flowersContainer.querySelectorAll('.flower-item')]
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return { x: rect.left - field.left + rect.width / 2, y: rect.bottom - field.top };
        })
        .filter((spot) => spot.y > b.top && spot.y < b.bottom + 40);
      return options[Math.floor(Math.random() * options.length)] || null;
    }

    // ---------- La casita ----------
    function enterHouse(pet) {
      const door = housePoint('door');
      if (door) {
        pet.x = door.x;
        pet.y = door.y;
      }
      setMode(pet, 'entering');
      pet.el.classList.add('is-entering');
      place(pet);
      Sound.tinkle();
      setTimeout(() => {
        pet.el.classList.remove('is-entering');
        pet.timer = 8 + Math.random() * 18;
        setMode(pet, 'inside');
      }, reducedMotion ? 0 : 600);
    }

    function leaveByDoor(pet) {
      const door = housePoint('door');
      if (!door) return idle(pet);
      pet.x = door.x;
      pet.y = door.y;
      pet.scale = 1;
      setMode(pet, 'idle');
      place(pet);
      flash(pet, 'is-emerging', 650);
      think(pet, 'heart');
      const b = bounds();
      // De noche sale, se queda en la puerta y se duerme ahí.
      if (state.time === 'night') return idle(pet);
      walkTo(pet, door.x + (Math.random() - 0.5) * 120, b.top + 20 + Math.random() * 60);
    }

    // Se asoma por una ventana y, al rato, salta al pasto.
    function peek(pet, windowKey = WINDOW_KEYS[Math.floor(Math.random() * WINDOW_KEYS.length)]) {
      const spot = housePoint(windowKey);
      if (!spot) return leaveByDoor(pet);
      pet.x = spot.x;
      pet.y = spot.y;
      pet.scale = spot.scale * (windowKey === 'attic' ? 0.85 : 1);
      pet.timer = 3 + Math.random() * 3;
      pet.window = windowKey;
      setMode(pet, 'peek');
      place(pet);
      flash(pet, 'is-emerging', 650);
      setTimeout(() => think(pet, 'heart'), 500);
    }

    function jump(pet, toX, toY) {
      if (reducedMotion) {
        pet.x = toX;
        pet.y = toY;
        idle(pet);
        return;
      }
      pet.jump = { fromX: pet.x, fromY: pet.y, toX, toY, fromScale: pet.scale ?? 1, t: 0, length: reducedMotion ? 0.01 : 0.9 };
      setMode(pet, 'jump');
      setFace(pet, toX >= pet.x ? 1 : -1);
      Sound.tinkle();
    }

    function jumpDown(pet) {
      const b = bounds();
      jump(pet, Math.min(b.right, Math.max(b.left, pet.x + (Math.random() - 0.5) * 140)), b.top + 10 + Math.random() * 50);
    }

    // ---------- Lo que deciden hacer solos ----------
    function chooseNext(pet) {
      const roll = Math.random();
      const b = bounds();
      const inside = crew.filter((other) => other.mode === 'inside').length;
      if (roll < 0.4 && reducedMotion) {
        sit(pet, 15 + Math.random() * 20);
      } else if (roll < 0.4) {
        walkTo(pet, b.left + Math.random() * (b.right - b.left), b.top + Math.random() * (b.bottom - b.top));
      } else if (roll < 0.62) {
        const flower = visibleFlower();
        if (flower) walkTo(pet, flower.x + (Math.random() < 0.5 ? -1 : 1) * (26 + Math.random() * 14), flower.y + 6, 'watch');
        else sit(pet, 10 + Math.random() * 15);
      } else if (roll < 0.74 && inside < 2) {
        const door = housePoint('door');
        if (door) walkTo(pet, door.x, door.y, 'enter');
      } else if (roll < 0.88) {
        const friends = outside().filter((other) => other !== pet && other.mode !== 'held');
        const friend = friends[Math.floor(Math.random() * friends.length)];
        if (friend) {
          pet.friend = friend;
          walkTo(pet, friend.x + (pet.x < friend.x ? -1 : 1) * 46, friend.y + 4, 'greet');
        } else sit(pet, 8 + Math.random() * 10);
      } else {
        sit(pet, 12 + Math.random() * 20);
      }
      if (Math.random() < 0.25) think(pet);
    }

    function arrive(pet) {
      const next = pet.next;
      pet.next = null;
      if (next === 'enter') return enterHouse(pet);
      if (next === 'watch') {
        const flower = visibleFlower();
        sit(pet, 15 + Math.random() * 20, flower ? flower.x : null);
        think(pet, 'flower');
        return;
      }
      if (next === 'greet' && pet.friend && outside().includes(pet.friend)) {
        const friend = pet.friend;
        setFace(pet, friend.x > pet.x ? 1 : -1);
        if (friend.mode !== 'held') setFace(friend, pet.x > friend.x ? 1 : -1);
        hop(pet);
        setTimeout(() => hop(friend), 250);
        think(pet, 'heart');
        setTimeout(() => think(friend, 'heart'), 400);
        sit(pet, 6 + Math.random() * 6, friend.x);
        if (friend.mode === 'idle' || friend.mode === 'sit') sit(friend, 6 + Math.random() * 6, pet.x);
        pet.friend = null;
        return;
      }
      idle(pet, 2 + Math.random() * 5);
    }

    // ---------- Arrastrarlos con el dedo ----------
    function enableDrag(pet) {
      const el = pet.el;
      let start = null;
      el.addEventListener('pointerdown', (event) => {
        if (['inside', 'entering', 'jump'].includes(pet.mode) || event.button > 0) return;
        start = { x: event.clientX, y: event.clientY, id: event.pointerId };
        pet.dragged = false;
      });
      // Se escucha en toda la ventana: si el dedo se mueve rápido, no lo suelta.
      window.addEventListener('pointermove', (event) => {
        if (!start || event.pointerId !== start.id) return;
        if (pet.mode !== 'held') {
          if (Math.hypot(event.clientX - start.x, event.clientY - start.y) < 8) return;
          try { el.setPointerCapture(event.pointerId); } catch (e) {}
          pet.dragged = true;
          pet.scale = 1;
          setMode(pet, 'held');
          Sound.tinkle();
          flash(pet, 'show-tag', 1800);
        }
        const point = meadowPoint(event);
        pet.x = point.x;
        // El dedo lo agarra de la barriguita, no de las patas.
        pet.y = point.y + el.offsetHeight * 0.45;
        place(pet);
        event.preventDefault();
      });
      const release = (event) => {
        if (!start || event.pointerId !== start.id) return;
        start = null;
        if (pet.mode !== 'held') return;
        drop(pet);
      };
      window.addEventListener('pointerup', release);
      window.addEventListener('pointercancel', release);
    }

    function drop(pet) {
      const door = housePoint('door');
      const b = bounds();
      if (door && Math.hypot(pet.x - door.x, pet.y - door.y) < 55) {
        walkTo(pet, door.x, door.y, 'enter');
        return;
      }
      // Si lo sueltan en el cielo o en la casita, salta al pasto.
      if (pet.y < b.top - 30) {
        jumpDown(pet);
        return;
      }
      hop(pet);
      const flower = visibleFlower();
      sit(pet, 25 + Math.random() * 20, flower ? flower.x : null);
      if (state.time !== 'night') think(pet, 'flower');
      place(pet);
    }

    // ---------- Tocar la puerta y las ventanas ----------
    function makeHouseButtons() {
      const spots = [
        { key: 'door', label: 'La puerta de la casita', w: 100, h: 138, dy: -69 },
        { key: 'left', label: 'La ventana de la izquierda', w: 80, h: 86, dy: -43 },
        { key: 'right', label: 'La ventana de la derecha', w: 80, h: 86, dy: -43 },
        { key: 'attic', label: 'La ventanita del ático', w: 80, h: 80, dy: -38 }
      ];
      spots.forEach((spot) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'house-hit';
        button.setAttribute('aria-label', spot.label);
        button.dataset.key = spot.key;
        button.addEventListener('click', (event) => {
          event.stopPropagation();
          tapHouse(spot.key);
        });
        layer.appendChild(button);
        spot.el = button;
      });
      const layout = () => {
        const cottage = document.querySelector('.cottage');
        if (!cottage) return;
        const k = cottage.getBoundingClientRect().width / 720;
        spots.forEach((spot) => {
          const point = housePoint(spot.key);
          if (!point) return;
          spot.el.style.width = `${spot.w * k}px`;
          spot.el.style.height = `${spot.h * k}px`;
          spot.el.style.transform = `translate(${(point.x - (spot.w * k) / 2).toFixed(1)}px, ${(point.y + (spot.dy - spot.h / 2) * k).toFixed(1)}px)`;
        });
      };
      layout();
      window.addEventListener('resize', layout);
      if (document.fonts) document.fonts.ready.then(layout);
      setTimeout(layout, 800);
    }

    function tapHouse(key) {
      Sound.chime();
      const inside = crew.filter((pet) => pet.mode === 'inside');
      const someone = inside[Math.floor(Math.random() * inside.length)];
      if (key === 'door') {
        // Tocar la puerta: sale alguien, o el que esté más cerca corre a entrar.
        if (someone) return leaveByDoor(someone);
        const door = housePoint('door');
        const free = outside().filter((pet) => pet.mode !== 'held');
        if (!door || !free.length) return;
        const nearest = free.reduce((best, pet) => (Math.hypot(pet.x - door.x, pet.y - door.y) < Math.hypot(best.x - door.x, best.y - door.y) ? pet : best));
        if (state.time === 'night') return enterHouse(nearest);
        walkTo(nearest, door.x, door.y, 'enter');
        think(nearest, 'heart');
        return;
      }
      // Tocar una ventana: alguien de adentro se asoma por ahí.
      if (someone) return peek(someone, key);
      const peeking = crew.find((pet) => pet.mode === 'peek' && pet.window === key);
      if (peeking) jumpDown(peeking);
    }

    // ---------- Crear a cada uno ----------
    function create(def, index) {
      const el = document.createElement('button');
      el.type = 'button';
      el.className = 'pet';
      el.setAttribute('aria-label', `${def.name}. Tócale para saludar o arrástrale para moverle.`);
      el.innerHTML = `<span class="pet-tag">${def.name}</span><span class="pet-bubble"></span><div class="pet-flip"><div class="pet-bob"><svg viewBox="0 0 100 110" aria-hidden="true">${ART[def.key]}</svg></div></div><span class="pet-zzz">z z</span>`;
      layer.appendChild(el);
      const b = bounds();
      const pet = {
        def, el, mode: 'idle', rest: 1 + Math.random() * 3, face: index % 2 ? -1 : 1, scale: 1,
        x: b.left + ((index + 0.5) / CREW.length) * (b.right - b.left),
        y: Math.min(b.bottom, 150 + (index % 3) * 46),
        speed: 26 + Math.random() * 16
      };
      el.style.setProperty('--face', pet.face);
      place(pet);
      enableDrag(pet);
      el.addEventListener('click', (event) => {
        event.stopPropagation();
        // Un arrastre termina en "click": ese no cuenta como saludo.
        if (pet.dragged) {
          pet.dragged = false;
          return;
        }
        Sound.tinkle();
        hop(pet);
        flash(pet, 'show-tag', 2200);
        floatHearts($('waterLayer'), pet.x, meadow.offsetTop + pet.y - el.offsetHeight * 0.8);
        if (pet.mode === 'peek') {
          setTimeout(() => jumpDown(pet), 300);
          return;
        }
        if (state.time !== 'night') think(pet);
      });
      return pet;
    }

    // ---------- Cada cuadro ----------
    function tick(now) {
      if (!running) return;
      requestAnimationFrame(tick);
      if (document.hidden) { last = now; return; }
      // Avanzan según el tiempo real, aunque el teléfono dibuje pocos cuadros por segundo.
      const dt = Math.min(0.25, (now - last) / 1000 || 0.016);
      last = now;
      const asleep = state.time === 'night';
      crew.forEach((pet) => {
        if (pet.mode === 'held' || pet.mode === 'entering') return;
        if (pet.mode === 'jump') {
          const j = pet.jump;
          j.t = Math.min(1, j.t + dt / j.length);
          const ease = j.t;
          pet.x = j.fromX + (j.toX - j.fromX) * ease;
          pet.y = j.fromY + (j.toY - j.fromY) * ease - Math.sin(Math.PI * ease) * 70;
          pet.scale = j.fromScale + (1 - j.fromScale) * ease;
          place(pet);
          if (j.t >= 1) {
            hop(pet);
            idle(pet, 1 + Math.random() * 2);
          }
          return;
        }
        // De noche, los de adentro se quedan adentro y los de afuera duermen donde estén.
        if (asleep) return;
        if (pet.mode === 'inside') {
          pet.timer -= dt;
          if (pet.timer <= 0) {
            if (Math.random() < 0.45) peek(pet);
            else leaveByDoor(pet);
          }
          return;
        }
        if (pet.mode === 'peek') {
          pet.timer -= dt;
          if (pet.timer <= 0) jumpDown(pet);
          return;
        }
        if (pet.mode === 'sit') {
          pet.timer -= dt;
          pet.nextThought -= dt;
          if (pet.nextThought <= 0) {
            pet.nextThought = 6 + Math.random() * 8;
            if (Math.random() < 0.6) think(pet, Math.random() < 0.6 ? 'flower' : null);
          }
          if (pet.timer <= 0) idle(pet, 0.5 + Math.random() * 2);
          return;
        }
        if (pet.mode === 'idle') {
          pet.rest -= dt;
          if (pet.rest <= 0) chooseNext(pet);
          return;
        }
        if (pet.mode !== 'walk') return;
        const dx = pet.tx - pet.x;
        const dy = pet.ty - pet.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 3) {
          arrive(pet);
          return;
        }
        const step = Math.min(distance, pet.speed * dt);
        pet.x += (dx / distance) * step;
        pet.y += (dy / distance) * step;
        if (Math.abs(dx) > 2) setFace(pet, dx > 0 ? 1 : -1);
        place(pet);
      });
    }

    return {
      refresh() {
        if (!layer) return;
        if (!crew.length) {
          crew = CREW.map(create);
          makeHouseButtons();
        }
        const asleep = state.time === 'night';
        crew.forEach((pet) => {
          pet.el.classList.toggle('is-asleep', asleep);
          if (asleep && pet.mode === 'walk') {
            if (pet.next === 'enter') enterHouse(pet);
            else idle(pet);
          }
          if (asleep && pet.mode === 'peek') setMode(pet, 'inside');
        });
        // También con "reducir movimiento": siguen sentándose, entrando y saliendo, solo que sin pasear.
        if (!running) {
          running = true;
          last = performance.now();
          requestAnimationFrame(tick);
        }
      }
    };
  })();

  // ================= 12. RECUERDOS Y COPIA DE SEGURIDAD =================
  function renderChest() {
    const list = $('chestList');
    list.innerHTML = '';
    const flowers = FlowerStore.planted().sort((a, b) => b.date.localeCompare(a.date));
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
    $('selectRadio').value = String(Radio.minutes);
    $('toggleMotion').checked = !reducedMotion;
    openSheet(chestModal);
  });
  $('toggleMotion').addEventListener('change', (event) => {
    try { localStorage.setItem(STILL_KEY, event.target.checked ? '0' : '1'); } catch (e) {}
    window.location.reload();
  });
  $('selectRadio').addEventListener('change', (event) => {
    Radio.setMinutes(event.target.value);
    toast(Radio.minutes ? `Sonará una canción cada ${Radio.minutes === 60 ? 'hora' : `${Radio.minutes} minutos`}` : 'Las canciones quedan apagadas en este dispositivo');
  });
  $('btnPlaySong').addEventListener('click', async () => {
    await closeSheet(chestModal);
    Radio.playOne({ auto: false });
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
    // Con la nube, el panel es de la clave de Santiago y no de un truco escondido.
    if (Cloud.user && !Cloud.isAdmin()) return;
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

  const TYPE_LABELS = { astromelia: 'Astromelia', sunflower: 'Girasol', rose: 'Rosa', tulip: 'Tulipán', daisy: 'Margarita', wildflower: 'Flor silvestre', ramo: 'Ramo con globito' };
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

    // Con la nube, la flor se guarda escondida en Firebase y el QR solo lleva su nombre.
    const cloud = Boolean(Cloud.user);
    let packaged = false;
    if (cloud) {
      const submit = form.querySelector('[type="submit"]');
      submit.disabled = true;
      toast('Guardando la flor en la nube…');
      try {
        const existing = FlowerStore.get(flower.id);
        const saved = await FlowerStore.add({ ...flower, porSembrar: !(existing && !existing.porSembrar) });
        if (!saved || !(await Cloud.ensureUploaded(flower.id))) throw new Error('sin subir');
      } catch (e) {
        console.error('No se pudo guardar la flor en la nube', e);
        toast('No pude guardar la flor en la nube. Revisa tu conexión e inténtalo otra vez.');
        return;
      } finally {
        submit.disabled = false;
      }
      renderAdminList();
      currentPackage = null;
      currentURL = FlowerStore.packagedFlowerURL(flower, base);
    } else {
      const hasFiles = [flower.realPhoto, flower.couplePhoto, flower.music].some((value) => value.startsWith('data:'));
      const directURL = FlowerStore.encodeFlowerToURL(flower, base);
      packaged = hasFiles || directURL.length > QR_DIRECT_LIMIT;
      currentPackage = packaged ? flower : null;
      currentURL = packaged ? FlowerStore.packagedFlowerURL(flower, base) : directURL;
    }

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
    $('qrQuality').textContent = cloud
      ? 'La flor ya está guardada en la nube, escondida. Brotará en su jardín cuando escanee este código.'
      : packaged
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
    ctx.fillStyle = '#fffaf0';
    ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#4a3226';
    ctx.font = '600 104px Fredoka, sans-serif';
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
    ctx.fillStyle = '#4a3226';
    ctx.font = '600 50px Fredoka, sans-serif';
    ctx.fillText('Escanéame y nacerá tu flor', width / 2, 1050);
    ctx.fillStyle = '#7a5b47';
    ctx.font = '600 30px Nunito, sans-serif';
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
      item.querySelector('small').textContent = formatDate(flower.date) + (flower.porSembrar ? ' · esperando su QR' : '');
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
    if (Cloud.user) renderSongList();
    openSheet(adminModal);
  });
  $('btnCloseAdmin').addEventListener('click', () => closeSheet(adminModal));

  // ================= 14. INICIO =================
  Ambient.start();
  setTimeMode(timeFromClock());
  startAutoCycle();
  resetForm();
  renderGarden();
  Pets.refresh();
  drawFairyLights();
  window.addEventListener('resize', drawFairyLights);
  if (document.fonts) document.fonts.ready.then(drawFairyLights);
  window.addEventListener('resize', () => {
    if (columnsForWidth() !== gardenColumns) renderGarden();
    else if (flowersContainer.clientWidth !== trailWidth) drawGardenTrail();
  });
  // ================= 15. LA NUBE =================
  const loginModal = $('loginModal');
  // La llave no se puede cerrar: sin clave no se entra al jardín.
  loginModal.addEventListener('cancel', (event) => event.preventDefault());

  function loginMessage(error) {
    const code = (error && error.code) || '';
    if (code.includes('too-many-requests')) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
    if (code.includes('network')) return 'No hay conexión. Revisa el internet y vuelve a intentarlo.';
    return 'Esa no es la clave del jardín. Inténtalo otra vez.';
  }

  function askForKey() {
    return new Promise((resolve) => {
      openSheet(loginModal);
      setTimeout(() => $('inputGardenKey').focus(), 350);
      $('formLogin').onsubmit = async (event) => {
        event.preventDefault();
        const key = $('inputGardenKey').value;
        if (!key) {
          showError($('loginError'), 'Escribe la clave.');
          return;
        }
        const button = $('btnLogin');
        button.disabled = true;
        showError($('loginError'), '');
        try {
          await Cloud.signIn(key);
          $('inputGardenKey').value = '';
          await closeSheet(loginModal);
          resolve();
        } catch (e) {
          console.error('No se pudo entrar', e);
          showError($('loginError'), loginMessage(e));
        } finally {
          button.disabled = false;
        }
      };
    });
  }

  function applyRole() {
    const admin = Cloud.isAdmin();
    $('btnOpenAdmin').hidden = !admin;
    $('songsSection').hidden = !admin;
    $('btnSignOut').hidden = false;
    $('backupNote').textContent = 'El jardín se guarda en la nube y es el mismo en todos sus dispositivos. La copia es un respaldo extra, por si acaso.';
    $('adminListTitle').textContent = 'Flores del jardín';
    $('adminListNote').textContent = 'Quitar una flor la borra también de su celular. Las que esperan su QR todavía no se ven en el jardín.';
  }

  // Si llega algo de otro dispositivo, se redibuja; no en plena ceremonia de brote.
  function onCloudChange() {
    if (sproutModal.open) return;
    renderGarden();
    if (adminModal.open) renderAdminList();
  }

  async function connectCloud() {
    if (!Cloud.init()) return;
    const user = await Cloud.currentUser();
    if (!user) await askForKey();
    applyRole();
    await Cloud.start(onCloudChange);
    Cloud.watchSongs((songs) => {
      Radio.setSongs(songs);
      if (adminModal.open) renderSongList();
    });
  }

  // ---------- Canciones en el panel ----------
  function renderSongList() {
    const list = $('songList');
    list.innerHTML = '';
    if (!Radio.songs.length) {
      const empty = document.createElement('li');
      empty.className = 'card-note';
      empty.textContent = 'Aún no hay canciones.';
      list.appendChild(empty);
    }
    Radio.songs.forEach((song) => {
      const item = document.createElement('li');
      item.className = 'memory-row';
      item.innerHTML = '<span class="memory-row__text"><strong></strong><small></small></span><button class="btn-link" type="button">Escuchar</button><button class="btn-link" type="button">Quitar</button>';
      item.querySelector('strong').textContent = song.title;
      item.querySelector('small').textContent = song.ref.startsWith('nube:') ? 'Archivo guardado en la nube' : 'Enlace';
      const [listen, remove] = item.querySelectorAll('button');
      listen.addEventListener('click', () => {
        if (Music.current === song.ref) Music.stop();
        else Music.play(song.ref, { loop: false });
      });
      remove.addEventListener('click', async () => {
        if (remove.dataset.confirm !== '1') {
          remove.dataset.confirm = '1';
          remove.textContent = '¿Seguro?';
          return;
        }
        remove.disabled = true;
        if (Music.current === song.ref) Music.stop();
        await Cloud.removeSong(song).catch((e) => {
          console.error('No se pudo quitar la canción', e);
          toast('No pude quitar la canción. Revisa tu conexión.');
        });
      });
      list.appendChild(item);
    });
  }

  let songFile = '';
  $('fileSong').addEventListener('change', async (event) => {
    const file = event.target.files[0];
    songFile = '';
    showError($('songError'), '');
    if (!file) return;
    if (file.size > MAX_AUDIO_BYTES) {
      event.target.value = '';
      showError($('songError'), 'Esa canción pesa más de 8 MB. Usa una versión más ligera o un enlace directo.');
      return;
    }
    if (!$('inputSongTitle').value.trim()) $('inputSongTitle').value = file.name.replace(/\.[^.]+$/, '').slice(0, 80);
    try {
      songFile = await blobToDataURL(file);
    } catch (e) {
      showError($('songError'), 'No pude leer ese archivo de audio.');
    }
  });

  $('btnAddSong').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    const title = $('inputSongTitle').value.trim() || 'Nuestra canción';
    const link = $('inputSongUrl').value.trim();
    showError($('songError'), '');
    let value = songFile;
    if (!value) {
      if (!link) return showError($('songError'), 'Elige un archivo o pega un enlace directo a un .mp3.');
      if (!/^https?:\/\//i.test(link) || /youtube\.com|youtu\.be|spotify\.com/i.test(link)) {
        return showError($('songError'), 'Necesito un enlace directo a un .mp3. YouTube y Spotify no dejan reproducirse aquí: sube el archivo.');
      }
      value = link;
    }
    if (value.startsWith('data:') && !/^data:audio\//i.test(value)) {
      return showError($('songError'), 'Ese archivo no parece una canción.');
    }
    button.disabled = true;
    button.textContent = 'Subiendo…';
    try {
      await Cloud.addSong(title, value);
      toast(`«${title}» ya está en el jardín`);
      $('inputSongTitle').value = '';
      $('inputSongUrl').value = '';
      $('fileSong').value = '';
      songFile = '';
    } catch (e) {
      console.error('No se pudo agregar la canción', e);
      showError($('songError'), 'No pude subir la canción. Revisa tu conexión e inténtalo otra vez.');
    } finally {
      button.disabled = false;
      button.textContent = 'Agregar canción';
    }
  });

  $('btnSignOut').addEventListener('click', async (event) => {
    const button = event.currentTarget;
    if (button.dataset.confirm !== '1') {
      button.dataset.confirm = '1';
      button.textContent = 'Toca otra vez para salir';
      return;
    }
    await Cloud.signOut();
    window.location.reload();
  });

  FlowerStore.migrate()
    .then(() => renderGarden())
    .catch((e) => console.error(e))
    .then(connectCloud)
    .catch((e) => console.error('No pude conectar con la nube', e))
    .finally(() => {
      renderGarden();
      checkURLForFlower();
    });
});
