import React, { useEffect, useRef, useState } from 'react';
import { Barcode, Camera, CameraOff, Search } from 'lucide-react';

interface InventoryScannerInputProps {
  onScan: (code: string) => void;
  placeholder?: string;
  label?: string;
  autoFocus?: boolean;
}

export const InventoryScannerInput: React.FC<InventoryScannerInputProps> = ({
  onScan,
  placeholder = 'Scan barcode USB / ketik SKU atau kode batch lalu tekan Enter...',
  label = 'Pemindai Barcode / Lookup SKU',
  autoFocus = false,
}) => {
  const [value, setValue] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;
    onScan(trimmed);
  };

  const toggleCamera = async () => {
    if (cameraActive) {
      stopCamera();
      return;
    }

    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera langsung. Gunakan USB scanner atau input manual.');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      }, 60);

      const BarcodeDetectorCtor = (window as any).BarcodeDetector;
      if (BarcodeDetectorCtor) {
        const detector = new BarcodeDetectorCtor({
          formats: ['code_128', 'code_39', 'ean_13', 'ean_8', 'qr_code'],
        });
        const intervalId = window.setInterval(async () => {
          if (!videoRef.current || !streamRef.current) {
            window.clearInterval(intervalId);
            return;
          }
          try {
            const barcodes = await detector.detect(videoRef.current);
            if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
              const detected = String(barcodes[0].rawValue).trim();
              setValue(detected);
              onScan(detected);
              window.clearInterval(intervalId);
              stopCamera();
            }
          } catch {
            // Keep scanning frame
          }
        }, 450);
      } else {
        setCameraError('Kamera aktif, namun BarcodeDetector native tidak tersedia di browser ini. Ketik kode manual atau gunakan USB scanner.');
      }
    } catch (err: any) {
      setCameraError(err?.message || 'Izin kamera ditolak oleh pengguna atau perangkat.');
      stopCamera();
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-stone-700">{label}</label>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Barcode className="w-4 h-4 text-primary-700 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={value}
            autoFocus={autoFocus}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            className="w-full pl-9 pr-3 py-2 text-xs font-mono rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-primary-700"
          />
        </div>
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-primary-800 hover:bg-primary-900 text-white text-xs font-semibold transition-colors whitespace-nowrap"
        >
          <Search className="w-3.5 h-3.5" />
          <span>Cari / Scan</span>
        </button>
        <button
          type="button"
          onClick={toggleCamera}
          className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors whitespace-nowrap ${
            cameraActive
              ? 'bg-rose-50 border-rose-300 text-rose-700 hover:bg-rose-100'
              : 'bg-stone-100 border-stone-300 text-stone-700 hover:bg-stone-200'
          }`}
        >
          {cameraActive ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
          <span>{cameraActive ? 'Tutup Kamera' : 'Kamera'}</span>
        </button>
      </form>

      {cameraError && (
        <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          {cameraError}
        </p>
      )}

      {cameraActive && (
        <div className="rounded-xl overflow-hidden border border-stone-300 bg-stone-950 max-w-sm">
          <video ref={videoRef} className="w-full h-44 object-cover" muted playsInline />
          <div className="px-3 py-1.5 text-[10px] font-mono text-stone-300 bg-stone-900">
            Arahkan label barcode / QR ikan ke kamera...
          </div>
        </div>
      )}
    </div>
  );
};
