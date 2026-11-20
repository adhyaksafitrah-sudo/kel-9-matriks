/* =========================================================
   IDE PRIORITY - script.js
   Kelompok 9 - XI PPLG 2

   Isi file ini (urutan dari atas ke bawah):
   1. Data awal & aturan kuadran
   2. LocalStorage (simpan / muat data)
   3. Fungsi bantu (hitung skor, urutkan, dll.)
   4. Chart.js (plugin kuadran, matriks, grafik batang)
   5. Menampilkan setiap halaman
   6. Form tambah/edit, hapus, reset, cari
   7. Navigasi & inisialisasi
   ========================================================= */
'use strict';

import { mountMatrix3D } from './matriks-3d.js';

/* ---------------------------------------------------------
   1. DATA AWAL & ATURAN KUADRAN
   --------------------------------------------------------- */

const STORAGE_KEY = 'idePriorityKelompok9';
const THEME_STORAGE_KEY = 'idePriorityTheme';

// Data awal dari LKPD 5 (jangan diubah)
const INITIAL_IDEAS = [
  { id: '1',  name: 'Fit Assistant & Size Recommendation AI',        feas: 4, impact: 5 },
  { id: '2',  name: 'Express 1-Click Buy & Instant Escrow Checkout', feas: 5, impact: 5 },
  { id: '3',  name: 'Consolidated Shipping & Flat Rate Ongkir',      feas: 4, impact: 5 },
  { id: '4',  name: 'Real-Time Inventory & Size Sync System',        feas: 4, impact: 4 },
  { id: '5',  name: 'Sistem Pre-order Berbasis Kuota',               feas: 3, impact: 4 },
  { id: '6',  name: '24/7 Contextual Chatbot CS',                    feas: 4, impact: 4 },
  { id: '7',  name: 'Virtual Try-On 3D Augmented Reality',           feas: 2, impact: 5 },
  { id: '8',  name: 'Video Review Reels',                            feas: 3, impact: 4 },
  { id: '9',  name: 'Gamified Cashback & Reviewer Poin',             feas: 4, impact: 3 },
  { id: '10', name: 'Smart Price Negotiation Bot',                   feas: 3, impact: 2 }
];

// Informasi tiap kuadran (warna, aturan, posisi)
const QUADRANTS = {
  utama: {
    key: 'utama', name: 'Prioritas Utama', badge: 'green',
    color: '#2e9e5b', text: '#1d7a43', fill: 'rgba(46, 158, 91, 0.10)',
    rule: 'Feasibility 4–5 · Impact 4–5', position: 'kanan atas'
  },
  potensi: {
    key: 'potensi', name: 'Potensi', badge: 'yellow',
    color: '#e0a800', text: '#8a6a00', fill: 'rgba(224, 168, 0, 0.13)',
    rule: 'Feasibility 1–3 · Impact 4–5', position: 'kiri atas'
  },
  pertimbangkan: {
    key: 'pertimbangkan', name: 'Pertimbangkan', badge: 'blue',
    color: '#2f80ed', text: '#1a5bb8', fill: 'rgba(47, 128, 237, 0.10)',
    rule: 'Feasibility 4–5 · Impact 1–3', position: 'kanan bawah'
  },
  tunda: {
    key: 'tunda', name: 'Tunda', badge: 'red',
    color: '#d64545', text: '#a82a2a', fill: 'rgba(214, 69, 69, 0.10)',
    rule: 'Feasibility 1–3 · Impact 1–3', position: 'kiri bawah'
  }
};
const QUADRANT_ORDER = ['utama', 'potensi', 'pertimbangkan', 'tunda'];

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  data: 'Data Ide',
  matriks: 'Matriks Kuadran',
  grafik: 'Grafik Skor',
  prioritas: 'Ide Prioritas',
  laporan: 'Laporan'
};

const BAR_NORMAL = '#7f9cc7';   // warna batang biasa
const BAR_TOP = '#1d7a43';      // warna batang skor tertinggi
const FONT = "Inter, 'Segoe UI', system-ui, sans-serif";

/* ---------------------------------------------------------
   2. LOCALSTORAGE
   --------------------------------------------------------- */

function cloneInitial() {
  return INITIAL_IDEAS.map(function (item) { return Object.assign({}, item); });
}

function isScore(value) {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

// Cek apakah data dari LocalStorage bentuknya benar
function isValidList(list) {
  return Array.isArray(list) && list.every(function (item) {
    return item && item.id != null &&
      typeof item.name === 'string' && item.name.trim() !== '' &&
      isScore(item.feas) && isScore(item.impact);
  });
}

function persist(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn('Data tidak bisa disimpan ke LocalStorage:', err);
  }
}

// Kunjungan pertama: simpan 10 ide awal. Berikutnya: muat data yang tersimpan.
function loadIdeas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const fresh = cloneInitial();
      persist(fresh);
      return fresh;
    }
    const parsed = JSON.parse(raw);
    if (isValidList(parsed)) return parsed;
  } catch (err) {
    console.warn('Data LocalStorage rusak, memakai data awal.', err);
  }
  const fallback = cloneInitial();
  persist(fallback);
  return fallback;
}

/* ---------------------------------------------------------
   3. FUNGSI BANTU
   --------------------------------------------------------- */

let ideas = [];               // satu-satunya sumber data
let currentPage = 'dashboard';
const charts = {};            // menyimpan chart yang sedang aktif
let matrix3DDispose = null;

function $(id) { return document.getElementById(id); }

function loadThemePreference() {
  try {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    return savedTheme === null ? true : savedTheme === 'dark';
  } catch (err) {
    console.warn('Preferensi tema tidak bisa dibaca:', err);
    return true;
  }
}

function applyTheme(isDark, savePreference) {
  document.body.classList.toggle('dark-mode', isDark);
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  const button = $('themeToggle');
  if (button) {
    button.querySelector('i').className = 'bi ' + (isDark ? 'bi-sun-fill' : 'bi-moon-stars-fill');
    button.querySelector('span').textContent = isDark ? 'Mode terang' : 'Mode gelap';
    button.setAttribute('aria-label', isDark ? 'Ganti ke tema terang' : 'Ganti ke tema gelap');
    button.setAttribute('aria-pressed', String(isDark));
  }
  if (typeof Chart !== 'undefined') Chart.defaults.color = isDark ? '#b7c6de' : '#1f2937';
  if (savePreference) {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, isDark ? 'dark' : 'light');
    } catch (err) {
      console.warn('Preferensi tema tidak bisa disimpan:', err);
    }
  }
}

function mapIdeasToMatrix3D(list) {
  return list.map(function (item) {
    return {
      n: item.name,
      f: ((item.feas - 1) / 4) * 10,
      i: ((item.impact - 1) / 4) * 10,
      s: item.total * 10
    };
  });
}

function disposeMatrix3D() {
  if (!matrix3DDispose) return;
  matrix3DDispose();
  matrix3DDispose = null;
}

