import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { Button } from '@/components/ui/Button';

interface QrScannerProps {
  onScan: (token: string) => void;
  onClose: () => void;
}

/** A live camera panel that decodes a child's boarding QR code. Stops the camera stream on unmount either way. */
export function QrScanner({ onScan, onClose }: QrScannerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraError, setCameraError] = useState(false);

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
      .catch(() => setCameraError(true));

    return () => {
      cancelled = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-2 rounded-md border border-slate-200 p-3">
      {cameraError ? (
        <p className="text-sm text-red-600">{t('qr.cameraError')}</p>
      ) : (
        <video ref={videoRef} className="w-full max-w-sm rounded-md bg-black" muted />
      )}
      <Button variant="secondary" onClick={onClose}>
        {t('qr.closeScanner')}
      </Button>
    </div>
  );
}
