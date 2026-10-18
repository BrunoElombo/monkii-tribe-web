import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";

/** Ticket QR code (the content is the ticket code itself). */
export function QrCode({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    // Dark modules on white: scanners need maximum contrast, whatever the app theme
    void QRCode.toCanvas(canvasRef.current, value, { width: size, margin: 2, errorCorrectionLevel: "M", color: { dark: "#1A0F05", light: "#FFFFFF" } });
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-xl" aria-label={value} role="img" />;
}

interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<{ rawValue: string }[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike;
  }
}

/**
 * Camera scanner for the door (EVT-05). Uses the native BarcodeDetector where
 * the browser has it (Chrome on Android) and the jsQR decoder elsewhere (iOS).
 */
export function useQrScanner(onCode: (code: string) => void) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number>(0);
  const lastRef = useRef<{ code: string; at: number }>({ code: "", at: 0 });
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const stop = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current!;
      video.srcObject = stream;
      await video.play();
      setActive(true);

      const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { willReadFrequently: true })!;

      const tick = async () => {
        if (!streamRef.current) return;
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          let code: string | null = null;

          if (detector) {
            const found = await detector.detect(video).catch(() => []);
            code = found[0]?.rawValue ?? null;
          } else {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            context.drawImage(video, 0, 0);
            const image = context.getImageData(0, 0, canvas.width, canvas.height);
            code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" })?.data ?? null;
          }

          // The same ticket stays in front of the camera: report it once every 3 s at most
          const now = Date.now();
          if (code && (code !== lastRef.current.code || now - lastRef.current.at > 3000)) {
            lastRef.current = { code, at: now };
            onCode(code);
          }
        }
        frameRef.current = requestAnimationFrame(() => void tick());
      };
      frameRef.current = requestAnimationFrame(() => void tick());
    } catch {
      setError("camera");
      stop();
    }
  }, [onCode, stop]);

  useEffect(() => stop, [stop]);

  return { videoRef, active, error, start, stop };
}
