/**
 * ==============================================================================
 * DỰ ÁN CUỐI KỲ: THIẾT KẾ WEB - LỚP 25CT111
 * FILE: js/cart-logic.js
 * PHỤ TRÁCH: Đinh Hữu Phước (MSSV: 125000155 - Nhóm trưởng)
 * MÔ TẢ: Core JS quản lý Giỏ hàng môn học, kiểm tra giới hạn 25 TC, lưu
 *        LocalStorage, đồng bộ trạng thái thẻ môn học và phát CustomEvent API.
 * ==============================================================================
 */

(() => {
  'use strict';

  const MAX_CREDITS = 25;
  const WARNING_CREDITS = 20;
  const STORAGE_KEY = 'smart_enrollment_cart_25ct111';

  let enrolledCourses = [];
  let warningTimer = null;

  /**
   * Định dạng tiền tệ VNĐ (VD: 1350000 -> 1.350.000 ₫)
   */
  function formatCurrency(amount) {
    return `${Number(amount || 0).toLocaleString('vi-VN')} ₫`;
  }

  /**
   * Đọc dữ liệu giỏ hàng từ LocalStorage
   */
  function loadCartFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      enrolledCourses = Array.isArray(parsed) ? parsed : [];
    } catch {
      enrolledCourses = [];
    }
  }

  /**
   * Lưu giỏ hàng vào LocalStorage
   */
  function saveCartToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(enrolledCourses));
    } catch {
      // Bỏ qua nếu trình duyệt chặn localStorage
    }
  }

  function getTotalCredits() {
    return enrolledCourses.reduce((sum, item) => sum + Number(item.credits || 0), 0);
  }

  function getTotalTuition() {
    return enrolledCourses.reduce((sum, item) => sum + Number(item.tuition || 0), 0);
  }

  function isEnrolled(courseId) {
    return enrolledCourses.some((item) => item.id === courseId);
  }

  /**
   * Hiển thị hộp cảnh báo trong #credit-warning
   */
  function renderCreditWarning(customErrorMessage = '') {
    const warningContainer = document.getElementById('credit-warning');
    if (!warningContainer) return;

    const totalCredits = getTotalCredits();

    if (customErrorMessage) {
      warningContainer.innerHTML = `
        <div class="alert alert-danger" role="alert">
          <span class="alert-icon" aria-hidden="true">🚫</span>
          <div>
            <strong>Vượt quá hạn mức tín chỉ!</strong><br>
            ${customErrorMessage}
          </div>
        </div>
      `;
      clearTimeout(warningTimer);
      warningTimer = setTimeout(() => {
        renderCreditWarning();
      }, 4500);
      return;
    }

    if (totalCredits >= MAX_CREDITS) {
      warningContainer.innerHTML = `
        <div class="alert alert-danger" role="status">
          <span class="alert-icon" aria-hidden="true">🛑</span>
          <div>
            <strong>Đã chạm mức trần ${MAX_CREDITS} tín chỉ.</strong> Bạn không thể đăng ký thêm môn học mới trừ khi hủy bớt môn đã chọn.
          </div>
        </div>
      `;
    } else if (totalCredits >= WARNING_CREDITS) {
      warningContainer.innerHTML = `
        <div class="alert alert-warning" role="status">
          <span class="alert-icon" aria-hidden="true">⚠️</span>
          <div>
            <strong>Cảnh báo khối lượng học tập:</strong> Bạn đã chọn ${totalCredits}/${MAX_CREDITS} TC (còn tối đa ${MAX_CREDITS - totalCredits} TC). Hãy cân nhắc lịch học hợp lý.
          </div>
        </div>
      `;
    } else {
      warningContainer.innerHTML = '';
    }
  }

  /**
   * Cập nhật trạng thái nút & thẻ môn học bên cột Danh mục (Phát)
   */
  function syncCatalogCards() {
    const cards = document.querySelectorAll('#course-list .course-card');
    const currentCredits = getTotalCredits();

    cards.forEach((card) => {
      const id = card.dataset.id;
      const credits = Number(card.dataset.credits || 0);
      const enrollBtn = card.querySelector('.btn-enroll');
      if (!enrollBtn) return;

      const enrolled = isEnrolled(id);
      const wouldExceed = !enrolled && currentCredits + credits > MAX_CREDITS;

      card.classList.toggle('is-enrolled', enrolled);
      enrollBtn.classList.toggle('btn-enrolled', enrolled);
      enrollBtn.classList.toggle('btn-would-exceed', wouldExceed);

      if (enrolled) {
        enrollBtn.textContent = '✓ Đã đăng ký (Bấm để hủy)';
        enrollBtn.setAttribute('aria-pressed', 'true');
      } else if (wouldExceed) {
        enrollBtn.textContent = `⚠ Vượt hạn mức (+${credits} TC)`;
        enrollBtn.setAttribute('aria-pressed', 'false');
      } else {
        enrollBtn.textContent = '+ Đăng ký môn';
        enrollBtn.setAttribute('aria-pressed', 'false');
      }
    });
  }

  /**
   * Render bảng danh sách môn đã chọn, thanh tiến độ & tổng học phí
   */
  function renderCart() {
    const tbody = document.getElementById('selected-courses-body');
    const totalCreditsEl = document.getElementById('total-credits');
    const progressBarEl = document.getElementById('credit-progress-bar');
    const statusTextEl = document.getElementById('credit-status-text');
    const totalTuitionEl = document.getElementById('total-tuition');
    const checkoutBtn = document.getElementById('btn-checkout');
    const clearBtn = document.getElementById('btn-clear-cart');

    const totalCredits = getTotalCredits();
    const totalTuition = getTotalTuition();
    const percent = Math.min((totalCredits / MAX_CREDITS) * 100, 100);

    // 1. Cập nhật số tín chỉ & thanh tiến độ
    if (totalCreditsEl) totalCreditsEl.textContent = String(totalCredits);

    if (progressBarEl) {
      progressBarEl.style.width = `${percent}%`;
      progressBarEl.setAttribute('aria-valuenow', String(totalCredits));
      progressBarEl.classList.toggle('is-warning', totalCredits >= WARNING_CREDITS && totalCredits < MAX_CREDITS);
      progressBarEl.classList.toggle('is-full', totalCredits >= MAX_CREDITS);
    }

    if (statusTextEl) {
      if (totalCredits === 0) {
        statusTextEl.textContent = `Chưa có môn học nào được đăng ký (Hạn mức: ${MAX_CREDITS} TC).`;
      } else if (totalCredits >= MAX_CREDITS) {
        statusTextEl.textContent = `Đã đạt giới hạn tối đa ${MAX_CREDITS}/${MAX_CREDITS} TC (${enrolledCourses.length} môn học).`;
      } else {
        statusTextEl.textContent = `Đã chọn ${enrolledCourses.length} môn học • Còn có thể đăng ký thêm ${MAX_CREDITS - totalCredits} TC.`;
      }
    }

    // 2. Render các dòng bảng
    if (tbody) {
      if (enrolledCourses.length === 0) {
        tbody.innerHTML = `
          <tr class="empty-state-row">
            <td colspan="5" class="empty-state-cell">
              <div class="empty-cart-message">
                <span class="empty-icon">🛒</span>
                <p>Giỏ đăng ký hiện đang trống.</p>
                <small>Hãy chọn các môn học ở danh sách bên trái để thêm vào kế hoạch.</small>
              </div>
            </td>
          </tr>
        `;
      } else {
        tbody.innerHTML = enrolledCourses
          .map(
            (course) => `
            <tr data-course-id="${course.id}">
              <td data-label="Mã môn">
                <span class="table-course-code">${course.id}</span>
              </td>
              <td data-label="Tên môn học">
                <div class="table-course-name">${course.name}</div>
                <div class="table-course-sub">${course.schedule}</div>
              </td>
              <td data-label="Số TC" class="text-center">
                <span class="table-credit-pill">${course.credits} TC</span>
              </td>
              <td data-label="Học phí" class="text-right table-tuition-cell">
                ${formatCurrency(course.tuition)}
              </td>
              <td data-label="Thao tác" class="text-center">
                <button 
                  type="button" 
                  class="btn-remove-course" 
                  data-remove-id="${course.id}" 
                  title="Xóa môn ${course.id}"
                  aria-label="Xóa môn ${course.name}"
                >
                  ✕ Xóa
                </button>
              </td>
            </tr>
          `
          )
          .join('');
      }
    }

    // 3. Cập nhật học phí & nút hành động
    if (totalTuitionEl) totalTuitionEl.textContent = formatCurrency(totalTuition);
    if (checkoutBtn) checkoutBtn.disabled = enrolledCourses.length === 0;
    if (clearBtn) clearBtn.disabled = enrolledCourses.length === 0;

    // 4. Cập nhật cảnh báo, thẻ môn học và phát CustomEvent cho vision-features.js
    renderCreditWarning();
    syncCatalogCards();
    saveCartToStorage();

    document.dispatchEvent(
      new CustomEvent('enrollment:updated', {
        detail: {
          cart: enrolledCourses.map((c) => ({ ...c })),
          totalCredits,
          totalTuition,
          maxCredits: MAX_CREDITS,
        },
      })
    );
  }

  /**
   * Thêm môn học vào giỏ (kiểm tra giới hạn 25 TC)
   */
  function addCourse(course) {
    if (isEnrolled(course.id)) return;

    const currentCredits = getTotalCredits();
    const newTotal = currentCredits + course.credits;

    if (newTotal > MAX_CREDITS) {
      renderCreditWarning(
        `Môn <strong>${course.id} - ${course.name}</strong> (${course.credits} TC) làm tổng tín chỉ lên <strong>${newTotal}/${MAX_CREDITS} TC</strong>. Vui lòng hủy bớt ít nhất ${newTotal - MAX_CREDITS} TC trước khi thêm.`
      );
      return;
    }

    enrolledCourses.push(course);
    renderCart();
  }

  /**
   * Xóa 1 môn học theo mã môn
   */
  function removeCourse(courseId) {
    const initialLength = enrolledCourses.length;
    enrolledCourses = enrolledCourses.filter((item) => item.id !== courseId);
    if (enrolledCourses.length !== initialLength) {
      renderCart();
    }
  }

  /**
   * Xóa toàn bộ giỏ hàng
   */
  function clearCart() {
    if (enrolledCourses.length === 0) return;
    if (window.confirm('Bạn có chắc muốn xóa toàn bộ các môn học đã chọn khỏi kế hoạch?')) {
      enrolledCourses = [];
      renderCart();
    }
  }

  /**
   * Khởi tạo các bộ lắng nghe sự kiện
   */
  function initCartLogic() {
    loadCartFromStorage();

    const courseList = document.getElementById('course-list');
    const selectedBody = document.getElementById('selected-courses-body');
    const clearBtn = document.getElementById('btn-clear-cart');

    // Event Delegation cho nút "Đăng ký môn" ở cột trái
    if (courseList) {
      courseList.addEventListener('click', (event) => {
        const enrollBtn = event.target.closest('.btn-enroll');
        if (!enrollBtn) return;

        const card = enrollBtn.closest('.course-card');
        if (!card) return;

        const courseId = card.dataset.id;
        if (isEnrolled(courseId)) {
          removeCourse(courseId);
          return;
        }

        addCourse({
          id: courseId,
          name: card.dataset.name || '',
          credits: Number(card.dataset.credits || 0),
          prereq: card.dataset.prereq || 'Không có',
          schedule: card.dataset.schedule || '',
          tuition: Number(card.dataset.tuition || 0),
        });
      });
    }

    // Event Delegation cho nút "Xóa" từng dòng trong bảng bên phải
    if (selectedBody) {
      selectedBody.addEventListener('click', (event) => {
        const removeBtn = event.target.closest('.btn-remove-course');
        if (!removeBtn) return;
        removeCourse(removeBtn.dataset.removeId);
      });
    }

    // Nút "Xóa tất cả"
    if (clearBtn) {
      clearBtn.addEventListener('click', clearCart);
    }

    renderCart();
  }

  // Cung cấp API dùng chung cho các module khác (vision-features.js)
  window.SmartEnrollment = {
    MAX_CREDITS,
    formatCurrency,
    getCart: () => enrolledCourses.map((c) => ({ ...c })),
    getTotalCredits,
    getTotalTuition,
    removeCourse,
    clearCart,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCartLogic);
  } else {
    initCartLogic();
  }
})();
