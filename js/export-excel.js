// export-excel.js — export ผลทดสอบเป็น .xlsx และอ่านไฟล์ .xlsx ที่อัพโหลด
// ใช้ไลบรารี SheetJS (global `XLSX`) โหลดจาก CDN ใน index.html
// แทนที่ xlsx-io.js เดิมของ mockup (ลดการดูแลโค้ด parser เอง)

/**
 * @param {object} s state
 * @param {object} c { geometry, water, dryUnitWeight, computedRows, results }
 */
function exportExcel(s, c) {
  const infoAoa = [
    ['Unconfined Compression Test Report'], [],
    ['Specimen from', s.proj.specimenFrom], ['Project Name', s.proj.projectName], ['Location', s.proj.location],
    ['Column No.', s.proj.columnNo], ['Sample Number', s.proj.sampleNumber], ['Depth', s.proj.depth],
    ['Shearing Rate', s.proj.shearingRate], ['Tested by', s.proj.testedBy],
    ['Date of Jetting', s.proj.dateOfJetting], ['Date of Testing', s.proj.dateOfTesting], ['Curing Time (days)', curingDays(s.proj.dateOfJetting, s.proj.dateOfTesting)],
    [],
    ['Mixed Jet Mixing (kg/m3)', Number(s.cement.mixedJetMixing) || s.cement.mixedJetMixing],
    ['Diameter D (cm)', Number(s.sample.diameter)], ['Height H (cm)', Number(s.sample.height)],
    ['Area A (cm2)', c.geometry.area], ['Volume V (cm3)', c.geometry.volume], ['Weight of Sample W (g)', Number(s.sample.weight)],
    ['Wet Unit Weight (g/cm3)', c.geometry.wetUnitWeight], ['Dry Unit Weight (g/cm3)', c.dryUnitWeight],
    [],
    ['Container No.', s.water.containerNo], ['Weight of Can (g)', Number(s.water.weightOfCan)],
    ['Weight of Can + Wet Soil (g)', Number(s.water.weightOfCanWetSoil)], ['Weight of Can + Dry Soil (g)', Number(s.water.weightOfCanDrySoil)],
    ['Weight of Water (g)', c.water.weightOfWater], ['Weight of Dry Soil (g)', c.water.weightOfDrySoil], ['Water Content w (%)', c.water.waterContent],
    [],
    ['Proving Ring Capacity (kN)', Number(s.test.provingRingCapacity)], ['Factor K (kg/division)', Number(s.test.factorK)], ['Test Mode', s.test.mode],
    [],
    ['--- Results ---'],
    ['Unconfined Compressive Strength, qu (ksc)', c.results.qu], ['Undrained Shear Strength, su (ksc)', c.results.su],
    ['Failure Strain, ef (%)', c.results.ef], ['Modulus of Elasticity, E50 (ksc)', c.results.e50],
    [],
    ['--- QA supplemental (not printed on report) ---'],
    ['Curve fit degree', s.curve.degree], ['qu source', s.curve.quSource], ['R-squared', c.results.r2],
    ['Initial Tangent Modulus, Ei (ksc)', c.results.ei], ['Polynomial coefficients (a0..an)', c.results.coeffs.join(', ')],
  ];

  const dataAoa = [
    ['No.', 'Reading', 'Deformation R (mm)', 'Axial Load P (kg)', 'Axial Strain (%)', 'Corrected Area (cm2)', 'Axial Stress (ksc)'],
    ...c.computedRows.map((r, i) => [i + 1, r.reading, r.deformation, r.load, r.strain * 100, r.correctedArea, r.stress]),
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(infoAoa), 'Report');
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(dataAoa), 'Raw Data');

  const fname = 'UCS_Report_' + (s.proj.sampleNumber || 'report').replace(/[\/\\]/g, '-') + '.xlsx';
  XLSX.writeFile(wb, fname);
}

/**
 * อ่านไฟล์ .xlsx หรือ .csv ที่อัพโหลด แล้วคืนค่าเป็น [{reading, deformation}, ...]
 * จากคอลัมน์แรก 2 คอลัมน์ของ sheet แรก (คอลัมน์แรก = Deformation, คอลัมน์ที่สอง = Reading/Load)
 */
async function readRowsFromFile(file) {
  if (/\.xlsx$/i.test(file.name)) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const rows = [];
    for (const r of aoa) {
      const deformation = parseFloat(r[0]);
      const reading = parseFloat(r[1]);
      if (!isNaN(deformation) && !isNaN(reading)) rows.push({ reading: String(reading), deformation: String(deformation) });
    }
    return rows;
  }
  // .csv หรือไฟล์ text อื่น ๆ
  const text = await file.text();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
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
