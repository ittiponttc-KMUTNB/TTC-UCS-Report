// export-word.js — สร้างไฟล์ Word (.doc แบบ HTML) จากผลทดสอบ
// พอร์ตตรงจาก doExportWord เดิมใน mockup

async function fetchLogoDataUrl() {
  try {
    const res = await fetch('assets/kmutnb-logo.png');
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
  } catch (e) {
    return '';
  }
}

function row(label, value) {
  return `<tr><td style="border:1px solid #000;padding:3px 6px;width:38%;">${label}</td><td style="border:1px solid #000;padding:3px 6px;">${value}</td></tr>`;
}

/**
 * @param {object} s state.proj/sample/cement/water/test ฯลฯ (ดู app.js)
 * @param {object} c { geometry, water, dryUnitWeight, computedRows, results }
 * @param {SVGElement} chartSvgEl element ของกราฟที่กำลังแสดงอยู่บนหน้า
 */
async function exportWord(s, c, chartSvgEl) {
  const logoData = await fetchLogoDataUrl();
  const chartImg = chartSvgEl ? await svgToPngDataUrl(chartSvgEl) : '';

  const headCells = ['No.', 'Deformation R (mm)', 'Axial Load P (kg)', 'Strain (%)', 'Corrected Area (cm2)', 'Stress (ksc)'];

  const html = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>UCS Report</title></head>' +
    '<body style="font-family:Tahoma,sans-serif;font-size:11pt;">' +
    '<div style="text-align:center;">' + (logoData ? '<img src="' + logoData + '" style="width:70px;"><br/>' : '') +
    '<h3 style="margin:4px 0;">KING MONGKUT\'S UNIVERSITY OF TECHNOLOGY NORTH BANGKOK</h3><div>DEPARTMENT OF TEACHER TRAINING IN CIVIL ENGINEERING</div></div>' +
    '<h4 style="text-align:center;">Unconfined Compression Test (ASTM D2166)</h4>' +
    '<table style="border-collapse:collapse;width:100%;">' +
    row('Specimen from', s.proj.specimenFrom) + row('Project Name', s.proj.projectName) + row('Location', s.proj.location) +
    row('Column No. / Sample Number', s.proj.columnNo + ' / ' + s.proj.sampleNumber) + row('Depth', s.proj.depth) +
    row('Shearing Rate', formatShearingRate(s.proj.shearingRate)) + row('Date of Jetting / Testing', s.proj.dateOfJetting + ' / ' + s.proj.dateOfTesting) +
    row('Curing Time', curingDays(s.proj.dateOfJetting, s.proj.dateOfTesting) + ' days') + row('Tested by', s.proj.testedBy) +
    '</table>' +
    '<h4>Cement Mixing / Sample</h4><table style="border-collapse:collapse;width:100%;">' +
    row('Mixed Jet Mixing', s.cement.mixedJetMixing + ' kg/m3') + row('Diameter D', s.sample.diameter + ' cm') +
    row('Height H', s.sample.height + ' cm') + row('Area A', fmt(c.geometry.area, 3) + ' cm2') +
    row('Volume V', fmt(c.geometry.volume, 2) + ' cm3') + row('Weight of Sample W', s.sample.weight + ' g') +
    row('Wet Unit Weight', fmt(c.geometry.wetUnitWeight, 3) + ' g/cm3') + row('Dry Unit Weight', fmt(c.dryUnitWeight, 3) + ' g/cm3') +
    '</table>' +
    '<h4>Water Content Determination</h4><table style="border-collapse:collapse;width:100%;">' +
    row('Container No.', s.water.containerNo) + row('Weight of Can', s.water.weightOfCan + ' g') +
    row('Weight of Can + Wet Soil', s.water.weightOfCanWetSoil + ' g') + row('Weight of Can + Dry Soil', s.water.weightOfCanDrySoil + ' g') +
    row('Weight of Water', fmt(c.water.weightOfWater, 2) + ' g') + row('Weight of Dry Soil', fmt(c.water.weightOfDrySoil, 2) + ' g') +
    row('Water Content, w', fmt(c.water.waterContent, 2) + ' %') +
    '</table>' +
    '<h4>Load - Deformation Data</h4><table style="border-collapse:collapse;width:100%;font-size:9.5pt;">' +
    '<tr>' + headCells.map((h) => '<th style="border:1px solid #000;padding:3px;">' + h + '</th>').join('') + '</tr>' +
    c.computedRows.map((r, i) => '<tr>' + [i + 1, fmt(r.deformation, 2), fmt(r.load, 2), fmt(r.strain * 100, 3), fmt(r.correctedArea, 3), fmt(r.stress, 2)]
      .map((v) => '<td style="border:1px solid #000;padding:3px;text-align:center;">' + v + '</td>').join('') + '</tr>').join('') +
    '</table>' +
    (chartImg ? '<div style="text-align:center;margin-top:10px;"><img src="' + chartImg + '" style="width:500px;"></div>' : '') +
    '<h4>Results</h4><table style="border-collapse:collapse;width:60%;">' +
    row('Unconfined Compressive Strength, qu', fmt(c.results.qu, 2) + ' ksc.') +
    row('Undrained Shear Strength, su', fmt(c.results.su, 2) + ' ksc.') +
    row('Failure Strain, ef', fmt(c.results.ef, 2) + ' %') +
    row('Modulus of Elasticity, E50', fmt(c.results.e50, 1) + ' ksc.') +
    '</table>' +
    '<p>1. The testing results are good only for those specimens tested.<br/>2. Not valid unless signed and sealed.<br/>' +
    '- Proving Ring Capacity ' + s.test.provingRingCapacity + ' kN &nbsp; - Factor K = ' + s.test.factorK + ' kg/division</p>' +
    '<table style="width:100%;margin-top:40px;"><tr>' +
    '<td style="text-align:center;">.....................................<br/>Test by:<br/>( ' + s.sig.testBy + ' )</td>' +
    '<td style="text-align:center;">.....................................<br/>Controlled Test by:<br/>( ' + s.sig.controlledBy + ' )</td>' +
    '<td style="text-align:center;">.....................................<br/>Notified by:<br/>( ' + s.sig.notifiedBy + ' )<br/>' + s.sig.headTitle + '</td>' +
    '</tr></table></body></html>';

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'UCS_Report_' + (s.proj.sampleNumber || 'report').replace(/[\/\\]/g, '-') + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
