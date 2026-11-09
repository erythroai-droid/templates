'use client';
import { ReactNode, useRef } from 'react';
import { usePinnedBlock } from '@/lib/pin';

/** Screen-high pinned section; the next `.rise` sibling rides up over it (rosso-garage pattern). */
export default function PinSection({ id, className, fit, children }: { id: string; className: string; fit?: string; children: ReactNode }) {
  const el = useRef<HTMLElement>(null);
  usePinnedBlock(el, fit);
  return <section ref={el} id={id} className={className} data-slide="blk">{children}</section>;
}
