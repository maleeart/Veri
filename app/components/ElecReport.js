'use client';

function formatThaiDate(isoDate) {
  if (!isoDate) return { d: '..........', m: '..............................', y: '..........' };
  const parts = String(isoDate).split('-');
  if (parts.length < 3) return { d: '..........', m: '..............................', y: '..........' };
  const d = String(parseInt(parts[2], 10));
  const mIdx = parseInt(parts[1], 10) - 1;
  const thMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];
  const m = thMonths[mIdx] || '';
  const y = String(parseInt(parts[0], 10) + 543);
  return { d, m, y, full: `${d} ${m} ${y}` };
}

function CircleOpt({ checked, label }) {
  return (
    <span className="tmpl-circle-opt">
      <span className={`tmpl-circle ${checked ? 'tmpl-circle--checked' : ''}`}>
        {checked ? '✓' : ''}
      </span>
      <span className="tmpl-circle-lbl">{label}</span>
    </span>
  );
}

function Dot({ value, minWidth = 50, placeholder = '........................................' }) {
  if (!value) {
    return <span className="tmpl-dots" style={{ minWidth }}>{placeholder}</span>;
  }
  return <span className="tmpl-val" style={{ minWidth }}>{value}</span>;
}

function StatusMark({ status, target }) {
  if (status === target) {
    return <span className="tbl-check">✓</span>;
  }
  return null;
}