function esc(text) {
  return String(text).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

// Aturan kuadran: pakai Feasibility DAN Impact (4–5 = High, 1–3 = Low)
function getQuadrantKey(feas, impact) {
  const feasHigh = feas >= 4;
  const impactHigh = impact >= 4;
  if (feasHigh && impactHigh) return 'utama';
  if (!feasHigh && impactHigh) return 'potensi';
  if (feasHigh && !impactHigh) return 'pertimbangkan';
  return 'tunda';
}

// Tambahkan Total Score dan kuadran ke setiap ide
function getEnriched() {
  return ideas.map(function (item, index) {
    return {
      id: item.id,
      no: index + 1,
      name: item.name,
      feas: item.feas,
      impact: item.impact,
      total: item.feas + item.impact,   // Total Score = Feasibility + Impact
      quad: getQuadrantKey(item.feas, item.impact)
    };
  });
}

// Urut dari Total Score tertinggi ke terendah
function getSorted() {
  return getEnriched().sort(function (a, b) {
    return (b.total - a.total) || (a.no - b.no);
  });
}

// Semua ide dengan Total Score tertinggi (bisa lebih dari satu jika seri)
function getTopIdeas() {
  const sorted = getSorted();
  if (!sorted.length) return [];
  const max = sorted[0].total;
  return sorted.filter(function (item) { return item.total === max; });
}

function countByQuadrant() {
  const result = { utama: 0, potensi: 0, pertimbangkan: 0, tunda: 0 };
  getEnriched().forEach(function (item) { result[item.quad] += 1; });
  return result;
}

function badgeHtml(quadKey) {
  const q = QUADRANTS[quadKey];
  return '<span class="q-badge ' + q.badge + '">' + q.name + '</span>';
}

function newId() {
  return String(Date.now()) + String(Math.floor(Math.random() * 1000));
}

function average(list, field) {
  if (!list.length) return 0;
  const sum = list.reduce(function (acc, item) { return acc + item[field]; }, 0);
  return Math.round((sum / list.length) * 10) / 10;
}

function joinNames(list) {
  return list.map(function (item) { return '<strong>' + esc(item.name) + '</strong>'; }).join(', ');
}

function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + '…' : text;
}

// Pecah nama panjang menjadi beberapa baris (untuk label sumbu grafik batang)
function wrapChars(text, maxChars) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  words.forEach(function (word) {
    if (line && (line + ' ' + word).length > maxChars) {
      lines.push(line);
      line = word;
    } else {
      line = line ? line + ' ' + word : word;
    }
  });
  if (line) lines.push(line);
  return lines;
}

/* ---------------------------------------------------------
   4. CHART.JS
   --------------------------------------------------------- */

function renderChart(canvasId, config) {
  const canvas = $(canvasId);
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    canvas.parentElement.innerHTML =
      '<div class="chart-error">Chart.js gagal dimuat. Pastikan komputer terhubung ke internet, lalu muat ulang halaman.</div>';
    return;
  }
  if (charts[canvasId]) charts[canvasId].destroy();
  charts[canvasId] = new Chart(canvas, config);
}

function setBoxHeight(canvasId, px) {
  const canvas = $(canvasId);
  if (canvas && canvas.parentElement) canvas.parentElement.style.height = px + 'px';
}

/* ---- 4a. Tata letak label nama ide pada matriks ----
   Fungsi ini murni (tidak menyentuh DOM): mencoba beberapa posisi label
   (kanan, kiri, atas, bawah, ...) dan memilih yang tidak bertabrakan. */

function wrapLines(measure, text, maxW, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  let lines = [];
  let cur = '';
  words.forEach(function (word) {
    const test = cur ? cur + ' ' + word : word;
    if (!cur || measure(test) <= maxW) {
      cur = test;
    } else {
      lines.push(cur);
      cur = word;
    }
  });
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines);
    let last = lines[maxLines - 1];
    while (last.length > 1 && measure(last + '…') > maxW) last = last.slice(0, -1);
    lines[maxLines - 1] = last + '…';
  }
  return lines;
}

function rectsOverlap(a, b) {
  const pad = 2;
  return !(a.r + pad <= b.l || b.r + pad <= a.l || a.b + pad <= b.t || b.b + pad <= a.t);
}

function labelCandidates(px, py, w, h) {
  return [
    { l: px + 10,     t: py - h / 2,  align: 'left'   },  // kanan
    { l: px - 10 - w, t: py - h / 2,  align: 'right'  },  // kiri
    { l: px - w / 2,  t: py - 10 - h, align: 'center' },  // atas
    { l: px - w / 2,  t: py + 10,     align: 'center' },  // bawah
    { l: px + 7,      t: py - h - 5,  align: 'left'   },  // kanan atas
    { l: px + 7,      t: py + 5,      align: 'left'   },  // kanan bawah
    { l: px - 7 - w,  t: py - h - 5,  align: 'right'  },  // kiri atas
    { l: px - 7 - w,  t: py + 5,      align: 'right'  },  // kiri bawah
    // posisi cadangan yang sedikit lebih jauh dari titik
    { l: px + 26,     t: py - h / 2,  align: 'left'   },
    { l: px - 26 - w, t: py - h / 2,  align: 'right'  },
    { l: px - w / 2,  t: py - 28 - h, align: 'center' },
    { l: px - w / 2,  t: py + 28,     align: 'center' }
  ];
}

function computeLabelLayout(points, obstacles, area, measure, opts) {
  const lineHeight = opts.fontSize + 2;
  const baseWidth = Math.max(70, Math.min(170, opts.unitX * 1.1));
  const widths = [baseWidth, baseWidth * 0.72, baseWidth * 0.5];

  const ordered = points.slice().sort(function (a, b) { return (a.y - b.y) || (a.x - b.x); });
  const pointBoxes = ordered.map(function (p) {
    return { l: p.x - 9, t: p.y - 9, r: p.x + 9, b: p.y + 9 };
  });
  const placed = obstacles.slice();
  const result = [];

  ordered.forEach(function (p, index) {
    let chosen = null;
    let fallback = null;

    for (let wi = 0; wi < widths.length && !chosen; wi++) {
      const lines = wrapLines(measure, p.name, widths[wi], 4);
      const w = Math.max.apply(null, lines.map(measure));
      const h = lines.length * lineHeight;
      const candidates = labelCandidates(p.x, p.y, w, h);

      for (let ci = 0; ci < candidates.length; ci++) {
        const c = candidates[ci];
        const rect = { l: c.l, t: c.t, r: c.l + w, b: c.t + h };
        const inside = rect.l >= area.left + 2 && rect.r <= area.right - 2 &&
                       rect.t >= area.top + 2 && rect.b <= area.bottom - 2;
        if (!inside) continue;

        const box = { rect: rect, lines: lines, align: c.align, w: w, h: h, lineHeight: lineHeight };
        if (!fallback) fallback = box;

        let free = true;
        for (let k = 0; k < placed.length && free; k++) {
          if (rectsOverlap(rect, placed[k])) free = false;
        }
        for (let k = 0; k < pointBoxes.length && free; k++) {
          if (k !== index && rectsOverlap(rect, pointBoxes[k])) free = false;
        }
        if (free) { chosen = box; break; }
      }
    }

    if (!chosen) chosen = fallback;
    if (!chosen) {
      // Tidak ada posisi yang muat: letakkan di kanan titik apa adanya
      const lines = wrapLines(measure, p.name, widths[1], 4);
      const w = Math.max.apply(null, lines.map(measure));
      const h = lines.length * lineHeight;
      chosen = { rect: { l: p.x + 10, t: p.y - h / 2, r: p.x + 10 + w, b: p.y - h / 2 + h },
                 lines: lines, align: 'left', w: w, h: h, lineHeight: lineHeight };
    }
    placed.push(chosen.rect);
    result.push(chosen);
  });

  return result;
}

