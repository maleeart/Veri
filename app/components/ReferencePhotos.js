'use client';

import { useState } from 'react';

export default function ReferencePhotos({ imageDir, imageFiles }) {
  const [openImage, setOpenImage] = useState(null);

  if (!imageFiles || imageFiles.length === 0) return null;

  return (
    <div className="ref-photos">
      <p className="ref-photos__label">รูปอ้างอิงเครื่อง (Nameplate / อุปกรณ์)</p>
      <div className="ref-photos__strip">
        {imageFiles.map((file) => (
          <button
            key={file}
            type="button"
            className="ref-photos__thumb"
            onClick={() => setOpenImage(`/${imageDir}/${file}`)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/${imageDir}/${file}`} alt="" loading="lazy" />
          </button>
        ))}
      </div>

      {openImage && (
        <div className="ref-photos__lightbox" onClick={() => setOpenImage(null)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={openImage} alt="" />
        </div>
      )}

      <style jsx>{`
        .ref-photos__label {
          font-size: 13px;
          color: var(--ink-secondary);
          margin: 0 0 8px;
        }
        .ref-photos__strip {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
        }
        .ref-photos__thumb {
          flex-shrink: 0;
          width: 72px;
          height: 72px;
          border-radius: var(--radius-sm);
          overflow: hidden;
          border: 1px solid var(--border-hairline);
          padding: 0;
          background: var(--bg-input);
          cursor: pointer;
        }
        .ref-photos__thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ref-photos__lightbox {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 50;
          padding: 24px;
        }
        .ref-photos__lightbox img {
          max-width: 100%;
          max-height: 100%;
          border-radius: var(--radius-md);
        }
      `}</style>
    </div>
  );
}