export default function ElecReport({ data }) {
  const f = data.records?.formData || data.records || {};
  const inspector = f.inspector || {};
  const workplace = f.workplace || {};
  const general = f.general || {};
  const highVoltageSystems = f.highVoltageSystems || [{}];
  const transformers = f.transformers || [{}];
  const mainSwitchboards = f.mainSwitchboards || [{}];
  const mainCircuits = f.mainCircuits || [{}];
  const subPanels = f.subPanels || [{}];
  const otherEquipments = f.otherEquipments || [{}];
  const conclusion = f.conclusion || {};

  const inspDate = formatThaiDate(conclusion.inspectionDate || workplace.inspectionDate || data.date);

  // Collect photos for appendix
  const photos = [];
  highVoltageSystems.forEach((hv, idx) => {
    Object.entries(hv.aerial || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `ระบบแรงสูง (${hv.aerialName || `ชุดที่ ${idx+1}`}) - สายอากาศ : ${k}`, photo: v.photo, note: v.note });
    });
    Object.entries(hv.disconnectors || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `ระบบแรงสูง (${hv.aerialName || `ชุดที่ ${idx+1}`}) - เครื่องปลดวงจร : ${k}`, photo: v.photo, note: v.note });
    });
    if (hv.other?.photo) photos.push({ label: `ระบบแรงสูง (${hv.aerialName || `ชุดที่ ${idx+1}`}) - อื่นๆ`, photo: hv.other.photo, note: hv.other.note });
  });
  transformers.forEach((tf, idx) => {
    Object.entries(tf.items || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `หม้อแปลงลูกที่ ${tf.no || idx+1} - ${k}`, photo: v.photo, note: v.note });
    });
  });
  mainSwitchboards.forEach((msb, idx) => {
    Object.entries(msb.items || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `ตู้ MDB ที่ ${msb.no || idx+1} - ${k}`, photo: v.photo, note: v.note });
    });
    if (msb.grounding?.photo) photos.push({ label: `ตู้ MDB ที่ ${msb.no || idx+1} - สายดิน`, photo: msb.grounding.photo, note: msb.grounding.note });
  });
  mainCircuits.forEach((mc, idx) => {
    Object.entries(mc.items || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `วงจรเมน (${mc.title || idx+1}) - ${k}`, photo: v.photo, note: v.note });
    });
  });
  subPanels.forEach((sp, idx) => {
    Object.entries(sp.items || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `แผงย่อย ${sp.no || idx+1} - ${k}`, photo: v.photo, note: v.note });
    });
  });
  otherEquipments.forEach((eq, idx) => {
    if (eq.installation?.photo) photos.push({ label: `บริภัณฑ์: ${eq.name || idx+1} - การติดตั้ง`, photo: eq.installation.photo, note: eq.installation.note });
    if (eq.external?.photo) photos.push({ label: `บริภัณฑ์: ${eq.name || idx+1} - สภาพภายนอก`, photo: eq.external.photo, note: eq.external.note });
  });

  return (
    <div className="espsib-report-root">

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 1 (หน้า ๑๓): ประกาศกรมสวัสดิการและคุ้มครองแรงงาน
      ══════════════════════════════════════════════════════════════════ */}
      <div className="a4-page espsib-paper espsib-paper--gazette">
        <div className="gazette-top-right">หน้า ๑๓</div>
        <div className="gazette-header-box">
          <div className="gazette-border-line" />
          <div className="gazette-meta">
            เล่ม ๑๓๒ ตอนพิเศษ ๓๕๑ ง &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ราชกิจจานุเบกษา &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ๓๐ ธันวาคม ๒๕๕๘
          </div>
          <div className="gazette-border-line" />
        </div>

        <div className="gazette-title">
          <h2>ประกาศกรมสวัสดิการและคุ้มครองแรงงาน</h2>
          <p className="gazette-sub">
            เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการจัดทำบันทึกผลการตรวจสอบและรับรอง<br />
            ระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า
          </p>
        </div>

        <div className="gazette-body">
          <p className="indent">
            อาศัยอำนาจตามความในข้อ ๑๒ แห่งกฎกระทรวงกำหนดมาตรฐานในการบริหารจัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับไฟฟ้า พ.ศ. ๒๕๕๘ อธิบดีกรมสวัสดิการและคุ้มครองแรงงาน จึงออกประกาศไว้ ดังต่อไปนี้
          </p>
          <p className="indent">
            <strong>ข้อ ๑</strong> &nbsp;ประกาศนี้ให้ใช้บังคับตั้งแต่วันถัดจากวันประกาศในราชกิจจานุเบกษาเป็นต้นไป
          </p>
          <p className="indent">
            <strong>ข้อ ๒</strong> &nbsp;ให้นายจ้างจัดให้มีการตรวจสอบและจัดให้มีการบำรุงรักษาระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าของสถานประกอบกิจการเพื่อให้ใช้งานได้อย่างปลอดภัยอย่างน้อยปีละหนึ่งครั้ง และจัดทำบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า ตามแบบท้ายประกาศนี้
          </p>
          <p className="indent">
            กรณีนายจ้างได้ดำเนินการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าตามกฎหมายว่าด้วยโรงงานหรือกฎหมายว่าด้วยการควบคุมอาคาร โดยมีวิศวกรไฟฟ้าเป็นผู้บันทึกผลการตรวจสอบ ให้ถือว่าเป็นการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าตามประกาศฉบับนี้ ทั้งนี้ ผู้จัดทำบันทึกผลการตรวจสอบและรับรองต้องเป็นบุคคลที่ขึ้นทะเบียนตามมาตรา ๙ หรือเป็นนิติบุคคลที่ได้รับใบอนุญาตตามมาตรา ๑๑ แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔ แล้วแต่กรณี
          </p>
          <p className="indent">
            <strong>ข้อ ๓</strong> &nbsp;ให้นายจ้างแจ้งผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าต่อพนักงานตรวจความปลอดภัยในเขตพื้นที่รับผิดชอบภายในสิบห้าวันนับแต่วันที่ตรวจสอบ
          </p>
        </div>

        <div className="gazette-sign-block">
          <p>ประกาศ ณ วันที่ ๒๔ ธันวาคม พ.ศ. ๒๕๕๘</p>
          <p className="name">พรรณี ศรียุทธศักดิ์</p>
          <p>อธิบดีกรมสวัสดิการและคุ้มครองแรงงาน</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 2: แบบบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าฯ
      ══════════════════════════════════════════════════════════════════ */}
      <div className="a4-page espsib-paper espsib-paper--page2 page-break">
        <div className="form-header-center">
          <h2 className="form-h2">บันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า</h2>
          <h3 className="form-h3">กรมสวัสดิการและคุ้มครองแรงงาน กระทรวงแรงงาน</h3>
        </div>

        <div className="tmpl-body" style={{ marginTop: '16pt' }}>
          <p className="doc-line indent">
            ข้าพเจ้า <Dot value={inspector.name} minWidth={260} />
            อายุ <Dot value={inspector.age} minWidth={40} /> ปี
          </p>
          <p className="doc-line">
            ที่อยู่เลขที่ <Dot value={inspector.address} minWidth={60} />
            &nbsp;หมู่ที่ <Dot value={inspector.moo} minWidth={40} />
            &nbsp;ตรอก/ซอย <Dot value={inspector.soi} minWidth={110} />
            &nbsp;ถนน <Dot value={inspector.road} minWidth={140} />
          </p>
          <p className="doc-line">
            แขวง/ตำบล <Dot value={inspector.subdistrict} minWidth={130} />
            &nbsp;เขต/อำเภอ <Dot value={inspector.district} minWidth={130} />
            &nbsp;จังหวัด <Dot value={inspector.province} minWidth={130} />
          </p>
          <p className="doc-line">
            โทรศัพท์ <Dot value={inspector.phone} minWidth={130} />
            &nbsp;ได้รับใบอนุญาตเป็นผู้ประกอบวิชาชีพวิศวกรรมควบคุม ระดับ <Dot value={inspector.licenseLevel} minWidth={160} />
          </p>
          <p className="doc-line">
            สาขาวิศวกรรมไฟฟ้า แขนงไฟฟ้ากำลัง ตามกฎหมายว่าด้วยวิศวกร เลขทะเบียน <Dot value={inspector.licenseNo} minWidth={180} />
          </p>
          <p className="doc-line">
            ตั้งแต่วันที่ <Dot value={inspector.licenseStart} minWidth={110} />
            &nbsp;ถึงวันที่ <Dot value={inspector.licenseEnd} minWidth={110} />
            &nbsp;และไม่อยู่ในระหว่างถูกสั่งพักหรือเพิกถอนใบอนุญาตดังกล่าว
          </p>
          <p className="doc-line">
            พร้อมแนบสำเนาใบอนุญาตมาด้วยแล้ว โดย
          </p>

          <div style={{ margin: '6pt 0 6pt 24pt' }}>
            <p className="doc-line">
              <CircleOpt checked={inspector.certType === 'sec9'} label="ได้ขึ้นทะเบียนตามมาตรา ๙ หรือ" />
            </p>
            <p className="doc-line">
              <CircleOpt checked={inspector.certType === 'sec11'} label="ได้รับใบอนุญาตตามมาตรา ๑๑ (ในนามนิติบุคคล" />
              &nbsp;<Dot value={inspector.juristicName} minWidth={220} /> )
            </p>
          </div>

          <p className="doc-line">
            แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔ ทะเบียนหรือ
          </p>
          <p className="doc-line">
            ใบอนุญาต เลขที่ <Dot value={inspector.certNo} minWidth={130} />
            &nbsp;ตั้งแต่วันที่ <Dot value={inspector.certStart} minWidth={110} />
            &nbsp;ถึงวันที่ <Dot value={inspector.certEnd} minWidth={110} />
          </p>

          <p className="doc-line indent" style={{ marginTop: '10pt' }}>
            ข้าพเจ้าได้ดำเนินการตรวจสอบระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าของสถานประกอบกิจการ
          </p>
          <p className="doc-line">
            ชื่อสถานประกอบกิจการ <Dot value={workplace.name} minWidth={450} />
          </p>
          <p className="doc-line">
            ประกอบกิจการ <Dot value={workplace.businessType} minWidth={485} />
          </p>
          <p className="doc-line">
            ชื่อนายจ้าง/ผู้กระทำแทน <Dot value={workplace.employerName} minWidth={440} />
          </p>
          <p className="doc-line">
            ตั้งอยู่เลขที่ <Dot value={workplace.address} minWidth={60} />
            &nbsp;หมู่ที่ <Dot value={workplace.moo} minWidth={40} />
            &nbsp;ตรอก/ซอย <Dot value={workplace.soi} minWidth={110} />
            &nbsp;ถนน <Dot value={workplace.road} minWidth={140} />
          </p>
          <p className="doc-line">
            แขวง/ตำบล <Dot value={workplace.subdistrict} minWidth={130} />
            &nbsp;เขต/อำเภอ <Dot value={workplace.district} minWidth={130} />
            &nbsp;จังหวัด <Dot value={workplace.province} minWidth={130} />
          </p>
          <p className="doc-line">
            โทรศัพท์ <Dot value={workplace.phone} minWidth={160} />
            &nbsp;เมื่อวันที่ <Dot value={workplace.inspectionDate || data.date} minWidth={180} />
          </p>

          <p className="doc-line indent" style={{ marginTop: '10pt' }}>
            ข้าพเจ้าขอรับรองว่าระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าของสถานประกอบกิจการแห่งนี้ สามารถใช้งานได้อย่างปลอดภัยตามรายละเอียดและเงื่อนไขของการตรวจสอบ และเอกสารแนบเพิ่มเติม (ถ้ามี) ทั้งนี้ต้องมีการใช้งานอย่างถูกวิธีและมีการบำรุงรักษาตามหลักวิชาการ ข้าพเจ้าจึงลงลายมือชื่อไว้เป็นหลักฐาน
          </p>

          <div className="dual-sign-row">
            <div className="sign-col">
              <div className="sign-canvas-img">
                {inspector.signature ? <img src={inspector.signature} alt="ลายเซ็น" /> : null}
              </div>
              <p>ลงชื่อ ................................................................</p>
              <p>( <span className="sign-name-text">{inspector.name || '................................................................'}</span> )</p>
              <p className="sign-role">วิศวกรผู้ตรวจสอบ</p>
            </div>

            <div className="sign-col">
              <div className="sign-canvas-img">
                {workplace.employerSignature ? <img src={workplace.employerSignature} alt="ลายเซ็น" /> : null}
              </div>
              <p>ลงชื่อ ................................................................</p>
              <p>( <span className="sign-name-text">{workplace.employerName || '................................................................'}</span> )</p>
              <p className="sign-role">นายจ้าง/ผู้กระทำแทน</p>
            </div>
          </div>

          <div className="form-footer-note">
            <strong>หมายเหตุ</strong> วิศวกรผู้ตรวจสอบ หมายถึง วิศวกรตามคำนิยาม “วิศวกร” ในกฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับไฟฟ้า พ.ศ. ๒๕๕๘ เป็นผู้ตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าจนกว่าจะได้มีบุคคลที่ขึ้นทะเบียนตามมาตรา ๙ หรือนิติบุคคลที่ได้รับใบอนุญาตตามมาตรา ๑๑ แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 3 (หน้า -๒-): ๑. ข้อมูลทั่วไป & ๒.๑.๑ สายอากาศ
      ══════════════════════════════════════════════════════════════════ */}
      {highVoltageSystems.map((hv, hIdx) => (
        <div key={`page3_${hv.id || hIdx}`} className="a4-page espsib-paper espsib-paper--table page-break">
          <div className="paper-page-num">-๒-</div>

          <div className="section-indent-box">
            <div className="section-hdr-txt">๑. ข้อมูลทั่วไป</div>
            <div className="tmpl-body">
              <p className="doc-line">
                - ระบบไฟฟ้าที่ใช้ในสถานประกอบกิจการ <Dot value={general.voltage} minWidth={70} /> โวลต์ <Dot value={general.phase} minWidth={35} /> เฟส <Dot value={general.wires} minWidth={35} /> สาย
              </p>
              <p className="doc-line">
                - ขนาดเครื่องวัดหน่วยไฟฟ้า <Dot value={general.meterAmp} minWidth={70} /> แอมแปร์ <Dot value={general.meterVolt} minWidth={70} /> โวลต์ <Dot value={general.meterPhase} minWidth={35} /> เฟส <Dot value={general.meterWires} minWidth={35} /> สาย
              </p>
              <p className="doc-line" style={{ paddingLeft: '14pt' }}>
                หมายเลขเครื่องวัด <Dot value={general.meterNo} minWidth={300} />
              </p>
              <p className="doc-line">
                - ปริมาณการใช้พลังไฟฟ้าสูงสุดในรอบ ๑๒ เดือน ที่ผ่านมา <Dot value={general.peakKw12Months} minWidth={140} /> กิโลวัตต์
              </p>
              <p className="doc-line">
                - หม้อแปลงกำลัง จำนวน <Dot value={general.transformerCount} minWidth={50} /> เครื่อง รวม <Dot value={general.transformerTotalKva} minWidth={120} /> เควีเอ
              </p>
              <p className="doc-line">
                - เครื่องกำเนิดไฟฟ้า/เครื่องกำเนิดไฟฟ้าสำรอง จำนวน <Dot value={general.generatorCount} minWidth={50} /> เครื่อง รวม <Dot value={general.generatorTotalKva} minWidth={120} /> เควีเอ
              </p>
              <p className="doc-line">
                - ผู้รับผิดชอบระบบไฟฟ้า ๑. <Dot value={general.responsiblePerson1?.name} minWidth={180} /> ตำแหน่ง <Dot value={general.responsiblePerson1?.position} minWidth={140} />
              </p>
              <p className="doc-line" style={{ paddingLeft: '120pt' }}>
                ๒. <Dot value={general.responsiblePerson2?.name} minWidth={180} /> ตำแหน่ง <Dot value={general.responsiblePerson2?.position} minWidth={140} />
              </p>
              <p className="doc-line">
                - แบบการติดตั้งระบบไฟฟ้าจริง (As built Drawing)
              </p>
              <p className="doc-line" style={{ paddingLeft: '14pt' }}>
                <CircleOpt checked={general.asBuiltDrawing === 'yes'} label="มี" />
                &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                <CircleOpt checked={general.asBuiltDrawing === 'no'} label="ไม่มี เหตุผล" />
                &nbsp;<Dot value={general.asBuiltReason} minWidth={300} />
              </p>
            </div>

            <div className="section-hdr-txt" style={{ marginTop: '12pt' }}>๒. รายการตรวจสอบ</div>
          </div>

          <table className="tmpl-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>อุปกรณ์</th>
                <th style={{ width: '38%' }}>รายการตรวจสอบ</th>
                <th style={{ width: '7%' }}>ใช้ได้</th>
                <th style={{ width: '12%' }}>ควรปรับปรุง</th>
                <th style={{ width: '10%' }}>ต้องแก้ไข</th>
                <th style={{ width: '20%' }}>คำแนะนำ/ความเห็น</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowSpan={9} className="bold-cell top-cell">
                  ๒.๑ แรงสูง {highVoltageSystems.length > 1 ? `(ชุดที่ ${hIdx+1})` : ''}
                </td>
                <td className="bold-cell" colSpan={5} style={{ background: '#fafafa' }}>
                  ๒.๑.๑ สายอากาศ : <Dot value={hv.aerialName} minWidth={220} />
                </td>
              </tr>
              {[
                { key: 'pole', label: '- สภาพเสา' },
                { key: 'poleTop', label: '- การประกอบอุปกรณ์หัวเสา' },
                { key: 'guyWire', label: '- สายยึดโยง (Guy Wire)' },
                { key: 'stringing', label: '- การพาดสาย (สภาพสาย ระยะหย่อนยาน)' },
                { key: 'clearance', label: '- ระยะห่างของสายกับอาคาร สิ่งก่อสร้าง หรือต้นไม้' },
                { key: 'lightning', label: '- การติดตั้งล่อฟ้าและสภาพ' },
                { key: 'joints', label: '- สภาพของจุดต่อสาย' },
                { key: 'grounding', label: '- การต่อลงดินและสภาพ' },
              ].map(({ key, label }) => {
                const item = hv.aerial?.[key] || {};
                return (
                  <tr key={key}>
                    <td>{label}</td>
                    <td className="c"><StatusMark status={item.status} target="pass" /></td>
                    <td className="c"><StatusMark status={item.status} target="improve" /></td>
                    <td className="c"><StatusMark status={item.status} target="fix" /></td>
                    <td className="note-cell">{item.note || ''}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 4 (หน้า -๓-): เครื่องปลดวงจร & ข้อมูลหม้อแปลง
      ══════════════════════════════════════════════════════════════════ */}
      {transformers.map((tf, tIdx) => {
        const hv = highVoltageSystems[tIdx] || highVoltageSystems[0] || {};
        return (
          <div key={`page4_${tf.id || tIdx}`} className="a4-page espsib-paper espsib-paper--table page-break">
            <div className="paper-page-num">-๓-</div>

            <table className="tmpl-table">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>อุปกรณ์</th>
                  <th style={{ width: '38%' }}>รายการตรวจสอบ</th>
                  <th style={{ width: '7%' }}>ใช้ได้</th>
                  <th style={{ width: '12%' }}>ควรปรับปรุง</th>
                  <th style={{ width: '10%' }}>ต้องแก้ไข</th>
                  <th style={{ width: '20%' }}>คำแนะนำ/ความเห็น</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={6} className="top-cell"></td>
                  <td className="bold-cell" colSpan={5} style={{ background: '#fafafa' }}>
                    ๒.๑.๒ การติดตั้งเครื่องปลดวงจรต้นทาง (ส่วนของผู้ใช้ไฟ) :
                  </td>
                </tr>
                {[
                  { key: 'dropFuse', label: '- ดรอปฟิวส์คัตเอาท์' },
                  { key: 'disconnectSwitch', label: '- สวิตช์ตัดตอน (Disconnecting Switch)' },
                  { key: 'rmu', label: '- RMU' },
                  { key: 'other', label: `- อื่นๆ ${hv.disconnectors?.otherText || ''}` },
                ].map(({ key, label }) => {
                  const item = hv.disconnectors?.[key] || {};
                  return (
                    <tr key={key}>
                      <td>{label}</td>
                      <td className="c"><StatusMark status={item.status} target="pass" /></td>
                      <td className="c"><StatusMark status={item.status} target="improve" /></td>
                      <td className="c"><StatusMark status={item.status} target="fix" /></td>
                      <td className="note-cell">{item.note || ''}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td>๒.๑.๓ อื่นๆ : {hv.otherText || ''}</td>
                  <td className="c"><StatusMark status={hv.other?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={hv.other?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={hv.other?.status} target="fix" /></td>
                  <td className="note-cell">{hv.other?.note || ''}</td>
                </tr>

                {/* ๒.๒ หม้อแปลง */}
                <tr>
                  <td rowSpan={3} className="bold-cell top-cell">๒.๒ หม้อแปลง</td>
                  <td colSpan={5} className="inner-spec-cell">
                    <p className="doc-line bold-txt">๒.๒.๑ หม้อแปลงลูกที่ <Dot value={tf.no || tIdx+1} minWidth={40} /></p>
                    <p className="doc-line">
                      ขนาด <Dot value={tf.kva} minWidth={60} /> kVA แรงดัน <Dot value={tf.voltage} minWidth={60} /> V
                    </p>
                    <p className="doc-line">
                      Impedance Voltage <Dot value={tf.impedance} minWidth={60} /> %
                    </p>
                    <p className="doc-line">
                      ชนิด &nbsp;
                      <CircleOpt checked={tf.type === 'Oil'} label="Oil" />
                      &nbsp;&nbsp;&nbsp;&nbsp;
                      <CircleOpt checked={tf.type === 'Dry'} label="Dry" />
                      &nbsp;&nbsp;&nbsp;&nbsp;
                      <CircleOpt checked={tf.type === 'other'} label="อื่นๆ" />
                      &nbsp;<Dot value={tf.typeOther} minWidth={100} />
                    </p>
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="inner-spec-cell">
                    <p className="doc-line bold-txt">๒.๒.๒ การติดตั้ง</p>
                    <p className="doc-line">
                      <CircleOpt checked={tf.installType === 'sitting'} label="นั่งร้าน" />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <CircleOpt checked={tf.installType === 'hanging'} label="แบบแขวน" />
                    </p>
                    <p className="doc-line">
                      <CircleOpt checked={tf.installType === 'yard'} label="ลานหม้อแปลง" />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                      <CircleOpt checked={tf.installType === 'room'} label="ในห้องหม้อแปลง" />
                    </p>
                    <p className="doc-line">
                      <CircleOpt checked={tf.installType === 'other'} label="อื่นๆ" />
                      &nbsp;<Dot value={tf.installTypeOther} minWidth={140} />
                    </p>
                  </td>
                </tr>
                <tr>
                  <td colSpan={5} className="inner-spec-cell">
                    <p className="doc-line bold-txt">๒.๒.๓ เครื่องป้องกันกระแสเกินด้านไฟเข้า</p>
                    <p className="doc-line">
                      แบบ <Dot value={tf.primaryProtection?.type} minWidth={220} />
                    </p>
                    <p className="doc-line">
                      พิกัดกระแส <Dot value={tf.primaryProtection?.amp} minWidth={80} /> A
                    </p>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 5 (หน้า -๔-): รายการตรวจสอบหม้อแปลง
      ══════════════════════════════════════════════════════════════════ */}
      {transformers.map((tf, tIdx) => {
        const it = tf.items || {};
        return (
          <div key={`page5_${tf.id || tIdx}`} className="a4-page espsib-paper espsib-paper--table page-break">
            <div className="paper-page-num">-๔-</div>

            <table className="tmpl-table">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>อุปกรณ์</th>
                  <th style={{ width: '38%' }}>รายการตรวจสอบ</th>
                  <th style={{ width: '7%' }}>ใช้ได้</th>
                  <th style={{ width: '12%' }}>ควรปรับปรุง</th>
                  <th style={{ width: '10%' }}>ต้องแก้ไข</th>
                  <th style={{ width: '20%' }}>คำแนะนำ/ความเห็น</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={19} className="bold-cell top-cell">
                    หม้อแปลง<br />(ลูกที่ {tf.no || tIdx+1})
                  </td>
                  <td>๒.๒.๔ การต่อสายแรงต่ำและแรงสูงที่หม้อแปลง</td>
                  <td className="c"><StatusMark status={it.wiring?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.wiring?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.wiring?.status} target="fix" /></td>
                  <td className="note-cell">{it.wiring?.note || ''}</td>
                </tr>
                <tr>
                  <td>๒.๒.๕ การติดตั้งล่อฟ้าแรงสูง (Lightning Arrester)</td>
                  <td className="c"><StatusMark status={it.lightningArrester?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.lightningArrester?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.lightningArrester?.status} target="fix" /></td>
                  <td className="note-cell">{it.lightningArrester?.note || ''}</td>
                </tr>
                <tr>
                  <td>๒.๒.๖ การติดตั้งดรอปฟิวส์คัตเอาท์</td>
                  <td className="c"><StatusMark status={it.dropFuse?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.dropFuse?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.dropFuse?.status} target="fix" /></td>
                  <td className="note-cell">{it.dropFuse?.note || ''}</td>
                </tr>
                <tr>
                  <td>๒.๒.๗ การป้องกันการสัมผัสส่วนที่มีไฟฟ้า</td>
                  <td className="c"><StatusMark status={it.touchProtection?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.touchProtection?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.touchProtection?.status} target="fix" /></td>
                  <td className="note-cell">{it.touchProtection?.note || ''}</td>
                </tr>
                <tr>
                  <td>๒.๒.๘ สายดินกับตัวถังหม้อแปลงและล่อฟ้าแรงสูง</td>
                  <td className="c"><StatusMark status={it.bodyGround?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.bodyGround?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.bodyGround?.status} target="fix" /></td>
                  <td className="note-cell">{it.bodyGround?.note || ''}</td>
                </tr>

                {/* ๒.๒.๙ */}
                <tr>
                  <td colSpan={5} className="sub-cat-row">๒.๒.๙ สายดินของหม้อแปลง</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพหลักดินและจุดต่อ</td>
                  <td className="c"><StatusMark status={it.groundRod?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.groundRod?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.groundRod?.status} target="fix" /></td>
                  <td className="note-cell">{it.groundRod?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>
                    - สายต่อหลักดิน ชนิด <Dot value={it.groundRod?.wireType} minWidth={60} /> ขนาด <Dot value={it.groundRod?.wireSize} minWidth={50} /> mm²
                  </td>
                  <td className="c">✓</td>
                  <td className="c"></td>
                  <td className="c"></td>
                  <td className="note-cell"></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพสายดินและจุดต่อ</td>
                  <td className="c"><StatusMark status={it.groundRod?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.groundRod?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.groundRod?.status} target="fix" /></td>
                  <td className="note-cell"></td>
                </tr>

                {/* ๒.๒.๑๐ */}
                <tr>
                  <td colSpan={5} className="sub-cat-row">๒.๒.๑๐ สภาพภายนอกหม้อแปลง</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สารดูดความชื้น</td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="fix" /></td>
                  <td className="note-cell">{it.externalCondition?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพบุชชิ่ง</td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="fix" /></td>
                  <td className="note-cell"></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- ปริมาณและการรั่วซึมของน้ำมันหม้อแปลง</td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="fix" /></td>
                  <td className="note-cell"></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- อุณหภูมิหม้อแปลง</td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.externalCondition?.status} target="fix" /></td>
                  <td className="note-cell"></td>
                </tr>

                {/* ๒.๒.๑๑ */}
                <tr>
                  <td colSpan={5} className="sub-cat-row">๒.๒.๑๑ สภาพแวดล้อมหม้อแปลง</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- การระบายอากาศ</td>
                  <td className="c"><StatusMark status={it.environment?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.environment?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.environment?.status} target="fix" /></td>
                  <td className="note-cell">{it.environment?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- ความชื้น</td>
                  <td className="c"><StatusMark status={it.environment?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.environment?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.environment?.status} target="fix" /></td>
                  <td className="note-cell"></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพรั้วกั้น/ลานและการต่อลงดิน</td>
                  <td className="c"><StatusMark status={it.environment?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.environment?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.environment?.status} target="fix" /></td>
                  <td className="note-cell"></td>
                </tr>
                <tr>
                  <td>๒.๒.๑๒ อื่นๆ : {it.otherText || ''}</td>
                  <td className="c"><StatusMark status={it.other?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.other?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.other?.status} target="fix" /></td>
                  <td className="note-cell">{it.other?.note || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 6 (หน้า -๕-): ๒.๓ ตู้เมนสวิตช์ MDB
      ══════════════════════════════════════════════════════════════════ */}
      {mainSwitchboards.map((msb, mIdx) => {
        const it = msb.items || {};
        return (
          <div key={`page6_${msb.id || mIdx}`} className="a4-page espsib-paper espsib-paper--table page-break">
            <div className="paper-page-num">-๕-</div>

            <table className="tmpl-table">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>อุปกรณ์</th>
                  <th style={{ width: '38%' }}>รายการตรวจสอบ</th>
                  <th style={{ width: '7%' }}>ใช้ได้</th>
                  <th style={{ width: '12%' }}>ควรปรับปรุง</th>
                  <th style={{ width: '10%' }}>ต้องแก้ไข</th>
                  <th style={{ width: '20%' }}>คำแนะนำ/ความเห็น</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={15} className="bold-cell top-cell">
                    ๒.๓ ตู้เมน<br />สวิตช์
                  </td>
                  <td colSpan={5} className="inner-spec-cell">
                    <p className="doc-line bold-txt">๒.๓.๑ ตู้เมนสวิตช์ที่ <Dot value={msb.no || mIdx+1} minWidth={40} /></p>
                    <p className="doc-line">
                      รับจากหม้อแปลงที่ <Dot value={msb.sourceTransformer || '1'} minWidth={40} />
                    </p>
                    <p className="doc-line">
                      <CircleOpt checked={msb.locationType === 'outdoor'} label="ติดตั้งภายนอกอาคาร" />
                    </p>
                    <p className="doc-line">
                      <CircleOpt checked={msb.locationType === 'indoor'} label="ติดตั้งภายในอาคาร" />
                    </p>
                    <p className="doc-line">
                      <CircleOpt checked={msb.locationType === 'other'} label="อื่นๆ" />
                      &nbsp;<Dot value={msb.locationOther} minWidth={140} />
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพทั่วไป</td>
                  <td className="c"><StatusMark status={it.generalCondition?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.generalCondition?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.generalCondition?.status} target="fix" /></td>
                  <td className="note-cell">{it.generalCondition?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- จุดต่อสายและจุดต่อบัสบาร์</td>
                  <td className="c"><StatusMark status={it.busbarJoints?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.busbarJoints?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.busbarJoints?.status} target="fix" /></td>
                  <td className="note-cell">{it.busbarJoints?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งตู้เมนสวิตช์</td>
                  <td className="c"><StatusMark status={it.workingSpace?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.workingSpace?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.workingSpace?.status} target="fix" /></td>
                  <td className="note-cell">{it.workingSpace?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน</td>
                  <td className="c"><StatusMark status={it.lighting?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.lighting?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.lighting?.status} target="fix" /></td>
                  <td className="note-cell">{it.lighting?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- การต่อฝาก</td>
                  <td className="c"><StatusMark status={it.bonding?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.bonding?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.bonding?.status} target="fix" /></td>
                  <td className="note-cell">{it.bonding?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- การป้องกันส่วนสัมผัสที่มีไฟฟ้า</td>
                  <td className="c"><StatusMark status={it.livePartProtection?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.livePartProtection?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.livePartProtection?.status} target="fix" /></td>
                  <td className="note-cell">{it.livePartProtection?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- ป้ายชื่อและแผนภาพเส้นเดี่ยว (Single Line Diagram) ของเมนสวิตช์</td>
                  <td className="c"><StatusMark status={it.singleLineDiagram?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.singleLineDiagram?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.singleLineDiagram?.status} target="fix" /></td>
                  <td className="note-cell">{it.singleLineDiagram?.note || ''}</td>
                </tr>

                {/* ๒.๓.๒ */}
                <tr>
                  <td colSpan={5} className="inner-spec-cell">
                    <p className="doc-line bold-txt">๒.๓.๒ เครื่องป้องกันกระแสเกิน</p>
                    <p className="doc-line">
                      ชนิด <Dot value={msb.overcurrentProtection?.type} minWidth={140} />
                    </p>
                    <p className="doc-line">
                      IC <Dot value={msb.overcurrentProtection?.icKa} minWidth={60} /> kA
                      &nbsp;&nbsp;แรงดัน <Dot value={msb.overcurrentProtection?.volt} minWidth={60} /> V
                    </p>
                    <p className="doc-line">
                      พิกัดกระแส AT <Dot value={msb.overcurrentProtection?.atAmp} minWidth={60} /> A
                      &nbsp;&nbsp;AF <Dot value={msb.overcurrentProtection?.afAmp} minWidth={60} /> A
                    </p>
                  </td>
                </tr>

                {/* ๒.๓.๓ */}
                <tr>
                  <td colSpan={5} className="sub-cat-row">๒.๓.๓ สายดินของแผงสวิตช์</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพหลักดินและจุดต่อ</td>
                  <td className="c"><StatusMark status={msb.grounding?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={msb.grounding?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={msb.grounding?.status} target="fix" /></td>
                  <td className="note-cell">{msb.grounding?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>
                    - สายต่อหลักดิน ชนิด <Dot value={msb.grounding?.wireType} minWidth={60} /> ขนาด <Dot value={msb.grounding?.wireSize} minWidth={50} /> mm²
                  </td>
                  <td className="c">✓</td>
                  <td className="c"></td>
                  <td className="c"></td>
                  <td className="note-cell"></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพสายดินและจุดต่อ</td>
                  <td className="c"><StatusMark status={msb.grounding?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={msb.grounding?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={msb.grounding?.status} target="fix" /></td>
                  <td className="note-cell"></td>
                </tr>

                {/* ๒.๓.๔ */}
                <tr>
                  <td>
                    ๒.๓.๔ อุณหภูมิของอุปกรณ์<br />
                    &nbsp;&nbsp;<CircleOpt checked={msb.temperature === 'normal'} label="ปกติ" />
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <CircleOpt checked={msb.temperature === 'abnormal'} label="ผิดปกติ" />
                  </td>
                  <td className="c"><StatusMark status={msb.temperature === 'normal' ? 'pass' : 'fix'} target="pass" /></td>
                  <td className="c"></td>
                  <td className="c"><StatusMark status={msb.temperature === 'normal' ? 'pass' : 'fix'} target="fix" /></td>
                  <td className="note-cell">{msb.temperatureNote || ''}</td>
                </tr>
                <tr>
                  <td>๒.๓.๕ อื่นๆ : {msb.otherText || ''}</td>
                  <td className="c"><StatusMark status={msb.other?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={msb.other?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={msb.other?.status} target="fix" /></td>
                  <td className="note-cell">{msb.other?.note || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 7 (หน้า -๖-): ๒.๔.๑ วงจรเมน (Main Circuit)
      ══════════════════════════════════════════════════════════════════ */}
      {mainCircuits.map((mc, cIdx) => (
        <div key={`page7_${mc.id || cIdx}`} className="a4-page espsib-paper espsib-paper--table page-break">
          <div className="paper-page-num">-๖-</div>

          <table className="tmpl-table">
            <thead>
              <tr>
                <th style={{ width: '13%' }}>อุปกรณ์</th>
                <th style={{ width: '38%' }}>รายการตรวจสอบ</th>
                <th style={{ width: '7%' }}>ใช้ได้</th>
                <th style={{ width: '12%' }}>ควรปรับปรุง</th>
                <th style={{ width: '10%' }}>ต้องแก้ไข</th>
                <th style={{ width: '20%' }}>คำแนะนำ/ความเห็น</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td rowSpan={7} className="bold-cell top-cell">
                  ๒.๔ แรงต่ำ<br />ภายในอาคาร
                </td>
                <td colSpan={5} className="inner-spec-cell">
                  <p className="doc-line bold-txt">๒.๔.๑ วงจรเมน (Main Circuit) {mainCircuits.length > 1 ? `(ชุดที่ ${cIdx+1})` : ''}</p>
                  <p className="doc-line bold-txt">๒.๔.๑.๑ สายเข้าเมนสวิตช์</p>
                  <p className="doc-line" style={{ paddingLeft: '10pt' }}>
                    - สายเฟส ชนิด <Dot value={mc.phaseWire?.type} minWidth={70} /> ขนาด <Dot value={mc.phaseWire?.size} minWidth={50} /> mm²
                  </p>
                  <p className="doc-line" style={{ paddingLeft: '10pt' }}>
                    - สายนิวทรัล ชนิด <Dot value={mc.neutralWire?.type} minWidth={70} /> ขนาด <Dot value={mc.neutralWire?.size} minWidth={50} /> mm²
                  </p>
                  <p className="doc-line">
                    เดินใน &nbsp;
                    <CircleOpt checked={mc.raceway === 'conduit'} label="ท่อร้อยสาย (Conduit)" />
                  </p>
                  <p className="doc-line" style={{ paddingLeft: '32pt' }}>
                    <CircleOpt checked={mc.raceway === 'wireway'} label="รางเดินสาย (Wire Way)" />
                  </p>
                  <p className="doc-line" style={{ paddingLeft: '32pt' }}>
                    <CircleOpt checked={mc.raceway === 'cabletray'} label="รางเคเบิล (Cable Tray)" />
                    &nbsp;แบบ <Dot value={mc.racewayOther} minWidth={80} />
                  </p>
                  <p className="doc-line" style={{ paddingLeft: '32pt' }}>
                    <CircleOpt checked={mc.raceway === 'rack'} label="ลูกถ้วยราวยึดสาย (Rack)" />
                  </p>
                  <p className="doc-line" style={{ paddingLeft: '32pt' }}>
                    <CircleOpt checked={mc.raceway === 'other'} label="อื่นๆ" />
                    &nbsp;<Dot value={mc.racewayOther} minWidth={100} />
                  </p>
                </td>
              </tr>
              <tr>
                <td>
                  ๒.๔.๑.๒ รางเดินสายและรางเคเบิล<br />
                  &nbsp;&nbsp;- สภาพการติดตั้งและใช้งาน<br />
                  &nbsp;&nbsp;- ความต่อเนื่องทางไฟฟ้า การต่อฝากและการต่อลงดิน
                </td>
                <td className="c"><StatusMark status={mc.items?.racewayCondition?.status} target="pass" /></td>
                <td className="c"><StatusMark status={mc.items?.racewayCondition?.status} target="improve" /></td>
                <td className="c"><StatusMark status={mc.items?.racewayCondition?.status} target="fix" /></td>
                <td className="note-cell">{mc.items?.racewayCondition?.note || ''}</td>
              </tr>
              <tr>
                <td>๒.๔.๑.๓ สภาพฉนวนสายไฟ</td>
                <td className="c"><StatusMark status={mc.items?.insulation?.status} target="pass" /></td>
                <td className="c"><StatusMark status={mc.items?.insulation?.status} target="improve" /></td>
                <td className="c"><StatusMark status={mc.items?.insulation?.status} target="fix" /></td>
                <td className="note-cell">{mc.items?.insulation?.note || ''}</td>
              </tr>
              <tr>
                <td>๒.๔.๑.๔ สภาพจุดต่อของสาย</td>
                <td className="c"><StatusMark status={mc.items?.joints?.status} target="pass" /></td>
                <td className="c"><StatusMark status={mc.items?.joints?.status} target="improve" /></td>
                <td className="c"><StatusMark status={mc.items?.joints?.status} target="fix" /></td>
                <td className="note-cell">{mc.items?.joints?.note || ''}</td>
              </tr>
              <tr>
                <td>๒.๔.๑.๕ การป้องกันความร้อนจากการเหนี่ยวนำ</td>
                <td className="c"><StatusMark status={mc.items?.inductionHeatProtection?.status} target="pass" /></td>
                <td className="c"><StatusMark status={mc.items?.inductionHeatProtection?.status} target="improve" /></td>
                <td className="c"><StatusMark status={mc.items?.inductionHeatProtection?.status} target="fix" /></td>
                <td className="note-cell">{mc.items?.inductionHeatProtection?.note || ''}</td>
              </tr>
              <tr>
                <td>
                  ๒.๔.๑.๖ อุณหภูมิของอุปกรณ์<br />
                  &nbsp;&nbsp;<CircleOpt checked={mc.temperature === 'normal'} label="ปกติ" />
                  &nbsp;&nbsp;&nbsp;&nbsp;
                  <CircleOpt checked={mc.temperature === 'abnormal'} label="ผิดปกติ" />
                </td>
                <td className="c"><StatusMark status={mc.temperature === 'normal' ? 'pass' : 'fix'} target="pass" /></td>
                <td className="c"></td>
                <td className="c"><StatusMark status={mc.temperature === 'normal' ? 'pass' : 'fix'} target="fix" /></td>
                <td className="note-cell">{mc.temperatureNote || ''}</td>
              </tr>
              <tr>
                <td>๒.๔.๑.๗ อื่นๆ : {mc.otherText || ''}</td>
                <td className="c"><StatusMark status={mc.other?.status} target="pass" /></td>
                <td className="c"><StatusMark status={mc.other?.status} target="improve" /></td>
                <td className="c"><StatusMark status={mc.other?.status} target="fix" /></td>
                <td className="note-cell">{mc.other?.note || ''}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 8 (หน้า -๗-): ๒.๔.๒ แผงย่อย (Sub Panel / DB)
      ══════════════════════════════════════════════════════════════════ */}
      {subPanels.map((sp, sIdx) => {
        const it = sp.items || {};
        return (
          <div key={`page8_${sp.id || sIdx}`} className="a4-page espsib-paper espsib-paper--table page-break">
            <div className="paper-page-num">-๗-</div>

            <table className="tmpl-table">
              <thead>
                <tr>
                  <th style={{ width: '13%' }}>อุปกรณ์</th>
                  <th style={{ width: '38%' }}>รายการตรวจสอบ</th>
                  <th style={{ width: '7%' }}>ใช้ได้</th>
                  <th style={{ width: '12%' }}>ควรปรับปรุง</th>
                  <th style={{ width: '10%' }}>ต้องแก้ไข</th>
                  <th style={{ width: '20%' }}>คำแนะนำ/ความเห็น</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td rowSpan={13} className="bold-cell top-cell">
                    แผงย่อย<br />(DB)
                  </td>
                  <td colSpan={5} className="inner-spec-cell">
                    <p className="doc-line bold-txt">๒.๔.๒ แผงย่อยที่ <Dot value={sp.no || sIdx+1} minWidth={40} /></p>
                    <p className="doc-line">ตำแหน่งหรือพื้นที่ติดตั้ง <Dot value={sp.location} minWidth={220} /></p>
                    <p className="doc-line">รับจากตู้เมนสวิตช์ที่ <Dot value={sp.sourceMdb || '1'} minWidth={40} /></p>
                    <p className="doc-line bold-txt">๒.๔.๒.๑ การติดตั้ง</p>
                    <p className="doc-line">
                      <CircleOpt checked={sp.locationType === 'outdoor'} label="ภายนอกอาคาร" />
                    </p>
                    <p className="doc-line">
                      <CircleOpt checked={sp.locationType === 'indoor'} label="ภายในอาคาร" />
                    </p>
                    <p className="doc-line">
                      <CircleOpt checked={sp.locationType === 'other'} label="อื่นๆ" />
                      &nbsp;<Dot value={sp.locationOther} minWidth={140} />
                    </p>
                  </td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพทั่วไป</td>
                  <td className="c"><StatusMark status={it.generalCondition?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.generalCondition?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.generalCondition?.status} target="fix" /></td>
                  <td className="note-cell">{it.generalCondition?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- จุดต่อสาย และจุดต่อบัสบาร์</td>
                  <td className="c"><StatusMark status={it.busbarJoints?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.busbarJoints?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.busbarJoints?.status} target="fix" /></td>
                  <td className="note-cell">{it.busbarJoints?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งแผงย่อย</td>
                  <td className="c"><StatusMark status={it.workingSpace?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.workingSpace?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.workingSpace?.status} target="fix" /></td>
                  <td className="note-cell">{it.workingSpace?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน</td>
                  <td className="c"><StatusMark status={it.lighting?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.lighting?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.lighting?.status} target="fix" /></td>
                  <td className="note-cell">{it.lighting?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- การต่อฝาก</td>
                  <td className="c"><StatusMark status={it.bonding?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.bonding?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.bonding?.status} target="fix" /></td>
                  <td className="note-cell">{it.bonding?.note || ''}</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- การป้องกันส่วนสัมผัสที่มีไฟฟ้า</td>
                  <td className="c"><StatusMark status={it.livePartProtection?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={it.livePartProtection?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={it.livePartProtection?.status} target="fix" /></td>
                  <td className="note-cell">{it.livePartProtection?.note || ''}</td>
                </tr>

                {/* ๒.๔.๒.๒ */}
                <tr>
                  <td colSpan={5} className="inner-spec-cell">
                    <p className="doc-line bold-txt">๒.๔.๒.๒ เครื่องป้องกันกระแสเกินของแผงย่อย</p>
                    <p className="doc-line">
                      ชนิด <Dot value={sp.overcurrentProtection?.type} minWidth={140} />
                    </p>
                    <p className="doc-line">
                      IC <Dot value={sp.overcurrentProtection?.icKa} minWidth={60} /> kA
                      &nbsp;&nbsp;แรงดัน <Dot value={sp.overcurrentProtection?.volt} minWidth={60} /> V
                    </p>
                    <p className="doc-line">
                      พิกัดกระแส AT <Dot value={sp.overcurrentProtection?.atAmp} minWidth={60} /> A
                      &nbsp;&nbsp;AF <Dot value={sp.overcurrentProtection?.afAmp} minWidth={60} /> A
                    </p>
                  </td>
                </tr>

                {/* ๒.๔.๒.๓ */}
                <tr>
                  <td colSpan={5} className="sub-cat-row">๒.๔.๒.๓ สายดินของแผงย่อย</td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>
                    - สายดิน ชนิด <Dot value={sp.grounding?.wireType} minWidth={60} /> ขนาด <Dot value={sp.grounding?.wireSize} minWidth={50} /> mm²
                  </td>
                  <td className="c">✓</td>
                  <td className="c"></td>
                  <td className="c"></td>
                  <td className="note-cell"></td>
                </tr>
                <tr>
                  <td style={{ paddingLeft: '14pt' }}>- สภาพสายดินและจุดต่อ</td>
                  <td className="c"><StatusMark status={sp.grounding?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={sp.grounding?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={sp.grounding?.status} target="fix" /></td>
                  <td className="note-cell">{sp.grounding?.note || ''}</td>
                </tr>

                {/* ๒.๔.๒.๔ */}
                <tr>
                  <td>
                    ๒.๔.๒.๔ อุณหภูมิของอุปกรณ์<br />
                    &nbsp;&nbsp;<CircleOpt checked={sp.temperature === 'normal'} label="ปกติ" />
                    &nbsp;&nbsp;&nbsp;&nbsp;
                    <CircleOpt checked={sp.temperature === 'abnormal'} label="ผิดปกติ" />
                  </td>
                  <td className="c"><StatusMark status={sp.temperature === 'normal' ? 'pass' : 'fix'} target="pass" /></td>
                  <td className="c"></td>
                  <td className="c"><StatusMark status={sp.temperature === 'normal' ? 'pass' : 'fix'} target="fix" /></td>
                  <td className="note-cell">{sp.temperatureNote || ''}</td>
                </tr>
                <tr>
                  <td>๒.๔.๒.๕ อื่นๆ : {sp.otherText || ''}</td>
                  <td className="c"><StatusMark status={sp.other?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={sp.other?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={sp.other?.status} target="fix" /></td>
                  <td className="note-cell">{sp.other?.note || ''}</td>
                </tr>
              </tbody>
            </table>

            <div className="form-footer-note" style={{ marginTop: '14pt' }}>
              <strong>หมายเหตุ :</strong> ๑. แผงย่อย คือ แผงวงจรที่ต่อจากตู้เมนสวิตช์ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ๒. ใช้เอกสารการตรวจสอบแผงย่อย ๑ ฉบับ ต่อ ๑ แผงย่อย
            </div>
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════════
          PAGE 9 (หน้า -๘-): ๒.๕ บริภัณฑ์ไฟฟ้า & ๓. สรุปผลการตรวจสอบ
      ══════════════════════════════════════════════════════════════════ */}
      <div className="a4-page espsib-paper espsib-paper--table page-break">
        <div className="paper-page-num">-๘-</div>

        <table className="tmpl-table">
          <thead>
            <tr>
              <th style={{ width: '13%' }}>อุปกรณ์</th>
              <th style={{ width: '38%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '7%' }}>ใช้ได้</th>
              <th style={{ width: '12%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '20%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {otherEquipments.map((eq, eIdx) => (
              <tr key={eq.id || eIdx}>
                <td rowSpan={4} className="bold-cell top-cell">
                  ๒.๕ บริภัณฑ์<br />ไฟฟ้า
                </td>
                <td colSpan={5} className="bold-cell" style={{ background: '#fafafa' }}>
                  ชื่อบริภัณฑ์ไฟฟ้า <Dot value={eq.name} minWidth={260} />
                </td>
              </tr>
            ))}
            {otherEquipments.map((eq, eIdx) => (
              <>
                <tr key={`eq_inst_${eIdx}`}>
                  <td>๒.๕.๑ การติดตั้ง</td>
                  <td className="c"><StatusMark status={eq.installation?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={eq.installation?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={eq.installation?.status} target="fix" /></td>
                  <td className="note-cell">{eq.installation?.note || ''}</td>
                </tr>
                <tr key={`eq_ext_${eIdx}`}>
                  <td>๒.๕.๒ สภาพภายนอก</td>
                  <td className="c"><StatusMark status={eq.external?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={eq.external?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={eq.external?.status} target="fix" /></td>
                  <td className="note-cell">{eq.external?.note || ''}</td>
                </tr>
                <tr key={`eq_oth_${eIdx}`}>
                  <td>๒.๕.๓ อื่นๆ : {eq.otherText || ''}</td>
                  <td className="c"><StatusMark status={eq.other?.status} target="pass" /></td>
                  <td className="c"><StatusMark status={eq.other?.status} target="improve" /></td>
                  <td className="c"><StatusMark status={eq.other?.status} target="fix" /></td>
                  <td className="note-cell">{eq.other?.note || ''}</td>
                </tr>
              </>
            ))}
          </tbody>
        </table>

        <div className="form-footer-note" style={{ margin: '8pt 0 14pt' }}>
          <strong>หมายเหตุ</strong> หากมีบริภัณฑ์ไฟฟ้าอื่นที่จำเป็นต้องตรวจสอบเพิ่มเติม (เช่น มอเตอร์ไฟฟ้า ตู้เย็นหรือเครื่องทำน้ำดื่ม เครื่องทำความร้อน เครื่องเชื่อมไฟฟ้า เป็นต้น) ให้จัดทำเป็นเอกสารแนบ
        </div>

        <div className="section-indent-box">
          <div className="section-hdr-txt">๓. สรุปผลการตรวจสอบระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า</div>

          <div className="tmpl-body" style={{ margin: '8pt 0' }}>
            <p className="doc-line">
              <CircleOpt
                checked={conclusion.result === 'pass'}
                label="ใช้งานได้ ทั้งนี้ระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าต้องมีการบำรุงรักษาอย่างถูกวิธีและตามหลักวิชาการทางด้านวิศวกรรมศาสตร์"
              />
            </p>
            <p className="doc-line" style={{ marginTop: '6pt' }}>
              <CircleOpt
                checked={conclusion.result === 'repair'}
                label="ใช้งานได้ แต่ต้องแก้ไขตามรายงานการตรวจสอบภายใน"
              />
              &nbsp;<Dot value={conclusion.repairDays} minWidth={40} /> วัน
            </p>
          </div>

          <div style={{ marginTop: '12pt' }}>
            <div className="bold-txt" style={{ fontSize: '11.5pt', marginBottom: '4pt' }}>ความเห็นและข้อเสนอแนะ</div>
            <div className="suggestions-ruled-box">
              {conclusion.suggestions ? (
                <div className="suggestions-text">{conclusion.suggestions}</div>
              ) : null}
              <div className="ruled-line" />
              <div className="ruled-line" />
              <div className="ruled-line" />
              <div className="ruled-line" />
            </div>
          </div>

          <div className="final-sign-wrap">
            <div className="final-sign-col">
              <div className="sign-canvas-img">
                {(conclusion.inspectorSignature || inspector.signature) ? (
                  <img src={conclusion.inspectorSignature || inspector.signature} alt="ลายเซ็นวิศวกร" />
                ) : null}
              </div>
              <p>ลงชื่อ ................................................................</p>
              <p>( <span className="sign-name-text">{inspector.name || '................................................................'}</span> )</p>
              <p className="sign-role">วิศวกรผู้ตรวจสอบ</p>
              <p style={{ marginTop: '4pt' }}>
                วันที่ <Dot value={inspDate.d} minWidth={30} /> เดือน <Dot value={inspDate.m} minWidth={80} /> พ.ศ. <Dot value={inspDate.y} minWidth={40} />
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          PHOTO APPENDIX: ภาพถ่ายประกอบการตรวจสอบ
      ══════════════════════════════════════════════════════════════════ */}
      {photos.length > 0 && (
        <div className="a4-page espsib-paper espsib-paper--table page-break">
          <div className="form-header-center" style={{ marginBottom: '16pt' }}>
            <h2 className="form-h2">เอกสารแนบ: ภาพถ่ายประกอบการตรวจสอบระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า</h2>
            <p style={{ fontSize: '10pt', color: '#555' }}>
              {workplace.name || ''} · วันที่ {inspDate.full}
            </p>
          </div>
          <div className="appendix-photo-grid">
            {photos.map((p, idx) => (
              <div key={idx} className="appendix-card">
                <div className="appendix-img-box">
                  <img src={p.photo} alt={p.label} />
                </div>
                <div className="appendix-caption">
                  <strong>ภาพที่ {idx + 1}:</strong> {p.label}
                  {p.note && <div className="appendix-note">คำแนะนำ/ความเห็น: {p.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          AUTHENTIC TEMPLATE STYLES
      ══════════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        .espsib-report-root {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        /* ── Standard A4 Canvas ── */
        .espsib-paper {
          width: 210mm;
          max-width: 100%;
          min-height: 297mm;
          box-sizing: border-box;
          background: #ffffff;
          color: #000000;
          font-family: 'TH Sarabun New', 'Sarabun', 'Noto Sans Thai', serif;
          font-size: 11pt;
          line-height: 1.45;
          margin: 0 auto 24px auto;
          box-shadow: 0 4px 18px rgba(0, 0, 0, 0.15);
          position: relative;
        }

        /* Dedicated paddings matching official PDF template (162-164mm standard width) */
        .espsib-paper--gazette {
          padding: 25mm 28mm 25mm 28mm;
        }
        .espsib-paper--page2 {
          padding: 22mm 24mm 20mm 26mm;
        }
        .espsib-paper--table {
          padding: 18mm 22mm 16mm 24mm;
        }

        .section-indent-box {
          padding-left: 6mm;
          padding-right: 4mm;
        }

        /* ── Typography & Lines ── */
        .paper-page-num {
          text-align: center;
          font-size: 11pt;
          margin-bottom: 8pt;
        }
        .doc-line {
          margin: 3.5pt 0;
          line-height: 1.45;
          font-size: 11pt;
        }
        .indent {
          text-indent: 32pt;
        }
        .bold-txt {
          font-weight: 700;
        }
        .section-hdr-txt {
          font-size: 12pt;
          font-weight: 800;
          margin: 8pt 0 4pt;
        }

        /* ── Fill dotted styling ── */
        .tmpl-dots {
          display: inline-block;
          letter-spacing: 1.5px;
          color: #555;
          text-align: center;
          vertical-align: bottom;
        }
        .tmpl-val {
          display: inline-block;
          font-weight: 700;
          border-bottom: 1px dotted #000;
          padding: 0 4pt;
          text-align: center;
          color: #000;
          vertical-align: bottom;
        }

        /* ── Option circle ── */
        .tmpl-circle-opt {
          display: inline-flex;
          align-items: center;
          gap: 4pt;
          vertical-align: middle;
        }
        .tmpl-circle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          border: 1.2px solid #000;
          font-size: 9px;
          font-weight: 800;
          line-height: 1;
          vertical-align: middle;
        }
        .tmpl-circle--checked {
          background: #000;
          color: #fff;
        }
        .tmpl-circle-lbl {
          font-size: 11pt;
        }

        /* ── Gazette (Page 1) Header ── */
        .gazette-top-right {
          text-align: right;
          font-size: 11pt;
          margin-bottom: 6pt;
        }
        .gazette-header-box {
          margin-bottom: 18pt;
        }
        .gazette-border-line {
          height: 1px;
          background: #000;
          width: 100%;
          margin: 3pt 0;
        }
        .gazette-meta {
          text-align: center;
          font-size: 11pt;
          padding: 2pt 0;
        }
        .gazette-title {
          text-align: center;
          margin: 22pt 0 16pt;
        }
        .gazette-title h2 {
          font-size: 13.5pt;
          font-weight: 800;
          margin: 0 0 4pt;
        }
        .gazette-sub {
          font-size: 12pt;
          font-weight: 700;
          line-height: 1.4;
          margin: 0;
        }
        .gazette-body p {
          margin: 8pt 0;
          text-align: justify;
          line-height: 1.55;
        }
        .gazette-sign-block {
          text-align: center;
          margin-top: 40pt;
          line-height: 1.6;
        }
        .gazette-sign-block .name {
          font-weight: 700;
          margin: 12pt 0 2pt;
        }

        /* ── Page 2 & Form Titles ── */
        .form-header-center {
          text-align: center;
          margin-bottom: 12pt;
        }
        .form-h2 {
          font-size: 12.5pt;
          font-weight: 800;
          margin: 0 0 2pt;
        }
        .form-h3 {
          font-size: 11.5pt;
          font-weight: 700;
          margin: 0;
        }

        /* ── Signatures ── */
        .dual-sign-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24pt;
          margin-top: 24pt;
          text-align: center;
        }
        .sign-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sign-canvas-img {
          height: 44pt;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4pt;
        }
        .sign-canvas-img img {
          max-height: 42pt;
          max-width: 150pt;
          object-fit: contain;
        }
        .sign-name-text {
          font-weight: 700;
        }
        .sign-role {
          font-weight: 700;
          margin-top: 2pt;
        }

        .final-sign-wrap {
          display: flex;
          justify-content: flex-end;
          margin-top: 22pt;
        }
        .final-sign-col {
          text-align: center;
          min-width: 210pt;
        }

        .form-footer-note {
          font-size: 9pt;
          color: #333;
          margin-top: 14pt;
          line-height: 1.4;
          text-align: justify;
        }

        /* ── Authentic Table ── */
        .tmpl-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 6pt;
          font-size: 10pt;
          border: 1px solid #000;
        }
        .tmpl-table th, .tmpl-table td {
          border: 1px solid #000;
          padding: 3.5pt 5pt;
          vertical-align: middle;
        }
        .tmpl-table th {
          background: #ffffff;
          font-weight: 800;
          text-align: center;
        }
        .bold-cell {
          font-weight: 700;
        }
        .top-cell {
          vertical-align: top !important;
        }
        .inner-spec-cell {
          padding: 5pt 7pt !important;
          line-height: 1.4;
        }
        .sub-cat-row {
          font-weight: 700;
          background: #fbfbfb;
        }
        .c {
          text-align: center;
        }
        .tbl-check {
          font-size: 12pt;
          font-weight: 800;
        }
        .note-cell {
          font-size: 9pt;
          line-height: 1.25;
        }

        /* ── Suggestions ruled lines ── */
        .suggestions-ruled-box {
          position: relative;
          min-height: 75pt;
          border: 1px solid #000;
          padding: 6pt 8pt;
          background: #fff;
        }
        .suggestions-text {
          font-size: 10.5pt;
          line-height: 1.6;
          white-space: pre-wrap;
          font-weight: 600;
        }
        .ruled-line {
          border-bottom: 1px dotted #bbb;
          height: 18pt;
        }

        /* ── Appendix Photos ── */
        .appendix-photo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16pt;
        }
        .appendix-card {
          border: 1px solid #ccc;
          padding: 8pt;
          border-radius: 4pt;
          background: #fff;
          page-break-inside: avoid;
        }
        .appendix-img-box {
          height: 150pt;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8fafc;
          overflow: hidden;
        }
        .appendix-img-box img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .appendix-caption {
          font-size: 9.5pt;
          margin-top: 6pt;
          line-height: 1.35;
        }
        .appendix-note {
          color: #444;
          margin-top: 2pt;
          font-style: italic;
        }

        /* ── Print Setup ── */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          body {
            background: #ffffff !important;
            color: #000000 !important;
          }
          .espsib-paper {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            box-sizing: border-box !important;
          }
          .espsib-paper--gazette {
            padding: 25mm 28mm 25mm 28mm !important;
          }
          .espsib-paper--page2 {
            padding: 22mm 24mm 20mm 26mm !important;
          }
          .espsib-paper--table {
            padding: 18mm 22mm 16mm 24mm !important;
          }
          .page-break {
            page-break-before: always !important;
          }
          tr {
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}