/* ---- 4b. Plugin: latar 4 kuadran ---- */

function getQuadrantLabelBoxes(chart, ctx, fontSize) {
  const a = chart.chartArea;
  const defs = [
    { q: 'potensi',       align: 'left',  x: a.left + 10,  top: true  },
    { q: 'utama',         align: 'right', x: a.right - 10, top: true  },
    { q: 'tunda',         align: 'left',  x: a.left + 10,  top: false },
    { q: 'pertimbangkan', align: 'right', x: a.right - 10, top: false }
  ];
  ctx.save();
  ctx.font = '700 ' + fontSize + 'px ' + FONT;
  const boxes = defs.map(function (d) {
    const text = QUADRANTS[d.q].name.toUpperCase();
    const w = ctx.measureText(text).width;
    const h = fontSize + 4;
    const l = d.align === 'left' ? d.x : d.x - w;
    const t = d.top ? a.top + 8 : a.bottom - 8 - h;
    return { q: d.q, text: text, align: d.align, x: d.x, t: t, rect: { l: l, t: t, r: l + w, b: t + h } };
  });
  ctx.restore();
  return boxes;
}

const quadrantPlugin = {
  id: 'quadrantBackground',

  // Warna latar tiap kuadran (digambar sebelum garis grid)
  beforeDraw: function (chart) {
    const ctx = chart.ctx;
    const a = chart.chartArea;
    const mx = chart.scales.x.getPixelForValue(3.5);   // batas Low | High (antara 3 dan 4)
    const my = chart.scales.y.getPixelForValue(3.5);
    ctx.save();
    ctx.fillStyle = QUADRANTS.utama.fill;
    ctx.fillRect(mx, a.top, a.right - mx, my - a.top);
    ctx.fillStyle = QUADRANTS.potensi.fill;
    ctx.fillRect(a.left, a.top, mx - a.left, my - a.top);
    ctx.fillStyle = QUADRANTS.pertimbangkan.fill;
    ctx.fillRect(mx, my, a.right - mx, a.bottom - my);
    ctx.fillStyle = QUADRANTS.tunda.fill;
    ctx.fillRect(a.left, my, mx - a.left, a.bottom - my);
    ctx.restore();
  },

  // Garis pemisah dan nama kuadran
  beforeDatasetsDraw: function (chart) {
    const ctx = chart.ctx;
    const a = chart.chartArea;
    const mx = chart.scales.x.getPixelForValue(3.5);
    const my = chart.scales.y.getPixelForValue(3.5);
    const fontSize = chart.width < 640 ? 10 : 12;

    ctx.save();
    ctx.strokeStyle = '#4b5b78';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(mx, a.top);
    ctx.lineTo(mx, a.bottom);
    ctx.moveTo(a.left, my);
    ctx.lineTo(a.right, my);
    ctx.stroke();

    ctx.font = '700 ' + fontSize + 'px ' + FONT;
    ctx.textBaseline = 'top';
    getQuadrantLabelBoxes(chart, ctx, fontSize).forEach(function (box) {
      ctx.fillStyle = QUADRANTS[box.q].text;
      ctx.textAlign = box.align;
      ctx.fillText(box.text, box.x, box.t + 2);
    });
    ctx.restore();
  }
};

/* ---- 4c. Plugin: nama ide di samping titik ---- */

const pointLabelPlugin = {
  id: 'pointLabels',
  afterDatasetsDraw: function (chart) {
    const ctx = chart.ctx;
    const a = chart.chartArea;
    const fontSize = chart.width < 640 ? 10 : 12;
    const unitX = chart.scales.x.getPixelForValue(2) - chart.scales.x.getPixelForValue(1);
    const darkTheme = document.body.classList.contains('dark-mode');

    ctx.save();
    ctx.font = '500 ' + fontSize + 'px ' + FONT;
    const measure = function (text) { return ctx.measureText(text).width; };

    const points = [];
    chart.data.datasets.forEach(function (ds, di) {
      if (!chart.isDatasetVisible(di)) return;
      chart.getDatasetMeta(di).data.forEach(function (el, i) {
        points.push({ x: el.x, y: el.y, name: ds.data[i].idea.name });
      });
    });

    const obstacles = getQuadrantLabelBoxes(chart, ctx, fontSize).map(function (b) { return b.rect; });
    const layout = computeLabelLayout(points, obstacles, a, measure, { fontSize: fontSize, unitX: unitX });

    ctx.font = '500 ' + fontSize + 'px ' + FONT;
    ctx.textBaseline = 'top';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 3;
    layout.forEach(function (box) {
      ctx.textAlign = box.align;
      const textX = box.align === 'left' ? box.rect.l : (box.align === 'right' ? box.rect.r : box.rect.l + box.w / 2);
      box.lines.forEach(function (line, k) {
        const textY = box.rect.t + k * box.lineHeight;
        ctx.strokeStyle = darkTheme ? 'rgba(8, 15, 32, .94)' : 'rgba(255, 255, 255, .9)';
        ctx.strokeText(line, textX, textY);
        ctx.fillStyle = darkTheme ? '#e5efff' : '#1f2937';
        ctx.fillText(line, textX, textY);
      });
    });
    ctx.restore();
  }
};

/* ---- 4d. Matriks Feasibility vs Impact (scatter) ---- */

// Ide dengan nilai yang sama digeser sedikit agar titiknya tidak menumpuk.
// Nilai asli tetap tampil pada tooltip.
function getJitter(list) {
  const groups = {};
  list.forEach(function (item) {
    const key = item.feas + ',' + item.impact;
    (groups[key] = groups[key] || []).push(item.id);
  });
  const offsets = {};
  Object.keys(groups).forEach(function (key) {
    const ids = groups[key];
    const n = ids.length;
    const radius = n === 1 ? 0 : (n === 2 ? 0.13 : 0.2);
    ids.forEach(function (id, i) {
      const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
      offsets[id] = { dx: n === 1 ? 0 : radius * Math.cos(angle), dy: n === 1 ? 0 : radius * Math.sin(angle) };
    });
  });
  return offsets;
}

