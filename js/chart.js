// chart.js — วาดกราฟ Stress-Strain เป็น SVG พร้อม hover tooltip
// พอร์ตตรรกะเดิมจาก mockup (renderVals chart section) มาเป็นฟังก์ชันแยก

const CW = 640, CH = 480, ML = 75, MR = 20, MT = 25, MB = 60;
const PLOT_W = CW - ML - MR, PLOT_H = CH - MT - MB;

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

/**
 * วาดกราฟลงใน svgEl (element <svg viewBox="0 0 640 480">) และ tick label
 * ลงใน tickLayerEl (div ครอบ position:relative ขนาดเดียวกับ svg สำหรับวาง label ตัวเลขแกน)
 * คืนค่า scale object ไว้ใช้กับ hover
 */
function renderChart(svgEl, tickLayerEl, computedRows, results) {
  svgEl.innerHTML = '';
  tickLayerEl.querySelectorAll('.axis-tick').forEach((n) => n.remove());

  svgEl.appendChild(el('rect', { x: 0, y: 0, width: CW, height: CH, fill: '#ffffff' }));

  const rawXMax = Math.max(...computedRows.map((r) => r.strain * 100), 0.001);
  const xStep = niceStep((rawXMax * 1.05) / 5);
  const xMax = Math.ceil((rawXMax * 1.05) / xStep) * xStep || xStep;
  const rawYMax = Math.max(...computedRows.map((r) => r.stress), 0.001);
  const yStep = niceStep((rawYMax * 1.1) / 5);
  const yMax = Math.ceil((rawYMax * 1.1) / yStep) * yStep || yStep;

  const xScale = (v) => ML + (v / xMax) * PLOT_W;
  const yScale = (v) => MT + PLOT_H - (v / yMax) * PLOT_H;

  const xCount = Math.round(xMax / xStep);
  for (let i = 0; i <= xCount; i++) {
    const v = i * xStep;
    const x = xScale(v);
    svgEl.appendChild(el('line', { x1: x, y1: MT, x2: x, y2: MT + PLOT_H, stroke: '#eef0f3', 'stroke-width': 1 }));
    const label = document.createElement('div');
    label.className = 'axis-tick axis-tick-x';
    label.style.left = ((x / CW) * 100) + '%';
    // ระยะห่างจากเส้นแกน x เท่ากับที่ตัวเลขแกน y ห่างจากเส้นแกน y ตอนแสดงผลจริง
    // (offset นี้อยู่ในหน่วย viewBox 480 แต่ svg ถูกยืดไม่เท่ากันทั้ง 2 แกน (preserveAspectRatio="none")
    // จึงต้องคูณด้วยอัตราส่วนสเกล x/y ของ container ก่อน ไม่ใช้ 12 ตรงๆ)
    label.style.top = (((MT + PLOT_H + 13.4) / CH) * 100) + '%';
    label.textContent = String(Number(v.toFixed(3)));
    tickLayerEl.appendChild(label);
  }
  const yCount = Math.round(yMax / yStep);
  for (let i = 0; i <= yCount; i++) {
    const v = i * yStep;
    const y = yScale(v);
    svgEl.appendChild(el('line', { x1: ML, y1: y, x2: ML + PLOT_W, y2: y, stroke: '#eef0f3', 'stroke-width': 1 }));
    const label = document.createElement('div');
    label.className = 'axis-tick axis-tick-y';
    label.style.left = (((ML - 12) / CW) * 100) + '%';
    label.style.top = ((y / CH) * 100) + '%';
    label.textContent = String(Number(v.toFixed(3)));
    tickLayerEl.appendChild(label);
  }

  svgEl.appendChild(el('line', { x1: ML, y1: MT, x2: ML, y2: MT + PLOT_H, stroke: '#111827', 'stroke-width': 1.8 }));
  svgEl.appendChild(el('line', { x1: ML, y1: MT + PLOT_H, x2: ML + PLOT_W, y2: MT + PLOT_H, stroke: '#111827', 'stroke-width': 1.8 }));

  const xTitle = el('text', { x: 330, y: MT + PLOT_H + 45, 'font-size': 14, 'text-anchor': 'middle', fill: '#111827' });
  xTitle.textContent = 'Axial Strain, ε (%)';
  svgEl.appendChild(xTitle);

  const yTitleX = 20, yTitleY = MT + PLOT_H / 2;
  const yTitle = el('text', { x: yTitleX, y: yTitleY, 'font-size': 14, 'text-anchor': 'middle', fill: '#111827', transform: `rotate(-90,${yTitleX},${yTitleY})` });
  yTitle.textContent = 'Axial Stress, σ (ksc)';
  svgEl.appendChild(yTitle);

  const ordered = computedRows.map((r) => ({ x: r.strain * 100, y: r.stress })).sort((a, b) => a.x - b.x);
  const curvePath = ordered.length ? 'M ' + ordered.map((p) => xScale(p.x).toFixed(1) + ',' + yScale(p.y).toFixed(1)).join(' L ') : '';
  svgEl.appendChild(el('path', { d: curvePath, fill: 'none', stroke: '#2563eb', 'stroke-width': 2.4 }));

  computedRows.forEach((r) => {
    svgEl.appendChild(el('circle', { cx: xScale(r.strain * 100), cy: yScale(r.stress), r: 3.6, fill: '#111827' }));
  });

  const peakCx = xScale(results.peakStrain * 100);
  const peakCy = yScale(results.peakStress);
  svgEl.appendChild(el('line', { x1: peakCx, y1: peakCy, x2: peakCx, y2: MT + PLOT_H, stroke: '#dc2626', 'stroke-width': 1.6, 'stroke-dasharray': '5,5' }));
  svgEl.appendChild(el('line', { x1: ML, y1: peakCy, x2: peakCx, y2: peakCy, stroke: '#dc2626', 'stroke-width': 1.6, 'stroke-dasharray': '5,5' }));
  svgEl.appendChild(el('circle', { cx: peakCx, cy: peakCy, r: 5.5, fill: '#dc2626' }));
  const quLabel = el('text', { x: peakCx, y: Math.max(peakCy - 10, 12), 'font-size': 14, 'font-weight': 700, 'text-anchor': 'middle', fill: '#dc2626' });
  quLabel.textContent = 'qu';
  svgEl.appendChild(quLabel);

  return {
    ML, MT, plotW: PLOT_W, plotH: PLOT_H, xMax, yMax,
    rawPoints: computedRows.map((r) => ({ strain: r.strain, stress: r.stress })),
  };
}

