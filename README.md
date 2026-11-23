# CỔNG ĐĂNG KÝ MÔN HỌC THÔNG MINH (SMART ENROLLMENT PORTAL)

> **Học phần:** Thiết kế Web  
> **Lớp học:** 25CT111  
> **Đề tài:** 2.1.2 - Cổng Đăng ký Môn học Thông minh (Smart Enrollment Portal)  
> **Kiến trúc:** Frontend thuần HTML5 / CSS3 Modern / Vanilla ES6 Modular (Không dùng framework/thư viện bên ngoài)

---

## 🌐 1. THÔNG TIN BẢNG DEMO TRỰC TUYẾN
- **GitHub Repository:** `https://github.com/dinhhuuphuoc-25ct111/smart-enrollment`
- **Link Demo GitHub Pages:** [https://dinhhuuphuoc-25ct111.github.io/smart-enrollment/]((https://huuphuocgith2802.github.io/smart-enrollment/))

---

## 👥 2. BẢNG PHÂN CÔNG NHIỆM VỤ THÀNH VIÊN NHÓM (LỚP 25CT111)

| STT | Họ và Tên | Mã Sinh Viên (MSSV) | Lớp | Vai trò | Nhánh GitHub (Git Branch) | Nhiệm vụ chính phụ trách | Tỷ lệ đóng góp |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- | :---: |
| **1** | **Đinh Hữu Phước** | **125000155** | **25CT111** | **Nhóm trưởng (Leader)** | `main` / `leader-core` | Khung kiến trúc `index.html`, hệ biến & layout `css/variables.css`, lập trình Core JS `js/cart-logic.js`, kiểm soát giới hạn 25 TC, CustomEvent, quản lý GitHub & tài liệu `README.md`. | **100%** |
| **2** | **Nguyễn Thành Phát** | **125000658** | **25CT111** | **Thành viên** | `feature-catalog` | Danh mục môn học `data-*`, thiết kế thanh tìm kiếm & lọc tín chỉ, tạo kiểu `css/catalog.css`, lập trình tìm kiếm `js/search-filter.js`. | **100%** |
| **3** | **Nguyễn Tấn Điền** | **125000260** | **25CT111** | **Thành viên** | `feature-table-vision` | Bảng kế hoạch môn đã chọn, Responsive trên thiết bị di động, modal xác nhận thanh toán/in phiếu, `css/table-responsive.css`, `js/vision-features.js`. | **100%** |

---

## 🎯 3. GIỚI THIỆU ĐỀ TÀI & MỤC TIÊU DỰ ÁN

Hệ thống "Cổng Đăng ký Môn học Thông minh" giải quyết bài toán cốt lõi của sinh viên đại học trong mỗi kỳ đăng ký học phần:
1. **Trực quan hóa danh mục môn học:** Hiển thị rõ ràng mã môn, tên môn, số tín chỉ, môn tiên quyết, lịch học và học phí.
2. **Kiểm soát quy chế tín chỉ học kỳ chặt chẽ (Hard Limit 25 TC):**
   - Giới hạn tối đa **25 tín chỉ / học kỳ**.
   - Cảnh báo cận tải khi đăng ký từ **20 tín chỉ** trở lên.
   - **NGĂN CHẶN TUYỆT ĐỐI** và giải thích rõ số tín chỉ vượt mức nếu sinh viên cố gắng chọn môn học làm tổng tín chỉ > 25.
3. **Tính toán học phí thời gian thực (Real-time Calculation):** Tự động cập nhật tổng học phí tạm tính ngay khi thêm hoặc xóa môn học.
4. **Lưu trữ phiên làm việc (Data Persistence):** Sử dụng `localStorage` để sinh viên không bị mất dữ liệu khi tải lại trang (F5).
5. **Khả năng cộng tác nhóm không xung đột (Zero Conflict Git Architecture):** Tách bạch rõ 3 file CSS và 3 file JS, phân chia vùng giao diện trong `index.html` bằng comment đánh dấu.

---

## 📂 4. CẤU TRÚC CÂY THƯ MỤC DỰ ÁN

```text
smart-enrollment/
├── index.html                   # Khung HTML5 chính, chia 2 vùng rõ ràng cho Phát và Điền
├── README.md                    # Tài liệu đồ án, phân công nhóm và hướng dẫn Git
├── css/
│   ├── variables.css            # [Phước] Hệ biến :root, Reset CSS, Header, Layout 2 cột, Footer
│   ├── catalog.css              # [Phát] Định dạng danh mục môn học, thanh tìm kiếm, course-card
│   └── table-responsive.css     # [Điền] Định dạng bảng môn đã chọn, Responsive Mobile, Modal
└── js/
    ├── cart-logic.js            # [Phước] Core Engine: Giỏ hàng, Event Delegation, kiểm tra 25 TC, CustomEvent
    ├── search-filter.js         # [Phát] Logic tìm kiếm thời gian thực theo tên, mã môn và bộ lọc tín chỉ
    └── vision-features.js       # [Điền] Lắng nghe CustomEvent, mở modal thanh toán, in phiếu đăng ký
```

---

## 🚀 5. CHI TIẾT CÁC TÍNH NĂNG ĐÃ HOÀN THÀNH

### 5.1. Kiến trúc HTML5 & CSS3 (`index.html` & `css/variables.css` - Đinh Hữu Phước)
- **Chuẩn ngữ nghĩa HTML5:** Áp dụng đầy đủ `<header>`, `<main>`, `<section>`, `<article>`, `<table>`, `<footer>` chuẩn W3C và hỗ trợ Accessibility (ARIA).
- **Hệ biến toàn cục `:root`:**
  - Bảng màu: `--color-primary` (Xanh dương hiện đại), `--color-success` (Đã chọn), `--color-warning` (Cận tải >= 20 TC), `--color-danger` (Vượt mức > 25 TC).
  - Biến kích thước, bo góc (`--radius-*`), đổ bóng (`--shadow-*`), chuyển động (`--transition-*`).
- **Bố cục 2 cột `.portal-layout`:**
  - Sử dụng CSS Grid `1.35fr 1fr` trên màn hình Desktop lớn.
  - Breakpoint `@media (max-width: 992px)` tự động chuyển thành 1 cột mượt mà.
- **Header & Footer chuẩn chỉnh:**
  - Header hiển thị tên Nhóm trưởng: **Đinh Hữu Phước (125000155 - Lớp 25CT111)** và mức trần 25 TC.
  - Footer hiển thị thẻ thông tin cá nhân của cả 3 thành viên trong nhóm.

### 5.2. Core JavaScript Engine (`js/cart-logic.js` - Đinh Hữu Phước)
- **Mô hình IIFE:** Toàn bộ mã nguồn bọc trong hàm tự thực thi `(() => { ... })();` tránh xung đột biến toàn cục với các thành viên khác.
- **Event Delegation:**
  - Bắt sự kiện click `.btn-enroll` trên container `#course-list`. Đảm bảo hoạt động ổn định kể cả khi Phát thêm môn động hay lọc danh sách.
  - Bắt sự kiện click `.btn-remove-course` trên `#selected-courses-body`.
- **Đọc dữ liệu `data-*` chuẩn W3C:** Trích xuất 6 trường: `data-id`, `data-name`, `data-credits`, `data-prereq`, `data-schedule`, `data-tuition`.
- **Thuật toán kiểm soát tín chỉ (Max 25 TC):**
  - Khi thêm môn học mới, kiểm tra `Tổng TC hiện tại + TC môn mới > 25`.
  - Nếu vi phạm: Lập tức từ chối, render thông báo cảnh báo trực quan vào `#credit-warning`, chỉ rõ số tín chỉ vượt mức.
  - Khi `Tổng TC >= 20` và `< 25`: Thanh tiến độ đổi sang màu cam cảnh báo (`.is-warning`).
  - Khi `Tổng TC == 25`: Thanh tiến độ đổi sang màu đỏ rực chạm mức tối đa (`.is-full`).
- **Đồng bộ trạng thái nút `.btn-enroll`:**
  - Môn đã đăng ký: Thẻ cha nhận class `.is-enrolled`, nút đổi sang màu xanh lá `✓ Đã đăng ký`, tự động disable.
  - Môn chưa đăng ký nhưng nếu thêm sẽ vượt 25 TC: Thêm class `.btn-would-exceed` để sinh viên nhận biết trước giới hạn.
- **Lưu trữ `localStorage`:** Tự động lưu và phục hồi giỏ hàng qua key `smart_enrollment_cart_25ct111`.
- **Giao tiếp liên module bằng `CustomEvent` & Global API:**
  - Mỗi khi giỏ hàng biến động, hệ thống dispatch sự kiện:
    ```javascript
    new CustomEvent('cartUpdated', { detail: { cart, totalCredits, totalTuition, maxCredits } })
    ```
  - Cung cấp API `window.SmartEnrollment` chứa các phương thức: `getCart()`, `getTotalCredits()`, `getTotalTuition()`, `addCourse()`, `removeCourse()`, `clearCart()`, `isEnrolled()`, `checkCanAdd()`.

---

## 🛠️ 6. QUY TRÌNH PHỐI HỢP GIT FLOW TRÁNH XUNG ĐỘT (MERGE CONFLICTS)

Để 3 thành viên có thể đẩy code song song lên GitHub mà không bị lỗi đè code:

1. **Phân quyền nhánh riêng:**
   - **Đinh Hữu Phước (Leader):** Quản lý nhánh `main`, duyệt Pull Request và cập nhật `css/variables.css`, `index.html`, `js/cart-logic.js`.
   - **Nguyễn Thành Phát:** Chỉ làm việc trên nhánh `feature-catalog`, chỉnh sửa `css/catalog.css` và `js/search-filter.js`.
   - **Nguyễn Tấn Điền:** Chỉ làm việc trên nhánh `feature-table-vision`, chỉnh sửa `css/table-responsive.css` và `js/vision-features.js`.
2. **Quy tắc sửa `index.html`:**
   - Phát chỉ thêm thẻ hoặc sửa trong phạm vi `<!-- [PHÁT - START] --> ... <!-- [PHÁT - END] -->`.
   - Điền chỉ sửa bảng và modal trong phạm vi `<!-- [ĐIỀN - START] --> ... <!-- [ĐIỀN - END] -->`.
3. **Các lệnh Git cơ bản cho thành viên:**
   ```bash
   # Bước 1: Clone dự án về máy
   git clone https://github.com/dinhhuuphuoc-25ct111/smart-enrollment.git
   cd smart-enrollment

   # Bước 2: Tạo nhánh riêng theo phân công
   git checkout -b feature-catalog        # Dành cho Phát
   # hoặc:
   git checkout -b feature-table-vision   # Dành cho Điền

   # Bước 3: Đẩy code lên nhánh của mình
   git add .
   git commit -m "feat(catalog): hoàn thiện bộ lọc tìm kiếm và thẻ môn học"
   git push origin <tên-nhánh>

   # Bước 4: Tạo Pull Request (PR) trên GitHub gửi cho Leader (Đinh Hữu Phước) review và merge vào main.
   ```

---

## 💻 7. HƯỚNG DẪN KHỞI CHẠY VÀ KIỂM THỬ TẠI MÁY LOCAL

1. **Mở trực tiếp bằng trình duyệt:**
   - Nhấp đúp vào file `index.html` hoặc chuột phải chọn **Open with Google Chrome / Microsoft Edge**.
2. **Sử dụng Live Server trong VS Code:**
   - Cài extension **Live Server** của Ritwick Dey.
   - Nhấp chuột phải vào `index.html` chọn **Open with Live Server** (cổng mặc định `http://127.0.0.1:5500`).
3. **Kịch bản kiểm thử (Test Cases):**
   - **Test 1:** Nhấn "+ Đăng ký môn" tại môn IT001 (3 TC) và IT002 (4 TC). Quan sát tổng TC tăng thành 7 TC, học phí tăng lên 3.150.000 ₫, bảng hiển thị 2 dòng.
   - **Test 2:** Đăng ký tiếp các môn IT003 (4 TC), IT004 (3 TC), IT005 (3 TC)... Khi tổng tín chỉ chạm mốc >= 20 TC, thanh tiến độ chuyển sang màu cam cảnh báo.
   - **Test 3 (Giới hạn 25 TC):** Khi giỏ hàng đang có 23 hoặc 24 tín chỉ, cố gắng bấm đăng ký môn 3 TC hoặc 4 TC: Hệ thống lập tức từ chối, không thêm vào giỏ, hiển thị cảnh báo đỏ chi tiết số TC bị vượt mức.
   - **Test 4:** F5 tải lại trang: Dữ liệu giỏ hàng và trạng thái các nút vẫn giữ nguyên từ `localStorage`.
   - **Test 5:** Nhấn "🗑️ Xóa tất cả" hoặc nút "✕ Xóa" từng môn: Dữ liệu cập nhật theo thời gian thực.
