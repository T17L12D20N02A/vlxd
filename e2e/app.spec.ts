import { expect, test } from "@playwright/test";

test.describe("Vina Khang E2E", () => {
  let createdQuoteCode = "";

  test("1. Trang chủ hiển thị đầy đủ và không có lỗi console", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/");
    await expect(page.locator("main h1")).toBeVisible();
    await expect(page.getByText(/Tiêu điểm 01 \//)).toBeVisible();
    await expect(page.getByText("5 nhóm sản phẩm chính")).toBeVisible();
    await expect(page.getByText("Sản phẩm nổi bật")).toBeVisible();

    const brokenImages = await page.evaluate(() =>
      Array.from(document.images)
        .filter((img) => img.complete && img.naturalWidth === 0)
        .map((img) => img.src)
    );
    expect(brokenImages).toEqual([]);

    // Ensure hero heading is actually visible (opacity 1) and light text on dark background
    const heroCheck = await page.evaluate(() => {
      const h1 = document.querySelector("main h1");
      if (!h1) return null;
      const st = getComputedStyle(h1);
      const m = st.color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      const lum = m ? (0.299 * +m[1] + 0.587 * +m[2] + 0.114 * +m[3]) / 255 : 0;
      const wrap = h1.closest(".vk-reveal");
      return {
        opacity: Number(wrap ? getComputedStyle(wrap).opacity : st.opacity),
        lum,
      };
    });
    expect(heroCheck).not.toBeNull();
    expect(heroCheck!.opacity).toBeGreaterThan(0.9);
    expect(heroCheck!.lum).toBeGreaterThan(0.75);
    expect(errors).toEqual([]);
  });

  test("2. Lọc danh mục, tìm kiếm không dấu và thêm sản phẩm vào giỏ báo giá", async ({
    page,
  }) => {
    await page.goto("/san-pham");
    const main = page.getByRole("main");
    await expect(main.getByText(/Hiển thị 1\d\d \/ 1\d\d sản phẩm/)).toBeVisible();

    const search = main.getByLabel("Tìm kiếm sản phẩm");
    await search.fill("bang tai");
    await expect(page).toHaveURL(/q=bang\+tai|q=bang%20tai/);
    await expect(main.getByText(/Hiển thị [1-9]\d* \/ 1\d\d sản phẩm/)).toBeVisible();

    await main.getByRole("button", { name: "Xóa bộ lọc" }).click();
    await expect(main.getByText(/Hiển thị 1\d\d \/ 1\d\d sản phẩm/)).toBeVisible();

    await main.getByRole("button", { name: /Vải Teflon chịu nhiệt/i }).click();
    await expect(page).toHaveURL(/danh-muc=vai/);

    await page.getByRole("link", { name: /Vải chịu nhiệt cao cấp/i }).first().click();
    await expect(page).toHaveURL(/\/san-pham\/vai-chiu-nhiet-cao-cap$/);
    await expect(
      page.getByRole("heading", { level: 1, name: /Vải chịu nhiệt cao cấp/i })
    ).toBeVisible();

    await page.getByRole("button", { name: "Tăng số lượng" }).click();
    await page.getByRole("button", { name: "Thêm vào yêu cầu" }).click();
    await expect(
      page.getByText(/Đang có 2 sản phẩm này trong giỏ yêu cầu báo giá/)
    ).toBeVisible();

    // Verify cart persists on /bao-gia and submit quote
    await page.goto("/bao-gia");
    await expect(
      page.getByRole("link", { name: /Vải chịu nhiệt cao cấp/i }).first()
    ).toBeVisible();

    await page.getByLabel(/Họ và tên/).fill("Nguyễn Test E2E");
    await page.getByLabel(/Số điện thoại/).fill("0932149717");
    await page.getByLabel(/^Email/).fill("test@vinakhang.vn");
    await page.getByLabel(/Công ty/).fill("Xưởng May Test");
    await page.getByLabel(/Ghi chú/).fill("Kiểm thử E2E độ dày 0.13mm");

    await page.getByRole("button", { name: "Gửi yêu cầu báo giá" }).click();

    await expect(page).toHaveURL(/\/bao-gia\/VK-\d{6}-\d{3}$/);
    const url = page.url();
    const match = url.match(/(VK-\d{6}-\d{3})$/);
    expect(match).not.toBeNull();
    createdQuoteCode = match![1];

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Yêu cầu báo giá ${createdQuoteCode}`,
      })
    ).toBeVisible();
    await expect(page.getByText("Mới tiếp nhận").first()).toBeVisible();
    await expect(page.getByText("Yêu cầu của bạn đã được ghi nhận")).toBeVisible();
  });

  test("3. Tra cứu yêu cầu báo giá theo mã VK-...", async ({ page }) => {
    expect(createdQuoteCode).toMatch(/^VK-\d{6}-\d{3}$/);

    await page.goto("/bao-gia/tra-cuu");
    await page.getByLabel("Mã yêu cầu hoặc số điện thoại").fill(createdQuoteCode);
    await page.getByRole("button", { name: "Tra cứu" }).click();

    await expect(
      page.getByRole("link", { name: new RegExp(createdQuoteCode) }).first()
    ).toBeVisible();
    await expect(page.getByText("Nguyễn Test E2E").first()).toBeVisible();
  });

  test("4. Gửi biểu mẫu liên hệ thành công", async ({ page }) => {
    await page.goto("/lien-he");
    await page.getByLabel(/Họ và tên/).fill("Trần Liên Hệ");
    await page.getByLabel(/Số điện thoại/).fill("0912345678");
    await page.getByLabel(/Email/).fill("lienhe@test.vn");
    await page.getByLabel(/Nội dung cần tư vấn/).fill("Cần tư vấn khổ vải Teflon 1.2m");

    await page.getByRole("button", { name: "Gửi liên hệ" }).click();
    await expect(page.getByText("Đã gửi tin nhắn thành công!")).toBeVisible();
  });

  test("5. Các trang nội dung (Ứng dụng, Tin tức, Tuyển dụng) tải ổn định", async ({
    page,
  }) => {
    await page.goto("/ung-dung");
    await expect(
      page.getByRole("heading", { level: 1, name: /Ứng dụng vật liệu Teflon/i })
    ).toBeVisible();

    await page.goto("/tin-tuc");
    await expect(
      page.getByRole("heading", { level: 1, name: /Kiến thức & tin tức kỹ thuật/i })
    ).toBeVisible();

    await page.goto("/tuyen-dung");
    await expect(
      page.getByRole("heading", { level: 1, name: /Tuyển dụng tại Vina Khang/i })
    ).toBeVisible();
  });

  test("6. Quản trị: bảo vệ route, đăng nhập, xem liên hệ & chuyển trạng thái báo giá", async ({
    page,
  }) => {
    expect(createdQuoteCode).toMatch(/^VK-\d{6}-\d{3}$/);

    await page.goto("/quan-tri");
    await expect(page).toHaveURL(/\/quan-tri\/dang-nhap$/);

    await page.getByLabel("Mật khẩu quản trị").fill("vinakhang");
    await page.getByRole("button", { name: "Đăng nhập" }).click();

    await expect(page).toHaveURL(/\/quan-tri$/);
    await expect(page.getByRole("link", { name: createdQuoteCode })).toBeVisible();
    await expect(page.getByText("Trần Liên Hệ").first()).toBeVisible();
    await expect(page.getByText(/Mục cần kiểm tra & hoàn thiện/)).toBeVisible();

    // Verify URL-synced tab navigation (?muc=banner & ?muc=products), pagination, preview tab, and unsaved-changes guard
    const adminNav = page.getByRole("navigation", { name: "Menu quản trị" });
    await adminNav.getByRole("button", { name: /^Banner nổi bật/ }).click();
    await expect(page).toHaveURL(/\/quan-tri\?muc=banner$/);
    await expect(page.getByText(/Đang chọn \d+ \/ 10 sản phẩm trên Banner/)).toBeVisible();

    await adminNav.getByRole("button", { name: /^Sản phẩm/ }).click();
    await expect(page).toHaveURL(/\/quan-tri\?muc=products$/);
    await expect(page.getByText(/Trang 1 \//)).toBeVisible();

    await page.getByRole("button", { name: "Thêm sản phẩm" }).click();
    const editorDialog = page.getByRole("dialog");
    await expect(editorDialog).toBeVisible();
    await editorDialog.getByPlaceholder("Vải Teflon chịu nhiệt...").fill("Sản phẩm nháp kiểm tra");
    await editorDialog.getByRole("tab", { name: "Xem trước" }).click();
    await expect(editorDialog.getByRole("heading", { name: "Sản phẩm nháp kiểm tra" })).toBeVisible();

    await editorDialog.getByRole("button", { name: "Hủy" }).click();
    await expect(page.getByText("Bỏ thay đổi chưa lưu?")).toBeVisible();
    await page.getByRole("button", { name: "Bỏ thay đổi" }).click();
    await expect(editorDialog).toHaveCount(0);

    await adminNav.getByRole("button", { name: /^Tổng quan/ }).click();
    await expect(page).toHaveURL(/\/quan-tri$/);

    await page.getByRole("link", { name: createdQuoteCode }).click();
    await expect(page).toHaveURL(new RegExp(`/quan-tri/${createdQuoteCode}$`));

    await page.getByRole("button", { name: /Chuyển sang: Đang xử lý/ }).click();
    await expect(page.getByText("Đang xử lý").first()).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Chuyển sang: Đã báo giá/ })
    ).toBeVisible();
  });

  test("7. CMS PostgreSQL: thêm, xác nhận lưu DB và xóa sản phẩm trong quản trị", async ({
    page,
    request,
  }) => {
    const health = await request.get("/api/health");
    expect(health.ok()).toBeTruthy();
    const healthJson = (await health.json()) as { ok: boolean; mode: string };
    expect(healthJson.ok).toBe(true);

    // Log in to admin
    await page.goto("/quan-tri/dang-nhap");
    await page.getByLabel("Mật khẩu quản trị").fill("vinakhang");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page).toHaveURL(/\/quan-tri$/);

    // Only run DB CRUD assertions when PostgreSQL is connected
    if (healthJson.mode !== "postgres") return;

    await expect(page.getByText("PostgreSQL · Đã kết nối")).toBeVisible();
    const adminNav = page.getByRole("navigation", { name: "Menu quản trị" });
    await adminNav.getByRole("button", { name: /^Sản phẩm/ }).click();
    await expect(page).toHaveURL(/\/quan-tri\?muc=products$/);
    await page.getByRole("button", { name: "Thêm sản phẩm" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.getByPlaceholder("Vải Teflon chịu nhiệt...").fill("Vải Teflon Test Docker");
    await dialog.getByRole("button", { name: "Lưu sản phẩm" }).click();

    await expect(page.getByText("Vải Teflon Test Docker")).toBeVisible();

    // Reload page to verify URL tab state (?muc=products) AND persistence in PostgreSQL
    await page.reload();
    await expect(page).toHaveURL(/\/quan-tri\?muc=products$/);
    await expect(page.getByText("Vải Teflon Test Docker")).toBeVisible();

    // Verify the new product appears live on public /san-pham AND opens its detail page
    await page.goto("/san-pham");
    const productLink = page
      .getByRole("main")
      .getByRole("link", { name: /Vải Teflon Test Docker/i })
      .first();
    await expect(productLink).toBeVisible();
    await productLink.click();
    await expect(page).toHaveURL(/\/san-pham\/vai-teflon-test-docker$/);
    await expect(
      page.getByRole("main").getByRole("heading", { level: 1, name: /Vải Teflon Test Docker/i })
    ).toBeVisible();

    // Return to /quan-tri?muc=products and clean up test product via accessible ConfirmDialog
    await page.goto("/quan-tri?muc=products");
    const row = page.locator("tr", { hasText: "Vải Teflon Test Docker" });
    await row.getByRole("button", { name: /Xóa Vải Teflon Test Docker/i }).click();
    const confirmModal = page.getByRole("dialog");
    await expect(confirmModal).toBeVisible();
    await confirmModal.getByRole("button", { name: "Xóa sản phẩm" }).click();
    await expect(page.getByText("Vải Teflon Test Docker")).toHaveCount(0);
  });

  test("8. Bảo mật API, kiểm tra form lỗi và trang 404", async ({
    page,
    request,
  }) => {
    const unauth = await request.get("/api/admin/cms");
    expect(unauth.status()).toBe(401);

    await page.goto("/quan-tri/dang-nhap");
    await page.getByLabel("Mật khẩu quản trị").fill("sai-mat-khau");
    await page.getByRole("button", { name: "Đăng nhập" }).click();
    await expect(page.getByText("Mật khẩu chưa đúng.")).toBeVisible();

    await page.goto("/bao-gia");
    await page.getByRole("button", { name: "Gửi yêu cầu báo giá" }).click();
    await expect(page.getByText("Vui lòng nhập họ tên.")).toBeVisible();
    await expect(page.getByText("Vui lòng nhập số điện thoại.")).toBeVisible();

    const notFoundResp = await page.goto("/khong-ton-tai-xyz");
    expect(notFoundResp?.status()).toBe(404);
    await expect(page.getByText("Không tìm thấy trang bạn yêu cầu")).toBeVisible();
  });

  test("9. Giao diện di động (390px) không tràn ngang và mở menu mượt", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const homeOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(homeOverflow).toBe(false);

    await page.getByRole("button", { name: "Mở menu" }).click();
    await expect(
      page.getByRole("navigation", { name: "Điều hướng di động" })
    ).toBeVisible();

    await page.goto("/san-pham");
    const catalogOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(catalogOverflow).toBe(false);
  });
});
