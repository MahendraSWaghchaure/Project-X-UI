import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader, IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/Button';

interface QrScannerProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

/** A live camera panel that decodes a child's boarding QR code. Stops the camera stream on unmount either way. */
export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const reader = new BrowserQRCodeReader();
    let controls: IScannerControls | undefined;
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result) => {
        if (result && !cancelled) {
          onScan(result.getText());
        }
      })
      .then((c) => {
        controls = c;
      })
      .catch(() => setError('Could not access the camera. Check permissions and try again.'));

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
      {error ? (
        <p className="text-sm text-red-600">{error}</p>
      ) : (
        <video ref={videoRef} className="w-full max-w-sm rounded-md bg-black" muted />
      )}
      <Button variant="secondary" onClick={onClose}>
        Close scanner
      </Button>
    </div>
  );
}
