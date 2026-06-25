#!/usr/bin/env python3
"""
แปลง xlsx → pdf
1. แก้ XML: ลบ scale, ตั้ง fitToWidth=1, fitToPage=1
2. เปิดด้วย LibreOffice UNO socket → ตั้ง ScaleToPagesX=1 โดยตรง → export PDF
"""
import sys, os, re, zipfile, subprocess, time, socket, atexit

# ── เพิ่ม LibreOffice Python path เพื่อให้ import uno ได้ ──
_LO_PYTHON = '/usr/lib/libreoffice/program'
if _LO_PYTHON not in sys.path:
    sys.path.insert(0, _LO_PYTHON)


# ─────────────────────────────────────────────────────────────
# ส่วนที่ 1 : แก้ xlsx XML
# ─────────────────────────────────────────────────────────────

def _fix_sheet_xml(xml: str) -> str:
    # ลบ scale="..." ทุกรูปแบบ
    xml = re.sub(r'\s+scale="[^"]*"', '', xml)

    # แก้ pageSetup: fitToWidth=1, fitToHeight=0
    def _fix_ps(m):
        tag = m.group(0)
        if 'fitToWidth=' in tag:
            tag = re.sub(r'fitToWidth="[^"]*"', 'fitToWidth="1"', tag)
        else:
            tag = tag[:-2] + ' fitToWidth="1"/>'
        if 'fitToHeight=' in tag:
            tag = re.sub(r'fitToHeight="[^"]*"', 'fitToHeight="0"', tag)
        else:
            tag = tag[:-2] + ' fitToHeight="0"/>'
        return tag

    xml = re.sub(r'<pageSetup\b[^>]*/>', _fix_ps, xml)

    # ตั้ง fitToPage="1" ใน sheetPr/pageSetUpPr
    if 'pageSetUpPr' in xml:
        xml = re.sub(r'fitToPage="[^"]*"', 'fitToPage="1"', xml)
        if 'fitToPage=' not in xml:
            xml = re.sub(r'<pageSetUpPr\b', '<pageSetUpPr fitToPage="1"', xml)
    elif '<sheetPr' in xml:
        xml = re.sub(r'(<sheetPr\b[^>]*)/>',
                     r'\1><pageSetUpPr fitToPage="1"/></sheetPr>', xml, count=1)
        xml = re.sub(r'(<sheetPr\b[^>]*>)(?!<pageSetUpPr)',
                     r'\1<pageSetUpPr fitToPage="1"/>', xml, count=1)
    else:
        xml = re.sub(r'(<worksheet\b[^>]*>)',
                     r'\1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>',
                     xml, count=1)
    return xml


def fix_xlsx(src: str, dst: str):
    with zipfile.ZipFile(src, 'r') as zin, \
         zipfile.ZipFile(dst, 'w', zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if re.match(r'xl/worksheets/sheet\d+\.xml$', item.filename):
                original = data.decode('utf-8')
                fixed    = _fix_sheet_xml(original)
                data     = fixed.encode('utf-8')
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
    subprocess.run(
        ['sh', '-c', 'pkill -9 -f soffice 2>/dev/null; killall -9 soffice 2>/dev/null; true'],
        capture_output=True
    )
    time.sleep(1)

    proc = subprocess.Popen([
        'soffice', '--headless', '--norestore', '--nologo', '--nofirststartwizard',
        f'--accept=socket,host=localhost,port={LO_PORT};urp;StarOffice.ServiceManager',
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def _kill():
        try: proc.terminate(); proc.wait(5)
        except Exception: proc.kill()

    atexit.register(_kill)

    if not _wait_socket(60):
        _kill()
        raise RuntimeError('LibreOffice socket timeout (60s)')

    time.sleep(2)  # ให้ LO stabilize

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

        doc = desktop.loadComponentFromURL(file_url, '_blank', 0,
            (prop('Hidden', True), prop('MacroExecutionMode', 4)))

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
            # ตั้ง fit-to-width: 1 page wide, unlimited height
            style.ScaleToPages  = 0
            style.ScaleToPagesX = 1
            style.ScaleToPagesY = 0
            after = (style.ScaleToPagesX, style.ScaleToPagesY, style.ScaleToPages)
            print(f'[uno] style={sname} before={before} after={after}', flush=True)

        doc.storeToURL(out_url, (prop('FilterName', 'calc_pdf_Export'),))
        doc.close(False)
        print(f'[uno] PDF saved: {pdf_path}', flush=True)

    except Exception as e:
        print(f'[uno] ERROR: {type(e).__name__}: {e}', flush=True)
        raise
    finally:
        _kill()


# ─────────────────────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────────────────────

def main():
    src_xlsx = sys.argv[1]
    out_pdf  = sys.argv[2]
    fixed    = src_xlsx + '.fixed.xlsx'

    print('[step1] fixing xlsx XML...', flush=True)
    fix_xlsx(src_xlsx, fixed)

    print('[step2] converting via UNO...', flush=True)
    try:
        convert_via_uno(fixed, out_pdf)
    finally:
        try: os.unlink(fixed)
        except Exception: pass


if __name__ == '__main__':
    main()
