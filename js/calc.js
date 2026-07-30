// calc.js — สูตรคำนวณ Unconfined Compression Test (ASTM D2166-66)
// พอร์ตตรงจาก mockup เดิม (ไม่เปลี่ยนสูตร) ให้เป็นฟังก์ชัน vanilla JS แยกอิสระ
// ทดสอบได้เอง ไม่ผูกกับ UI

function computeSampleGeometry({ diameter, height, weight }) {
  const D = Number(diameter) || 0;
  const H = Number(height) || 0;
  const W = Number(weight) || 0;
  const area = Math.PI * Math.pow(D / 2, 2);
  const volume = area * H;
  return { area, volume, wetUnitWeight: volume > 0 ? W / volume : 0 };
}

function computeWaterContent({ weightOfCan, weightOfCanWetSoil, weightOfCanDrySoil }) {
  const can = Number(weightOfCan) || 0;
  const canWet = Number(weightOfCanWetSoil) || 0;
  const canDry = Number(weightOfCanDrySoil) || 0;
  const weightOfWater = canWet - canDry;
  const weightOfDrySoil = canDry - can;
  return {
    weightOfWater,
    weightOfDrySoil,
    waterContent: weightOfDrySoil > 0 ? (weightOfWater / weightOfDrySoil) * 100 : 0,
  };
}

function computeRows(rows, { mode, factorK, area, height }) {
  const H10 = (Number(height) || 0) * 10; // cm -> mm
  return rows.map((r) => {
    const reading = Number(r.reading) || 0;
    const deformation = Number(r.deformation) || 0;
    const load = mode === 'division' ? reading * (Number(factorK) || 0) : reading;
    const strain = H10 > 0 ? deformation / H10 : 0;
    const correctedArea = strain < 1 ? area / (1 - strain) : area;
    const stress = correctedArea > 0 ? load / correctedArea : 0;
    return { reading, deformation, load, strain, correctedArea, stress };
  });
}

function solveLinearSystem(A, b) {
  const n = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(M[r][col]) > Math.abs(M[pivot][col])) pivot = r;
    [M[col], M[pivot]] = [M[pivot], M[col]];
    if (Math.abs(M[col][col]) < 1e-12) continue;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const factor = M[r][col] / M[col][col];
      for (let c = col; c <= n; c++) M[r][c] -= factor * M[col][c];
    }
  }
  return M.map((row, i) => (Math.abs(row[i]) < 1e-12 ? 0 : row[n] / row[i]));
}

function polyFit(xs, ys, degree) {
  const n = degree + 1;
  const m = xs.length;
  const powSums = new Array(2 * n - 1).fill(0);
  for (let k = 0; k < 2 * n - 1; k++) {
    let s = 0;
    for (let i = 0; i < m; i++) s += Math.pow(xs[i], k);
    powSums[k] = s;
  }
  const A = [], b = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) row.push(powSums[i + j]);
    A.push(row);
    let s = 0;
    for (let k = 0; k < m; k++) s += Math.pow(xs[k], i) * ys[k];
    b.push(s);
  }
  const coeffs = solveLinearSystem(A, b);
  const yMean = ys.reduce((a, v) => a + v, 0) / m;
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < m; i++) {
    const yhat = evalPoly(coeffs, xs[i]);
    ssRes += (ys[i] - yhat) ** 2;
    ssTot += (ys[i] - yMean) ** 2;
  }
  return { coeffs, r2: ssTot > 0 ? 1 - ssRes / ssTot : 1 };
}

function evalPoly(coeffs, x) {
  let y = 0, p = 1;
  for (let i = 0; i < coeffs.length; i++) { y += coeffs[i] * p; p *= x; }
  return y;
}

function evalPolyDerivative(coeffs, x) {
  let y = 0, p = 1;
  for (let i = 1; i < coeffs.length; i++) { y += i * coeffs[i] * p; p *= x; }
  return y;
}

function sampleCurve(fn, xMin, xMax, steps) {
  const xs = [], ys = [];
  for (let i = 0; i <= steps; i++) {
    const x = xMin + ((xMax - xMin) * i) / steps;
    xs.push(x);
    ys.push(fn(x));
  }
  return { xs, ys };
}

function maxOfSamples(xs, ys) {
  let bi = 0;
  for (let i = 1; i < ys.length; i++) if (ys[i] > ys[bi]) bi = i;
  return { x: xs[bi], y: ys[bi] };
}

