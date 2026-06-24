import { NextResponse } from 'next/server';
import fieldMap from '../../../src/data/field-map.json';

// หน้าฟอร์มดึงโครงสร้างฟิลด์ทั้งหมด (รายชื่อเครื่อง, checklist, ฟิลด์ที่ต้องกรอก) จากที่นี่
// แทนที่จะ hardcode ซ้ำในฝั่ง React — ถ้าแก้ field-map.json ฝั่งฟอร์มจะอัปเดตตามอัตโนมัติ
export async function GET() {
  return NextResponse.json(fieldMap);
}
