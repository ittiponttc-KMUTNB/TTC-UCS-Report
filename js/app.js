// app.js — ตัวเชื่อมหลักของแอป: state, event binding, คำนวณ, render, download/import backup, export

// ---------- State ----------

const state = {
  proj: {
    specimenFrom: '', projectName: '', location: '', columnNo: '', sampleNumber: '',
    depth: '', shearingRate: '', testedBy: '', dateOfJetting: '', dateOfTesting: '', jobNo: '',
  },
  sample: { diameter: '', height: '', weight: '' },
  cement: { mixedJetMixing: '' },
  water: { containerNo: '', weightOfCan: '', weightOfCanWetSoil: '', weightOfCanDrySoil: '' },
  test: { mode: 'kg', factorK: '', provingRingCapacity: '20' },
  curve: { degree: 4, quSource: 'raw' },
  rows: [
    { reading: '', deformation: '' },
    { reading: '', deformation: '' },
    { reading: '', deformation: '' },
  ],
  sig: { testBy: '', controlledBy: '', notifiedBy: '', headTitle: 'Head of Department' },
  photoDataUrl: null, // base64 data URL ของรูป After Test (เก็บในเครื่อง ฝังลง backup ตอนดาวน์โหลด)
};

let calcCache = null;
let chartScale = null;

// ---------- Path helpers ----------

function getPath(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj);
}
function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur = obj;
  for (let i = 0; i < keys.length - 1; i++) cur = cur[keys[i]];
  cur[keys[keys.length - 1]] = value;
}

// ---------- DOM refs ----------

const $ = (id) => document.getElementById(id);

// ---------- Compute + Render ----------

function recompute() {
  const geometry = computeSampleGeometry(state.sample);
  const water = computeWaterContent(state.water);
  const dryUnitWeight = geometry.wetUnitWeight / (1 + (water.waterContent / 100 || 0));
  const computedRows = computeRows(state.rows, {
    mode: state.test.mode, factorK: state.test.factorK, area: geometry.area, height: state.sample.height,
  });
  // หมายเหตุ: ต้นฉบับ mockup hardcode quSource เป็น 'raw' เสมอตอนคำนวณจริง (ดู calc.js)
  const results = computeResults(computedRows, { degree: Number(state.curve.degree), quSource: 'raw' });
  calcCache = { geometry, water, dryUnitWeight, computedRows, results };
  return calcCache;
}

