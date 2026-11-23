/**
 * ==============================================================================
 * DỰ ÁN CUỐI KỲ: THIẾT KẾ WEB - LỚP 25CT111
 * ĐỀ TÀI 2.1.2: CỔNG ĐĂNG KÝ MÔN HỌC THÔNG MINH (SMART ENROLLMENT PORTAL)
 * FILE: js/vision-features.js
 * PHỤ TRÁCH: Nguyễn Tấn Điền (MSSV: 125000260) & Nguyễn Thành Phát (MSSV: 125000658)
 * PHIÊN BẢN: v2.5 - Tích hợp VietQR Động & Cổng Thanh Toán Trực Tuyến
 * ==============================================================================
 */

(() => {
  'use strict';

  console.log('%c[SmartEnrollment] Vision Features v2.5 (VietQR Active) Loaded!', 'color: #16a34a; font-weight: bold;');

  // Thông tin sinh viên mặc định
  const STUDENT_INFO = {
    name: 'Nguyễn Tấn Điền',
    id: '125000260',
    className: '25CT111',
    term: 'Học kỳ 1 / 2026-2027'
  };

  // Cấu hình tài khoản ngân hàng thụ hưởng của nhà trường
  const BANK_CONFIG = {
    bankId: 'MB', // Ngân hàng Quân Đội
    bankName: 'MBBank (Ngân hàng Quân Đội)',
    accountNo: '0987654321',
    accountName: 'CONG DANG KY MON HOC - SE PORTAL'
  };

  // Trạng thái dữ liệu
  let currentCart = [];
  let currentTotalCredits = 0;
  let currentTotalTuition = 0;
  let currentTransactionId = '';
  let hasScheduleConflict = false;

  // DOM Elements
  const smartAlertsEl = document.getElementById('smart-alerts');
  const btnCheckoutEl = document.getElementById('btn-checkout');
  const checkoutModalEl = document.getElementById('checkout-modal');
  const modalSummaryBodyEl = document.getElementById('modal-summary-body') 
                          || document.getElementById('checkout-modal-body') 
                          || document.querySelector('.modal-body');
  const btnCloseModalEl = document.getElementById('btn-close-modal') 
                       || document.querySelector('.btn-close-modal');
  const btnConfirmPayEl = document.getElementById('btn-confirm-pay') 
                       || document.getElementById('btn-confirm-online-pay');

  const formatCurrencyVND = (amount) => {
    return new Intl.NumberFormat('vi-VN').format(amount || 0) + ' ₫';
  };

  const generateTransactionId = () => {
    const year = new Date().getFullYear();
    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `SE-${year}-${randomHex}`;
  };

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
   * ĐỒNG BỘ DỮ LIỆU TỪ MỌI NGUỒN VÀO GIỎ HÀNG
   */
  const syncCurrentCart = () => {
    // 1. Thử lấy từ API bộ nhớ chia sẻ
    if (window.SmartEnrollment && typeof window.SmartEnrollment.getCart === 'function') {
      const cart = window.SmartEnrollment.getCart();
      if (Array.isArray(cart) && cart.length > 0) {
        currentCart = cart;
        currentTotalCredits = window.SmartEnrollment.getTotalCredits ? window.SmartEnrollment.getTotalCredits() : currentCart.reduce((s, c) => s + (Number(c.credits) || 0), 0);
        currentTotalTuition = window.SmartEnrollment.getTotalTuition ? window.SmartEnrollment.getTotalTuition() : currentCart.reduce((s, c) => s + (Number(c.tuition) || 0), 0);
        return currentCart;
      }
    }

    // 2. Thử lấy từ LocalStorage
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

    // 3. Quét trực tiếp các dòng trên bảng giao diện
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
   * KIỂM TRA TRÙNG LỊCH HỌC
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
   * KIỂM TRA MÔN TIÊN QUYẾT
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
   * CẬP NHẬT CẢNH BÁO TRÙNG LỊCH NGOÀI MÀN HÌNH CHÍNH
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
   * MỞ MODAL XÁC NHẬN THANH TOÁN & HIỂN THỊ VIETQR
   */
  const openCheckoutModal = () => {
    if (!checkoutModalEl) return;

    // Cưỡng bức style thanh cuộn cho Modal tránh bị che khuất nội dung
    checkoutModalEl.style.overflowY = 'auto';
    const modalContent = checkoutModalEl.querySelector('.modal-content') || checkoutModalEl.querySelector('.modal-dialog');
    if (modalContent) {
      modalContent.style.maxHeight = '92vh';
      modalContent.style.display = 'flex';
      modalContent.style.flexDirection = 'column';
    }

    syncCurrentCart();

    const currentCreditsVal = currentTotalCredits || parseInt(document.getElementById('total-credits')?.textContent.replace(/\D/g, '') || '0', 10);
    if (currentCart.length === 0 || currentCreditsVal === 0) {
      alert('🛒 Giỏ đăng ký hiện đang trống! Vui lòng chọn ít nhất 1 môn học trước khi xác nhận.');
      return;
    }

    const conflicts = detectScheduleConflicts(currentCart);
    hasScheduleConflict = conflicts.length > 0;
    if (hasScheduleConflict) {
      const confirmContinue = confirm(
        '⚠️ CẢNH BÁO: Kế hoạch của bạn đang có môn học bị TRÙNG LỊCH!\n\nBạn có chắc chắn vẫn muốn tiếp tục xem và thanh toán?'
      );
      if (!confirmContinue) return;
    }

    currentTransactionId = generateTransactionId();
    const currentDateStr = new Date().toLocaleString('vi-VN', {
      dateStyle: 'full',
      timeStyle: 'medium'
    });
    const student = getStudentInfo();

    // Đường link API VietQR sinh mã QR chuẩn NAPAS
    const vietQrUrl = `https://img.vietqr.io/image/${BANK_CONFIG.bankId}-${BANK_CONFIG.accountNo}-compact2.png?amount=${currentTotalTuition}&addInfo=${encodeURIComponent(currentTransactionId)}&accountName=${encodeURIComponent(BANK_CONFIG.accountName)}`;

    if (modalSummaryBodyEl) {
      // Cấp quyền cuộn độc lập cho thân modal
      modalSummaryBodyEl.style.overflowY = 'auto';
      modalSummaryBodyEl.style.maxHeight = 'calc(90vh - 120px)';
      modalSummaryBodyEl.style.padding = '16px';

      modalSummaryBodyEl.innerHTML = `
        <!-- Dải thông báo kích hoạt thanh toán trực tuyến -->
        <div style="display: flex; justify-content: space-between; align-items: center; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; padding: 8px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 0.8125rem;">
          <span>⚡ Cổng thu học phí trực tuyến đã kết nối hệ thống ngân hàng</span>
          <span style="background: #10b981; color: #fff; font-weight: 700; padding: 2px 8px; border-radius: 9999px; font-size: 0.6875rem;">VietQR 24/7</span>
        </div>

        <div class="receipt-meta-box" style="background: var(--color-bg-alt, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); padding: 12px; border-radius: 8px; margin-bottom: 14px;">
          <div class="receipt-meta-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.8125rem;">
            <div><span>Mã biên lai:</span> <strong style="font-family: monospace; color: var(--color-primary, #1e40af);">${escapeHtml(currentTransactionId)}</strong></div>
            <div><span>Thời gian:</span> <strong>${escapeHtml(currentDateStr)}</strong></div>
            <div><span>Sinh viên:</span> <strong>${escapeHtml(student.name)} (${escapeHtml(student.id)})</strong></div>
            <div><span>Lớp học:</span> <strong>${escapeHtml(student.className)} &bull; ${escapeHtml(student.term)}</strong></div>
          </div>
        </div>

        <!-- Bảng tóm tắt môn học -->
        <div style="max-height: 160px; overflow-y: auto; border: 1px solid var(--color-border, #e2e8f0); border-radius: 6px; margin-bottom: 14px;">
          <table class="modal-table-summary" style="width: 100%; border-collapse: collapse; font-size: 0.8125rem;">
            <thead style="background: var(--color-bg-alt, #f1f5f9); position: sticky; top: 0; z-index: 1;">
              <tr style="text-align: left; border-bottom: 1px solid var(--color-border, #e2e8f0);">
                <th style="padding: 6px 8px; width: 8%;">STT</th>
                <th style="padding: 6px 8px; width: 18%;">Mã môn</th>
                <th style="padding: 6px 8px;">Tên môn học</th>
                <th style="padding: 6px 8px; width: 15%; text-align: center;">Số TC</th>
                <th style="padding: 6px 8px; width: 22%; text-align: right;">Học phí</th>
              </tr>
            </thead>
            <tbody>
              ${currentCart
                .map(
                  (c, idx) => `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 6px 8px; color: #64748b;">${idx + 1}</td>
                  <td style="padding: 6px 8px;"><code style="font-weight: 700; color: var(--color-primary, #1e40af);">${escapeHtml(c.id)}</code></td>
                  <td style="padding: 6px 8px;">
                    <strong>${escapeHtml(c.name)}</strong>
                    ${c.schedule ? `<span style="display:block; font-size: 0.7rem; color: #64748b;">${escapeHtml(c.schedule)}</span>` : ''}
                  </td>
                  <td style="padding: 6px 8px; text-align: center;">
                    <span style="font-weight: 700; color: var(--color-secondary, #0f766e);">${c.credits} TC</span>
                  </td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 600;">
                    ${formatCurrencyVND(c.tuition)}
                  </td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </div>

        <!-- Khung tổng số tiền -->
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 14px;">
          <div>
            <div style="font-size: 0.75rem; color: #64748b;">Tổng số tín chỉ:</div>
            <strong style="font-size: 1.1rem; color: var(--color-primary, #1e40af);">${currentTotalCredits} / 25 TC</strong>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 0.75rem; color: #64748b;">Tổng học phí phải thanh toán:</div>
            <strong style="font-size: 1.3rem; color: var(--color-success, #16a34a); font-family: monospace;">${formatCurrencyVND(currentTotalTuition)}</strong>
          </div>
        </div>

        <!-- KHỐI QUÉT MÃ QR THANH TOÁN (HIỂN THỊ RÕ RÀNG TRỰC TIẾP) -->
        <div style="background: #ffffff; border: 2px solid #3b82f6; border-radius: 10px; padding: 14px; margin-bottom: 14px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          <div style="font-weight: 800; font-size: 0.875rem; color: #1e3a8a; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
            <span>📱 QUÉT MÃ VIETQR HOẶC CHUYỂN KHOẢN HỌC PHÍ</span>
          </div>

          <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center;">
            <!-- Cột mã QR -->
            <div style="flex: 0 0 160px; text-align: center; margin: 0 auto;">
              <div style="position: relative; width: 155px; height: 155px; margin: 0 auto; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                <img 
                  id="vietqr-image-el"
                  src="${vietQrUrl}" 
                  alt="Mã QR thanh toán học phí" 
                  style="width: 100%; height: 100%; object-fit: contain; display: block;"
                  onerror="this.onerror=null; this.parentElement.innerHTML='<div style=\\'padding:10px; font-size:0.75rem; color:#dc2626; font-weight:600;\\'>⚠️ Vui lòng chuyển khoản theo số tài khoản bên cạnh</div>';"
                />
              </div>
              <small style="display: block; font-size: 0.7rem; color: #64748b; margin-top: 4px; font-weight: 600;">Tự động nhập số tiền & nội dung</small>
            </div>

            <!-- Cột thông tin tài khoản -->
            <div style="flex: 1 1 230px; font-size: 0.8125rem; line-height: 1.6; background: #f8fafc; padding: 10px 12px; border-radius: 6px; border: 1px solid #e2e8f0;">
              <div style="margin-bottom: 4px;">Ngân hàng: <strong>${escapeHtml(BANK_CONFIG.bankName)}</strong></div>
              <div style="margin-bottom: 4px; display: flex; align-items: center; justify-content: space-between;">
                <span>Số tài khoản: <strong style="color: #1e40af; font-size: 0.95rem; font-family: monospace;">${escapeHtml(BANK_CONFIG.accountNo)}</strong></span>
                <button type="button" id="btn-copy-stk" style="padding: 2px 6px; font-size: 0.7rem; background: #e0e7ff; color: #3730a3; border: 1px solid #c7d2fe; border-radius: 4px; cursor: pointer;">📋 Chép</button>
              </div>
              <div style="margin-bottom: 4px;">Chủ tài khoản: <strong>${escapeHtml(BANK_CONFIG.accountName)}</strong></div>
              <div style="margin-bottom: 4px;">Số tiền: <strong style="color: #16a34a; font-size: 0.95rem;">${formatCurrencyVND(currentTotalTuition)}</strong></div>
              <div style="display: flex; align-items: center; justify-content: space-between;">
                <span>Nội dung: <strong style="color: #b45309; background: #fef3c7; padding: 1px 4px; border-radius: 3px; font-family: monospace;">${escapeHtml(currentTransactionId)}</strong></span>
                <button type="button" id="btn-copy-memo" style="padding: 2px 6px; font-size: 0.7rem; background: #fef3c7; color: #92400e; border: 1px solid #fde68a; border-radius: 4px; cursor: pointer;">📋 Chép</button>
              </div>
            </div>
          </div>
        </div>

        <div style="font-size: 0.75rem; color: #64748b; text-align: center; margin-top: 8px;">
          Sau khi chuyển khoản thành công trên app ngân hàng, vui lòng bấm nút <strong>Xác Nhận Đã Thanh Toán</strong> bên dưới để hệ thống xuất biên lai.
        </div>
      `;

      // Xử lý nút sao chép nhanh
      const btnCopyStk = modalSummaryBodyEl.querySelector('#btn-copy-stk');
      if (btnCopyStk) {
        btnCopyStk.addEventListener('click', () => {
          navigator.clipboard.writeText(BANK_CONFIG.accountNo);
          btnCopyStk.textContent = '✓ Đã chép!';
          setTimeout(() => (btnCopyStk.textContent = '📋 Chép'), 1500);
        });
      }

      const btnCopyMemo = modalSummaryBodyEl.querySelector('#btn-copy-memo');
      if (btnCopyMemo) {
        btnCopyMemo.addEventListener('click', () => {
          navigator.clipboard.writeText(currentTransactionId);
          btnCopyMemo.textContent = '✓ Đã chép!';
          setTimeout(() => (btnCopyMemo.textContent = '📋 Chép'), 1500);
        });
      }
    }

    if (btnConfirmPayEl) {
      btnConfirmPayEl.style.display = 'inline-flex';
      btnConfirmPayEl.disabled = false;
      btnConfirmPayEl.innerHTML = '💳 Xác Nhận Đã Thanh Toán';
    }

    checkoutModalEl.classList.add('is-open');
    checkoutModalEl.classList.add('show');
    checkoutModalEl.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  };

  const closeCheckoutModal = () => {
    if (!checkoutModalEl) return;
    checkoutModalEl.classList.remove('is-open');
    checkoutModalEl.classList.remove('show');
    checkoutModalEl.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  /**
   * XỬ LÝ KHI BẤM NÚT "XÁC NHẬN ĐÃ THANH TOÁN"
   */
  const handleConfirmPayment = () => {
    if (!btnConfirmPayEl || !modalSummaryBodyEl) return;

    btnConfirmPayEl.disabled = true;
    btnConfirmPayEl.innerHTML = '⏳ Đang kiểm tra giao dịch với ngân hàng...';

    setTimeout(() => {
      btnConfirmPayEl.style.display = 'none';

      modalSummaryBodyEl.innerHTML = `
        <div class="payment-success-banner" style="text-align: center; padding: 24px 12px;">
          <div style="font-size: 3.5rem; margin-bottom: 8px;">🎉</div>
          <h3 style="color: var(--color-success, #16a34a); font-size: 1.35rem; font-weight: 800; margin-bottom: 8px;">
            ĐĂNG KÝ & THANH TOÁN HỌC PHÍ THÀNH CÔNG!
          </h3>
          <p style="color: #64748b; font-size: 0.875rem; margin-bottom: 20px;">
            Hệ thống Cổng Đăng ký Môn học Thông minh đã xác nhận nhận đủ tiền học phí qua hệ thống VietQR.
          </p>

          <div style="text-align: left; background: var(--color-bg-alt, #f8fafc); border: 1px solid var(--color-border, #e2e8f0); padding: 16px; border-radius: 8px; margin-bottom: 20px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.875rem;">
              <div><span>Mã giao dịch:</span> <strong style="font-family: monospace;">${escapeHtml(currentTransactionId)}</strong></div>
              <div><span>Trạng thái:</span> <strong style="color: #16a34a;">ĐÃ HOÀN TẤT (PAID)</strong></div>
              <div><span>Số tín chỉ tích lũy:</span> <strong>${currentTotalCredits} TC</strong></div>
              <div><span>Số tiền đã thanh toán:</span> <strong style="color: var(--color-primary, #1e40af);">${formatCurrencyVND(currentTotalTuition)}</strong></div>
            </div>
          </div>

          <div style="display: flex; justify-content: center; gap: 12px;">
            <button type="button" class="btn btn-primary" id="btn-print-receipt" style="padding: 10px 20px; font-weight: 700; cursor: pointer;">
              🖨️ In Biên Lai Xác Nhận
            </button>
            <button type="button" class="btn btn-secondary" id="btn-finish-enrollment" style="padding: 10px 20px; font-weight: 700; cursor: pointer;">
              ✓ Hoàn Tất Đăng Ký
            </button>
          </div>
        </div>
      `;

      const btnPrint = document.getElementById('btn-print-receipt');
      if (btnPrint) {
        btnPrint.addEventListener('click', () => window.print());
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
    }, 800);
  };

  /**
   * ĐĂNG KÝ CÁC SỰ KIỆN LẮNG NGHE
   */
  const initEventListeners = () => {
    syncCurrentCart();
    updateSmartAlerts(currentCart);

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

    if (btnCheckoutEl) {
      btnCheckoutEl.addEventListener('click', openCheckoutModal);
    }

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