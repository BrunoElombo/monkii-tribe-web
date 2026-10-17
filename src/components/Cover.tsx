import clsx from "clsx";
import { MusicalNoteIcon, UserIcon } from "@heroicons/react/24/solid";

/** Square cover art with an on-brand placeholder when there is no image. */
export function Cover({ src, alt, className, rounded = "rounded-xl" }: { src: string | null | undefined; alt: string; className?: string; rounded?: string }) {
  return (
    <div className={clsx("relative aspect-square overflow-hidden bg-gradient-to-br from-monkii-700 to-monkii-950", rounded, className)}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <MusicalNoteIcon className="absolute inset-0 m-auto h-1/3 w-1/3 text-monkii-300/60" aria-hidden />
      )}
    </div>
  );
}

export function Avatar({ src, alt, className }: { src: string | null | undefined; alt: string; className?: string }) {
  return (
    <div className={clsx("relative aspect-square overflow-hidden rounded-full bg-gradient-to-br from-monkii-600 to-monkii-900", className)}>
      {src ? (
        <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <UserIcon className="absolute inset-0 m-auto h-1/2 w-1/2 text-monkii-200/70" aria-hidden />
      )}
    </div>
  );
}

/** 2×2 mosaic of covers for playlists. */
export function Mosaic({ urls, alt, className }: { urls: string[]; alt: string; className?: string }) {
  if (urls.length < 4) return <Cover src={urls[0]} alt={alt} className={className} />;
  return (
    <div className={clsx("grid aspect-square grid-cols-2 overflow-hidden rounded-xl", className)} role="img" aria-label={alt}>
      {urls.slice(0, 4).map((url) => (
        <img key={url} src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
      ))}
    </div>
  );
}
