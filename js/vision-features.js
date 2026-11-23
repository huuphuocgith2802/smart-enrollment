/**
 * ==============================================================================
 * DỰ ÁN CUỐI KỲ: THIẾT KẾ WEB - LỚP 25CT111
 * ĐỀ TÀI 2.1.2: CỔNG ĐĂNG KÝ MÔN HỌC THÔNG MINH (SMART ENROLLMENT PORTAL)
 * FILE: js/vision-features.js
 * PHỤ TRÁCH: Nguyễn Tấn Điền (MSSV: 125000260 - Thành viên nhóm)
 * MÔ TẢ: Lắng nghe sự kiện cartUpdated, kiểm tra trùng lịch thời khóa biểu,
 *        kiểm tra điều kiện môn tiên quyết, quản lý Modal thanh toán trực tuyến
 *        và xuất phiếu đăng ký môn học (Receipt / Print).
 * ==============================================================================
 */

(() => {
  'use strict';

  // Thông tin sinh viên thực hiện
  const STUDENT_INFO = {
    name: 'Nguyễn Tấn Điền',
    id: '125000260',
    className: '25CT111',
    term: 'Học kỳ 1 / 2026-2027'
  };

  // Trạng thái cục bộ lưu trữ giỏ hàng hiện tại
  let currentCart = [];
  let currentTotalCredits = 0;
  let currentTotalTuition = 0;
  let currentTransactionId = '';
  let hasScheduleConflict = false;

  // DOM Elements
  const smartAlertsEl = document.getElementById('smart-alerts');
  const btnCheckoutEl = document.getElementById('btn-checkout');
  const checkoutModalEl = document.getElementById('checkout-modal');
  const modalSummaryBodyEl = document.getElementById('modal-summary-body');
  const btnCloseModalEl = document.getElementById('btn-close-modal');
  const btnConfirmPayEl = document.getElementById('btn-confirm-pay');

  /**
   * Định dạng số tiền sang chuẩn Việt Nam Đồng (VND)
   * @param {number} amount
   * @returns {string}
   */
  const formatCurrencyVND = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' ₫';
  };

  /**
   * Tạo mã giao dịch hóa đơn mô phỏng
   * @returns {string}
   */
  const generateTransactionId = () => {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SE-${year}-${randomHex}`;
  };

  /**
   * 1. TỐI ƯU THỜI KHÓA BIỂU: KIỂM TRA TRÙNG LỊCH HỌC
   * Quét mảng cart, nhóm các môn theo schedule hoặc phát hiện trùng tiết
   * @param {Array} cart
   * @returns {Array} Danh sách các xung đột lịch
   */
  const detectScheduleConflicts = (cart) => {
    const scheduleGroups = {};

    cart.forEach((course) => {
      if (!course.schedule) return;
      const cleanSchedule = course.schedule.trim();
      if (!scheduleGroups[cleanSchedule]) {
        scheduleGroups[cleanSchedule] = [];
      }
      scheduleGroups[cleanSchedule].push(course);
    });

    const conflicts = [];
    Object.keys(scheduleGroups).forEach((sched) => {
      if (scheduleGroups[sched].length >= 2) {
        conflicts.push({
          schedule: sched,
          courses: scheduleGroups[sched]
        });
      }
    });

    return conflicts;
  };

  /**
   * 2. KIỂM TRA ĐIỀU KIỆN TIÊN QUYẾT (PREREQUISITES)
   * Lọc các môn có điều kiện tiên quyết khác 'Không có'
   * @param {Array} cart
   * @returns {Array}
   */
  const getPrerequisiteCourses = (cart) => {
    return cart.filter((course) => {
      if (!course.prereq) return false;
      const p = course.prereq.trim().toLowerCase();
      return (
        p !== 'không có' &&
        p !== 'không' &&
        p !== 'none' &&
        p !== 'null' &&
        p !== '-' &&
        p !== 'chưa có'
      );
    });
  };

  /**
   * Cập nhật các khối cảnh báo thông minh trong vùng #smart-alerts
   * @param {Array} cart
   */
  const updateSmartAlerts = (cart) => {
    if (!smartAlertsEl) return;

    // Kiểm tra trùng lịch
    const conflicts = detectScheduleConflicts(cart);
    hasScheduleConflict = conflicts.length > 0;

    // Kiểm tra môn tiên quyết
    const prereqCourses = getPrerequisiteCourses(cart);

    let html = '';

    // Khối 1: Cảnh báo trùng lịch học (Màu đỏ)
    if (hasScheduleConflict) {
      html += `
        <div class="alert-box alert-conflict" role="alert">
          <span class="alert-icon">⚠️</span>
          <div class="alert-content">
            <span class="alert-title">Cảnh báo: Phát hiện TRÙNG THỜI KHÓA BIỂU!</span>
            <p>Có <strong>${conflicts.length}</strong> khung giờ bị trùng lịch giữa các môn học bạn đã chọn:</p>
            <ul>
              ${conflicts
                .map(
                  (c) => `
                <li>
                  <strong>${escapeHtml(c.schedule)}:</strong> 
                  ${c.courses.map((item) => `<span>${escapeHtml(item.name)} (<em>${escapeHtml(item.id)}</em>)</span>`).join(' <strong style="color:var(--danger);">&bull; TRÙNG VỚI &bull;</strong> ')}
                </li>
              `
                )
                .join('')}
            </ul>
            <small style="display:block; margin-top: 4px; font-style: italic;">
              Vui lòng hủy 1 trong các môn trùng lịch trên trước khi thanh toán để tránh xung đột giờ lên lớp!
            </small>
          </div>
        </div>
      `;
    }

    // Khối 2: Lưu ý điều kiện môn tiên quyết (Màu vàng/cam)
    if (prereqCourses.length > 0) {
      html += `
        <div class="alert-box alert-prereq" role="status">
          <span class="alert-icon">💡</span>
          <div class="alert-content">
            <span class="alert-title">Lưu ý điều kiện học phần tiên quyết:</span>
            <p>Các môn học sau đây yêu cầu bạn phải hoàn thành học phần tiên quyết trước khi đăng ký:</p>
            <ul>
              ${prereqCourses
                .map(
                  (c) => `
                <li>
                  <strong>${escapeHtml(c.name)} (${escapeHtml(c.id)})</strong> &rarr; Yêu cầu đã đạt: <em>${escapeHtml(c.prereq)}</em>
                </li>
              `
                )
                .join('')}
            </ul>
            <small style="display:block; margin-top: 4px;">
              Sinh viên vui lòng đảm bảo đã tích lũy môn tiên quyết để tránh bị phòng Đào tạo hủy học phần khi hậu kiểm.
            </small>
          </div>
        </div>
      `;
    }

    smartAlertsEl.innerHTML = html;
  };

  /**
   * Helper chống XSS khi chèn chuỗi HTML động
   * @param {string} str
   * @returns {string}
   */
  const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  /**
   * 3. MỞ MODAL XÁC NHẬN THANH TOÁN & RENDER BẢNG TỔNG KẾT
   */
  const openCheckoutModal = () => {
    if (!checkoutModalEl) return;

    // 1. Luôn đồng bộ dữ liệu giỏ hàng mới nhất từ window.SmartEnrollment nếu có
    if (window.SmartEnrollment && typeof window.SmartEnrollment.getCart === 'function') {
      const liveCart = window.SmartEnrollment.getCart();
      if (liveCart && liveCart.length > 0) {
        currentCart = liveCart;
      }
    }

    // Nếu currentCart vẫn rỗng, thử đọc từ LocalStorage
    if (!currentCart || currentCart.length === 0) {
      try {
        const saved = localStorage.getItem('smart_enrollment_cart_25ct111');
        if (saved) {
          currentCart = JSON.parse(saved);
        }
      } catch (e) {
        currentCart = [];
      }
    }

    // Luôn tính toán lại trực tiếp từ mảng currentCart để không bao giờ bị 0 tín chỉ
    const computedCredits = (currentCart || []).reduce((sum, c) => sum + (Number(c.credits) || 0), 0);
    const computedTuition = (currentCart || []).reduce((sum, c) => sum + (Number(c.tuition) || 0), 0);
    const totalEl = document.getElementById('total-credits');
    const creditsFromDom = totalEl ? parseInt(totalEl.textContent || '0', 10) : 0;

    currentTotalCredits = computedCredits || creditsFromDom || currentTotalCredits || (window.SmartEnrollment?.getTotalCredits?.()) || 0;
    currentTotalTuition = computedTuition || currentTotalTuition || (window.SmartEnrollment?.getTotalTuition?.()) || 0;

    // Kiểm tra giỏ hàng rỗng
    if ((!currentCart || currentCart.length === 0) && currentTotalCredits === 0) {
      alert('🛒 Giỏ đăng ký hiện đang trống! Vui lòng chọn ít nhất 1 môn học trước khi xác nhận.');
      return;
    }

    // 2. Nhắc nhở nếu đang trùng lịch học
    if (hasScheduleConflict) {
      const confirmContinue = confirm(
        '⚠️ CẢNH BÁO: Kế hoạch của bạn đang có môn học bị TRÙNG LỊCH!\n\nBạn có chắc chắn vẫn muốn tiếp tục xem và in phiếu đăng ký?'
      );
      if (!confirmContinue) return;
    }

    // Tạo mã giao dịch mới
    currentTransactionId = generateTransactionId();
    const currentDateStr = new Date().toLocaleString('vi-VN', {
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    // Render thông tin vào #modal-summary-body
    if (modalSummaryBodyEl) {
      modalSummaryBodyEl.innerHTML = `
        <div class="receipt-meta-box">
          <div class="receipt-meta-grid">
            <div class="receipt-meta-item">
              <span>Mã biên lai:</span> <strong>${escapeHtml(currentTransactionId)}</strong>
            </div>
            <div class="receipt-meta-item">
              <span>Thời gian:</span> <strong>${escapeHtml(currentDateStr)}</strong>
            </div>
            <div class="receipt-meta-item">
              <span>Sinh viên:</span> <strong>${escapeHtml(STUDENT_INFO.name)} (${escapeHtml(STUDENT_INFO.id)})</strong>
            </div>
            <div class="receipt-meta-item">
              <span>Lớp học:</span> <strong>${escapeHtml(STUDENT_INFO.className)} &bull; ${escapeHtml(STUDENT_INFO.term)}</strong>
            </div>
          </div>
        </div>

        <table class="modal-table-summary">
          <thead>
            <tr>
              <th style="width: 8%;">STT</th>
              <th style="width: 17%;">Mã môn</th>
              <th style="width: 35%;">Tên môn học</th>
              <th style="width: 15%; text-align: center;">Số TC</th>
              <th style="width: 25%; text-align: right;">Học phí</th>
            </tr>
          </thead>
          <tbody>
            ${currentCart
              .map(
                (c, idx) => `
              <tr>
                <td style="color: var(--text-muted);">${idx + 1}</td>
                <td><code style="font-weight: 600; color: var(--primary);">${escapeHtml(c.id)}</code></td>
                <td>
                  <strong>${escapeHtml(c.name)}</strong>
                  <div style="font-size: 0.725rem; color: var(--text-muted);">${escapeHtml(c.schedule)}</div>
                </td>
                <td style="text-align: center;">
                  <span class="credit-badge">${c.credits} TC</span>
                </td>
                <td style="text-align: right; font-weight: 600;">
                  ${formatCurrencyVND(c.tuition)}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="receipt-total-box">
          <div>
            <div style="font-size: 0.8125rem; color: var(--text-muted);">Tổng số tín chỉ đăng ký:</div>
            <strong style="font-size: 1.125rem; color: var(--primary);">
              ${currentTotalCredits} / 25 TC
            </strong>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8125rem; color: var(--text-muted);">Tổng học phí phải thanh toán:</div>
            <strong style="font-size: 1.35rem; color: var(--color-success, #16a34a); font-family: monospace;">
              ${formatCurrencyVND(currentTotalTuition)}
            </strong>
          </div>
        </div>

        ${
          hasScheduleConflict
            ? `<div class="alert-box alert-conflict" style="margin-top: 8px;">
                <span class="alert-icon">⚠️</span>
                <div class="alert-content">
                  <strong>Lưu ý:</strong> Phiếu này có học phần bị trùng lịch lên lớp.
                </div>
              </div>`
            : `<div class="alert-box" style="background-color: var(--success-bg); border: 1px solid var(--success); color: #15803d; margin-top: 8px;">
                <span class="alert-icon">✅</span>
                <div class="alert-content">
                  <strong>Thời khóa biểu hợp lệ:</strong> Không phát hiện bất kỳ xung đột lịch học nào.
                </div>
              </div>`
        }

        <div class="payment-methods-group">
          <div class="payment-methods-title">Chọn hình thức thanh toán học phí:</div>
          <div class="payment-methods-list">
            <div class="payment-method-card is-selected" data-method="vnpay">
              <div>🏦 VNPAY-QR</div>
              <small style="color: var(--text-muted);">Quét mã tức thì</small>
            </div>
            <div class="payment-method-card" data-method="atm">
              <div>💳 Thẻ ATM / Napas</div>
              <small style="color: var(--text-muted);">Nội địa Internet Banking</small>
            </div>
            <div class="payment-method-card" data-method="transfer">
              <div>📱 Chuyển khoản QR</div>
              <small style="color: var(--text-muted);">Ngân hàng 24/7</small>
            </div>
          </div>
        </div>
      `;

      // Thao tác chọn phương thức thanh toán
      const methodCards = modalSummaryBodyEl.querySelectorAll('.payment-method-card');
      methodCards.forEach((card) => {
        card.addEventListener('click', () => {
          methodCards.forEach((c) => c.classList.remove('is-selected'));
          card.classList.add('is-selected');
        });
      });
    }

    // Hiển thị nút Xác nhận thanh toán ban đầu
    if (btnConfirmPayEl) {
      btnConfirmPayEl.style.display = 'inline-flex';
      btnConfirmPayEl.disabled = false;
      btnConfirmPayEl.innerHTML = '💳 Xác Nhận Thanh Toán';
    }

    // Mở modal
    checkoutModalEl.classList.add('is-open');
    checkoutModalEl.classList.add('show');
    checkoutModalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden'; // Ngăn cuộn trang chính khi modal mở
  };

  /**
   * Đóng Modal thanh toán
   */
  const closeCheckoutModal = () => {
    if (!checkoutModalEl) return;
    checkoutModalEl.classList.remove('is-open');
    checkoutModalEl.classList.remove('show');
    checkoutModalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  /**
   * 4. XỬ LÝ THANH TOÁN THÀNH CÔNG VÀ IN BIÊN LAI
   */
  const handleConfirmPayment = () => {
    if (!btnConfirmPayEl || !modalSummaryBodyEl) return;

    // Loading state
    btnConfirmPayEl.disabled = true;
    btnConfirmPayEl.innerHTML = '⏳ Đang xác thực giao dịch...';

    // Đảm bảo số tín chỉ và học phí được lưu trữ chính xác từ giỏ hàng hiện tại
    const paidCredits = currentTotalCredits || (currentCart || []).reduce((sum, c) => sum + (Number(c.credits) || 0), 0) || parseInt(document.getElementById('total-credits')?.textContent || '0', 10);
    const paidTuition = currentTotalTuition || (currentCart || []).reduce((sum, c) => sum + (Number(c.tuition) || 0), 0);

    setTimeout(() => {
      // Ẩn nút thanh toán
      btnConfirmPayEl.style.display = 'none';

      // Render màn hình thành công
      modalSummaryBodyEl.innerHTML = `
        <div class="payment-success-banner">
          <div class="payment-success-icon">🎉</div>
          <h3 style="color: var(--success); font-size: 1.25rem; font-weight: 800; margin-bottom: 6px;">
            ĐĂNG KÝ & THANH TOÁN HỌC PHÍ THÀNH CÔNG!
          </h3>
          <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 16px;">
            Hệ thống Cổng Đăng ký Môn học Thông minh đã xác nhận và ghi nhận thành công kế hoạch học tập của sinh viên.
          </p>

          <div class="receipt-meta-box" style="text-align: left;">
            <div class="receipt-meta-grid">
              <div class="receipt-meta-item">
                <span>Mã giao dịch:</span> <strong>${escapeHtml(currentTransactionId)}</strong>
              </div>
              <div class="receipt-meta-item">
                <span>Trạng thái:</span> <strong style="color: var(--success);">ĐÃ HOÀN TẤT (PAID)</strong>
              </div>
              <div class="receipt-meta-item">
                <span>Số tín chỉ:</span> <strong>${paidCredits} TC</strong>
              </div>
              <div class="receipt-meta-item">
                <span>Số tiền đã thanh toán:</span> <strong style="color: var(--primary);">${formatCurrencyVND(paidTuition)}</strong>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 10px; margin-top: 20px; flex-wrap: wrap;">
            <button type="button" class="btn btn-primary" id="btn-print-receipt">
              🖨️ In Biên Lai Xác Nhận
            </button>
            <button type="button" class="btn btn-success" id="btn-finish-keep-cart">
              ✓ Hoàn Tất & Xem Kế Hoạch
            </button>
            <button type="button" class="btn btn-secondary" id="btn-finish-enrollment">
              🔄 Làm Mới Giỏ Hàng
            </button>
          </div>
        </div>
      `;

      // Gắn sự kiện nút In biên lai
      const btnPrint = document.getElementById('btn-print-receipt');
      if (btnPrint) {
        btnPrint.addEventListener('click', () => {
          window.print();
        });
      }

      // Nút hoàn tất nhưng giữ nguyên kế hoạch trên màn hình chính
      const btnKeep = document.getElementById('btn-finish-keep-cart');
      if (btnKeep) {
        btnKeep.addEventListener('click', () => {
          closeCheckoutModal();
        });
      }

      // Gắn sự kiện nút Hoàn tất & Làm mới giỏ
      const btnFinish = document.getElementById('btn-finish-enrollment');
      if (btnFinish) {
        btnFinish.addEventListener('click', () => {
          // Gọi hàm làm mới giỏ từ Core cart-logic
          if (window.SmartEnrollment && typeof window.SmartEnrollment.clearAllCourses === 'function') {
            window.SmartEnrollment.clearAllCourses();
          } else if (window.SmartEnrollment && typeof window.SmartEnrollment.clearCart === 'function') {
            window.SmartEnrollment.clearCart();
          }
          closeCheckoutModal();
        });
      }
    }, 800);
  };

  /**
   * Xử lý khi nhận được sự kiện cập nhật giỏ hàng từ cart-logic.js
   */
  const handleCartUpdated = (e) => {
    const detail = e.detail || {};
    currentCart = detail.cart || (window.SmartEnrollment?.getCart?.()) || [];
    currentTotalCredits = detail.totalCredits ?? (window.SmartEnrollment?.getTotalCredits?.()) ?? 0;
    currentTotalTuition = detail.totalTuition ?? (window.SmartEnrollment?.getTotalTuition?.()) ?? 0;

    // Cập nhật cảnh báo trùng lịch & môn tiên quyết
    updateSmartAlerts(currentCart);

    // Cập nhật trạng thái nút thanh toán
    if (btnCheckoutEl) {
      btnCheckoutEl.disabled = currentCart.length === 0;
    }
  };

  /**
   * KHỞI TẠO CÁC SỰ KIỆN LẮNG NGHE (EVENT LISTENERS)
   */
  const initEventListeners = () => {
    // 1. Lắng nghe cả cartUpdated và enrollment:updated từ cart-logic.js
    document.addEventListener('cartUpdated', handleCartUpdated);
    document.addEventListener('enrollment:updated', handleCartUpdated);

    // Đồng bộ tức thì nếu giỏ hàng đã có dữ liệu từ trước
    setTimeout(() => {
      if (window.SmartEnrollment && typeof window.SmartEnrollment.getCart === 'function') {
        const initialCart = window.SmartEnrollment.getCart();
        if (initialCart && initialCart.length > 0) {
          handleCartUpdated({
            detail: {
              cart: initialCart,
              totalCredits: window.SmartEnrollment.getTotalCredits?.() || 0,
              totalTuition: window.SmartEnrollment.getTotalTuition?.() || 0
            }
          });
        }
      }
    }, 50);

    // 2. Mở Modal thanh toán khi bấm nút #btn-checkout
    if (btnCheckoutEl) {
      btnCheckoutEl.addEventListener('click', openCheckoutModal);
    }

    // 3. Đóng Modal khi bấm nút #btn-close-modal hoặc data-close-modal
    if (btnCloseModalEl) {
      btnCloseModalEl.addEventListener('click', closeCheckoutModal);
    }

    if (checkoutModalEl) {
      // Bắt các nút có data-close-modal
      checkoutModalEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]')) {
          closeCheckoutModal();
        }
        // Đóng khi click ngoài backdrop
        if (e.target === checkoutModalEl) {
          closeCheckoutModal();
        }
      });
    }

    // 4. Đóng Modal bằng phím Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && checkoutModalEl && checkoutModalEl.classList.contains('is-open')) {
        closeCheckoutModal();
      }
    });

    // 5. Xác nhận thanh toán khi bấm #btn-confirm-pay
    if (btnConfirmPayEl) {
      btnConfirmPayEl.addEventListener('click', handleConfirmPayment);
    }
  };

  // Khởi động module khi DOM đã tải xong
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventListeners);
  } else {
    initEventListeners();
  }

  // Xuất API hỗ trợ nếu các thành viên khác cần kiểm tra
  window.SmartEnrollmentVision = {
    detectScheduleConflicts,
    getPrerequisiteCourses,
    openCheckoutModal,
    closeCheckoutModal
  };
})();
