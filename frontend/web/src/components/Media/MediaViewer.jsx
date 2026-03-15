import { useState } from 'react';

export default function MediaViewer({ src, type, thumbnail }) {
  const [open, setOpen] = useState(false);

  if (type === 'video') {
    return (
      <>
        <div className="relative cursor-pointer max-w-xs rounded-lg overflow-hidden" onClick={() => setOpen(true)}>
          {thumbnail
            ? <img src={thumbnail} alt="Video preview" className="w-full object-cover max-h-48" />
            : <div className="w-48 h-32 bg-wa-bg flex items-center justify-center">🎥</div>
          }
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-12 h-12 bg-white/80 rounded-full flex items-center justify-center">
              ▶
            </div>
          </div>
        </div>

        {open && (
          <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setOpen(false)}>
            <video src={src} controls autoPlay className="max-w-full max-h-full rounded-lg" onClick={e => e.stopPropagation()} />
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <img
        src={thumbnail || src}
        alt="media"
        className="max-w-xs max-h-48 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
        onClick={() => setOpen(true)}
        loading="lazy"
      />
      {open && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setOpen(false)}>
          <img src={src} alt="media" className="max-w-full max-h-full object-contain rounded-lg" onClick={e => e.stopPropagation()} />
          <a
            href={src}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-4 right-4 bg-wa-green text-white px-3 py-1.5 rounded-lg text-sm"
            onClick={e => e.stopPropagation()}
          >
            ⬇ Download
          </a>
        </div>
      )}
    </>
  );
}