function buildMatrixConfig() {
  const list = getEnriched();
  const jitter = getJitter(list);
  const darkTheme = document.body.classList.contains('dark-mode');

  const datasets = QUADRANT_ORDER.map(function (key) {
    const q = QUADRANTS[key];
    return {
      label: q.name,
      data: list.filter(function (item) { return item.quad === key; }).map(function (item) {
        return { x: item.feas + jitter[item.id].dx, y: item.impact + jitter[item.id].dy, idea: item };
      }),
      backgroundColor: q.color,
      borderColor: '#ffffff',
      borderWidth: 2,
      pointRadius: function (context) {
        return context.raw && context.raw.idea ? 4 + context.raw.idea.total : 6;
      },
      pointHoverRadius: function (context) {
        return context.raw && context.raw.idea ? 6 + context.raw.idea.total : 8;
      },
      hitRadius: 12
    };
  });

  function axis(title) {
    return {
      min: 0,
      max: 6,
      title: { display: true, text: title, color: darkTheme ? '#dce7fa' : '#0f2447', font: { weight: '600', size: 13 } },
      ticks: {
        stepSize: 1,
        color: darkTheme ? '#b7c6de' : '#1f2937',
        font: { size: 12 },
        callback: function (value) { return (value >= 1 && value <= 5) ? value : ''; }   // tampilkan 1–5 saja
      },
      grid: {
        color: function (ctx) {
          if (ctx.tick.value === 0 || ctx.tick.value === 6) return 'transparent';
          return darkTheme ? 'rgba(126, 158, 211, .2)' : '#dde2ea';
        }
      }
    };
  }

  return {
    type: 'scatter',
    data: { datasets: datasets },
    plugins: [quadrantPlugin],
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      interaction: { mode: 'nearest', intersect: true },
      layout: { padding: 4 },
      scales: { x: axis('Feasibility (Kelayakan)'), y: axis('Impact (Dampak)') },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#0f2447',
          padding: 10,
          displayColors: false,
          callbacks: {
            title: function (items) { return 'Nama Ide: ' + items[0].raw.idea.name; },
            label: function (item) {
              const idea = item.raw.idea;
              return [
                'Feasibility Score: ' + idea.feas,
                'Impact Score: ' + idea.impact,
                'Total Score: ' + idea.total,
                'Quadrant Category: ' + QUADRANTS[idea.quad].name
              ];
            }
          }
        }
      }
    }
  };
}

/* ---- 4e. Grafik batang Total Score ---- */

const valueLabelPlugin = {
  id: 'valueLabels',
  afterDatasetsDraw: function (chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.font = '600 12px ' + FONT;
    ctx.fillStyle = document.body.classList.contains('dark-mode') ? '#e5efff' : '#0f2447';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    chart.getDatasetMeta(0).data.forEach(function (bar, i) {
      ctx.fillText(String(chart.data.datasets[0].data[i]), bar.x + 6, bar.y);
    });
    ctx.restore();
  }
};

function buildBarConfig(compact) {
  const list = getSorted();
  const max = list.length ? list[0].total : 0;
  const narrow = window.innerWidth < 576;
  const darkTheme = document.body.classList.contains('dark-mode');
  const wrapAt = narrow ? 20 : 34;

  return {
    type: 'bar',
    data: {
      labels: list.map(function (item) {
        return compact ? truncate(item.name, narrow ? 22 : 30) : wrapChars(item.name, wrapAt);
      }),
      datasets: [{
        label: 'Total Score',
        data: list.map(function (item) { return item.total; }),
        backgroundColor: list.map(function (item) {
          if (!darkTheme) return item.total === max ? BAR_TOP : BAR_NORMAL;
          return item.total === max ? '#16d9a8' : '#3978b9';
        }),
        borderRadius: 3,
        barPercentage: 0.72
      }]
    },
    plugins: [valueLabelPlugin],
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250 },
      layout: { padding: { right: 30 } },
      scales: {
        x: {
          min: 0,
          max: 10,
          ticks: { stepSize: 1, color: darkTheme ? '#b7c6de' : '#1f2937' },
          grid: { color: darkTheme ? 'rgba(126, 158, 211, .16)' : '#e5e9f0' },
          title: { display: !compact, text: 'Total Score (Feasibility + Impact)', color: darkTheme ? '#dce7fa' : '#0f2447', font: { weight: '600' } }
        },
        y: {
          grid: { display: false },
          ticks: { autoSkip: false, color: darkTheme ? '#c1d0e7' : '#1f2937', font: { size: compact ? 11 : 12 } }
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: darkTheme ? '#101d38' : '#0f2447',
          padding: 10,
          displayColors: false,
          callbacks: {
            title: function (items) { return list[items[0].dataIndex].name; },
            label: function (item) {
              const idea = list[item.dataIndex];
              return [
                'Total Score: ' + idea.total + ' / 10',
                'Feasibility: ' + idea.feas,
                'Impact: ' + idea.impact,
                'Kuadran: ' + QUADRANTS[idea.quad].name
              ];
            }
          }
        }
      }
    }
  };
}

function drawBarChart(canvasId, compact, rowHeight, extra) {
  setBoxHeight(canvasId, Math.max(compact ? 260 : 380, getEnriched().length * rowHeight + extra));
  renderChart(canvasId, buildBarConfig(compact));
}

/* ---------------------------------------------------------
   5. MENAMPILKAN HALAMAN
   --------------------------------------------------------- */

function topSummaryHtml(tops) {
  if (!tops.length) return '<p class="text-muted mb-0">Belum ada data ide.</p>';

  if (tops.length === 1) {
    const t = tops[0];
    return '<div class="winner-name mb-3">' + esc(t.name) + '</div>' +
      '<div class="winner-stats cols-3">' +
        '<div class="winner-stat"><div class="lbl">Feasibility</div><div class="val">' + t.feas + '/5</div></div>' +
        '<div class="winner-stat"><div class="lbl">Impact</div><div class="val">' + t.impact + '/5</div></div>' +
        '<div class="winner-stat"><div class="lbl">Total Score</div><div class="val">' + t.total + '/10</div></div>' +
      '</div>' + badgeHtml(t.quad);
  }

  return '<p class="note mt-0">Ada ' + tops.length + ' ide dengan Total Score tertinggi yang sama (' + tops[0].total + '/10):</p>' +
    tops.map(function (t) {
      return '<div class="tie-item"><div class="fw-semibold">' + esc(t.name) + '</div>' +
        '<div class="small text-muted mb-1">Feasibility ' + t.feas + ' · Impact ' + t.impact + ' · Total ' + t.total + '/10</div>' +
        badgeHtml(t.quad) + '</div>';
    }).join('');
}

