/* GA4 + Meta Pixel 행동 추적. 기본 태그/식별자는 각 HTML에서 설정합니다. */
(function () {
  'use strict';
  if (window.LandingAnalytics) return;

  const debug = new URLSearchParams(location.search).get('analytics_debug') === '1';
  let initialized = false;
  const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim().slice(0, 100);

  function track(name, params) {
    const data = Object.assign({ page_path: location.pathname }, params);
    // 한쪽 태그가 차단되거나 오류가 나도 다른 태그와 페이지 동작은 계속됩니다.
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', name, Object.assign({}, data, debug ? { debug_mode: true } : {}));
      }
    } catch (error) { if (debug) console.warn('[analytics] GA4', error); }
    try {
      if (typeof window.fbq === 'function') window.fbq('trackCustom', name, data);
    } catch (error) { if (debug) console.warn('[analytics] Meta', error); }
    if (debug) console.debug('[analytics]', name, data);
  }

  function sectionId(element) {
    if (element.closest('#ngModal, #ngFab')) return 'game';
    if (element.closest('#mcta')) return 'mobile_cta';
    const section = element.closest('section, header, footer');
    return section ? section.id || (section.matches('header') ? 'header' : section.matches('footer') ? 'footer' : 'story') : 'page';
  }

  function buttonInfo(element) {
    const section = sectionId(element);
    const dot = element.closest('.p-dots');
    const index = dot ? Array.from(dot.children).indexOf(element) + 1 : 0;
    const label = element.querySelector('.t, .w');
    const image = element.querySelector('img[alt]');
    return {
      section_id: section,
      button_id: element.dataset.trackId || element.id || (dot ? 'principle_dot_' + index :
        element.matches('.logo') ? 'logo' : element.matches('.ng-x') ? 'game_close' :
        element.matches('.ng-buy') ? 'game_buy' : element.matches('.ng-sell') ? 'game_sell' :
        element.matches('.ng-retry') ? 'game_retry' :
        element.matches('a[href^="#"]') ? 'nav_' + element.getAttribute('href').slice(1) :
        element.matches('.nav-blog') ? 'nav_blog' : section + '_cta'),
      button_text: cleanText(element.getAttribute('aria-label') || (label && label.textContent) || element.textContent || (image && image.alt))
    };
  }

  function trackClick(event, clickSelector) {
    // 점 버튼의 .click() 등 내부 처리로 발생한 중복 클릭은 제외합니다.
    if (!event.isTrusted || !(event.target instanceof Element)) return;
    const element = event.target.closest('a[href], button, [role="button"]');
    if (!element || element.matches(':disabled, [aria-disabled="true"]')) return;
    if (clickSelector && !element.matches(clickSelector)) return;
    const params = buttonInfo(element);
    if (element.matches('a[href]')) {
      const url = new URL(element.getAttribute('href'), location.href);
      // 쿼리에는 개인정보가 포함될 수 있으므로 보내지 않습니다.
      if (/^https?:$/.test(url.protocol)) {
        params.link_url = (url.origin + url.pathname + (url.origin === location.origin ? url.hash : '')).slice(0, 100);
        params.outbound = url.origin !== location.origin;
      }
      track('button_click', params);
      if (url.hostname === 'fireclub.liveklass.com' && url.pathname === '/classes/266958') {
        track('course_cta_click', Object.assign({ course_id: '266958' }, params));
      }
    } else {
      track('button_click', params);
    }
  }

  function init(options) {
    if (initialized) return;
    initialized = true;
    const clickSelector = options && options.clickSelector;
    document.addEventListener('click', event => trackClick(event, clickSelector), true);

    // HTML 삽입 후 시작하여 빈 페이지를 100% 스크롤로 기록하지 않습니다.
    // 스크롤 가능한 거리 중 내려간 비율. 각 기준은 페이지 로드당 한 번만 기록합니다.
    const reached = new Set();
    let pending = false;
    function checkScroll() {
      pending = false;
      if (document.visibilityState === 'hidden') return;
      const root = document.scrollingElement || document.documentElement;
      const distance = root.scrollHeight - root.clientHeight;
      if (distance <= 1 || root.scrollTop <= 0) return;
      const percent = Math.min(100, Math.max(0, root.scrollTop / distance * 100));
      [25, 50, 75, 90, 100].forEach(value => {
        if (!reached.has(value) && (percent >= value || (value === 100 && distance - root.scrollTop <= 2))) {
          reached.add(value);
          track('scroll_depth', { percent_scrolled: value });
        }
      });
    }
    function queueScroll() {
      if (pending) return;
      pending = true;
      requestAnimationFrame(checkScroll);
    }
    window.addEventListener('scroll', queueScroll, { passive: true });
    window.addEventListener('resize', queueScroll, { passive: true });
    window.addEventListener('load', queueScroll);
    window.addEventListener('pageshow', queueScroll);
    document.addEventListener('visibilitychange', queueScroll);
    if (typeof ResizeObserver === 'function') new ResizeObserver(queueScroll).observe(document.body);
    if (document.fonts) document.fonts.ready.then(queueScroll);
    queueScroll();

    // 화면 중앙 영역에 진입한 섹션을 한 번씩 기록합니다. 긴 섹션도 측정합니다.
    if (typeof IntersectionObserver === 'function') {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const section = entry.target;
          track('section_view', {
            section_id: sectionId(section),
            section_title: cleanText((section.querySelector('h2') || {}).textContent || section.getAttribute('aria-label') || section.id)
          });
          observer.unobserve(section);
        });
      }, { rootMargin: '-10% 0px -20% 0px', threshold: 0 });
      document.querySelectorAll('main section').forEach(section => observer.observe(section));
    }
  }

  window.LandingAnalytics = { init: init, track: track };
})();