function render() {
  const c = recompute();
  const s = state;

  // --- Project info hint ---
  $('pCuringDays').textContent = curingDays(s.proj.dateOfJetting, s.proj.dateOfTesting);

  // --- Sample/water hints in input panel ---
  $('areaVal').textContent = fmt(c.geometry.area, 3);
  $('volumeVal').textContent = fmt(c.geometry.volume, 2);
  $('wetUnitWeightVal').textContent = fmt(c.geometry.wetUnitWeight, 3);
  $('dryUnitWeightVal').textContent = fmt(c.dryUnitWeight, 3);
  $('weightOfWaterVal').textContent = fmt(c.water.weightOfWater, 2);
  $('weightOfDrySoilVal').textContent = fmt(c.water.weightOfDrySoil, 2);
  $('waterContentVal').textContent = fmt(c.water.waterContent, 2);

  // --- Report header/info ---
  $('rJobNo').textContent = s.proj.jobNo || '';
  $('rSpecimenFrom').textContent = s.proj.specimenFrom;
  $('rProjectName').textContent = s.proj.projectName;
  $('rLocation').textContent = s.proj.location;
  $('rColumnNo').textContent = s.proj.columnNo;
  $('rSampleNumber').textContent = s.proj.sampleNumber;
  $('rDepth').textContent = s.proj.depth;
  $('rShearingRate').textContent = s.proj.shearingRate;
  $('rDateOfJetting').textContent = s.proj.dateOfJetting;
  $('rDateOfTesting').textContent = s.proj.dateOfTesting;
  $('rCuringDays').textContent = curingDays(s.proj.dateOfJetting, s.proj.dateOfTesting);
  $('rTestedBy').textContent = s.proj.testedBy;

  // --- Cement / sample table ---
  $('rMixedJetMixing').textContent = s.cement.mixedJetMixing;
  $('rDiameter').textContent = fmt(s.sample.diameter, 2);
  $('rHeight').textContent = fmt(s.sample.height, 2);
  $('rAreaVal').textContent = fmt(c.geometry.area, 2);
  $('rVolumeVal').textContent = fmt(c.geometry.volume, 2);
  $('rWeight').textContent = fmt(s.sample.weight, 2);
  $('rWetUnitWeightVal').textContent = fmt(c.geometry.wetUnitWeight, 2);
  $('rDryUnitWeightVal').textContent = fmt(c.dryUnitWeight, 2);
  $('rWaterContentVal').textContent = fmt(c.water.waterContent, 2);

  // --- Load-deformation report table ---
  const reportBody = $('reportRowsBody');
  reportBody.innerHTML = c.computedRows.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${fmt(r.deformation, 2)}</td>
      <td>${fmt(r.load, 2)}</td>
      <td>${fmt(r.strain * 100, 3)}</td>
      <td>${fmt(r.correctedArea, 3)}</td>
      <td>${fmt(r.stress, 2)}</td>
    </tr>`).join('');

  // --- Results table ---
  const resultsRows = [
    { label: 'Unconfined Compressive Strength, qu', value: fmt(c.results.qu, 2), unit: 'ksc.' },
    { label: 'Undrained Shear Strength, su', value: fmt(c.results.su, 2), unit: 'ksc.' },
    { label: 'Failure Strain, εf', value: fmt(c.results.ef, 2), unit: '%' },
    { label: 'Modulus of Elasticity, E50', value: fmt(c.results.e50, 1), unit: 'ksc.' },
  ];
  $('resultsBody').innerHTML = resultsRows.map((r) => `
    <tr><td class="label">${r.label}</td><td class="value">${r.value}</td><td>${r.unit}</td></tr>
  `).join('');

  // --- Signatures ---
  $('rSigTestBy').textContent = s.sig.testBy;
  $('rSigControlledBy').textContent = s.sig.controlledBy;
  $('rSigNotifiedBy').textContent = s.sig.notifiedBy;
  $('rSigHeadTitle').textContent = s.sig.headTitle;

  // --- Chart ---
  chartScale = renderChart($('chartSvg'), $('chartWrap'), c.computedRows, c.results);

  // --- Rows editor table ---
  renderRowsEditor();
}

function renderRowsEditor() {
  const body = $('rowsBody');
  body.innerHTML = state.rows.map((r, i) => `
    <tr>
      <td class="row-idx">${i}</td>
      <td><input type="text" value="${r.deformation}" data-row-idx="${i}" data-row-field="deformation"></td>
      <td><input type="text" value="${r.reading}" data-row-idx="${i}" data-row-field="reading"></td>
      <td><button class="remove-row-btn" data-remove-idx="${i}">×</button></td>
    </tr>`).join('');
}

// ---------- Event binding: simple data-path fields ----------

function bindPathInputs() {
  document.querySelectorAll('[data-path]').forEach((el) => {
    el.value = getPath(state, el.dataset.path) ?? '';
    el.addEventListener('input', () => {
      setPath(state, el.dataset.path, el.value);
      render();
    });
  });
}

function syncPathInputsFromState() {
  document.querySelectorAll('[data-path]').forEach((el) => {
    el.value = getPath(state, el.dataset.path) ?? '';
  });
}

function bindModeRadios() {
  const modeDivision = $('modeDivision');
  const modeKg = $('modeKg');
  modeDivision.checked = state.test.mode === 'division';
  modeKg.checked = state.test.mode === 'kg';
  modeDivision.addEventListener('change', () => { state.test.mode = 'division'; render(); });
  modeKg.addEventListener('change', () => { state.test.mode = 'kg'; render(); });
}

function bindRowsEditor() {
  $('rowsBody').addEventListener('input', (e) => {
    const idx = e.target.dataset.rowIdx;
    const field = e.target.dataset.rowField;
    if (idx == null || !field) return;
    state.rows[Number(idx)][field] = e.target.value;
    render();
  });
  $('rowsBody').addEventListener('click', (e) => {
    if (e.target.dataset.removeIdx == null) return;
    const idx = Number(e.target.dataset.removeIdx);
    state.rows.splice(idx, 1);
    render();
  });
  $('btnAddRow').addEventListener('click', () => {
    state.rows.push({ reading: '', deformation: '' });
    render();
  });
}

function bindPasteAndUpload() {
  $('btnParsePaste').addEventListener('click', () => {
    const rows = parseTextToRows($('pasteText').value);
    if (rows.length) {
      state.rows = rows;
      $('pasteText').value = '';
      render();
    }
  });
  $('fileUpload').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    try {
      const rows = await readRowsFromFile(file);
      if (rows.length) { state.rows = rows; render(); }
    } catch (err) {
      alert('อ่านไฟล์ไม่สำเร็จ: ' + err.message);
    }
    e.target.value = '';
  });
}

function bindChartHover() {
  attachChartHover($('chartSvg'), $('chartTooltip'), () => chartScale);
}

// ---------- Photo (After Test) — เก็บเป็น data URL ในเครื่อง ไม่มี cloud upload ----------

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

async function assignPhotoFile(file) {
  const dataUrl = await readFileAsDataUrl(file);
  state.photoDataUrl = dataUrl;
  showPhotoPreview(dataUrl);
}

function showPhotoPreview(dataUrl) {
  const preview = $('photoPreview');
  const placeholder = $('photoPlaceholder');
  if (dataUrl) {
    preview.src = dataUrl;
    preview.style.display = 'block';
    placeholder.style.display = 'none';
  } else {
    preview.style.display = 'none';
    placeholder.style.display = 'block';
  }
}

function bindPhotoUpload() {
  $('photoInput').addEventListener('change', async () => {
    const file = $('photoInput').files && $('photoInput').files[0];
    if (!file) return;
    try {
      await assignPhotoFile(file);
    } catch (err) {
      alert('อ่านไฟล์รูปไม่สำเร็จ: ' + err.message);
    }
  });
}

// ---------- Print: บังคับให้จบภายใน 1 หน้า A4 เสมอ ----------
// ถ้ามี Load-Deformation หลายแถวจนเนื้อหาสูงเกิน 297mm ให้ย่อขนาด (scale) แทนที่จะปล่อยให้ล้นไปหน้า 2
// ".print-frame" (ครอบ .report-page) มี height:297mm + overflow:hidden ตอนพิมพ์ (ดู style.css)
// จึงตัดส่วนเกินทิ้งได้จริง ไม่ใช่แค่ทำให้ดูเล็กลงเฉยๆ

function applyPrintScale() {
  const page = document.querySelector('[data-report-page]');
  if (!page) return;
  page.style.transform = '';
  const rect = page.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const pxPerMm = rect.width / 210; // .report-page กว้าง 210mm เสมอทั้งจอและตอนพิมพ์
  const heightMm = rect.height / pxPerMm;
  if (heightMm > 297) {
    const scale = 297 / heightMm;
    page.style.transform = `scale(${scale})`;
  }
}

window.addEventListener('beforeprint', applyPrintScale);
window.addEventListener('afterprint', () => {
  const page = document.querySelector('[data-report-page]');
  if (page) page.style.transform = '';
});

// ---------- Buttons: Print / Export ----------

function bindActionButtons() {
  $('btnPrint').addEventListener('click', () => window.print());

  $('btnExportWord').addEventListener('click', async () => {
    const c = recompute();
    await exportWord(state, c, $('chartSvg'));
  });

  $('btnExportExcel').addEventListener('click', () => {
    const c = recompute();
    exportExcel(state, c);
  });
}

// ---------- Backup: Download / Import (ไฟล์ .json เก็บเอง ไม่มี cloud) ----------

function buildBackupObject(c) {
  return {
    schema: 'ucs-test-backup',
    version: 1,
    savedAt: new Date().toISOString(),
    state: {
      proj: state.proj,
      sample: state.sample,
      cement: state.cement,
      water: state.water,
      test: state.test,
      curve: state.curve,
      rows: state.rows,
      sig: state.sig,
      photoDataUrl: state.photoDataUrl,
    },
    results: {
      qu: c.results.qu, su: c.results.su, ef: c.results.ef,
      e50: c.results.e50, ei: c.results.ei, r2: c.results.r2,
    },
  };
}

// กันอักขระที่ใช้เป็นชื่อไฟล์ไม่ได้ (Windows/Mac ตีความ / เป็น folder separator ฯลฯ)
function sanitizeFilenamePart(s) {
  return String(s || '').replace(/[\\/:*?"<>|]/g, '-').trim();
}

function buildBackupFilename() {
  const jobNo = sanitizeFilenamePart(state.proj.jobNo) || 'noJob';
  const specimen = sanitizeFilenamePart(state.proj.specimenFrom).slice(0, 5) || 'na';
  const project = sanitizeFilenamePart(state.proj.projectName).slice(0, 5) || 'na';
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD กันชื่อไฟล์ซ้ำถ้าดาวน์โหลดหลายครั้ง
  return `UCS_No${jobNo}_${specimen}_${project}_${date}.json`;
}

function downloadBackup() {
  const c = recompute();
  const backup = buildBackupObject(c);
  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = buildBackupFilename();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);

  const statusEl = $('backupStatus');
  statusEl.className = 'save-status ok';
  statusEl.textContent = 'ดาวน์โหลด backup แล้ว — เก็บไฟล์นี้ไว้ในโฟลเดอร์โปรเจกต์ให้ดี';
}

function applyBackupObject(backup) {
  if (!backup || backup.schema !== 'ucs-test-backup' || !backup.state) {
    throw new Error('ไฟล์นี้ไม่ใช่ไฟล์ backup ของโปรแกรมนี้ (schema ไม่ตรง)');
  }
  const st = backup.state;
  state.proj = { ...state.proj, ...st.proj };
  state.sample = { ...state.sample, ...st.sample };
  state.cement = { ...state.cement, ...st.cement };
  state.water = { ...state.water, ...st.water };
  state.test = { ...state.test, ...st.test };
  state.curve = { ...state.curve, ...st.curve };
  state.rows = Array.isArray(st.rows) && st.rows.length ? st.rows : [{ reading: '', deformation: '' }];
  state.sig = { ...state.sig, ...st.sig };
  state.photoDataUrl = st.photoDataUrl || null;

  syncPathInputsFromState();
  $('modeDivision').checked = state.test.mode === 'division';
  $('modeKg').checked = state.test.mode === 'kg';
  showPhotoPreview(state.photoDataUrl);
  render();
}

function bindBackupButtons() {
  $('btnDownloadBackup').addEventListener('click', downloadBackup);

  $('importBackupInput').addEventListener('change', async (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const statusEl = $('backupStatus');
    try {
      const text = await file.text();
      const backup = JSON.parse(text);
      applyBackupObject(backup);
      statusEl.className = 'save-status ok';
      statusEl.textContent = `นำเข้าข้อมูลจาก "${file.name}" แล้ว`;
    } catch (err) {
      statusEl.className = 'save-status err';
      statusEl.textContent = 'นำเข้าไม่สำเร็จ: ' + err.message;
    }
    e.target.value = '';
  });
}

// ---------- Init ----------

function init() {
  bindPathInputs();
  bindModeRadios();
  bindRowsEditor();
  bindPasteAndUpload();
  bindChartHover();
  bindPhotoUpload();
  bindActionButtons();
  bindBackupButtons();
  render();
}

document.addEventListener('DOMContentLoaded', init);