/** ผูก hover tooltip เข้ากับ svg โดยใช้ scale ที่ได้จาก renderChart() */
function attachChartHover(svgEl, tooltipEl, getScale) {
  svgEl.addEventListener('mousemove', (e) => {
    const scale = getScale();
    if (!scale || !scale.rawPoints.length) return;
    const rect = svgEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const px = (e.clientX - rect.left) * (CW / rect.width);
    const { ML: ml, plotW, xMax } = scale;
    const strainPct = ((px - ml) / plotW) * xMax;
    let best = 0, bestD = Infinity;
    scale.rawPoints.forEach((p, i) => {
      const d = Math.abs(p.strain * 100 - strainPct);
      if (d < bestD) { bestD = d; best = i; }
    });
    const p = scale.rawPoints[best];
    const cx = scale.ML + ((p.strain * 100) / scale.xMax) * scale.plotW;
    const cy = scale.MT + scale.plotH - (p.stress / scale.yMax) * scale.plotH;
    tooltipEl.style.display = 'block';
    tooltipEl.style.left = ((cx / CW) * 100) + '%';
    tooltipEl.style.top = ((cy / CH) * 100) + '%';
    tooltipEl.textContent = `ε ${(p.strain * 100).toFixed(2)}%  σ ${p.stress.toFixed(2)} ksc.`;
  });
  svgEl.addEventListener('mouseleave', () => { tooltipEl.style.display = 'none'; });
}

/** แปลง svg เป็น PNG dataURL (ใช้ตอน export Word) */
function svgToPngDataUrl(svgEl, width = 640, height = 480) {
  return new Promise((resolve) => {
    try {
      const xml = new XMLSerializer().serializeToString(svgEl);
      const svg64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(xml)));
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/png'));
      };
      img.onerror = () => resolve('');
      img.src = svg64;
    } catch (e) {
      resolve('');
    }
  });
}
