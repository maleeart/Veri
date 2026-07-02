# ตั้งค่า Login (Google OAuth) — ต้องทำก่อน deploy

หลังเพิ่มระบบ login แอปจะ **บังคับเข้าสู่ระบบทุกหน้า** ถ้ายังไม่ตั้ง env ด้านล่าง production จะเข้าไม่ได้

## 1. สร้าง Google OAuth Client
1. ไป https://console.cloud.google.com → สร้าง/เลือก Project
2. **APIs & Services → OAuth consent screen** → เลือก External → กรอกชื่อแอป + email → Save
   - Publishing status: กด **Publish app** (ไม่งั้นล็อกอินได้เฉพาะ test users)
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins:** `https://<โดเมนของคุณบน Vercel>`
   - **Authorized redirect URIs:** `https://<โดเมนของคุณบน Vercel>/api/auth/callback/google`
   - (ถ้าทดสอบ local ด้วย ให้เพิ่ม `http://localhost:3000` และ `http://localhost:3000/api/auth/callback/google`)
   - กด Create → จะได้ **Client ID** และ **Client Secret**

## 2. สร้าง NEXTAUTH_SECRET
รันคำสั่งนี้เพื่อสุ่มค่า (หรือใช้ตัวสุ่มอะไรก็ได้ยาว ๆ):
```
openssl rand -base64 32
```

## 3. ตั้ง Environment Variables บน Vercel
Project → Settings → Environment Variables (Production):

| Key | Value |
|-----|-------|
| `GOOGLE_CLIENT_ID` | (จากขั้นที่ 1) |
| `GOOGLE_CLIENT_SECRET` | (จากขั้นที่ 1) |
| `NEXTAUTH_SECRET` | (จากขั้นที่ 2) |
| `NEXTAUTH_URL` | `https://<โดเมนของคุณบน Vercel>` |
| `ADMIN_EMAILS` | `tuangphetch@gmail.com` (คั่นด้วย , ได้หลายคน) |

> `GITHUB_TOKEN`, `GITHUB_REPO_OWNER`, `GITHUB_REPO_NAME` ที่มีอยู่แล้วยังใช้เหมือนเดิม (role เก็บที่ `data/users.json` บน data branch)

## 4. Deploy
กด Redeploy ครั้งเดียวหลังตั้ง env ครบ

## Role
- **admin** (`ADMIN_EMAILS`): ทำได้ทุกอย่าง + จัดการสิทธิ์ (⚙️ บนหน้าหลัก) + ลบรายงาน
- **user (ผู้ใช้งาน)**: บันทึก/ส่งได้ทุกเมนู + ดาวน์โหลด — admin กำหนดที่หน้า ⚙️
- **visitor (ผู้เยี่ยมชม, ค่าเริ่มต้น)**: ดู/ดาวน์โหลดอย่างเดียว

> เปลี่ยน role แล้วผู้ใช้ต้อง **ออกจากระบบแล้วเข้าใหม่** (role ฝังใน token ตอนล็อกอิน)

## ข้อจำกัดที่ทราบ
- เมนู **Meter อาคาร** เขียนตรงเข้า Google Apps Script (ไม่ผ่าน server เรา) จึงกัน visitor ได้ระดับ client (ซ่อนฟอร์ม) เมนูอื่นกันที่ server เต็ม
