'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_PREFIX = 'fpg-draft:';
const AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * useDraftAutosave
 *
 * บันทึกข้อมูลฟอร์มลง localStorage อัตโนมัติทุกครั้งที่เปลี่ยนแปลง (debounced กันเขียนถี่เกินไป)
 * และกู้คืน draft อัตโนมัติตอนเปิดฟอร์มมาใหม่ — สำคัญมากเพราะช่างอาจกรอกไม่จบในครั้งเดียว
 * (จอดับ แอพถูกปิด เน็ตหลุดระหว่างกดส่ง ฯลฯ) ข้อมูลที่กรอกไปแล้วต้องไม่หายเด็ดขาด
 *
 * Key แยกตาม machineId + inspectionDate เพื่อให้ตรวจหลายเครื่อง/หลายวันพร้อมกันได้โดยไม่ทับกัน
 */
export function useDraftAutosave(draftKey, initialData) {
  const storageKey = `${STORAGE_PREFIX}${draftKey}`;
  const [data, setData] = useState(initialData);
  const [restoredAt, setRestoredAt] = useState(null);
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved | error
  const debounceTimer = useRef(null);
  const isFirstRender = useRef(true);

  // กู้คืน draft ตอน mount (เฉพาะตอนเปลี่ยน draftKey เช่น เปลี่ยนเครื่อง/วันที่)
  useEffect(() => {
    isFirstRender.current = true;
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        setData(parsed.data);
        setRestoredAt(parsed.savedAt);
      } else if (initialData) {
        setData(initialData);
        setRestoredAt(null);
      }
      // ถ้า initialData ยังเป็น null ตอนนี้ (เพราะ fieldMap ยังโหลดไม่เสร็จตอน mount) ปล่อยให้
      // effect ถัดไปด้านล่าง sync ให้เมื่อ initialData พร้อมจริง — กันปัญหาค้างที่ data=null ตลอดไป
    } catch (err) {
      console.error('ไม่สามารถกู้คืน draft ได้:', err);
      if (initialData) setData(initialData);
      setRestoredAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // เคสที่ initialData ยังไม่พร้อมตอน mount (fieldMap โหลดทีหลัง async) — เมื่อ initialData
  // เปลี่ยนจาก null เป็นค่าจริง และยังไม่มี draft ใดๆ ถูกกู้คืนมา (data ยังว่างอยู่) ให้ sync เข้า data
  useEffect(() => {
    if (data === null && initialData) {
      try {
        const raw = window.localStorage.getItem(storageKey);
        if (!raw) {
          setData(initialData);
        }
      } catch {
        setData(initialData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData]);

  // เขียนลง localStorage แบบ debounced ทุกครั้งที่ data เปลี่ยน
  useEffect(() => {
    if (isFirstRender.current) {
      // ข้ามรอบแรกหลังกู้คืน draft กันเขียนทับตัวเองทันทีที่ mount โดยไม่จำเป็น
      isFirstRender.current = false;
      return;
    }
    setSaveStatus('saving');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      try {
        const payload = { data, savedAt: new Date().toISOString() };
        window.localStorage.setItem(storageKey, JSON.stringify(payload));
        setSaveStatus('saved');
      } catch (err) {
        console.error('บันทึก draft ไม่สำเร็จ:', err);
        setSaveStatus('error');
      }
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [data, storageKey]);

  const clearDraft = useCallback(() => {
    try {
      window.localStorage.removeItem(storageKey);
    } catch (err) {
      console.error('ลบ draft ไม่สำเร็จ:', err);
    }
  }, [storageKey]);

  return { data, setData, saveStatus, restoredAt, clearDraft };
}