function summarySentence() {
  const n = ideas.length;
  if (!n) return 'Belum ada ide yang dievaluasi.';
  const c = countByQuadrant();
  const tops = getTopIdeas();
  let text = 'Dari ' + n + ' ide yang dievaluasi, ' + c.utama + ' ide masuk kuadran Prioritas Utama, ' +
    c.potensi + ' ide Potensi, ' + c.pertimbangkan + ' ide Pertimbangkan, dan ' + c.tunda + ' ide Tunda. ';
  if (tops.length === 1) {
    text += 'Ide dengan skor tertinggi adalah ' + tops[0].name + ' dengan Total Score ' + tops[0].total + '/10.';
  } else {
    text += 'Terdapat ' + tops.length + ' ide dengan skor tertinggi yang sama, yaitu ' +
      tops.map(function (t) { return t.name; }).join(', ') + ' (Total Score ' + tops[0].total + '/10).';
  }
  return text;
}

/* ---- Dashboard ---- */
function renderDashboard() {
  const c = countByQuadrant();
  const sorted = getSorted();
  const topScore = sorted.length ? sorted[0].total : 0;
  const averageScore = average(getEnriched(), 'total');
  const darkTheme = document.body.classList.contains('dark-mode');
  const cards = [
    { label: 'Total Ide', value: ideas.length, hint: 'Ide telah dievaluasi', icon: 'bi-lightbulb', cls: 'cyan' },
    { label: 'Rata-rata Score', value: averageScore + '<small> / 10</small>', hint: 'Nilai rata-rata semua ide', icon: 'bi-graph-up-arrow', cls: 'blue' },
    { label: 'Skor Tertinggi', value: topScore + '<small> / 10</small>', hint: 'Total nilai terbaik', icon: 'bi-trophy', cls: 'purple' },
    { label: 'Prioritas Utama', value: c.utama, hint: 'Ide pada kuadran utama', icon: 'bi-bullseye', cls: 'green' }
  ];
  $('summaryCards').innerHTML = cards.map(function (card) {
    return '<article class="dashboard-stat-card ' + card.cls + '">' +
      '<div class="dashboard-stat-icon"><i class="bi ' + card.icon + '"></i></div>' +
      '<div class="dashboard-stat-label">' + card.label + '</div>' +
      '<div class="dashboard-stat-value">' + card.value + '</div>' +
      '<div class="dashboard-stat-hint">' + card.hint + '</div></article>';
  }).join('');

  $('dashSummary').textContent = summarySentence();
  $('dashIdeaCount').textContent = ideas.length;

  const quadrantCards = [
    { key: 'utama', label: 'Prioritas Utama', value: c.utama, color: '#2e9e5b' },
    { key: 'potensi', label: 'Potensi', value: c.potensi, color: '#e0a800' },
    { key: 'pertimbangkan', label: 'Pertimbangkan', value: c.pertimbangkan, color: '#2f80ed' },
    { key: 'tunda', label: 'Tunda', value: c.tunda, color: '#d64545' }
  ];
  $('dashQuadrantLegend').innerHTML = quadrantCards.map(function (item) {
    return '<div class="dashboard-legend-item"><span class="dashboard-legend-dot ' + item.key + '"></span>' +
      '<span>' + item.label + '</span><strong>' + item.value + '</strong></div>';
  }).join('');

  renderChart('chartDash', {
    type: 'line',
    data: {
      labels: sorted.map(function (_, index) { return String(index + 1).padStart(2, '0'); }),
      datasets: [{
        data: sorted.map(function (item) { return item.total; }),
        borderColor: '#12d8d0',
        backgroundColor: 'rgba(18, 216, 208, .12)',
        borderWidth: 3,
        fill: true,
        tension: .38,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: '#12d8d0',
        pointBorderColor: '#112448',
        pointBorderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: function (items) {
              const item = sorted[items[0].dataIndex];
              return item ? item.name : '';
            },
            label: function (item) { return ' Total Score: ' + item.formattedValue + ' / 10'; }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(118, 148, 193, .08)' },
          border: { display: false },
          ticks: { color: darkTheme ? '#8298bb' : '#74829a', maxTicksLimit: 6 }
        },
        y: {
          min: 0,
          max: 10,
          grid: { color: darkTheme ? 'rgba(118, 148, 193, .12)' : 'rgba(15, 36, 71, .1)' },
          border: { display: false },
          ticks: { color: darkTheme ? '#8298bb' : '#74829a', stepSize: 2, padding: 8 }
        }
      }
    }
  });

  renderChart('chartQuadrant', {
    type: 'doughnut',
    data: {
      labels: quadrantCards.map(function (item) { return item.label; }),
      datasets: [{
        data: quadrantCards.map(function (item) { return item.value; }),
        backgroundColor: quadrantCards.map(function (item) { return item.color; }),
        borderColor: darkTheme ? '#101d38' : '#ffffff',
        borderWidth: 5,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '76%',
      plugins: { legend: { display: false } }
    }
  });
}

/* ---- Data Ide ---- */
function renderTable() {
  const keyword = $('searchInput').value.trim().toLowerCase();
  const rows = getEnriched().filter(function (item) {
    return item.name.toLowerCase().indexOf(keyword) !== -1;
  });

  if (!rows.length) {
    $('ideaTableBody').innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">' +
      (ideas.length ? 'Tidak ada ide yang cocok dengan pencarian.' : 'Belum ada data ide. Klik "Tambah Ide" untuk memulai.') +
      '</td></tr>';
    return;
  }

  $('ideaTableBody').innerHTML = rows.map(function (item) {
    return '<tr>' +
      '<td>' + item.no + '</td>' +
      '<td class="fw-medium">' + esc(item.name) + '</td>' +
      '<td class="text-center"><span class="score-pill">' + item.feas + '</span></td>' +
      '<td class="text-center"><span class="score-pill">' + item.impact + '</span></td>' +
      '<td class="text-center"><span class="score-pill">' + item.total + '</span></td>' +
      '<td>' + badgeHtml(item.quad) + '</td>' +
      '<td class="text-end text-nowrap">' +
        '<button class="btn btn-sm btn-outline-primary me-1" data-action="edit" data-id="' + esc(item.id) + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
        '<button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="' + esc(item.id) + '" title="Hapus"><i class="bi bi-trash"></i></button>' +
      '</td></tr>';
  }).join('');
}

/* ---- Matriks Kuadran ---- */
function renderMatrixPage() {
  disposeMatrix3D();
  matrix3DDispose = mountMatrix3D($('matrix3dContainer'), mapIdeasToMatrix3D(getEnriched()));
  renderMatrixRecommendation();
}

function renderMatrixRecommendation() {
  const tops = getTopIdeas();
  const box = $('matrixRecommendation');
  if (!tops.length) {
    box.innerHTML = '<p class="text-muted mb-0">Belum ada data ide untuk menentukan rekomendasi.</p>';
    return;
  }

  box.innerHTML = tops.map(function (idea) {
    return '<article class="matrix-recommendation-item">' +
      '<div class="matrix-recommendation-name">' + esc(idea.name) + '</div>' +
      '<div class="winner-stats cols-3">' +
        '<div class="winner-stat"><div class="lbl">Feasibility</div><div class="val">' + idea.feas + '/5</div></div>' +
        '<div class="winner-stat"><div class="lbl">Impact</div><div class="val">' + idea.impact + '/5</div></div>' +
        '<div class="winner-stat"><div class="lbl">Total Score</div><div class="val">' + idea.total + '/10</div></div>' +
      '</div>' +
      '<p class="mb-0">Direkomendasikan karena memperoleh Total Score tertinggi (' + idea.total +
      '/10 dari Feasibility ' + idea.feas + ' + Impact ' + idea.impact +
        '). Kategorinya <strong>' + QUADRANTS[idea.quad].name + '</strong>. ' +
        matrixRecommendationExplanation(idea.quad) + '</p>' +
    '</article>';
  }).join('');
}

function matrixRecommendationExplanation(quadKey) {
  if (quadKey === 'utama') return 'Kelayakan dan dampaknya sama-sama tinggi, sehingga ide siap dikembangkan.';
  if (quadKey === 'potensi') return 'Dampaknya tinggi; tingkatkan kelayakan sebelum implementasi.';
  if (quadKey === 'pertimbangkan') return 'Mudah direalisasikan, tetapi dampaknya perlu diperkuat.';
  return 'Skor tertinggi saat ini, tetapi kelayakan dan dampaknya tetap perlu ditingkatkan.';
}

/* ---- Grafik Total Score ---- */
function renderBarPage() {
  drawBarChart('chartBar', false, 52, 90);
}

/* ---- Ide Prioritas ---- */
function renderPriorityScorePanels(sorted) {
  const darkTheme = document.body.classList.contains('dark-mode');
  $('dashIdeasTable').innerHTML = sorted.length ? sorted.slice(0, 5).map(function (item, index) {
    return '<tr><td><div class="dashboard-idea-cell"><span class="dashboard-rank">' +
      String(index + 1).padStart(2, '0') + '</span><span class="dashboard-idea-name">' + esc(item.name) +
      '</span></div></td><td>' + badgeHtml(item.quad) + '</td><td class="text-end">' +
      '<span class="dashboard-score">' + item.total + '<small> / 10</small></span></td></tr>';
  }).join('') : '<tr><td colspan="3" class="dashboard-empty">Belum ada data ide.</td></tr>';

  const topFive = sorted.slice(0, 5);
  renderChart('chartPriority', {
    type: 'bar',
    data: {
      labels: topFive.map(function (item) { return truncate(item.name, 22); }),
      datasets: [{
        data: topFive.map(function (item) { return item.total; }),
        backgroundColor: ['#13d9ce', '#148fc7', '#386bd2', '#7155d5', '#a34ed0'],
        borderRadius: 5,
        barThickness: 10
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: function (item) { return ' ' + item.formattedValue + ' / 10'; } } }
      },
      scales: {
        x: {
          min: 0,
          max: 10,
          grid: { color: darkTheme ? 'rgba(118, 148, 193, .1)' : 'rgba(15, 36, 71, .09)' },
          border: { display: false },
          ticks: { color: darkTheme ? '#8298bb' : '#74829a', stepSize: 2 }
        },
        y: {
          grid: { display: false },
          border: { display: false },
          ticks: { color: darkTheme ? '#b7c6de' : '#52637d', font: { size: 10 } }
        }
      }
    }
  });
}

function quadrantExplanation(quadKey) {
  if (quadKey === 'utama') {
    return 'Karena Feasibility dan Impact sama-sama berkategori High, ide ini masuk kuadran Prioritas Utama: mudah direalisasikan dan berdampak besar, sehingga paling tepat dikembangkan lebih lanjut.';
  }
  if (quadKey === 'potensi') {
    return 'Impact-nya High tetapi Feasibility masih Low, sehingga ide ini masuk kuadran Potensi: dampaknya besar namun perlu persiapan dan sumber daya lebih banyak.';
  }
  if (quadKey === 'pertimbangkan') {
    return 'Feasibility-nya High tetapi Impact masih Low, sehingga ide ini masuk kuadran Pertimbangkan: mudah dibuat namun dampaknya belum besar.';
  }
  return 'Feasibility dan Impact sama-sama Low, sehingga ide ini masuk kuadran Tunda.';
}

function renderPriority() {
  const tops = getTopIdeas();
  const box = $('priorityContent');
  renderPriorityScorePanels(getSorted());

  if (!tops.length) {
    box.innerHTML = '<div class="panel"><p class="mb-0 text-muted">Belum ada data ide, sehingga ide prioritas belum bisa ditentukan.</p></div>';
    return;
  }

  function statsHtml(t) {
    return '<div class="winner-stats">' +
      '<div class="winner-stat"><div class="lbl">Feasibility</div><div class="val">' + t.feas + '/5</div></div>' +
      '<div class="winner-stat"><div class="lbl">Impact</div><div class="val">' + t.impact + '/5</div></div>' +
      '<div class="winner-stat"><div class="lbl">Total Score</div><div class="val">' + t.total + '/10</div></div>' +
      '<div class="winner-stat"><div class="lbl">Kuadran</div><div class="mt-1">' + badgeHtml(t.quad) + '</div></div>' +
      '</div>';
  }

  if (tops.length === 1) {
    const t = tops[0];
    box.innerHTML =
      '<div class="winner-card">' +
        '<span class="winner-tag"><i class="bi bi-trophy-fill"></i> Ide Prioritas Terpilih</span>' +
        '<div class="winner-name">' + esc(t.name) + '</div>' +
        statsHtml(t) +
      '</div>' +
      '<div class="panel"><div class="panel-title">Mengapa Ide Ini Dipilih?</div>' +
        '<p class="mb-2">Ide ini terpilih karena memperoleh Total Score tertinggi, yaitu <strong>' + t.total +
        ' dari 10</strong> (Feasibility ' + t.feas + ' + Impact ' + t.impact + '). Nilai 4–5 dikategorikan High dan nilai 1–3 dikategorikan Low.</p>' +
        '<p class="mb-0">' + quadrantExplanation(t.quad) + '</p></div>';
    return;
  }

  box.innerHTML =
    '<div class="panel mb-3 priority-tie-panel"><div class="panel-title"><i class="bi bi-people-fill" aria-hidden="true"></i> Hasil Seri</div>' +
      '<p class="mb-0">Ada <strong>' + tops.length + ' ide</strong> dengan Total Score tertinggi yang sama, yaitu <strong>' +
      tops[0].total + '/10</strong>. Karena skornya seri, semua ide tersebut ditampilkan di bawah ini.</p></div>' +
    tops.map(function (t) {
      return '<div class="winner-card"><span class="winner-tag">Ide dengan Skor Tertinggi</span>' +
        '<div class="winner-name">' + esc(t.name) + '</div>' + statsHtml(t) +
        '<p class="mb-0">' + quadrantExplanation(t.quad) + '</p></div>';
    }).join('') +
    '<div class="panel"><div class="panel-title">Penjelasan Seri</div>' +
      '<p class="mb-0">Total Score dihitung dari Feasibility + Impact, sehingga beberapa ide bisa memiliki skor sama. ' +
      'Kelompok perlu menentukan satu ide untuk dikembangkan dengan mempertimbangkan kuadran masing-masing ide ' +
      '(Prioritas Utama paling diutamakan) dan kesiapan tim.</p></div>';
}

/* ---- Laporan ---- */
function renderReport() {
  const list = getEnriched();
  const n = list.length;
  const c = countByQuadrant();
  const tops = getTopIdeas();

  $('repTotal').innerHTML = 'Jumlah ide yang dievaluasi: <strong>' + n + ' ide</strong>.';

  $('repTableBody').innerHTML = n ? list.map(function (item) {
    return '<tr><td>' + item.no + '</td><td>' + esc(item.name) + '</td>' +
      '<td class="text-center">' + item.feas + '</td><td class="text-center">' + item.impact + '</td>' +
      '<td class="text-center fw-semibold">' + item.total + '</td><td>' + badgeHtml(item.quad) + '</td></tr>';
  }).join('') : '<tr><td colspan="6" class="text-center text-muted">Belum ada data.</td></tr>';

  $('repQuadBody').innerHTML = QUADRANT_ORDER.map(function (key) {
    return '<tr><td>' + badgeHtml(key) + '</td><td class="text-center">' + c[key] + '</td></tr>';
  }).join('') + '<tr class="fw-semibold"><td>Total</td><td class="text-center">' + n + '</td></tr>';

  // Ide tertinggi
  if (!tops.length) {
    $('repTop').innerHTML = '<p>Belum ada data.</p>';
  } else if (tops.length === 1) {
    const t = tops[0];
    $('repTop').innerHTML = '<p><strong>' + esc(t.name) + '</strong> – Feasibility ' + t.feas + '/5, Impact ' + t.impact +
      '/5, Total Score ' + t.total + '/10, kuadran ' + QUADRANTS[t.quad].name + '.</p>';
  } else {
    $('repTop').innerHTML = '<p>Terdapat ' + tops.length + ' ide dengan Total Score tertinggi yang sama (' + tops[0].total + '/10):</p><ul>' +
      tops.map(function (t) {
        return '<li><strong>' + esc(t.name) + '</strong> – Feasibility ' + t.feas + ', Impact ' + t.impact +
          ', kuadran ' + QUADRANTS[t.quad].name + '</li>';
      }).join('') + '</ul>';
  }

  // Analisis singkat (dibuat otomatis dari data yang ada)
  if (!n) {
    $('repAnalysis').innerHTML = '<p>Belum ada data untuk dianalisis.</p>';
    $('repConclusion').innerHTML = '<p>Belum ada kesimpulan karena belum ada ide yang dievaluasi.</p>';
  } else {
    const pct = function (count) { return Math.round((count / n) * 100); };
    const byQuad = function (key) { return list.filter(function (item) { return item.quad === key; }); };
    let html = '<p>Dari ' + n + ' ide, ' + c.utama + ' ide (' + pct(c.utama) + '%) berada di kuadran Prioritas Utama, ' +
      c.potensi + ' ide (' + pct(c.potensi) + '%) di Potensi, ' + c.pertimbangkan + ' ide (' + pct(c.pertimbangkan) +
      '%) di Pertimbangkan, dan ' + c.tunda + ' ide (' + pct(c.tunda) + '%) di Tunda. ' +
      'Rata-rata Feasibility adalah ' + average(list, 'feas') + ' dan rata-rata Impact adalah ' + average(list, 'impact') + ' (skala 1–5).</p>';
    if (c.potensi) {
      html += '<p>Ide kuadran Potensi (' + joinNames(byQuad('potensi')) + ') berdampak tinggi tetapi kelayakannya masih rendah, ' +
        'sehingga dapat dikembangkan nanti setelah kendala pelaksanaannya teratasi.</p>';
    }
    if (c.pertimbangkan) {
      html += '<p>Ide kuadran Pertimbangkan (' + joinNames(byQuad('pertimbangkan')) + ') mudah direalisasikan, tetapi dampaknya belum besar.</p>';
    }
    if (c.tunda) {
      html += '<p>Ide kuadran Tunda (' + joinNames(byQuad('tunda')) + ') memiliki kelayakan dan dampak yang sama-sama rendah, sehingga ditunda terlebih dahulu.</p>';
    }
    $('repAnalysis').innerHTML = html;

    if (tops.length === 1) {
      $('repConclusion').innerHTML = '<p>Berdasarkan evaluasi menggunakan matriks Feasibility vs Impact, ide <strong>' + esc(tops[0].name) +
        '</strong> dengan Total Score ' + tops[0].total + '/10 (kuadran ' + QUADRANTS[tops[0].quad].name +
        ') dipilih sebagai ide prioritas yang akan dikembangkan lebih lanjut oleh Kelompok 9.</p>';
    } else {
      $('repConclusion').innerHTML = '<p>Berdasarkan evaluasi menggunakan matriks Feasibility vs Impact, terdapat ' + tops.length +
        ' ide dengan Total Score tertinggi yang sama (' + tops[0].total + '/10), yaitu ' + joinNames(tops) +
        '. Kelompok 9 perlu memilih satu di antaranya untuk dikembangkan lebih lanjut.</p>';
    }
  }

  renderChart('chartRepMatrix', buildMatrixConfig());
  drawBarChart('chartRepBar', false, 46, 80);
}

function renderPage(name) {
  if (name === 'dashboard') renderDashboard();
  else if (name === 'data') renderTable();
  else if (name === 'matriks') renderMatrixPage();
  else if (name === 'grafik') renderBarPage();
  else if (name === 'prioritas') renderPriority();
  else if (name === 'laporan') renderReport();
}

/* ---------------------------------------------------------
   6. FORM TAMBAH/EDIT, HAPUS, RESET
   --------------------------------------------------------- */

let ideaModal = null;
let confirmModal = null;
let confirmCallback = null;
let hasAttemptedSubmit = false;

function updatePreview() {
  const f = Number($('ideaFeas').value);
  const i = Number($('ideaImpact').value);
  if (isScore(f) && isScore(i)) {
    $('prevTotal').textContent = f + i;
    $('prevQuad').innerHTML = badgeHtml(getQuadrantKey(f, i));
  } else {
    $('prevTotal').textContent = '-';
    $('prevQuad').textContent = '-';
  }
}

function clearValidation() {
  hasAttemptedSubmit = false;
  ['ideaName', 'ideaFeas', 'ideaImpact'].forEach(function (id) { $(id).classList.remove('is-invalid'); });
}

function openForm(id) {
  clearValidation();
  const item = id ? ideas.find(function (x) { return x.id === id; }) : null;
  $('modalTitle').textContent = item ? 'Edit Ide' : 'Tambah Ide';
  $('ideaId').value = item ? item.id : '';
  $('ideaName').value = item ? item.name : '';
  $('ideaFeas').value = item ? String(item.feas) : '';
  $('ideaImpact').value = item ? String(item.impact) : '';
  updatePreview();
  ideaModal.show();
}

// Tandai field salah/benar, lalu kembalikan true jika valid
function checkField(id, valid) {
  $(id).classList.toggle('is-invalid', !valid);
  return valid;
}

function validateForm() {
  const name = $('ideaName').value.trim();
  const feas = Number($('ideaFeas').value);
  const impact = Number($('ideaImpact').value);

  const okName = checkField('ideaName', name.length > 0);
  const okFeas = checkField('ideaFeas', isScore(feas));
  const okImpact = checkField('ideaImpact', isScore(impact));
  return { valid: okName && okFeas && okImpact, name: name, feas: feas, impact: impact };
}

function handleFormChange() {
  updatePreview();
  if (hasAttemptedSubmit) validateForm();
}

function handleSubmit(event) {
  event.preventDefault();
  hasAttemptedSubmit = true;
  const result = validateForm();
  if (!result.valid) return;   // data tidak valid: jangan disimpan

  const id = $('ideaId').value;
  if (id) {
    const item = ideas.find(function (x) { return x.id === id; });
    if (item) { item.name = result.name; item.feas = result.feas; item.impact = result.impact; }
  } else {
    ideas.push({ id: newId(), name: result.name, feas: result.feas, impact: result.impact });
  }

  persist(ideas);
  ideaModal.hide();
  renderPage(currentPage);
}

function askConfirm(title, text, okLabel, callback) {
  $('confirmTitle').textContent = title;
  $('confirmText').textContent = text;
  $('confirmOk').textContent = okLabel;
  confirmCallback = callback;
  confirmModal.show();
}

function deleteIdea(id) {
  const item = ideas.find(function (x) { return x.id === id; });
  if (!item) return;
  askConfirm('Hapus Ide', 'Hapus ide "' + item.name + '"?', 'Ya, Hapus', function () {
    ideas = ideas.filter(function (x) { return x.id !== id; });
    persist(ideas);
    renderPage(currentPage);
  });
}

function resetData() {
  askConfirm('Reset Data', 'Semua perubahan akan dihapus dan data kembali ke 10 ide awal (LKPD 5). Lanjutkan?', 'Ya, Reset', function () {
    ideas = cloneInitial();
    persist(ideas);
    $('searchInput').value = '';
    renderPage(currentPage);
  });
}

/* ---------------------------------------------------------
   7. NAVIGASI & INISIALISASI
   --------------------------------------------------------- */

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarOverlay').classList.remove('show');
}

