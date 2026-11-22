import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import type { Product } from "@/lib/types";

export function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/san-pham/${product.slug}`}
      className="group card flex flex-col overflow-hidden transition duration-300 hover:-translate-y-1 hover:border-transparent hover:shadow-[0_18px_40px_-24px_rgba(15,27,45,0.45)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition duration-500 group-hover:scale-[1.04]"
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <span className="text-[11.5px] font-bold uppercase tracking-[0.1em] text-brand">
          {product.categoryLabel}
        </span>
        <h3 className="mt-1.5 text-[17px] leading-snug">{product.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
          {product.lead}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {product.miniSpecs.slice(0, 3).map((spec) => (
            <span
              key={`${spec.label}-${spec.value}`}
              className="rounded-md bg-[#eaf1fa] px-2 py-1 text-[11.5px] font-semibold text-brand"
            >
              {spec.value}
            </span>
          ))}
        </div>
        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-bold text-brand">
          Xem chi tiết
          <ArrowRight
            size={15}
            weight="bold"
            aria-hidden
            className="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </span>
      </div>
    </Link>
  );
}
