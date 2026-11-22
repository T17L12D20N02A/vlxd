import Link from "next/link";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react/dist/ssr";

export default function NotFound() {
  return (
    <section className="py-20 sm:py-28">
      <div className="container-page mx-auto max-w-xl text-center">
        <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-accent">
          Lỗi 404
        </p>
        <h1 className="mt-3 text-[2rem] sm:text-[2.5rem]">
          Không tìm thấy trang bạn yêu cầu
        </h1>
        <p className="mt-3 text-[15.5px] text-muted">
          Liên kết có thể đã thay đổi hoặc mã yêu cầu không tồn tại. Bạn có thể quay về trang chủ hoặc xem danh mục sản phẩm Teflon.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn btn-brand">
            <ArrowLeft size={16} aria-hidden />
            Về trang chủ
          </Link>
          <Link href="/san-pham" className="btn btn-outline">
            Xem sản phẩm
            <ArrowRight size={16} weight="bold" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