function showPage(name) {
  if (!PAGE_TITLES[name]) name = 'dashboard';
  if (name !== 'matriks') disposeMatrix3D();
  currentPage = name;
  document.body.classList.toggle('dashboard-theme', name === 'dashboard');

  document.querySelectorAll('.page').forEach(function (el) {
    el.classList.toggle('d-none', el.id !== 'page-' + name);
  });
  document.querySelectorAll('.menu .nav-link').forEach(function (el) {
    el.classList.toggle('active', el.getAttribute('data-page') === name);
  });
  $('pageTitle').textContent = PAGE_TITLES[name];
  closeSidebar();
  renderPage(name);
  window.scrollTo(0, 0);

  try { history.replaceState(null, '', '#' + name); } catch (err) { /* abaikan */ }
}

function resizeChartsForPrint() {
  Object.keys(charts).forEach(function (id) {
    if (charts[id]) charts[id].resize();
  });
}

function init() {
  ideas = loadIdeas();
  window.addEventListener('beforeunload', disposeMatrix3D);

  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = FONT;
  }
  applyTheme(loadThemePreference(), false);

  ideaModal = new bootstrap.Modal($('ideaModal'));
  confirmModal = new bootstrap.Modal($('confirmModal'));

  // Menu sidebar
  document.querySelectorAll('.menu .nav-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      showPage(link.getAttribute('data-page'));
    });
  });
  $('btnMenu').addEventListener('click', function () {
    $('sidebar').classList.add('open');
    $('sidebarOverlay').classList.add('show');
  });
  $('themeToggle').addEventListener('click', function () {
    applyTheme(!document.body.classList.contains('dark-mode'), true);
    if (currentPage === 'matriks') disposeMatrix3D();
    renderPage(currentPage);
  });
  $('dashboardAddIdea').addEventListener('click', function () { openForm(null); });
  document.querySelectorAll('[data-dashboard-page]').forEach(function (button) {
    button.addEventListener('click', function () { showPage(button.getAttribute('data-dashboard-page')); });
  });
  $('sidebarOverlay').addEventListener('click', closeSidebar);

  // Halaman Data Ide
  $('btnAdd').addEventListener('click', function () { openForm(null); });
  $('btnReset').addEventListener('click', resetData);
  $('searchInput').addEventListener('input', renderTable);
  $('ideaTableBody').addEventListener('click', function (e) {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (btn.getAttribute('data-action') === 'edit') openForm(id);
    else deleteIdea(id);
  });

  // Form
  $('ideaForm').addEventListener('submit', handleSubmit);
  $('ideaName').addEventListener('input', handleFormChange);
  $('ideaFeas').addEventListener('change', handleFormChange);
  $('ideaImpact').addEventListener('change', handleFormChange);
  $('ideaModal').addEventListener('shown.bs.modal', function () { $('ideaName').focus(); });

  // Konfirmasi
  $('confirmOk').addEventListener('click', function () {
    confirmModal.hide();
    if (confirmCallback) {
      const run = confirmCallback;
      confirmCallback = null;
      run();
    }
  });

  // Cetak laporan
  $('btnPrint').addEventListener('click', function () { window.print(); });
  window.addEventListener('beforeprint', resizeChartsForPrint);
  window.addEventListener('afterprint', resizeChartsForPrint);

  // Buka halaman dari alamat (#data, #laporan, ...) atau Dashboard
  const start = (location.hash || '').replace('#', '');
  showPage(PAGE_TITLES[start] ? start : 'dashboard');
}

export function mountLegacyApp() {
  init();
  return function unmountLegacyApp() {
    window.removeEventListener('beforeunload', disposeMatrix3D);
    window.removeEventListener('beforeprint', resizeChartsForPrint);
    window.removeEventListener('afterprint', resizeChartsForPrint);
    closeSidebar();
    disposeMatrix3D();
    Object.keys(charts).forEach(function (id) {
      if (charts[id]) charts[id].destroy();
      delete charts[id];
    });
    if (ideaModal) ideaModal.dispose();
    if (confirmModal) confirmModal.dispose();
    ideaModal = null;
    confirmModal = null;
  };
}
