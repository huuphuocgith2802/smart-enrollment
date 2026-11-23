/**
 * ==============================================================================
 * DỰ ÁN CUỐI KỲ: THIẾT KẾ WEB - LỚP 25CT111
 * FILE: js/search-filter.js
 * PHỤ TRÁCH: Nguyễn Thành Phát (MSSV: 125000658)
 * MÔ TẢ: Tìm kiếm thời gian thực theo Mã môn & Tên môn (hỗ trợ tiếng Việt không dấu),
 *        lọc theo số tín chỉ, cập nhật bộ đếm và nút đặt lại bộ lọc.
 * ==============================================================================
 */

(() => {
  'use strict';

  /**
   * Chuẩn hóa chuỗi tiếng Việt (bỏ dấu & chuyển chữ thường)
   * Giúp sinh viên gõ "lap trinh" vẫn tìm ra "Lập trình Web nâng cao"
   */
  function normalizeVietnamese(str) {
    return (str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  function initCatalogSearchFilter() {
    const searchForm = document.getElementById('search-form');
    const searchInput = document.getElementById('search-input');
    const creditFilter = document.getElementById('credit-filter');
    const resetBtn = document.getElementById('reset-filter-btn');
    const emptyResetBtn = document.getElementById('empty-reset-btn');
    const courseList = document.getElementById('course-list');
    const courseCountEl = document.getElementById('course-count');
    const emptyStateEl = document.getElementById('empty-search-state');

    if (!courseList || !searchInput || !creditFilter) return;

    const courseCards = Array.from(courseList.querySelectorAll('.course-card'));

    /**
     * Hàm thực hiện lọc danh sách thẻ môn học theo thời gian thực
     */
    function applyFilters() {
      const rawKeyword = searchInput.value.trim().toLowerCase();
      const normalizedKeyword = normalizeVietnamese(rawKeyword);
      const selectedCredit = creditFilter.value;

      let visibleCount = 0;

      courseCards.forEach((card) => {
        const courseId = (card.dataset.id || '').toLowerCase();
        const courseName = (card.dataset.name || '').toLowerCase();
        const normalizedName = normalizeVietnamese(card.dataset.name);
        const courseCredits = String(card.dataset.credits || '');

        // Kiểm tra khớp từ khóa (tìm theo cả data-id và data-name, có dấu hoặc không dấu)
        const matchesKeyword =
          !rawKeyword ||
          courseId.includes(rawKeyword) ||
          courseName.includes(rawKeyword) ||
          normalizedName.includes(normalizedKeyword);

        // Kiểm tra khớp bộ lọc số tín chỉ
        const matchesCredit =
          selectedCredit === 'all' || courseCredits === selectedCredit;

        const isMatch = matchesKeyword && matchesCredit;

        card.classList.toggle('is-hidden', !isMatch);
        card.hidden = !isMatch;

        if (isMatch) {
          visibleCount++;
        }
      });

      // Cập nhật số lượng môn học đang hiển thị
      if (courseCountEl) {
        courseCountEl.textContent = String(visibleCount);
      }

      // Ẩn/hiện thông báo không có kết quả
      if (emptyStateEl) {
        emptyStateEl.hidden = visibleCount > 0;
      }
    }

    /**
     * Hàm đặt lại toàn bộ bộ lọc về mặc định
     */
    function resetFilters() {
      searchInput.value = '';
      creditFilter.value = 'all';
      applyFilters();
      searchInput.focus();
    }

    // Chặn reload trang khi nhấn Enter trong form tìm kiếm
    if (searchForm) {
      searchForm.addEventListener('submit', (event) => {
        event.preventDefault();
        applyFilters();
      });
    }

    // Lắng nghe gõ phím tìm kiếm real-time
    searchInput.addEventListener('input', applyFilters);

    // Nhấn phím Esc trong ô tìm kiếm để xóa nhanh
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && searchInput.value !== '') {
        searchInput.value = '';
        applyFilters();
      }
    });

    // Lắng nghe thay đổi bộ lọc số tín chỉ
    creditFilter.addEventListener('change', applyFilters);

    // Lắng nghe nút Đặt lại bộ lọc
    if (resetBtn) {
      resetBtn.addEventListener('click', resetFilters);
    }
    if (emptyResetBtn) {
      emptyResetBtn.addEventListener('click', resetFilters);
    }

    // Chạy đồng bộ bộ đếm lần đầu khi tải trang
    applyFilters();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCatalogSearchFilter);
  } else {
    initCatalogSearchFilter();
  }
})();