import { useRef, useState } from "react";
import clsx from "clsx";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { uploadImage } from "../services/media.service";
import type { MediaAsset } from "../types";
import { translatedError } from "../utils/problems";
import { Spinner } from "./ui";

interface ImageUploadProps {
  purpose: "COVER" | "AVATAR" | "BANNER";
  label: string;
  hint?: string;
  /** Called with the stored asset once the upload is processed */
  onUploaded: (asset: MediaAsset) => void | Promise<void>;
  children?: React.ReactNode;
  className?: string;
}

/** Click-to-upload area; the media service checks dimensions and creates WebP variants. */
export function ImageUpload({ purpose, label, hint, onUploaded, children, className }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setProgress(0);
    try {
      const asset = await uploadImage(file, purpose, setProgress);
      await onUploaded(asset);
    } catch (err) {
      setError(translatedError(err));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        className={clsx(
          "group relative block w-full overflow-hidden rounded-xl border border-dashed border-line transition hover:border-monkii-500",
        )}
      >
        {children}
        {progress === null ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 text-sm font-semibold text-white opacity-0 transition group-hover:opacity-100">
            <ArrowUpTrayIcon className="h-6 w-6" /> {label}
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white">
            <Spinner /> <span className="ml-2 text-sm font-semibold">{progress}%</span>
          </span>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => onFile(event.target.files?.[0])} />
      {error ? <p role="alert" className="mt-2 text-xs font-medium text-monkii-300">{error}</p> : hint && <p className="mt-2 text-xs text-muted">{hint}</p>}
    </div>
  );
}
