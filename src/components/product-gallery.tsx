"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/format";

type ProductGalleryProps = {
  images: string[];
  name: string;
};

export function ProductGallery({ images, name }: ProductGalleryProps) {
  const [active, setActive] = useState(0);
  const current = images[active] ?? images[0];

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-line bg-soft">
        <Image
          src={current}
          alt={name}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-2.5">
          {images.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Xem ảnh ${index + 1}`}
              aria-pressed={index === active}
              className={cn(
                "relative aspect-[4/3] overflow-hidden rounded-xl border bg-soft transition",
                index === active
                  ? "border-brand ring-2 ring-brand/25"
                  : "border-line opacity-75 hover:opacity-100"
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