function findXForY(xs, ys, target) {
  for (let i = 1; i < ys.length; i++) {
    if ((ys[i - 1] < target && ys[i] >= target) || (ys[i - 1] > target && ys[i] <= target)) {
      const t = (target - ys[i - 1]) / (ys[i] - ys[i - 1] || 1e-9);
      return xs[i - 1] + t * (xs[i] - xs[i - 1]);
    }
  }
  return xs[0] || 0;
}

// หมายเหตุสำคัญ: mockup ต้นฉบับ hardcode quSource เป็น 'raw' เสมอตอนคำนวณจริง
// (ปุ่ม radio "จากกราฟ/จาก raw data" มีอยู่ใน UI แต่ไม่ถูกใช้จริงใน renderVals())
// ผมพอร์ตพฤติกรรมเดิมไว้ตรงๆ ก่อน ถ้าอาจารย์ต้องการให้ radio ใช้งานได้จริง แจ้งได้เลยครับ
function computeResults(computedRows, { degree, quSource = 'raw' }) {
  const xs = computedRows.map((r) => r.strain);
  const ys = computedRows.map((r) => r.stress);
  const fit = xs.length > degree ? polyFit(xs, ys, degree) : { coeffs: [0, 0], r2: 0 };
  const maxStrain = Math.max(...xs, 0.001);
  const curve = sampleCurve((x) => evalPoly(fit.coeffs, x), 0, maxStrain * 1.02, 300);
  let qu, strainAtQu, halfStrain;
  if (quSource === 'curve') {
    const peak = maxOfSamples(curve.xs, curve.ys);
    qu = peak.y; strainAtQu = peak.x;
    halfStrain = findXForY(curve.xs, curve.ys, qu / 2);
  } else {
    let bi = 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] > ys[bi]) bi = i;
    qu = ys[bi]; strainAtQu = xs[bi];
    const order = xs.map((_, i) => i).sort((a, b) => xs[a] - xs[b]);
    halfStrain = findXForY(order.map((i) => xs[i]), order.map((i) => ys[i]), qu / 2);
  }
  const su = qu / 2;
  const e50 = halfStrain > 0 ? su / halfStrain : 0;
  const ei = evalPolyDerivative(fit.coeffs, 0);
  return {
    qu, su, ef: strainAtQu * 100, e50, ei, r2: fit.r2, coeffs: fit.coeffs,
    curvePoints: curve.xs.map((x, i) => ({ strain: x, stress: curve.ys[i] })),
    peakStrain: strainAtQu, peakStress: qu,
  };
}

function niceStep(rough) {
  if (!rough || !isFinite(rough) || rough <= 0) return 1;
  const exp = Math.floor(Math.log10(rough));
  const base = Math.pow(10, exp);
  const frac = rough / base;
  let niceFrac;
  if (frac < 1.5) niceFrac = 1; else if (frac < 3) niceFrac = 2; else if (frac < 7) niceFrac = 5; else niceFrac = 10;
  return niceFrac * base;
}

function curingDays(dateOfJetting, dateOfTesting) {
  const a = new Date(dateOfJetting);
  const b = new Date(dateOfTesting);
  if (isNaN(a) || isNaN(b)) return '-';
  return Math.round((b - a) / 86400000);
}

const EN_MONTHS_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const TH_MONTHS_ABBR = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

// แสดงวันที่ในรายงานเป็น "DD-MonAbbr-YY (D ThMonAbbr. YY พ.ศ.)" เช่น "27-Apr-21 (27 เม.ย. 64)"
function formatReportDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00'); // กัน timezone เลื่อนวันที่
  if (isNaN(d)) return dateStr;
  const day = d.getDate();
  const day2 = String(day).padStart(2, '0');
  const month = d.getMonth();
  const enYY = String(d.getFullYear() % 100).padStart(2, '0');
  const thYY = String((d.getFullYear() + 543) % 100).padStart(2, '0');
  return `${day2}-${EN_MONTHS_ABBR[month]}-${enYY} (${day} ${TH_MONTHS_ABBR[month]} ${thYY})`;
}

// รูปแบบที่วาง: คอลัมน์แรก = Deformation (mm), คอลัมน์ที่สอง = Reading/Load
function parseTextToRows(text) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    const parts = line.includes('\t') ? line.split('\t') : line.split(',');
    if (parts.length < 2) continue;
    const deformation = parseFloat(String(parts[0]).replace(',', '.'));
    const reading = parseFloat(String(parts[1]).replace(',', '.'));
    if (!isNaN(deformation) && !isNaN(reading)) rows.push({ reading: String(reading), deformation: String(deformation) });
  }
  return rows;
}

function fmt(n, d) {
  const v = Number(n);
  return isFinite(v) ? v.toFixed(d) : (0).toFixed(d);
}
