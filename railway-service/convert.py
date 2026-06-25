#!/usr/bin/env python3
"""
แปลง xlsx → pdf

ขั้นตอน:
1. แก้ XML ใน xlsx zip โดยตรง: ลบ scale, เพิ่ม fitToWidth=1
2. เปิดด้วย LibreOffice UNO socket: ตั้ง ScaleToPagesX=1 โดยตรงใน API
3. export PDF
"""
import sys, os, re, zipfile, shutil, subprocess, time, socket, atexit


# ─────────────────────────────────────────────────────────────
# ส่วนที่ 1 : แก้ xlsx XML โดยตรง (ไม่กระทบภาพ)
# ─────────────────────────────────────────────────────────────

def _fix_sheet_xml(xml: str) -> str:
    # 1. ลบ scale="..." ออกจาก pageSetup
    xml = re.sub(r'\s+scale="\d+"', '', xml)

    # 2. แก้ pageSetup tag → fitToWidth=1, fitToHeight=0
    def _fix_ps(m):
        tag = m.group(0)
        tag = re.sub(r'fitToWidth="\d+"', 'fitToWidth="1"', tag)
        tag = re.sub(r'fitToHeight="\d+"', 'fitToHeight="0"', tag)
        if 'fitToWidth=' not in tag:
            tag = tag.replace('/>', ' fitToWidth="1"/>')
        if 'fitToHeight=' not in tag:
            tag = tag.replace('/>', ' fitToHeight="0"/>')
        return tag

    xml = re.sub(r'<pageSetup\b[^>]*/>', _fix_ps, xml)

    # 3. ตรวจ sheetPr → fitToPage=1
    if 'pageSetUpPr' in xml:
        if 'fitToPage=' in xml:
            xml = re.sub(r'fitToPage="\d+"', 'fitToPage="1"', xml)
        else:
            xml = re.sub(r'<pageSetUpPr', '<pageSetUpPr fitToPage="1"', xml)
    else:
        # ไม่มี pageSetUpPr เลย → ใส่เข้าไป
        if '<sheetPr>' in xml:
            xml = xml.replace('<sheetPr>', '<sheetPr><pageSetUpPr fitToPage="1"/>', 1)
        elif '<sheetPr' in xml:
            xml = re.sub(r'<sheetPr([^>]*)>', r'<sheetPr\1><pageSetUpPr fitToPage="1"/>', xml, count=1)
        else:
            xml = re.sub(
                r'(<worksheet\b[^>]*>)',
                r'\1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>',
                xml, count=1
            )
    return xml


def fix_xlsx_for_lo(src: str, dst: str):
    """คัดลอก xlsx และแก้ sheet xml ทุก sheet"""
    with zipfile.ZipFile(src, 'r') as zin, \
         zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.match(r'xl/worksheets/sheet\d+\.xml$', item.filename):
                original = data.decode('utf-8')
                fixed    = _fix_sheet_xml(original)
                data     = fixed.encode('utf-8')
                # log ว่า scale ถูกลบหรือเปล่า
                had_scale = bool(re.search(r'scale="\d+"', original))
                print(f'[xml] {item.filename}: scale_removed={had_scale}', flush=True)
            zout.writestr(item, data)


# ─────────────────────────────────────────────────────────────
# ส่วนที่ 2 : UNO socket — ตั้ง ScaleToPagesX=1 โดยตรง
# ─────────────────────────────────────────────────────────────

LO_PORT = 2002


def _wait_socket(timeout=60):
    end = time.time() + timeout
    while time.time() < end:
        try:
            s = socket.socket()
            s.settimeout(1)
            s.connect(('localhost', LO_PORT))
            s.close()
            return True
        except Exception:
            time.sleep(1)
    return False


def convert_via_uno(xlsx_path: str, pdf_path: str):
    # kill soffice เดิมก่อน (เผื่อค้าง)
    subprocess.run(['pkill', '-9', '-f', 'soffice'], capture_output=True)
    time.sleep(1)

    proc = subprocess.Popen([
        'soffice', '--headless', '--norestore', '--nologo', '--nofirststartwizard',
        f'--accept=socket,host=localhost,port={LO_PORT};urp;StarOffice.ServiceManager',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _cleanup():
        try:
            proc.terminate()
            proc.wait(5)
        except Exception:
            proc.kill()

    atexit.register(_cleanup)

    if not _wait_socket(60):
        _cleanup()
        raise RuntimeError('LibreOffice socket timeout (60s)')

    time.sleep(1)   # ให้ LO stabilize

    try:
        import uno
        from com.sun.star.beans import PropertyValue

        def prop(name, val):
            p = PropertyValue()
            p.Name  = name
            p.Value = val
            return p

        lctx     = uno.getComponentContext()
        resolver = lctx.ServiceManager.createInstanceWithContext(
            'com.sun.star.bridge.UnoUrlResolver', lctx)
        ctx      = resolver.resolve(
            f'uno:socket,host=localhost,port={LO_PORT};urp;StarOffice.ComponentContext')
        smgr     = ctx.ServiceManager
        desktop  = smgr.createInstanceWithContext('com.sun.star.frame.Desktop', ctx)

        file_url = 'file://' + os.path.abspath(xlsx_path)
        out_url  = 'file://' + os.path.abspath(pdf_path)

        doc = desktop.loadComponentFromURL(
            file_url, '_blank', 0,
            (prop('Hidden', True), prop('MacroExecutionMode', 4))
        )

        # ตั้ง ScaleToPagesX ทุก page style ที่ใช้อยู่
        sheets      = doc.getSheets()
        page_styles = doc.getStyleFamilies().getByName('PageStyles')
        seen        = set()
        for i in range(sheets.getCount()):
            sname = sheets.getByIndex(i).PageStyle
            if sname in seen:
                continue
            seen.add(sname)
            style = page_styles.getByName(sname)
            before = (style.ScaleToPagesX, style.ScaleToPagesY, style.ScaleToPages)
            style.ScaleToPages  = 0
            style.ScaleToPagesX = 1
            style.ScaleToPagesY = 0
            after = (style.ScaleToPagesX, style.ScaleToPagesY, style.ScaleToPages)
            print(f'[uno] style={sname} before={before} after={after}', flush=True)

        doc.storeToURL(out_url, (prop('FilterName', 'calc_pdf_Export'),))
        doc.close(False)
        print(f'[uno] PDF exported: {pdf_path}', flush=True)

    finally:
        _cleanup()


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main():
    src_xlsx = sys.argv[1]
    out_pdf  = sys.argv[2]
    tmp_dir  = os.path.dirname(src_xlsx)
    fixed    = os.path.join(tmp_dir, 'fixed.xlsx')

    print('[step1] fixing xlsx XML...', flush=True)
    fix_xlsx_for_lo(src_xlsx, fixed)

    print('[step2] converting via UNO...', flush=True)
    try:
        convert_via_uno(fixed, out_pdf)
    finally:
        try:
            os.unlink(fixed)
        except Exception:
            pass


if __name__ == '__main__':
    main()
