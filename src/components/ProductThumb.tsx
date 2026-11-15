import { Shirt } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/components/ui';

/** A product photo, or a neutral placeholder when there is none (or it fails to load). */
export function ProductThumb({ url, alt, className }: { url: string | null; alt: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={cn('flex shrink-0 items-center justify-center overflow-hidden bg-muted text-muted-foreground', className)}>
      {url && !failed ? (
        <img src={url} alt={alt} loading="lazy" decoding="async" onError={() => setFailed(true)} className="size-full object-cover" />
      ) : (
        <Shirt className="size-1/2" aria-hidden />
      )}
    </span>
  );
}
