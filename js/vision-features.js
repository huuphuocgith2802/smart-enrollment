/**
 * ==============================================================================
 * DỰ ÁN CUỐI KỲ: THIẾT KẾ WEB - LỚP 25CT111
 * ĐỀ TÀI 2.1.2: CỔNG ĐĂNG KÝ MÔN HỌC THÔNG MINH (SMART ENROLLMENT PORTAL)
 * FILE: js/vision-features.js
 * PHỤ TRÁCH: Nguyễn Tấn Điền (MSSV: 125000260 - Thành viên nhóm)
 * MÔ TẢ: Lắng nghe sự kiện giỏ hàng, kiểm tra trùng lịch thời khóa biểu,
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
  const modalSummaryBodyEl = document.getElementById('modal-summary-body') || document.getElementById('checkout-modal-body') || document.querySelector('.modal-body');
  const btnCloseModalEl = document.getElementById('btn-close-modal') || document.querySelector('.btn-close-modal');
  const btnConfirmPayEl = document.getElementById('btn-confirm-pay') || document.getElementById('btn-confirm-online-pay');

  /**
   * Định dạng số tiền sang chuẩn Việt Nam Đồng (VND)
   */
  const formatCurrencyVND = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' ₫';
  };

  /**
   * Tạo mã giao dịch hóa đơn mô phỏng
   */
  const generateTransactionId = () => {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SE-${year}-${randomHex}`;
  };

  /**
   * Lấy thông tin sinh viên hiển thị trên header (nếu có)
   */
  const getStudentInfo = () => {
    const headerMeta = document.querySelector('.student-card-badge');
    if (headerMeta) {
      const strongs = headerMeta.querySelectorAll('strong');
      if (strongs.length >= 2) {
        return {
          name: strongs[0].textContent.trim(),
          id: strongs[1].textContent.trim(),
          className: '25CT111',
          term: 'Học kỳ 1 / 2026-2027'
        };
      }
    }
    return STUDENT_INFO;
  };

  /**
   * ĐỒNG BỘ DỮ LIỆU GIỎ HÀNG ĐA TẦNG:
   * 1. SmartEnrollment API -> 2. LocalStorage -> 3. Quét trực tiếp DOM bảng ngoài
   */
  const syncCurrentCart = () => {
    // 1. Thử lấy từ window.SmartEnrollment
    if (window.SmartEnrollment && typeof window.SmartEnrollment.getCart === 'function') {
      const cart = window.SmartEnrollment.getCart();
      if (Array.isArray(cart) && cart.length > 0) {
        currentCart = cart;
        currentTotalCredits = window.SmartEnrollment.getTotalCredits ? window.SmartEnrollment.getTotalCredits() : currentCart.reduce((s, c) => s + (Number(c.credits) || 0), 0);
        currentTotalTuition = window.SmartEnrollment.getTotalTuition ? window.SmartEnrollment.getTotalTuition() : currentCart.reduce((s, c) => s + (Number(c.tuition) || 0), 0);
        return currentCart;
      }
    }

    // 2. Thử đọc từ LocalStorage
    const storageKeys = ['smart_enrollment_cart_25ct111', 'smartEnrollmentCart', 'cart'];
    for (const key of storageKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            currentCart = parsed;
            currentTotalCredits = currentCart.reduce((s, c) => s + (Number(c.credits) || 0), 0);
            currentTotalTuition = currentCart.reduce((s, c) => s + (Number(c.tuition) || 0), 0);
            return currentCart;
          }
        }
      } catch (e) {}
    }

    // 3. Fallback: Quét trực tiếp các dòng đang hiển thị trong #selected-courses-body
    const rows = document.querySelectorAll('#selected-courses-body tr:not(.empty-state-row)');
    if (rows && rows.length > 0) {
      const scraped = [];
      rows.forEach((row) => {
        const id = row.getAttribute('data-course-id') 
                || row.querySelector('.table-course-code')?.textContent.trim() 
                || row.children[0]?.textContent.trim() || '';
        const name = row.querySelector('.table-course-name')?.textContent.trim() 
                  || row.children[1]?.querySelector('div')?.textContent.trim() 
                  || row.children[1]?.textContent.trim() || '';
        const schedule = row.querySelector('.table-course-sub')?.textContent.trim() 
                      || row.children[1]?.querySelector('.table-course-sub')?.textContent.trim() || '';
        const creditsRaw = row.querySelector('.table-credit-pill')?.textContent.trim() 
                        || row.children[2]?.textContent.trim() || '0';
        const credits = parseInt(creditsRaw.replace(/\D/g, ''), 10) || 0;
        const tuitionRaw = row.querySelector('.table-tuition-cell')?.textContent.trim() 
                        || row.children[3]?.textContent.trim() || '0';
        const tuition = parseInt(tuitionRaw.replace(/\D/g, ''), 10) || 0;

        if (id) {
          scraped.push({ id, name, schedule, credits, tuition });
        }
      });

      if (scraped.length > 0) {
        currentCart = scraped;
        currentTotalCredits = parseInt(document.getElementById('total-credits')?.textContent.replace(/\D/g, '') || '0', 10)
                           || currentCart.reduce((s, c) => s + c.credits, 0);
        currentTotalTuition = parseInt(document.getElementById('total-tuition')?.textContent.replace(/\D/g, '') || '0', 10)
                           || currentCart.reduce((s, c) => s + c.tuition, 0);
        return currentCart;
      }
    }

    return currentCart;
  };

  /**
   * 1. TỐI ƯU THỜI KHÓA BIỂU: KIỂM TRA TRÙNG LỊCH HỌC
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
   */
  const updateSmartAlerts = (cart) => {
    if (!smartAlertsEl) return;

    const conflicts = detectScheduleConflicts(cart);
    hasScheduleConflict = conflicts.length > 0;
    const prereqCourses = getPrerequisiteCourses(cart);

    let html = '';

    if (hasScheduleConflict) {
      html += `
        <div class="alert-box alert-conflict" role="alert" style="background-color: var(--color-danger-bg, #fef2f2); border: 1px solid var(--color-danger-border, #fecaca); color: var(--color-danger-text, #991b1b); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <span class="alert-icon">⚠️</span>
          <div class="alert-content">
            <span class="alert-title" style="font-weight: 700;">Cảnh báo: Phát hiện TRÙNG THỜI KHÓA BIỂU!</span>
            <p style="margin: 4px 0;">Có <strong>${conflicts.length}</strong> khung giờ bị trùng lịch giữa các môn học bạn đã chọn:</p>
            <ul style="padding-left: 20px; font-size: 0.875rem;">
              ${conflicts
                .map(
                  (c) => `
                <li>
                  <strong>${escapeHtml(c.schedule)}:</strong> 
                  ${c.courses.map((item) => `<span>${escapeHtml(item.name)} (<em>${escapeHtml(item.id)}</em>)</span>`).join(' <strong style="color:var(--color-danger, #dc2626);">&bull; TRÙNG VỚI &bull;</strong> ')}
                </li>
              `
                )
                .join('')}
            </ul>
          </div>
        </div>
      `;
    }

    if (prereqCourses.length > 0) {
      html += `
        <div class="alert-box alert-prereq" role="status" style="background-color: var(--color-warning-bg, #fff7ed); border: 1px solid var(--color-warning-border, #fed7aa); color: var(--color-warning-text, #9a3412); padding: 12px; border-radius: 8px; margin-bottom: 12px;">
          <span class="alert-icon">💡</span>
          <div class="alert-content">
            <span class="alert-title" style="font-weight: 700;">Lưu ý điều kiện học phần tiên quyết:</span>
            <ul style="padding-left: 20px; font-size: 0.875rem; margin-top: 4px;">
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
          </div>
        </div>
      `;
    }

    smartAlertsEl.innerHTML = html;
  };

  /**
   * Helper chống XSS khi chèn chuỗi HTML động
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

    // 1. Đồng bộ giỏ hàng mới nhất trước khi render
    syncCurrentCart();

    const currentCreditsVal = currentTotalCredits || parseInt(document.getElementById('total-credits')?.textContent.replace(/\D/g, '') || '0', 10);
    if (currentCart.length === 0 || currentCreditsVal === 0) {
      alert('🛒 Giỏ đăng ký hiện đang trống! Vui lòng chọn ít nhất 1 môn học trước khi xác nhận.');
      return;
    }

    // 2. Nhắc nhở nếu đang trùng lịch học
    const conflicts = detectScheduleConflicts(currentCart);
    hasScheduleConflict = conflicts.length > 0;
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
    const student = getStudentInfo();

    // Render thông tin vào modal
    if (modalSummaryBodyEl) {
      modalSummaryBodyEl.innerHTML = `
        <div class="receipt-meta-box" style="background: var(--color-bg-alt, #f1f5f9); padding: 12px; border-radius: 8px; margin-bottom: 16px;">
          <div class="receipt-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8125rem;">
            <div><span>Mã biên lai:</span> <strong>${escapeHtml(currentTransactionId)}</strong></div>
            <div><span>Thời gian:</span> <strong>${escapeHtml(currentDateStr)}</strong></div>
            <div><span>Sinh viên:</span> <strong>${escapeHtml(student.name)} (${escapeHtml(student.id)})</strong></div>
            <div><span>Lớp học:</span> <strong>${escapeHtml(student.className)} &bull; ${escapeHtml(student.term)}</strong></div>
          </div>
        </div>

        <table class="modal-table-summary" style="width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 0.875rem;">
          <thead>
            <tr style="border-bottom: 2px solid var(--color-border, #e2e8f0); text-align: left;">
              <th style="padding: 8px; width: 8%;">STT</th>
              <th style="padding: 8px; width: 17%;">Mã môn</th>
              <th style="padding: 8px; width: 40%;">Tên môn học</th>
              <th style="padding: 8px; width: 15%; text-align: center;">Số TC</th>
              <th style="padding: 8px; width: 20%; text-align: right;">Học phí</th>
            </tr>
          </thead>
          <tbody>
            ${currentCart
              .map(
                (c, idx) => `
              <tr style="border-bottom: 1px solid var(--color-border, #e2e8f0);">
                <td style="padding: 8px; color: var(--color-text-muted, #64748b);">${idx + 1}</td>
                <td style="padding: 8px;"><code style="font-weight: 700; color: var(--color-primary, #1e40af);">${escapeHtml(c.id)}</code></td>
                <td style="padding: 8px;">
                  <strong>${escapeHtml(c.name)}</strong>
                  ${c.schedule ? `<div style="font-size: 0.75rem; color: var(--color-text-muted, #64748b);">${escapeHtml(c.schedule)}</div>` : ''}
                </td>
                <td style="padding: 8px; text-align: center;">
                  <span style="font-weight: 700; color: var(--color-secondary, #0f766e);">${c.credits} TC</span>
                </td>
                <td style="padding: 8px; text-align: right; font-weight: 600;">
                  ${formatCurrencyVND(c.tuition)}
                </td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>

        <div class="receipt-total-box" style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: var(--color-primary-light, #eff6ff); border-radius: 8px; margin-bottom: 16px;">
          <div>
            <div style="font-size: 0.8125rem; color: var(--color-text-muted, #64748b);">Tổng số tín chỉ đăng ký:</div>
            <strong style="font-size: 1.125rem; color: var(--color-primary, #1e40af);">
              ${currentTotalCredits} / 25 TC
            </strong>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.8125rem; color: var(--color-text-muted, #64748b);">Tổng học phí phải thanh toán:</div>
            <strong style="font-size: 1.35rem; color: var(--color-success, #16a34a); font-family: monospace;">
              ${formatCurrencyVND(currentTotalTuition)}
            </strong>
          </div>
        </div>

        ${
          hasScheduleConflict
            ? `<div class="alert-box alert-conflict" style="background: var(--color-warning-bg, #fff7ed); border: 1px solid var(--color-warning-border, #fed7aa); color: var(--color-warning-text, #9a3412); padding: 10px; border-radius: 6px; margin-bottom: 16px;">
                <span>⚠️</span> <strong>Lưu ý:</strong> Kế hoạch đăng ký này có môn học đang bị trùng thời khóa biểu.
              </div>`
            : `<div class="alert-box" style="background-color: var(--color-success-bg, #f0fdf4); border: 1px solid var(--color-success-border, #bbf7d0); color: var(--color-success-text, #15803d); padding: 10px; border-radius: 6px; margin-bottom: 16px;">
                <span>✅</span> <strong>Thời khóa biểu hợp lệ:</strong> Không phát hiện bất kỳ xung đột lịch học nào.
              </div>`
        }

        <div class="payment-methods-group">
          <div style="font-weight: 700; margin-bottom: 8px; font-size: 0.875rem;">CHỌN HÌNH THỨC THANH TOÁN HỌC PHÍ:</div>
          <div class="payment-methods-list" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;">
            <div class="payment-method-card is-selected" data-method="vnpay" style="border: 2px solid var(--color-primary, #1e40af); padding: 10px; border-radius: 8px; text-align: center; cursor: pointer;">
              <div>🏦 VNPAY-QR</div>
              <small style="color: var(--color-text-muted, #64748b);">Quét mã tức thì</small>
            </div>
            <div class="payment-method-card" data-method="atm" style="border: 1px solid var(--color-border, #e2e8f0); padding: 10px; border-radius: 8px; text-align: center; cursor: pointer;">
              <div>💳 Thẻ ATM / Napas</div>
              <small style="color: var(--color-text-muted, #64748b);">Nội địa Internet Banking</small>
            </div>
            <div class="payment-method-card" data-method="transfer" style="border: 1px solid var(--color-border, #e2e8f0); padding: 10px; border-radius: 8px; text-align: center; cursor: pointer;">
              <div>📱 Chuyển khoản QR</div>
              <small style="color: var(--color-text-muted, #64748b);">Ngân hàng 24/7</small>
            </div>
          </div>
        </div>
      `;

      // Chọn phương thức thanh toán
      const methodCards = modalSummaryBodyEl.querySelectorAll('.payment-method-card');
      methodCards.forEach((card) => {
        card.addEventListener('click', () => {
          methodCards.forEach((c) => {
            c.classList.remove('is-selected');
            c.style.borderColor = 'var(--color-border, #e2e8f0)';
          });
          card.classList.add('is-selected');
          card.style.borderColor = 'var(--color-primary, #1e40af)';
        });
      });
    }

    if (btnConfirmPayEl) {
      btnConfirmPayEl.style.display = 'inline-flex';
      btnConfirmPayEl.disabled = false;
      btnConfirmPayEl.innerHTML = '💳 Xác Nhận Thanh Toán';
    }

    checkoutModalEl.classList.add('is-open');
    checkoutModalEl.classList.add('show');
    checkoutModalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
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

    btnConfirmPayEl.disabled = true;
    btnConfirmPayEl.innerHTML = '⏳ Đang xác thực giao dịch...';

    setTimeout(() => {
      btnConfirmPayEl.style.display = 'none';

      modalSummaryBodyEl.innerHTML = `
        <div class="payment-success-banner" style="text-align: center; padding: 20px 10px;">
          <div style="font-size: 3rem; margin-bottom: 10px;">🎉</div>
          <h3 style="color: var(--color-success, #16a34a); font-size: 1.25rem; font-weight: 800; margin-bottom: 8px;">
            ĐĂNG KÝ & THANH TOÁN HỌC PHÍ THÀNH CÔNG!
          </h3>
          <p style="color: var(--color-text-muted, #64748b); font-size: 0.875rem; margin-bottom: 20px;">
            Hệ thống Cổng Đăng ký Môn học Thông minh đã xác nhận và ghi nhận thành công kế hoạch học tập của sinh viên.
          </p>

          <div class="receipt-meta-box" style="text-align: left; background: var(--color-bg-alt, #f1f5f9); padding: 16px; border-radius: 8px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.875rem;">
              <div><span>Mã giao dịch:</span> <strong>${escapeHtml(currentTransactionId)}</strong></div>
              <div><span>Trạng thái:</span> <strong style="color: var(--color-success, #16a34a);">ĐÃ HOÀN TẤT (PAID)</strong></div>
              <div><span>Số tín chỉ:</span> <strong>${currentTotalCredits} TC</strong></div>
              <div><span>Số tiền đã thanh toán:</span> <strong style="color: var(--color-primary, #1e40af);">${formatCurrencyVND(currentTotalTuition)}</strong></div>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 12px; margin-top: 24px;">
            <button type="button" class="btn btn-primary" id="btn-print-receipt" style="padding: 10px 18px; font-weight: 600;">
              🖨️ In Biên Lai Xác Nhận
            </button>
            <button type="button" class="btn btn-secondary" id="btn-finish-enrollment" style="padding: 10px 18px; font-weight: 600;">
              ✓ Hoàn Tất & Làm Mới Giỏ
            </button>
          </div>
        </div>
      `;

      const btnPrint = document.getElementById('btn-print-receipt');
      if (btnPrint) {
        btnPrint.addEventListener('click', () => {
          window.print();
        });
      }

      const btnFinish = document.getElementById('btn-finish-enrollment');
      if (btnFinish) {
        btnFinish.addEventListener('click', () => {
          if (window.SmartEnrollment && typeof window.SmartEnrollment.clearCart === 'function') {
            window.SmartEnrollment.clearCart();
          } else {
            const clearBtn = document.getElementById('btn-clear-cart');
            if (clearBtn) clearBtn.click();
          }
          closeCheckoutModal();
        });
      }
    }, 700);
  };

  /**
   * KHỞI TẠO CÁC SỰ KIỆN LẮNG NGHE (EVENT LISTENERS)
   */
  const initEventListeners = () => {
    // Đồng bộ trạng thái giỏ ban đầu ngay khi tải trang
    syncCurrentCart();
    updateSmartAlerts(currentCart);

    // Lắng nghe tất cả các sự kiện thay đổi giỏ hàng từ cart-logic
    const handleCartUpdate = (e) => {
      const detail = e.detail || {};
      if (detail.cart && Array.isArray(detail.cart)) {
        currentCart = detail.cart;
        currentTotalCredits = detail.totalCredits || 0;
        currentTotalTuition = detail.totalTuition || 0;
      } else {
        syncCurrentCart();
      }
      updateSmartAlerts(currentCart);
      if (btnCheckoutEl) {
        btnCheckoutEl.disabled = currentCart.length === 0;
      }
    };

    document.addEventListener('cartUpdated', handleCartUpdate);
    document.addEventListener('enrollment:updated', handleCartUpdate);
    document.addEventListener('cart:updated', handleCartUpdate);

    // Mở Modal
    if (btnCheckoutEl) {
      btnCheckoutEl.addEventListener('click', openCheckoutModal);
    }

    // Đóng Modal
    if (btnCloseModalEl) {
      btnCloseModalEl.addEventListener('click', closeCheckoutModal);
    }

    if (checkoutModalEl) {
      checkoutModalEl.addEventListener('click', (e) => {
        if (e.target.closest('[data-close-modal]') || e.target.classList.contains('btn-close-modal')) {
          closeCheckoutModal();
        }
        if (e.target === checkoutModalEl) {
          closeCheckoutModal();
        }
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && checkoutModalEl && checkoutModalEl.classList.contains('is-open')) {
        closeCheckoutModal();
      }
    });

    // Xác nhận thanh toán
    if (btnConfirmPayEl) {
      btnConfirmPayEl.addEventListener('click', handleConfirmPayment);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEventListeners);
  } else {
    initEventListeners();
  }

  window.SmartEnrollmentVision = {
    detectScheduleConflicts,
    getPrerequisiteCourses,
    openCheckoutModal,
    closeCheckoutModal,
    syncCurrentCart
  };
})();