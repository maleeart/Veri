'use client';

function Checkmark({ checked }) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      border: '1.5px solid #000',
      fontSize: '11px',
      lineHeight: 1,
      fontWeight: 800,
      marginRight: '4px',
      verticalAlign: 'middle',
    }}>
      {checked ? '✓' : ''}
    </span>
  );
}

function StatusTick({ status, target }) {
  return status === target ? <span style={{ fontWeight: 800, fontSize: '12pt' }}>✓</span> : null;
}

export default function ElecReport({ data }) {
  const f = data.records?.formData || data.records || {};
  const inspector = f.inspector || {};
  const workplace = f.workplace || {};
  const general = f.general || {};
  const highVoltageSystems = f.highVoltageSystems || [];
  const transformers = f.transformers || [];
  const mainSwitchboards = f.mainSwitchboards || [];
  const mainCircuits = f.mainCircuits || [];
  const subPanels = f.subPanels || [];
  const otherEquipments = f.otherEquipments || [];
  const conclusion = f.conclusion || {};

  // Collect all photos with labels for appendix
  const photos = [];
  highVoltageSystems.forEach((hv, idx) => {
    Object.entries(hv.aerial || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `ระบบแรงสูง ชุดที่ ${idx+1} - สายอากาศ (${k})`, photo: v.photo, note: v.note });
    });
    Object.entries(hv.disconnectors || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `ระบบแรงสูง ชุดที่ ${idx+1} - เครื่องปลดวงจร (${k})`, photo: v.photo, note: v.note });
    });
    if (hv.other?.photo) photos.push({ label: `ระบบแรงสูง ชุดที่ ${idx+1} - อื่นๆ`, photo: hv.other.photo, note: hv.other.note });
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
    if (msb.temperaturePhoto) photos.push({ label: `ตู้ MDB ที่ ${msb.no || idx+1} - อุณหภูมิ`, photo: msb.temperaturePhoto, note: msb.temperatureNote });
  });
  mainCircuits.forEach((mc, idx) => {
    Object.entries(mc.items || {}).forEach(([k, v]) => {
      if (v?.photo) photos.push({ label: `วงจรเมน ชุดที่ ${idx+1} - ${k}`, photo: v.photo, note: v.note });
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
      {/* ════════ PAGE 1: ประกาศกรมสวัสดิการและคุ้มครองแรงงาน ════════ */}
      <div className="a4-page espsib-doc">
        <div style={{ textAlign: 'right', fontSize: '11pt', marginBottom: '8pt' }}>หน้า ๑๓</div>
        <div style={{ textAlign: 'center', fontSize: '12pt', marginBottom: '14pt' }}>
          เล่ม ๑๓๒ ตอนพิเศษ ๓๕๑ ง &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ราชกิจจานุเบกษา &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ๓๐ ธันวาคม ๒๕๕๘
        </div>

        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '14pt', margin: '20pt 0 6pt' }}>
          ประกาศกรมสวัสดิการและคุ้มครองแรงงาน
        </div>
        <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '12.5pt', marginBottom: '16pt' }}>
          เรื่อง หลักเกณฑ์ วิธีการ และเงื่อนไขการจัดทำบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า
        </div>

        <p className="doc-p indent">
          อาศัยอำนาจตามความในข้อ ๑๒ แห่งกฎกระทรวงกำหนดมาตรฐานในการบริหารจัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับไฟฟ้า พ.ศ. ๒๕๕๘ อธิบดีกรมสวัสดิการและคุ้มครองแรงงาน จึงออกประกาศไว้ ดังต่อไปนี้
        </p>
        <p className="doc-p indent">
          <strong>ข้อ ๑</strong> ประกาศนี้ให้ใช้บังคับตั้งแต่วันถัดจากวันประกาศในราชกิจจานุเบกษาเป็นต้นไป
        </p>
        <p className="doc-p indent">
          <strong>ข้อ ๒</strong> ให้นายจ้างจัดให้มีการตรวจสอบและจัดให้มีการบำรุงรักษาระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าของสถานประกอบกิจการเพื่อให้ใช้งานได้อย่างปลอดภัยอย่างน้อยปีละหนึ่งครั้ง และจัดทำบันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า ตามแบบท้ายประกาศนี้
        </p>
        <p className="doc-p indent">
          กรณีนายจ้างได้ดำเนินการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าตามกฎหมายว่าด้วยโรงงานหรือกฎหมายว่าด้วยการควบคุมอาคาร โดยมีวิศวกรไฟฟ้าเป็นผู้บันทึกผลการตรวจสอบ ให้ถือว่าเป็นการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าตามประกาศฉบับนี้ ทั้งนี้ ผู้จัดทำบันทึกผลการตรวจสอบและรับรองต้องเป็นบุคคลที่ขึ้นทะเบียนตามมาตรา ๙ หรือเป็นนิติบุคคลที่ได้รับใบอนุญาตตามมาตรา ๑๑ แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔ แล้วแต่กรณี
        </p>
        <p className="doc-p indent">
          <strong>ข้อ ๓</strong> ให้นายจ้างแจ้งผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าต่อพนักงานตรวจความปลอดภัยในเขตพื้นที่รับผิดชอบภายในสิบห้าวันนับแต่วันที่ตรวจสอบ
        </p>

        <div style={{ textAlign: 'center', marginTop: '40pt' }}>
          <p style={{ margin: '4pt 0' }}>ประกาศ ณ วันที่ ๒๔ ธันวาคม พ.ศ. ๒๕๕๘</p>
          <p style={{ margin: '14pt 0 4pt', fontWeight: 700 }}>พรรณี ศรียุทธศักดิ์</p>
          <p style={{ margin: 0 }}>อธิบดีกรมสวัสดิการและคุ้มครองแรงงาน</p>
        </div>
      </div>

      {/* ════════ PAGE 2: บันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าฯ ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '13pt', marginTop: '10pt' }}>
          บันทึกผลการตรวจสอบและรับรองระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า
        </div>
        <div style={{ textAlign: 'center', fontSize: '11.5pt', marginBottom: '16pt' }}>
          กรมสวัสดิการและคุ้มครองแรงงาน กระทรวงแรงงาน
        </div>

        <p className="doc-p indent">
          ข้าพเจ้า <span className="fill-txt">{inspector.name || '....................................................................'}</span>
          &nbsp;&nbsp;อายุ <span className="fill-txt">{inspector.age || '......'}</span> ปี
        </p>
        <p className="doc-p">
          ที่อยู่เลขที่ <span className="fill-txt">{inspector.address || '............'}</span>
          &nbsp;หมู่ที่ <span className="fill-txt">{inspector.moo || '......'}</span>
          &nbsp;ตรอก/ซอย <span className="fill-txt">{inspector.soi || '..................'}</span>
          &nbsp;ถนน <span className="fill-txt">{inspector.road || '..................'}</span>
        </p>
        <p className="doc-p">
          แขวง/ตำบล <span className="fill-txt">{inspector.subdistrict || '..................'}</span>
          &nbsp;เขต/อำเภอ <span className="fill-txt">{inspector.district || '..................'}</span>
          &nbsp;จังหวัด <span className="fill-txt">{inspector.province || '..................'}</span>
        </p>
        <p className="doc-p">
          โทรศัพท์ <span className="fill-txt">{inspector.phone || '........................'}</span>
          &nbsp;ได้รับใบอนุญาตเป็นผู้ประกอบวิชาชีพวิศวกรรมควบคุม ระดับ <span className="fill-txt">{inspector.licenseLevel || '........................'}</span>
        </p>
        <p className="doc-p">
          สาขาวิศวกรรมไฟฟ้า แขนงไฟฟ้ากำลัง ตามกฎหมายว่าด้วยวิศวกร เลขทะเบียน <span className="fill-txt">{inspector.licenseNo || '........................'}</span>
        </p>
        <p className="doc-p">
          ตั้งแต่วันที่ <span className="fill-txt">{inspector.licenseStart || '........................'}</span>
          &nbsp;ถึงวันที่ <span className="fill-txt">{inspector.licenseEnd || '........................'}</span>
          &nbsp;และไม่อยู่ในระหว่างถูกสั่งพักหรือเพิกถอนใบอนุญาตดังกล่าว พร้อมแนบสำเนาใบอนุญาตมาด้วยแล้ว โดย
        </p>

        <div style={{ margin: '8pt 0 8pt 24pt' }}>
          <p className="doc-p">
            <Checkmark checked={inspector.certType === 'sec9'} /> ได้ขึ้นทะเบียนตามมาตรา ๙ หรือ
          </p>
          <p className="doc-p">
            <Checkmark checked={inspector.certType === 'sec11'} /> ได้รับใบอนุญาตตามมาตรา ๑๑ (ในนามนิติบุคคล <span className="fill-txt">{inspector.juristicName || '...................................................'}</span>)
          </p>
        </div>

        <p className="doc-p">
          แห่งพระราชบัญญัติความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงาน พ.ศ. ๒๕๕๔ ทะเบียนหรือใบอนุญาต เลขที่ <span className="fill-txt">{inspector.certNo || '........................'}</span>
          &nbsp;ตั้งแต่วันที่ <span className="fill-txt">{inspector.certStart || '........................'}</span>
          &nbsp;ถึงวันที่ <span className="fill-txt">{inspector.certEnd || '........................'}</span>
        </p>

        <p className="doc-p indent" style={{ marginTop: '12pt' }}>
          ข้าพเจ้าได้ดำเนินการตรวจสอบระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าของสถานประกอบกิจการ
        </p>
        <p className="doc-p">
          ชื่อสถานประกอบกิจการ <span className="fill-txt">{workplace.name || '....................................................................................................'}</span>
        </p>
        <p className="doc-p">
          ประกอบกิจการ <span className="fill-txt">{workplace.businessType || '..................................................................................................................'}</span>
        </p>
        <p className="doc-p">
          ชื่อนายจ้าง/ผู้กระทำแทน <span className="fill-txt">{workplace.employerName || '....................................................................................................'}</span>
        </p>
        <p className="doc-p">
          ตั้งอยู่เลขที่ <span className="fill-txt">{workplace.address || '............'}</span>
          &nbsp;หมู่ที่ <span className="fill-txt">{workplace.moo || '......'}</span>
          &nbsp;ตรอก/ซอย <span className="fill-txt">{workplace.soi || '..................'}</span>
          &nbsp;ถนน <span className="fill-txt">{workplace.road || '..................'}</span>
        </p>
        <p className="doc-p">
          แขวง/ตำบล <span className="fill-txt">{workplace.subdistrict || '..................'}</span>
          &nbsp;เขต/อำเภอ <span className="fill-txt">{workplace.district || '..................'}</span>
          &nbsp;จังหวัด <span className="fill-txt">{workplace.province || '..................'}</span>
        </p>
        <p className="doc-p">
          โทรศัพท์ <span className="fill-txt">{workplace.phone || '........................'}</span>
          &nbsp;เมื่อวันที่ <span className="fill-txt">{workplace.inspectionDate || data.date || '........................'}</span>
        </p>

        <p className="doc-p indent" style={{ marginTop: '12pt' }}>
          ข้าพเจ้าขอรับรองว่าระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าของสถานประกอบกิจการแห่งนี้ สามารถใช้งานได้อย่างปลอดภัยตามรายละเอียดและเงื่อนไขของการตรวจสอบ และเอกสารแนบเพิ่มเติม (ถ้ามี) ทั้งนี้ต้องมีการใช้งานอย่างถูกวิธีและมีการบำรุงรักษาตามหลักวิชาการ ข้าพเจ้าจึงลงลายมือชื่อไว้เป็นหลักฐาน
        </p>

        <div className="sig-table-wrap">
          <div className="sig-col">
            <div className="sig-box-img">
              {inspector.signature ? <img src={inspector.signature} alt="ลายเซ็นวิศวกร" /> : <div className="sig-line" />}
            </div>
            <p>ลงชื่อ ............................................................</p>
            <p>( {inspector.name || '............................................................'} )</p>
            <p>วิศวกรผู้ตรวจสอบ</p>
          </div>

          <div className="sig-col">
            <div className="sig-box-img">
              {workplace.employerSignature ? <img src={workplace.employerSignature} alt="ลายเซ็นนายจ้าง" /> : <div className="sig-line" />}
            </div>
            <p>ลงชื่อ ............................................................</p>
            <p>( {workplace.employerName || '............................................................'} )</p>
            <p>นายจ้าง/ผู้กระทำแทน</p>
          </div>
        </div>

        <div style={{ marginTop: '20pt', fontSize: '9pt', color: '#444', borderTop: '1px solid #999', paddingTop: '6pt' }}>
          <strong>หมายเหตุ:</strong> วิศวกรผู้ตรวจสอบ หมายถึง วิศวกรตามคำนิยาม “วิศวกร” ในกฎกระทรวงกำหนดมาตรฐานในการบริหาร จัดการ และดำเนินการด้านความปลอดภัย อาชีวอนามัย และสภาพแวดล้อมในการทำงานเกี่ยวกับไฟฟ้า พ.ศ. ๒๕๕๘
        </div>
      </div>

      {/* ════════ PAGE 3: -๒- ๑. ข้อมูลทั่วไป & ๒. รายการตรวจสอบ ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontSize: '11pt', marginBottom: '8pt' }}>-๒-</div>
        
        <h3 className="sec-title">๑. ข้อมูลทั่วไป</h3>
        <p className="doc-p">
          - ระบบไฟฟ้าที่ใช้ในสถานประกอบกิจการ <span className="fill-txt">{general.voltage || '.........'}</span> โวลต์ <span className="fill-txt">{general.phase || '...'}</span> เฟส <span className="fill-txt">{general.wires || '...'}</span> สาย
        </p>
        <p className="doc-p">
          - ขนาดเครื่องวัดหน่วยไฟฟ้า <span className="fill-txt">{general.meterAmp || '.........'}</span> แอมแปร์ <span className="fill-txt">{general.meterVolt || '.........'}</span> โวลต์ <span className="fill-txt">{general.meterPhase || '...'}</span> เฟส <span className="fill-txt">{general.meterWires || '...'}</span> สาย
          &nbsp;หมายเลขเครื่องวัด <span className="fill-txt">{general.meterNo || '................................................'}</span>
        </p>
        <p className="doc-p">
          - ปริมาณการใช้พลังไฟฟ้าสูงสุดในรอบ ๑๒ เดือน ที่ผ่านมา <span className="fill-txt">{general.peakKw12Months || '........................'}</span> กิโลวัตต์
        </p>
        <p className="doc-p">
          - หม้อแปลงกำลัง จำนวน <span className="fill-txt">{general.transformerCount || '.........'}</span> เครื่อง รวม <span className="fill-txt">{general.transformerTotalKva || '..................'}</span> เควีเอ
        </p>
        <p className="doc-p">
          - เครื่องกำเนิดไฟฟ้า/เครื่องกำเนิดไฟฟ้าสำรอง จำนวน <span className="fill-txt">{general.generatorCount || '.........'}</span> เครื่อง รวม <span className="fill-txt">{general.generatorTotalKva || '..................'}</span> เควีเอ
        </p>
        <p className="doc-p">
          - ผู้รับผิดชอบระบบไฟฟ้า ๑. <span className="fill-txt">{general.responsiblePerson1?.name || '...................................................'}</span> ตำแหน่ง <span className="fill-txt">{general.responsiblePerson1?.position || '................................................'}</span>
        </p>
        <p className="doc-p" style={{ paddingLeft: '110pt' }}>
          ๒. <span className="fill-txt">{general.responsiblePerson2?.name || '...................................................'}</span> ตำแหน่ง <span className="fill-txt">{general.responsiblePerson2?.position || '................................................'}</span>
        </p>
        <p className="doc-p">
          - แบบการติดตั้งระบบไฟฟ้าจริง (As built Drawing)
          &nbsp;&nbsp;&nbsp;&nbsp;<Checkmark checked={general.asBuiltDrawing === 'yes'} /> มี
          &nbsp;&nbsp;&nbsp;&nbsp;<Checkmark checked={general.asBuiltDrawing === 'no'} /> ไม่มี เหตุผล <span className="fill-txt">{general.asBuiltReason || '....................................................................................'}</span>
        </p>

        <h3 className="sec-title" style={{ marginTop: '16pt' }}>๒. รายการตรวจสอบ</h3>

        <table className="espsib-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>อุปกรณ์</th>
              <th style={{ width: '40%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '9%' }}>ใช้ได้</th>
              <th style={{ width: '11%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '15%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {highVoltageSystems.map((hv, hIdx) => (
              <tr key={hv.id}>
                <td style={{ verticalAlign: 'top', fontWeight: 700 }}>
                  ๒.๑ แรงสูง {highVoltageSystems.length > 1 ? `(ชุดที่ ${hIdx+1})` : ''}
                </td>
                <td colSpan={5} style={{ padding: 0 }}>
                  <table className="inner-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '47.1%', fontWeight: 700 }} colSpan={5}>๒.๑.๑ สายอากาศ :</td>
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
                        const it = hv.aerial?.[key] || {};
                        return (
                          <tr key={key}>
                            <td style={{ width: '47.1%' }}>{label}</td>
                            <td className="c" style={{ width: '10.6%' }}><StatusTick status={it.status} target="pass" /></td>
                            <td className="c" style={{ width: '12.9%' }}><StatusTick status={it.status} target="improve" /></td>
                            <td className="c" style={{ width: '11.8%' }}><StatusTick status={it.status} target="fix" /></td>
                            <td style={{ width: '17.6%', fontSize: '9pt' }}>{it.note || ''}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════════ PAGE 4: -๓- เครื่องปลดวงจร & หม้อแปลง ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontSize: '11pt', marginBottom: '8pt' }}>-๓-</div>
        <table className="espsib-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>อุปกรณ์</th>
              <th style={{ width: '40%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '9%' }}>ใช้ได้</th>
              <th style={{ width: '11%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '15%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {highVoltageSystems.map((hv) => (
              <>
                <tr key={`${hv.id}_disc`}>
                  <td style={{ verticalAlign: 'top' }}></td>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <table className="inner-table">
                      <tbody>
                        <tr>
                          <td colSpan={5} style={{ fontWeight: 700 }}>
                            ๒.๑.๒ การติดตั้งเครื่องปลดวงจรต้นทาง (ส่วนของผู้ใช้ไฟ) :
                          </td>
                        </tr>
                        {[
                          { key: 'dropFuse', label: '- ดรอปฟิวส์คัตเอาท์' },
                          { key: 'disconnectSwitch', label: '- สวิตช์ตัดตอน (Disconnecting Switch)' },
                          { key: 'rmu', label: '- RMU' },
                          { key: 'other', label: `- อื่นๆ ${hv.disconnectors?.otherText || ''}` },
                        ].map(({ key, label }) => {
                          const it = hv.disconnectors?.[key] || {};
                          return (
                            <tr key={key}>
                              <td style={{ width: '47.1%' }}>{label}</td>
                              <td className="c" style={{ width: '10.6%' }}><StatusTick status={it.status} target="pass" /></td>
                              <td className="c" style={{ width: '12.9%' }}><StatusTick status={it.status} target="improve" /></td>
                              <td className="c" style={{ width: '11.8%' }}><StatusTick status={it.status} target="fix" /></td>
                              <td style={{ width: '17.6%', fontSize: '9pt' }}>{it.note || ''}</td>
                            </tr>
                          );
                        })}
                        <tr>
                          <td style={{ width: '47.1%' }}>๒.๑.๓ อื่นๆ : {hv.otherText || ''}</td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={hv.other?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={hv.other?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={hv.other?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{hv.other?.note || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </>
            ))}

            {transformers.map((tf, tIdx) => (
              <tr key={tf.id}>
                <td style={{ verticalAlign: 'top', fontWeight: 700 }}>
                  ๒.๒ หม้อแปลง
                </td>
                <td colSpan={5} style={{ padding: 0 }}>
                  <div style={{ padding: '6pt 8pt' }}>
                    <p className="doc-p" style={{ fontWeight: 700 }}>๒.๒.๑ หม้อแปลงลูกที่ {tf.no || tIdx+1}</p>
                    <p className="doc-p">
                      ขนาด <span className="fill-txt">{tf.kva || '.........'}</span> kVA แรงดัน <span className="fill-txt">{tf.voltage || '.........'}</span> V
                      &nbsp;Impedance Voltage <span className="fill-txt">{tf.impedance || '.........'}</span> %
                    </p>
                    <p className="doc-p">
                      ชนิด &nbsp;<Checkmark checked={tf.type === 'Oil'} /> Oil
                      &nbsp;&nbsp;<Checkmark checked={tf.type === 'Dry'} /> Dry
                      &nbsp;&nbsp;<Checkmark checked={tf.type === 'other'} /> อื่นๆ {tf.typeOther || ''}
                    </p>
                    <p className="doc-p" style={{ marginTop: '6pt', fontWeight: 700 }}>๒.๒.๒ การติดตั้ง</p>
                    <p className="doc-p">
                      <Checkmark checked={tf.installType === 'sitting'} /> นั่งร้าน
                      &nbsp;&nbsp;<Checkmark checked={tf.installType === 'hanging'} /> แบบแขวน
                      &nbsp;&nbsp;<Checkmark checked={tf.installType === 'yard'} /> ลานหม้อแปลง
                      &nbsp;&nbsp;<Checkmark checked={tf.installType === 'room'} /> ในห้องหม้อแปลง
                    </p>
                    <p className="doc-p" style={{ marginTop: '6pt', fontWeight: 700 }}>๒.๒.๓ เครื่องป้องกันกระแสเกินด้านไฟเข้า</p>
                    <p className="doc-p">
                      แบบ <span className="fill-txt">{tf.primaryProtection?.type || '................................................'}</span>
                      &nbsp;พิกัดกระแส <span className="fill-txt">{tf.primaryProtection?.amp || '............'}</span> A
                    </p>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════════ PAGE 5: -๔- รายการตรวจสอบหม้อแปลงต่อ ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontSize: '11pt', marginBottom: '8pt' }}>-๔-</div>
        <table className="espsib-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>อุปกรณ์</th>
              <th style={{ width: '40%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '9%' }}>ใช้ได้</th>
              <th style={{ width: '11%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '15%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {transformers.map((tf, tIdx) => {
              const it = tf.items || {};
              return (
                <tr key={`${tf.id}_items`}>
                  <td style={{ verticalAlign: 'top', fontWeight: 700 }}>หม้อแปลง (ลูกที่ {tf.no || tIdx+1})</td>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <table className="inner-table">
                      <tbody>
                        {[
                          { key: 'wiring', label: '๒.๒.๔ การต่อสายแรงต่ำและแรงสูงที่หม้อแปลง' },
                          { key: 'lightningArrester', label: '๒.๒.๕ การติดตั้งล่อฟ้าแรงสูง (Lightning Arrester)' },
                          { key: 'dropFuse', label: '๒.๒.๖ การติดตั้งดรอปฟิวส์คัตเอาท์' },
                          { key: 'touchProtection', label: '๒.๒.๗ การป้องกันการสัมผัสส่วนที่มีไฟฟ้า' },
                          { key: 'bodyGround', label: '๒.๒.๘ สายดินกับตัวถังหม้อแปลงและล่อฟ้าแรงสูง' },
                        ].map(({ key, label }) => (
                          <tr key={key}>
                            <td style={{ width: '47.1%' }}>{label}</td>
                            <td className="c" style={{ width: '10.6%' }}><StatusTick status={it[key]?.status} target="pass" /></td>
                            <td className="c" style={{ width: '12.9%' }}><StatusTick status={it[key]?.status} target="improve" /></td>
                            <td className="c" style={{ width: '11.8%' }}><StatusTick status={it[key]?.status} target="fix" /></td>
                            <td style={{ width: '17.6%', fontSize: '9pt' }}>{it[key]?.note || ''}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ width: '47.1%' }}>
                            ๒.๒.๙ สายดินของหม้อแปลง
                            <div style={{ fontSize: '9pt', color: '#333' }}>
                              สายต่อหลักดิน ชนิด {it.groundRod?.wireType || '.......'} ขนาด {it.groundRod?.wireSize || '.......'} mm²
                            </div>
                          </td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={it.groundRod?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={it.groundRod?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={it.groundRod?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{it.groundRod?.note || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ width: '47.1%' }}>๒.๒.๑๐ สภาพภายนอกหม้อแปลง (สารดูดความชื้น, บุชชิ่ง, รั่วซึม, อุณหภูมิ)</td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={it.externalCondition?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={it.externalCondition?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={it.externalCondition?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{it.externalCondition?.note || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ width: '47.1%' }}>๒.๒.๑๑ สภาพแวดล้อมหม้อแปลง (ระบายอากาศ, ความชื้น, รั้วกั้น, สภาพทั่วไป)</td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={it.environment?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={it.environment?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={it.environment?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{it.environment?.note || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ width: '47.1%' }}>๒.๒.๑๒ อื่นๆ : {it.otherText || ''}</td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={it.other?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={it.other?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={it.other?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{it.other?.note || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ════════ PAGE 6: -๕- ตู้เมนสวิตช์ MDB ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontSize: '11pt', marginBottom: '8pt' }}>-๕-</div>
        <table className="espsib-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>อุปกรณ์</th>
              <th style={{ width: '40%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '9%' }}>ใช้ได้</th>
              <th style={{ width: '11%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '15%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {mainSwitchboards.map((msb, mIdx) => {
              const it = msb.items || {};
              return (
                <tr key={msb.id}>
                  <td style={{ verticalAlign: 'top', fontWeight: 700 }}>
                    ๒.๓ ตู้เมนสวิตช์ {mainSwitchboards.length > 1 ? `(ตู้ที่ ${msb.no || mIdx+1})` : ''}
                  </td>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div style={{ padding: '4pt 8pt', background: '#fafafa', borderBottom: '1px solid #ccc', fontSize: '9pt' }}>
                      <strong>๒.๓.๑ ตู้เมนสวิตช์ที่</strong> {msb.no || mIdx+1} &nbsp;&nbsp;
                      <strong>รับจากหม้อแปลงที่</strong> {msb.sourceTransformer || '1'} &nbsp;&nbsp;
                      <Checkmark checked={msb.locationType === 'outdoor'} /> ติดตั้งภายนอกอาคาร &nbsp;&nbsp;
                      <Checkmark checked={msb.locationType === 'indoor'} /> ติดตั้งภายในอาคาร
                    </div>
                    <table className="inner-table">
                      <tbody>
                        {[
                          { key: 'generalCondition', label: '- สภาพทั่วไป' },
                          { key: 'busbarJoints', label: '- จุดต่อสายและจุดต่อบัสบาร์' },
                          { key: 'workingSpace', label: '- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งตู้เมนสวิตช์' },
                          { key: 'lighting', label: '- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน' },
                          { key: 'bonding', label: '- การต่อฝาก' },
                          { key: 'livePartProtection', label: '- การป้องกันส่วนสัมผัสที่มีไฟฟ้า' },
                          { key: 'singleLineDiagram', label: '- ป้ายชื่อและแผนภาพเส้นเดี่ยว (Single Line Diagram)' },
                        ].map(({ key, label }) => (
                          <tr key={key}>
                            <td style={{ width: '47.1%' }}>{label}</td>
                            <td className="c" style={{ width: '10.6%' }}><StatusTick status={it[key]?.status} target="pass" /></td>
                            <td className="c" style={{ width: '12.9%' }}><StatusTick status={it[key]?.status} target="improve" /></td>
                            <td className="c" style={{ width: '11.8%' }}><StatusTick status={it[key]?.status} target="fix" /></td>
                            <td style={{ width: '17.6%', fontSize: '9pt' }}>{it[key]?.note || ''}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ width: '47.1%' }}>
                            <strong>๒.๓.๒ เครื่องป้องกันกระแสเกิน</strong>
                            <div style={{ fontSize: '9pt', color: '#333' }}>
                              ชนิด {msb.overcurrentProtection?.type || '.......'} IC {msb.overcurrentProtection?.icKa || '.......'} kA แรงดัน {msb.overcurrentProtection?.volt || '.......'} V AT {msb.overcurrentProtection?.atAmp || '.......'} A AF {msb.overcurrentProtection?.afAmp || '.......'} A
                            </div>
                          </td>
                          <td className="c" style={{ width: '10.6%' }}>✓</td>
                          <td className="c" style={{ width: '12.9%' }}></td>
                          <td className="c" style={{ width: '11.8%' }}></td>
                          <td style={{ width: '17.6%' }}></td>
                        </tr>
                        <tr>
                          <td style={{ width: '47.1%' }}>
                            <strong>๒.๓.๓ สายดินของแผงสวิตช์</strong>
                            <div style={{ fontSize: '9pt', color: '#333' }}>
                              สายต่อหลักดิน ชนิด {msb.grounding?.wireType || '.......'} ขนาด {msb.grounding?.wireSize || '.......'} mm²
                            </div>
                          </td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={msb.grounding?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={msb.grounding?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={msb.grounding?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{msb.grounding?.note || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ width: '47.1%' }}>
                            <strong>๒.๓.๔ อุณหภูมิของอุปกรณ์</strong>
                            &nbsp;&nbsp;<Checkmark checked={msb.temperature === 'normal'} /> ปกติ
                            &nbsp;&nbsp;<Checkmark checked={msb.temperature === 'abnormal'} /> ผิดปกติ
                          </td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={msb.temperature === 'normal' ? 'pass' : 'fix'} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={msb.temperature === 'normal' ? 'pass' : 'fix'} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{msb.temperatureNote || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ════════ PAGE 7: -๖- ๒.๔ แรงต่ำภายในอาคาร (วงจรเมน) ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontSize: '11pt', marginBottom: '8pt' }}>-๖-</div>
        <table className="espsib-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>อุปกรณ์</th>
              <th style={{ width: '40%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '9%' }}>ใช้ได้</th>
              <th style={{ width: '11%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '15%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {mainCircuits.map((mc, cIdx) => (
              <tr key={mc.id}>
                <td style={{ verticalAlign: 'top', fontWeight: 700 }}>
                  ๒.๔ แรงต่ำภายในอาคาร
                </td>
                <td colSpan={5} style={{ padding: 0 }}>
                  <div style={{ padding: '6pt 8pt' }}>
                    <p className="doc-p" style={{ fontWeight: 700 }}>๒.๔.๑ วงจรเมน (Main Circuit) {mainCircuits.length > 1 ? `ชุดที่ ${cIdx+1}` : ''}</p>
                    <p className="doc-p" style={{ fontWeight: 700, margin: '4pt 0' }}>๒.๔.๑.๑ สายเข้าเมนสวิตช์</p>
                    <p className="doc-p">
                      - สายเฟส ชนิด <span className="fill-txt">{mc.phaseWire?.type || '.........'}</span> ขนาด <span className="fill-txt">{mc.phaseWire?.size || '.........'}</span> mm²
                    </p>
                    <p className="doc-p">
                      - สายนิวทรัล ชนิด <span className="fill-txt">{mc.neutralWire?.type || '.........'}</span> ขนาด <span className="fill-txt">{mc.neutralWire?.size || '.........'}</span> mm²
                    </p>
                    <p className="doc-p" style={{ margin: '4pt 0' }}>
                      เดินใน &nbsp;<Checkmark checked={mc.raceway === 'conduit'} /> ท่อร้อยสาย (Conduit)
                      &nbsp;&nbsp;<Checkmark checked={mc.raceway === 'wireway'} /> รางเดินสาย (Wire Way)
                      &nbsp;&nbsp;<Checkmark checked={mc.raceway === 'cabletray'} /> รางเคเบิล (Cable Tray)
                    </p>
                    <p className="doc-p">
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<Checkmark checked={mc.raceway === 'rack'} /> ลูกถ้วยราวยึดสาย (Rack)
                      &nbsp;&nbsp;<Checkmark checked={mc.raceway === 'other'} /> อื่นๆ {mc.racewayOther || ''}
                    </p>
                  </div>
                  <table className="inner-table">
                    <tbody>
                      {[
                        { key: 'racewayCondition', label: '๒.๔.๑.๒ รางเดินสายและรางเคเบิล (การติดตั้ง, ความต่อเนื่อง, การต่อฝาก)' },
                        { key: 'insulation', label: '๒.๔.๑.๓ สภาพฉนวนสายไฟ' },
                        { key: 'joints', label: '๒.๔.๑.๔ สภาพจุดต่อของสาย' },
                        { key: 'inductionHeatProtection', label: '๒.๔.๑.๕ การป้องกันความร้อนจากการเหนี่ยวนำ' },
                      ].map(({ key, label }) => (
                        <tr key={key}>
                          <td style={{ width: '47.1%' }}>{label}</td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={mc.items?.[key]?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={mc.items?.[key]?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={mc.items?.[key]?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{mc.items?.[key]?.note || ''}</td>
                        </tr>
                      ))}
                      <tr>
                        <td style={{ width: '47.1%' }}>
                          ๒.๔.๑.๖ อุณหภูมิของอุปกรณ์ &nbsp;&nbsp;<Checkmark checked={mc.temperature === 'normal'} /> ปกติ &nbsp;&nbsp;<Checkmark checked={mc.temperature === 'abnormal'} /> ผิดปกติ
                        </td>
                        <td className="c" style={{ width: '10.6%' }}><StatusTick status={mc.temperature === 'normal' ? 'pass' : 'fix'} target="pass" /></td>
                        <td className="c" style={{ width: '12.9%' }}></td>
                        <td className="c" style={{ width: '11.8%' }}><StatusTick status={mc.temperature === 'normal' ? 'pass' : 'fix'} target="fix" /></td>
                        <td style={{ width: '17.6%', fontSize: '9pt' }}>{mc.temperatureNote || ''}</td>
                      </tr>
                      <tr>
                        <td style={{ width: '47.1%' }}>๒.๔.๑.๗ อื่นๆ : {mc.otherText || ''}</td>
                        <td className="c" style={{ width: '10.6%' }}><StatusTick status={mc.other?.status} target="pass" /></td>
                        <td className="c" style={{ width: '12.9%' }}><StatusTick status={mc.other?.status} target="improve" /></td>
                        <td className="c" style={{ width: '11.8%' }}><StatusTick status={mc.other?.status} target="fix" /></td>
                        <td style={{ width: '17.6%', fontSize: '9pt' }}>{mc.other?.note || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ════════ PAGE 8: -๗- ๒.๔.๒ แผงย่อย (DB) ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontSize: '11pt', marginBottom: '8pt' }}>-๗-</div>
        <table className="espsib-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>อุปกรณ์</th>
              <th style={{ width: '40%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '9%' }}>ใช้ได้</th>
              <th style={{ width: '11%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '15%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {subPanels.map((sp, sIdx) => {
              const it = sp.items || {};
              return (
                <tr key={sp.id}>
                  <td style={{ verticalAlign: 'top', fontWeight: 700 }}>
                    แผงย่อย (DB)
                  </td>
                  <td colSpan={5} style={{ padding: 0 }}>
                    <div style={{ padding: '6pt 8pt', background: '#fafafa', borderBottom: '1px solid #ccc' }}>
                      <p className="doc-p"><strong>๒.๔.๒ แผงย่อยที่</strong> {sp.no || sIdx+1}</p>
                      <p className="doc-p"><strong>ตำแหน่งหรือพื้นที่ติดตั้ง</strong> {sp.location || '–'}</p>
                      <p className="doc-p"><strong>รับจากตู้เมนสวิตช์ที่</strong> {sp.sourceMdb || '1'}</p>
                      <p className="doc-p" style={{ margin: '3pt 0' }}>
                        <strong>๒.๔.๒.๑ การติดตั้ง</strong>
                        &nbsp;&nbsp;<Checkmark checked={sp.locationType === 'outdoor'} /> ภายนอกอาคาร
                        &nbsp;&nbsp;<Checkmark checked={sp.locationType === 'indoor'} /> ภายในอาคาร
                      </p>
                    </div>
                    <table className="inner-table">
                      <tbody>
                        {[
                          { key: 'generalCondition', label: '- สภาพทั่วไป' },
                          { key: 'busbarJoints', label: '- จุดต่อสาย และจุดต่อบัสบาร์' },
                          { key: 'workingSpace', label: '- ที่ว่างเพื่อปฏิบัติงานที่จุดติดตั้งแผงย่อย' },
                          { key: 'lighting', label: '- แสงสว่างเหนือที่ว่างเพื่อปฏิบัติงาน' },
                          { key: 'bonding', label: '- การต่อฝาก' },
                          { key: 'livePartProtection', label: '- การป้องกันส่วนสัมผัสที่มีไฟฟ้า' },
                        ].map(({ key, label }) => (
                          <tr key={key}>
                            <td style={{ width: '47.1%' }}>{label}</td>
                            <td className="c" style={{ width: '10.6%' }}><StatusTick status={it[key]?.status} target="pass" /></td>
                            <td className="c" style={{ width: '12.9%' }}><StatusTick status={it[key]?.status} target="improve" /></td>
                            <td className="c" style={{ width: '11.8%' }}><StatusTick status={it[key]?.status} target="fix" /></td>
                            <td style={{ width: '17.6%', fontSize: '9pt' }}>{it[key]?.note || ''}</td>
                          </tr>
                        ))}
                        <tr>
                          <td style={{ width: '47.1%' }}>
                            <strong>๒.๔.๒.๒ เครื่องป้องกันกระแสเกินของแผงย่อย</strong>
                            <div style={{ fontSize: '9pt', color: '#333' }}>
                              ชนิด {sp.overcurrentProtection?.type || '.......'} IC {sp.overcurrentProtection?.icKa || '.......'} kA แรงดัน {sp.overcurrentProtection?.volt || '.......'} V AT {sp.overcurrentProtection?.atAmp || '.......'} A AF {sp.overcurrentProtection?.afAmp || '.......'} A
                            </div>
                          </td>
                          <td className="c" style={{ width: '10.6%' }}>✓</td>
                          <td className="c" style={{ width: '12.9%' }}></td>
                          <td className="c" style={{ width: '11.8%' }}></td>
                          <td style={{ width: '17.6%' }}></td>
                        </tr>
                        <tr>
                          <td style={{ width: '47.1%' }}>
                            <strong>๒.๔.๒.๓ สายดินของแผงย่อย</strong>
                            <div style={{ fontSize: '9pt', color: '#333' }}>
                              สายดิน ชนิด {sp.grounding?.wireType || '.......'} ขนาด {sp.grounding?.wireSize || '.......'} mm²
                            </div>
                          </td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={sp.grounding?.status} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}><StatusTick status={sp.grounding?.status} target="improve" /></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={sp.grounding?.status} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{sp.grounding?.note || ''}</td>
                        </tr>
                        <tr>
                          <td style={{ width: '47.1%' }}>
                            <strong>๒.๔.๒.๔ อุณหภูมิของอุปกรณ์</strong>
                            &nbsp;&nbsp;<Checkmark checked={sp.temperature === 'normal'} /> ปกติ
                            &nbsp;&nbsp;<Checkmark checked={sp.temperature === 'abnormal'} /> ผิดปกติ
                          </td>
                          <td className="c" style={{ width: '10.6%' }}><StatusTick status={sp.temperature === 'normal' ? 'pass' : 'fix'} target="pass" /></td>
                          <td className="c" style={{ width: '12.9%' }}></td>
                          <td className="c" style={{ width: '11.8%' }}><StatusTick status={sp.temperature === 'normal' ? 'pass' : 'fix'} target="fix" /></td>
                          <td style={{ width: '17.6%', fontSize: '9pt' }}>{sp.temperatureNote || ''}</td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div style={{ marginTop: '14pt', fontSize: '9pt', color: '#444' }}>
          <strong>หมายเหตุ:</strong> ๑. แผงย่อย คือ แผงวงจรที่ต่อจากตู้เมนสวิตช์ &nbsp;&nbsp;&nbsp;&nbsp; ๒. ใช้เอกสารการตรวจสอบแผงย่อย ๑ ฉบับ ต่อ ๑ แผงย่อย
        </div>
      </div>

      {/* ════════ PAGE 9: -๘- ๒.๕ บริภัณฑ์ไฟฟ้า & ๓. สรุปผล ════════ */}
      <div className="a4-page espsib-doc page-break">
        <div style={{ textAlign: 'center', fontSize: '11pt', marginBottom: '8pt' }}>-๘-</div>
        <table className="espsib-table">
          <thead>
            <tr>
              <th style={{ width: '15%' }}>อุปกรณ์</th>
              <th style={{ width: '40%' }}>รายการตรวจสอบ</th>
              <th style={{ width: '9%' }}>ใช้ได้</th>
              <th style={{ width: '11%' }}>ควรปรับปรุง</th>
              <th style={{ width: '10%' }}>ต้องแก้ไข</th>
              <th style={{ width: '15%' }}>คำแนะนำ/ความเห็น</th>
            </tr>
          </thead>
          <tbody>
            {otherEquipments.map((eq, eIdx) => (
              <tr key={eq.id}>
                <td style={{ verticalAlign: 'top', fontWeight: 700 }}>
                  ๒.๕ บริภัณฑ์ไฟฟ้า
                </td>
                <td colSpan={5} style={{ padding: 0 }}>
                  <div style={{ padding: '4pt 8pt', background: '#fafafa', borderBottom: '1px solid #ccc' }}>
                    <strong>ชื่อบริภัณฑ์ไฟฟ้า:</strong> {eq.name || `รายการที่ ${eIdx+1}`}
                  </div>
                  <table className="inner-table">
                    <tbody>
                      <tr>
                        <td style={{ width: '47.1%' }}>๒.๕.๑ การติดตั้ง</td>
                        <td className="c" style={{ width: '10.6%' }}><StatusTick status={eq.installation?.status} target="pass" /></td>
                        <td className="c" style={{ width: '12.9%' }}><StatusTick status={eq.installation?.status} target="improve" /></td>
                        <td className="c" style={{ width: '11.8%' }}><StatusTick status={eq.installation?.status} target="fix" /></td>
                        <td style={{ width: '17.6%', fontSize: '9pt' }}>{eq.installation?.note || ''}</td>
                      </tr>
                      <tr>
                        <td style={{ width: '47.1%' }}>๒.๕.๒ สภาพภายนอก</td>
                        <td className="c" style={{ width: '10.6%' }}><StatusTick status={eq.external?.status} target="pass" /></td>
                        <td className="c" style={{ width: '12.9%' }}><StatusTick status={eq.external?.status} target="improve" /></td>
                        <td className="c" style={{ width: '11.8%' }}><StatusTick status={eq.external?.status} target="fix" /></td>
                        <td style={{ width: '17.6%', fontSize: '9pt' }}>{eq.external?.note || ''}</td>
                      </tr>
                      <tr>
                        <td style={{ width: '47.1%' }}>๒.๕.๓ อื่นๆ : {eq.otherText || ''}</td>
                        <td className="c" style={{ width: '10.6%' }}><StatusTick status={eq.other?.status} target="pass" /></td>
                        <td className="c" style={{ width: '12.9%' }}><StatusTick status={eq.other?.status} target="improve" /></td>
                        <td className="c" style={{ width: '11.8%' }}><StatusTick status={eq.other?.status} target="fix" /></td>
                        <td style={{ width: '17.6%', fontSize: '9pt' }}>{eq.other?.note || ''}</td>
                      </tr>
                    </tbody>
                  </table>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: '16pt' }}>
          <h3 className="sec-title">๓. สรุปผลการตรวจสอบระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า</h3>
          <div style={{ margin: '8pt 0 8pt 16pt' }}>
            <p className="doc-p" style={{ marginBottom: '6pt' }}>
              <Checkmark checked={conclusion.result === 'pass'} /> ใช้งานได้ ทั้งนี้ ระบบไฟฟ้าและบริภัณฑ์ไฟฟ้าต้องมีการบำรุงรักษาอย่างถูกวิธีและตามหลักวิชาการทางด้านวิศวกรรมศาสตร์
            </p>
            <p className="doc-p">
              <Checkmark checked={conclusion.result === 'repair'} /> ใช้งานได้ แต่ต้องแก้ไขตามรายงานการตรวจสอบภายใน <span className="fill-txt">{conclusion.repairDays || '............'}</span> วัน
            </p>
          </div>

          <div style={{ marginTop: '12pt' }}>
            <strong>ความเห็นและข้อเสนอแนะ</strong>
            <div style={{
              minHeight: '80pt',
              border: '1px solid #ccc',
              borderRadius: '4pt',
              padding: '8pt',
              marginTop: '4pt',
              whiteSpace: 'pre-wrap',
              fontSize: '10pt',
              lineHeight: 1.6
            }}>
              {conclusion.suggestions || '– ไม่มีข้อเสนอแนะเพิ่มเติม –'}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24pt' }}>
            <div style={{ textAlign: 'center', minWidth: '220pt' }}>
              <div className="sig-box-img" style={{ margin: '0 auto' }}>
                {(conclusion.inspectorSignature || inspector.signature) ? (
                  <img src={conclusion.inspectorSignature || inspector.signature} alt="ลายเซ็นวิศวกร" />
                ) : (
                  <div className="sig-line" />
                )}
              </div>
              <p style={{ margin: '4pt 0' }}>ลงชื่อ ............................................................</p>
              <p style={{ margin: '4pt 0' }}>( {inspector.name || '............................................................'} )</p>
              <p style={{ margin: '4pt 0', fontWeight: 700 }}>วิศวกรผู้ตรวจสอบ</p>
              <p style={{ margin: '4pt 0' }}>วันที่ <span className="fill-txt">{conclusion.inspectionDate || workplace.inspectionDate || data.date}</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* ════════ PHOTO APPENDIX (ถ้ามีรูปภาพแนบ) ════════ */}
      {photos.length > 0 && (
        <div className="a4-page espsib-doc page-break">
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '13pt', marginBottom: '14pt' }}>
            เอกสารแนบ: ภาพถ่ายประกอบการตรวจสอบระบบไฟฟ้าและบริภัณฑ์ไฟฟ้า
          </div>
          <div className="photo-grid">
            {photos.map((p, idx) => (
              <div key={idx} className="photo-card">
                <div className="photo-frame">
                  <img src={p.photo} alt={p.label} />
                </div>
                <div className="photo-cap">
                  <strong>ภาพที่ {idx + 1}:</strong> {p.label}
                  {p.note && <div className="photo-note">({p.note})</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Document Styles ── */}
      <style jsx global>{`
        .espsib-report-root {
          width: 100%;
        }
        .espsib-doc {
          font-family: 'TH Sarabun New', 'Sarabun', 'Noto Sans Thai', sans-serif;
          font-size: 11pt;
          line-height: 1.6;
          color: #000;
          padding: 24mm 20mm;
          box-sizing: border-box;
          background: #fff;
          margin-bottom: 20px;
          box-shadow: 0 4px 14px rgba(0,0,0,0.15);
        }
        .doc-p {
          margin: 3pt 0;
        }
        .doc-p.indent {
          text-indent: 36pt;
        }
        .fill-txt {
          font-weight: 700;
          border-bottom: 1px dotted #444;
          padding: 0 4pt;
        }
        .sec-title {
          font-size: 12pt;
          font-weight: 800;
          margin: 10pt 0 6pt;
        }
        .sig-table-wrap {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20pt;
          margin-top: 30pt;
          text-align: center;
        }
        .sig-col {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .sig-box-img {
          height: 50pt;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 4pt;
        }
        .sig-box-img img {
          max-height: 48pt;
          max-width: 160pt;
          object-fit: contain;
        }
        .sig-line {
          height: 1px;
          width: 140pt;
          border-bottom: 1px dotted #888;
        }
        /* Tables */
        .espsib-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8pt;
          font-size: 10pt;
        }
        .espsib-table th, .espsib-table td {
          border: 1px solid #000;
          padding: 4pt 6pt;
          vertical-align: middle;
        }
        .espsib-table th {
          background: #f0f0f0;
          font-weight: 800;
          text-align: center;
        }
        .inner-table {
          width: 100%;
          border-collapse: collapse;
          margin: 0;
        }
        .inner-table td {
          border: none;
          border-bottom: 1px solid #ccc;
          padding: 3pt 4pt;
        }
        .inner-table tr:last-child td {
          border-bottom: none;
        }
        .c {
          text-align: center;
        }
        /* Photo Appendix */
        .photo-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16pt;
          margin-top: 14pt;
        }
        .photo-card {
          border: 1px solid #ddd;
          padding: 8pt;
          border-radius: 4pt;
          background: #fff;
          page-break-inside: avoid;
        }
        .photo-frame {
          height: 140pt;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9f9f9;
          overflow: hidden;
        }
        .photo-frame img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        .photo-cap {
          font-size: 9.5pt;
          margin-top: 6pt;
          line-height: 1.4;
        }
        .photo-note {
          color: #555;
          font-style: italic;
        }
        @media print {
          .espsib-doc {
            padding: 0 !important;
            margin: 0 !important;
            box-shadow: none !important;
          }
          .page-break {
            page-break-before: always !important;
          }
        }
      `}</style>
    </div>
  );
}
