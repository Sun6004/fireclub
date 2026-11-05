/* =========================================================
   미국 ETF 투자법 랜딩페이지 — script.js
   1) Header / Body / Footer HTML 불러오기
   2) 원칙 카드 탭 · 모바일 카드 넘김 버튼
   3) 스크롤 애니메이션 (GSAP + ScrollTrigger)
   ========================================================= */
(function(){
  'use strict';

  function track(name, params){
    if (window.LandingAnalytics) window.LandingAnalytics.track(name, params);
  }

  /* ---------- 1. HTML 영역 불러오기 ---------- */
  const PARTS = [
    { name:'header', mount:'site-header' },
    { name:'body',   mount:'site-body'   },
    { name:'footer', mount:'site-footer' }
  ];

  async function fetchPart(name){
    const res = await fetch('html/' + name + '.html', { cache:'no-cache' });
    if (!res.ok) throw new Error(name + ' ' + res.status);
    return res.text();
  }

  async function loadPartials(){
    const fallback = window.LANDING_PARTIALS || {};
    let html = {};
    // 더블클릭 실행(file://)은 fetch가 막히므로 바로 예비 사본 사용
    if (location.protocol !== 'file:'){
      try {
        const texts = await Promise.all(PARTS.map(p => fetchPart(p.name)));
        PARTS.forEach((p,i) => { html[p.name] = texts[i]; });
      } catch (err) {
        console.warn('[landing] html 파일을 불러오지 못해 예비 사본을 사용합니다.', err);
        html = {};
      }
    }
    PARTS.forEach(p => {
      const el = document.getElementById(p.mount);
      const markup = html[p.name] || fallback[p.name];
      if (el && markup) el.outerHTML = markup;
      else if (el) el.innerHTML = '<p style="padding:24px;font:14px sans-serif">' + p.name + ' 영역을 불러오지 못했습니다.</p>';
    });
  }

  /* ---------- 2. 원칙 카드 탭 + 모바일 카드 넘김 버튼 ---------- */
  function initInteractions(){

    // 원칙 카드 → 관련 강의 (기존 커리큘럼 강의명 기준)
    const PRINCIPLES = [
      {name:'분산투자', lessons:[['7강','한국에서도 투자 가능한 미국지수 ETF','17:24'],['8강','S&P500 ETF','15:54'],['9강','나스닥100 ETF','12:32']]},
      {name:'투자 비용', lessons:[['5강','저자가 미국 ETF를 선택한 이유','09:44'],['6강','ETF 기본 상식','22:42']]},
      {name:'안전성', lessons:[['12강','손실률 제로 주식 투자법','09:26'],['14강','파이어를 위한 포트폴리오 전략','26:05'],['15강','절세계좌 인출 전략','14:55']]}
    ];
    const tiles = [...document.querySelectorAll('.pgrid .ptile')];
    const list = document.getElementById('pdList'), nameEl = document.getElementById('pdName'), panel = document.getElementById('pdetail');
    const esc = s => s.replace(/&/g,'&amp;');
    function select(i, method){
      tiles.forEach((t,k)=>{ const on = k===i; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
      nameEl.textContent = PRINCIPLES[i].name;
      panel.setAttribute('aria-labelledby','pt-'+i);
      list.innerHTML = PRINCIPLES[i].lessons.map((l,k)=>`<li style="animation-delay:${k*60}ms"><span>${l[0]}</span>${esc(l[1])}<em>${l[2]}</em></li>`).join('');
      // 자동 전환과 첫 화면 기본 선택은 방문자의 선택으로 집계하지 않습니다.
      if (method) track('principle_select', {section_id:'principles', principle_name:PRINCIPLES[i].name, interaction_method:method});
    }
    tiles.forEach((t,i)=>{
      t.addEventListener('click', e=> select(i, e.isTrusted ? 'click' : null));
      t.addEventListener('keydown', e=>{ if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); const n=(i+(e.key==='ArrowRight'?1:-1)+tiles.length)%tiles.length; tiles[n].focus(); select(n, e.isTrusted ? 'keyboard' : null);} });
    });
    if (tiles.length) select(0);

    // 1.8초마다 다음 카드로 자동 전환 (화면에 보일 때만, 마우스를 올리거나 누르면 잠시 멈춤)
    const AUTO_MS = 1800;
    const pgrid = document.querySelector('.pgrid');
    let autoIdx = 0, autoTimer = null, inView = false, paused = false;
    const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function schedule(){
      clearTimeout(autoTimer);
      if (reduceMotion || !inView || paused) return;
      autoTimer = setTimeout(()=>{ autoIdx = (autoIdx + 1) % tiles.length; select(autoIdx); schedule(); }, AUTO_MS);
    }
    tiles.forEach((t,i)=> t.addEventListener('click', ()=>{ autoIdx = i; schedule(); }));
    if (pgrid){
      pgrid.addEventListener('mouseenter', ()=>{ paused = true; schedule(); });
      pgrid.addEventListener('mouseleave', ()=>{ paused = false; schedule(); });
      pgrid.addEventListener('focusin', ()=>{ paused = true; schedule(); });
      pgrid.addEventListener('focusout', ()=>{ paused = false; schedule(); });
      new IntersectionObserver(entries=>{
        entries.forEach(en=>{
          const was = inView; inView = en.isIntersecting;
          if (inView && !was){ autoIdx = 0; select(0); }   // 화면에 들어오면 '분산'부터 시작
          schedule();
        });
      }, {threshold:.45}).observe(pgrid);
    }

    // FAQ 아코디언
    document.querySelectorAll('.faq-q').forEach(q=>{
      q.addEventListener('click', ()=>{
        const open = q.getAttribute('aria-expanded') === 'true';
        // 하나만 열리도록: 다른 질문은 닫기
        document.querySelectorAll('.faq-q').forEach(o=>{ if (o !== q && o.getAttribute('aria-expanded') === 'true'){ o.setAttribute('aria-expanded','false'); o.parentElement.classList.remove('is-open'); } });
        q.setAttribute('aria-expanded', String(!open));
        q.parentElement.classList.toggle('is-open', !open);
        track('faq_toggle', {section_id:'faq', faq_id:q.id, question:q.querySelector('.t').textContent, action:open ? 'close' : 'open'});
      });
    });

    // ===== 원칙 카드 페이지 인디케이터(점 3개) — 활성 카드(is-active)와 항상 동기화 =====
    // · 카드 클릭 / 자동 전환 / 키보드 / 스와이프 / 점 클릭 어떤 경우든 활성 카드 = 라임 점
    // · 모바일(가로 슬라이더)에서는 활성 카드로 슬라이더가 부드럽게 이동, 스와이프가 멈추면 그 카드가 활성화
    if (pgrid && tiles.length){
      const pdots = document.createElement('div');
      pdots.className = 'm-dots p-dots';
      pdots.setAttribute('role','group'); pdots.setAttribute('aria-label','카드 위치');
      pdots.innerHTML = tiles.map((_,i)=>`<button type="button" aria-label="${i+1}번째 카드 보기"></button>`).join('');
      pgrid.after(pdots);
      const dotBtns = [...pdots.children];
      let progScroll = false, settleT = null;
      const isSlider = ()=> pgrid.scrollWidth > pgrid.clientWidth + 2;
      const maxLeft = ()=> pgrid.scrollWidth - pgrid.clientWidth;
      const cardLeft = i => Math.min(tiles[i].offsetLeft - tiles[0].offsetLeft, maxLeft());
      const activeIdx = ()=> Math.max(0, tiles.findIndex(t=> t.classList.contains('is-active')));
      function syncDots(i){
        dotBtns.forEach((d,k)=>{ d.classList.toggle('on', k===i); d.setAttribute('aria-current', k===i ? 'true' : 'false'); });
      }
      function goTo(i){
        if (!isSlider() || Math.abs(pgrid.scrollLeft - cardLeft(i)) < 2) return;
        progScroll = true;
        pgrid.scrollTo({left: cardLeft(i), behavior: reduceMotion ? 'auto' : 'smooth'});
      }
      // 활성 카드가 바뀌면(원인 무관) 점과 슬라이더 위치를 맞춤
      new MutationObserver(()=>{ const i = activeIdx(); syncDots(i); goTo(i); })
        .observe(pgrid, {subtree:true, attributes:true, attributeFilter:['class']});
      // 스와이프·스크롤이 멈추면 가장 가까운 카드를 활성화
      pgrid.addEventListener('scroll', ()=>{
        clearTimeout(settleT);
        settleT = setTimeout(()=>{
          if (progScroll){ progScroll = false; return; }
          const x = pgrid.scrollLeft;
          let best = 0; tiles.forEach((_,k)=>{ if (Math.abs(cardLeft(k) - x) < Math.abs(cardLeft(best) - x)) best = k; });
          if (best !== activeIdx()){ select(best, 'swipe'); autoIdx = best; schedule(); }
        }, 120);
      }, {passive:true});
      // 손가락으로 넘기는 동안은 자동 전환 잠시 멈춤
      pgrid.addEventListener('touchstart', ()=>{ paused = true; schedule(); progScroll = false; }, {passive:true});
      pgrid.addEventListener('touchend', ()=>{ paused = false; schedule(); }, {passive:true});
      dotBtns.forEach((d,i)=> d.addEventListener('click', e=>{ select(i, e.isTrusted ? 'dot' : null); autoIdx = i; schedule(); }));
      syncDots(activeIdx());
    }

    /* ===== 뉴스 주식 미니게임: 플로팅 버튼 + 팝업 (가상 시뮬레이션) ===== */
    (function ngGame(){
      if (document.getElementById('ngFab')) return;
      // good: 호재 뉴스면 상승 확률이 높고, 악재면 하락 확률이 높음 (항상 같은 결과는 아님)
      const NEWS = [
        {tag:'반도체', hl:'가상의 반도체 기업 A사, 분기 실적 시장 예상치 크게 상회', sub:'AI 서버용 칩 수요가 늘며 매출이 전년 대비 40% 증가했다는 소식입니다.', p:.72},
        {tag:'금리', hl:'중앙은행, 예상보다 빠른 기준금리 인상 시사', sub:'물가 상승세가 꺾이지 않자 추가 인상 가능성을 언급했습니다.', p:.3},
        {tag:'에너지', hl:'국제 유가 하루 만에 8% 급등', sub:'주요 산유국의 감산 발표로 원유 공급 우려가 커졌습니다.', p:.4},
        {tag:'빅테크', hl:'가상의 빅테크 B사, 대규모 자사주 매입 발표', sub:'향후 1년간 시가총액의 3% 규모 자사주를 사들이겠다고 밝혔습니다.', p:.68},
        {tag:'고용', hl:'월간 고용지표, 시장 예상보다 크게 부진', sub:'신규 일자리 증가 폭이 예상치의 절반에 그쳤습니다.', p:.42},
        {tag:'헬스케어', hl:'가상의 제약사 C사, 신약 임상 3상 실패', sub:'주요 평가 지표에서 기대한 효과를 확인하지 못했다고 발표했습니다.', p:.22},
        {tag:'소비', hl:'연말 쇼핑 시즌 소매 판매 역대 최대 기록', sub:'온라인 매출이 크게 늘며 소비 심리 회복 기대가 커지고 있습니다.', p:.66},
        {tag:'전기차', hl:'가상의 전기차 기업 D사, 대규모 리콜 발표', sub:'배터리 결함 가능성으로 약 20만 대를 리콜한다고 밝혔습니다.', p:.3},
        {tag:'물가', hl:'소비자물가 상승률, 3개월 연속 둔화', sub:'물가가 안정되며 금리 인하 기대감이 커지고 있습니다.', p:.7},
        {tag:'무역', hl:'주요국 간 관세 인상 갈등 다시 고조', sub:'수입품에 추가 관세를 부과하겠다는 발표가 나왔습니다.', p:.32},
        {tag:'AI', hl:'가상의 AI 스타트업 E사, 빅테크와 대형 파트너십 체결', sub:'클라우드 인프라 공동 개발 계약 소식이 전해졌습니다.', p:.65},
        {tag:'금융', hl:'가상의 대형 은행 F사, 예상 밖 대규모 손실 공시', sub:'부동산 대출 부실로 충당금을 크게 늘렸다고 밝혔습니다.', p:.25},
        {tag:'시장', hl:'미국 증시 대표 지수, 사상 최고치 경신', sub:'투자 심리가 과열됐다는 분석과 추가 상승 전망이 엇갈립니다.', p:.52},
        {tag:'통신', hl:'가상의 통신사 G사, 배당금 20% 인상 발표', sub:'안정적인 현금 흐름을 바탕으로 주주 환원을 늘리겠다고 했습니다.', p:.64}
      ];
      const MSG = {
        win:{
          buy:['촉이 좋았어요! 다음에도 맞을까요? 🤔','나이스 매수! 오늘은 시장이 내 편이었네요.','정답! 하지만 운도 실력의 일부일 뿐…'],
          sell:['정확한 판단! 빠른 손절(?)이 빛났어요.','하락을 미리 읽었네요. 오늘의 선견지명 👏','정답! 시장 흐름을 잘 읽었어요.']
        },
        lose:{
          buy:['앗, 사자마자 떨어졌어요… 흔한 일이에요 😅','뉴스는 좋았는데 시장 생각은 달랐네요.','매수 버튼이 너무 빨랐나 봐요.'],
          sell:['팔자마자 올랐어요… 이것이 시장 😭','하락을 예상했지만 시장은 반대로 갔어요.','아쉽지만 이번엔 시장이 이겼어요.']
        }
      };
      const SURPRISE = '좋은 뉴스에도 떨어지고, 나쁜 뉴스에도 오를 수 있어요. 이미 가격에 반영됐을 수도 있거든요.';
      const pick = a => a[Math.floor(Math.random()*a.length)];

      const ICON_CHART = '<svg viewBox="0 0 24 24" fill="none" stroke="#145C46" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 17l5-5 4 3 7-8"/><path d="M15 7h4v4"/></svg>';
      const ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

      const fab = document.createElement('button');
      fab.type = 'button'; fab.id = 'ngFab'; fab.className = 'ng-fab';
      fab.setAttribute('aria-haspopup','dialog'); fab.setAttribute('aria-controls','ngModal');
      fab.setAttribute('aria-label','투자 센스, 테스트해 볼래? 주식 게임 열기');
      fab.innerHTML = '<span class="ng-fab__bubble"><span class="ng-fab__tx">🔥 투자 센스, 테스트해 볼래?</span></span><span class="ng-fab__coin"><span class="ng-fx ng-fx-cone"></span><span class="ng-fx ng-fx-floor"></span><img src="assets/images/coin.png" alt="" width="240" height="252" draggable="false"><span class="ng-fx ng-spark s1"></span><span class="ng-fx ng-spark s2"></span><span class="ng-fx ng-spark s3"></span></span>';

      const modal = document.createElement('div');
      modal.id = 'ngModal'; modal.className = 'ng-modal'; modal.setAttribute('aria-hidden','true');
      modal.innerHTML =
        '<div class="ng-dialog" role="dialog" aria-modal="true" aria-labelledby="ngTitle">'+
          '<button type="button" class="ng-x" aria-label="닫기">'+ICON_X+'</button>'+
          '<div class="ng-head"><span class="ng-badge">속보</span><h2 class="ng-title" id="ngTitle">뉴스 보고 매수 vs 매도</h2></div>'+
          '<article class="ng-news" aria-live="polite">'+
            '<div class="ng-news__meta"><span class="ng-news__tag"></span><span>가상 뉴스 · 방금 전</span></div>'+
            '<p class="ng-news__hl"></p><p class="ng-news__sub"></p>'+
          '</article>'+
          '<div class="ng-play"><p class="ng-q">이 뉴스, 주가는 어떻게 될까요?</p>'+
            '<div class="ng-choices"><button type="button" class="ng-btn ng-buy" data-c="buy">매수<small>오를 것 같아요 ▲</small></button>'+
            '<button type="button" class="ng-btn ng-sell" data-c="sell">매도<small>내릴 것 같아요 ▼</small></button></div></div>'+
          '<div class="ng-result ng-hidden" aria-live="polite">'+
            '<svg class="ng-chart" viewBox="0 0 200 64" preserveAspectRatio="none" aria-hidden="true"><path/></svg>'+
            '<div class="ng-move"></div><div class="ng-verdict"></div><p class="ng-msg"></p>'+
            '<button type="button" class="ng-retry">다시 도전하기 ↻</button>'+
          '</div>'+
          '<div class="ng-cta">'+
            '<p class="ng-cta__q">“뉴스 하나만 보고 투자하기 어렵지 않나요?”</p>'+
            '<p class="ng-cta__d">감이 아닌 원칙으로 투자하는 방법, <br>미국 ETF 강의에서 알아보세요.</p>'+
            '<a class="ng-cta__btn" href="https://fireclub.liveklass.com/classes/266958" target="_blank" rel="noopener noreferrer">미국 ETF 투자법 알아보기 →</a>'+
          '</div>'+
          '<p class="ng-note">※ 이 게임의 뉴스·기업·주가 변동은 모두 가상의 시뮬레이션이며, 실제 투자 정보나 수익 예측이 아닙니다.</p>'+
        '</div>';

      document.body.appendChild(fab);
      document.body.appendChild(modal);

      const $ = s => modal.querySelector(s);
      const play = $('.ng-play'), result = $('.ng-result');
      let current = -1, lastFocus = null;

      function newRound(){
        let i; do { i = Math.floor(Math.random()*NEWS.length); } while (NEWS.length > 1 && i === current);
        current = i; const n = NEWS[i];
        $('.ng-news__tag').textContent = '#' + n.tag;
        $('.ng-news__hl').textContent = n.hl;
        $('.ng-news__sub').textContent = n.sub;
        result.classList.add('ng-hidden'); play.classList.remove('ng-hidden');
      }

      // 가상 주가 경로: 무작위 흔들림 + 최종 방향
      function chartPath(up){
        const pts = 12, end = up ? 14 : 50; let y = 32, d = '';
        for (let k=0; k<=pts; k++){
          const x = k/pts*200, target = 32 + (end-32)*(k/pts);
          y = k === 0 ? 32 : k === pts ? end : target + (Math.random()-.5)*16;
          y = Math.max(6, Math.min(58, y));
          d += (k ? ' L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
        }
        return d;
      }

      function choose(c){
        const n = NEWS[current];
        const up = Math.random() < n.p;                      // 뉴스 성향 + 랜덤
        const pct = (0.4 + Math.random()*6.6).toFixed(1);    // 0.4% ~ 7.0%
        const win = (c === 'buy') === up;
        result.classList.remove('up','down'); result.classList.add(up ? 'up' : 'down');
        const path = $('.ng-chart path'); path.setAttribute('d', chartPath(up));
        const len = path.getTotalLength ? path.getTotalLength() : 300;
        path.style.transition = 'none'; path.style.strokeDasharray = len; path.style.strokeDashoffset = len;
        $('.ng-move').textContent = (up ? '▲ +' : '▼ -') + pct + '%' + (up ? ' 상승' : ' 하락');
        $('.ng-verdict').textContent = win ? '예측 성공! 🎉' : '예측 실패!';
        const surprise = (n.p >= .6 && !up) || (n.p <= .4 && up);
        $('.ng-msg').textContent = pick(MSG[win ? 'win' : 'lose'][c]) + (surprise ? ' ' + SURPRISE : '');
        play.classList.add('ng-hidden'); result.classList.remove('ng-hidden');
        requestAnimationFrame(()=>{ path.getBoundingClientRect(); path.style.transition = 'stroke-dashoffset .8s ease'; path.style.strokeDashoffset = 0; });
        $('.ng-retry').focus({preventScroll:true});
        track('game_result', {section_id:'game', choice:c, result:win ? 'win' : 'lose'});
      }

      function open(){
        lastFocus = document.activeElement;
        newRound();
        modal.classList.add('open'); modal.setAttribute('aria-hidden','false');
        document.documentElement.classList.add('ng-lock');
        fab.classList.add('hide');
        track('game_open', {section_id:'game'});
        setTimeout(()=> $('.ng-x').focus({preventScroll:true}), 50);
      }
      function close(){
        modal.classList.remove('open'); modal.setAttribute('aria-hidden','true');
        document.documentElement.classList.remove('ng-lock');
        fab.classList.remove('hide');
        track('game_close', {section_id:'game'});
        if (lastFocus && lastFocus.focus) lastFocus.focus({preventScroll:true});
      }

      fab.addEventListener('click', open);
      $('.ng-x').addEventListener('click', close);
      modal.addEventListener('click', e=>{ if (e.target === modal) close(); });
      document.addEventListener('keydown', e=>{
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') { close(); return; }
        if (e.key === 'Tab'){   // 팝업 안에서만 포커스 이동
          const f = [...modal.querySelectorAll('button, a[href]')].filter(b=> b.offsetParent);
          const a = f[0], z = f[f.length-1];
          if (e.shiftKey && document.activeElement === a){ e.preventDefault(); z.focus(); }
          else if (!e.shiftKey && document.activeElement === z){ e.preventDefault(); a.focus(); }
        }
      });
      modal.querySelectorAll('.ng-btn').forEach(b=> b.addEventListener('click', ()=> choose(b.dataset.c)));
      $('.ng-retry').addEventListener('click', newRound);
      // CTA: 강의 상세페이지를 새 탭으로 엽니다 (링크 기본 동작 그대로)

      // 모바일 하단 고정 버튼(.mcta)이 올라오면 플로팅 버튼이 가리지 않도록 위로 비켜남
      const mcta = document.getElementById('mcta');
      if (mcta){
        const sync = ()=> fab.classList.toggle('lift', mcta.classList.contains('on') && getComputedStyle(mcta).display !== 'none');
        new MutationObserver(sync).observe(mcta, {attributes:true, attributeFilter:['class']});
        addEventListener('resize', sync); sync();
      }
    })();

  }

  /* ---------- 3. 스크롤 애니메이션 ---------- */
  function initScroll(){


    const hdr = document.getElementById('hdr');
    const heroEl = document.querySelector('.shift-dark');
    const onScroll = ()=>{ hdr.classList.toggle('scrolled', scrollY > 8); hdr.classList.toggle('on-dark', false); const sh = document.getElementById('shift'); hdr.classList.toggle('past-hero', !!sh && scrollY > sh.offsetHeight - 60); };   // 히어로가 밝은 배경이라 헤더는 항상 밝은 스타일
    addEventListener('scroll', onScroll, {passive:true}); onScroll();

    // fit 3D stage to viewport
    const fitEl = document.getElementById('fit');
    function fit(){
      const stage = fitEl.parentElement;
      const h = stage.clientHeight || innerHeight*0.5;
      const desk = innerWidth > 760;
      const s = desk ? Math.min(1.5, (innerWidth - 64) / 760, (h - 10) / 440) : Math.min(1, (innerWidth - 32) / 760, (h - 30) / 500);
      fitEl.style.setProperty('--fit', Math.max(0.36, s).toFixed(3));
    }
    fit(); addEventListener('resize', ()=>{ fit(); if (typeof placeCap==='function') placeCap(); });

    // 3D state
    const obj = document.getElementById('obj'), book = document.getElementById('book'),
          laptop = document.getElementById('laptop'), deck = document.getElementById('deck'),
          ground = document.getElementById('ground'), prog = document.getElementById('prog');
    const phone = document.getElementById('phone'), progM = document.getElementById('progM');
    const bookFaces = [...document.querySelectorAll('#book .face')], phoneFaces = [...document.querySelectorAll('#phone .face')], tabFaces = [...document.querySelectorAll('#laptop .face')];
    let isPhone = false;   // PC·모바일 모두 책 → 가로형 태블릿으로 전환 (#laptop 요소를 태블릿 디자인으로 사용)
    const shades = {};
    document.querySelectorAll('[data-shade]').forEach(el=> shades[el.dataset.shade] = el);
    const S = {ry:0, sc:1, bz:1, deck:0, tilt:0, y:0, pp:.18};
    const LAP_SCALE = .78;   // 태블릿 크기 (css/theme.css의 .stage .laptop 배율과 같게)
    let capBox = null;
    const rad = d => d*Math.PI/180;
    function render(){
      obj.style.transform = `translateY(${S.y}px) rotateX(${S.tilt}deg) rotateY(${S.ry}deg) scale3d(${S.sc},${S.sc},${S.sc})`;
      book.style.transform = `scaleZ(${S.bz})`;
      const isBook = S.ry < 90;
      book.style.visibility = isBook ? 'visible' : 'hidden';
      laptop.style.visibility = (isBook || isPhone) ? 'hidden' : 'visible';
      phone.style.visibility = (isBook || !isPhone) ? 'hidden' : 'visible';
      // 책 → 핸드폰 전환: 책 두께(모서리) 잔상이 남지 않도록 90° 직전에 책을 서서히 지우고, 90° 이후 핸드폰을 서서히 보이게
      // (preserve-3d가 깨지지 않게 상자 대신 각 면에 투명도 적용)
      const bookOp = S.ry <= 58 ? 1 : Math.max(0, (82 - S.ry) / 24);
      const phoneOp = S.ry < 95 ? 0 : Math.min(1, (S.ry - 95) / 30);
      bookFaces.forEach(f=> f.style.opacity = bookOp.toFixed(3));
      // 핸드폰 앞면만 서서히 나타나고, 옆·위·뒷면(회색 판)은 앞면이 완전히 보인 뒤에만 표시 → 반투명 앞면 너머로 회색 모서리가 비치지 않음
      // 옆면(책등·핸드폰 두께)도 앞면과 같은 투명도로 함께 서서히 사라지고/나타나게 → 옆면이 갑자기 튀거나 끊기지 않음
      phoneFaces.forEach(f=> f.style.opacity = phoneOp.toFixed(3));
      tabFaces.forEach(f=> f.style.opacity = phoneOp.toFixed(3));   // 태블릿도 같은 방식으로 서서히 나타남
      deck.style.transform = `rotateX(90deg) scaleY(${S.deck})`;
      const c = Math.cos(rad(S.ry)), s = Math.abs(Math.sin(rad(S.ry)));
      shades.front.style.opacity = ((1 - Math.max(c,0)) * .45).toFixed(3);
      shades.spine.style.opacity = ((1 - s) * .35 + .04).toFixed(3);
      shades.back.style.opacity = .2;
      shades.lap.style.opacity = ((1 + Math.min(c,0)) * .5).toFixed(3);
      shades.phone.style.opacity = ((1 + Math.min(c,0)) * .5).toFixed(3);
      const g = isBook ? (.55 + .45*Math.abs(c)) : (.35 + .65*Math.abs(c));
      ground.style.transform = `translateY(${(S.y + S.deck*40).toFixed(1)}px) scaleX(${(g*S.sc).toFixed(3)})`;
      ground.style.opacity = isPhone ? '0' : (0.5 + 0.5*Math.abs(c)).toFixed(3);   // 모바일: 책·핸드폰 모두 바닥 그림자 숨김
      prog.style.setProperty('--pp', (S.pp*100).toFixed(1)+'%');
      progM.style.setProperty('--pp', (S.pp*100).toFixed(1)+'%');
      placeCap();
    }
    // 강의 제목(캡션)을 책·노트북 바로 아래에 배치
    function placeCap(){
      capBox = capBox || document.querySelector('.stage .morph-cap');
      if (!capBox) return;
      const f = parseFloat(fitEl.style.getPropertyValue('--fit')) || 1;
      const sh = fitEl.parentElement.clientHeight;
      const k = (S.ry >= 90 && !isPhone) ? LAP_SCALE : 1;   // 노트북을 줄인 만큼 캡션도 노트북 바로 아래로
      capBox.style.top = Math.round(sh/2 + f*((242 + S.deck*40)*k + S.y)) + 'px';
    }
    render();

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cap1 = document.getElementById('cap1'), cap2 = document.getElementById('cap2');

    if (!window.gsap || !window.ScrollTrigger || reduce){
      // 정적 상태: 최종 노트북 화면을 보여줌
      Object.assign(S, {ry:180, sc:1, bz:.32, deck:0, tilt:0, y:0, pp:.18}); render();
      cap1.style.opacity = 0; cap2.style.opacity = 1;
      document.getElementById('mcta').classList.add('on');
      return;
    }

    gsap.registerPlugin(ScrollTrigger);

    // HERO intro

    // SECTION 01-B — '감으로' 취소선 → 단어 교체 → '이해하고 시작하세요.' (스크롤 연동)
    (function(){
      const words = gsap.utils.toArray('.shift .s-word');
      const strikes = words.map(w=> w.querySelector('.st'));
      const dots = gsap.utils.toArray('.shift .s-dots i');
      const setDot = n => dots.forEach((d,i)=> d.classList.toggle('on', i === n));
      gsap.set(words, {opacity:0, yPercent:60, color:'#145C46'});
      gsap.set(words[0], {opacity:1, yPercent:0});
      gsap.set(strikes, {scaleX:0});
      gsap.set('#sL2', {'--hl':'0%'});
      // 고정(pin) 없이: 스크롤을 조금만 내리면 재생, 맨 위로 올리면 되돌아감 → 히어로 아래 빈 공간이 생기지 않음
      const tl = gsap.timeline({defaults:{ease:'power2.inOut'}, paused:true});
      // 페이지가 열리고 잠시 뒤(또는 스크롤을 시작하면) 천천히 한 번 재생 → 형광펜이 끝까지 보인 채로 유지
      let heroPlayed = false;
      const playHero = ()=>{ if (heroPlayed) return; heroPlayed = true; tl.play(); };
      setTimeout(playHero, 900);
      ScrollTrigger.create({ trigger:'#shift', start:'top top-=4', onEnter: playHero });
      words.forEach((w,i)=>{
        tl.to(strikes[i], {scaleX:1, duration:1, ease:'power1.inOut'})
          .to(w, {color:'rgba(20,92,70,.4)', duration:.6}, '<.3');
        if (i < words.length - 1){
          tl.to(w, {yPercent:-60, opacity:0, duration:.6}, '+=.25')
            .to(words[i+1], {yPercent:0, opacity:1, duration:.6}, '<.15');
        }
      });
      tl.to('#sL2', {'--hl':'100%', duration:2.2, ease:'power1.inOut'}, '+=.15')   // 형광펜: 왼쪽 → 오른쪽으로 천천히
        .to({}, {duration:.1});
      tl.duration(3.4);   // 취소선 약 1초 → 형광펜 약 2초
    })();

    // SECTION 02 — book → laptop
    const mm = gsap.matchMedia();
    const reduceMotionAll = matchMedia('(prefers-reduced-motion: reduce)').matches;
    mm.add({isMobile:'(max-width: 760px)', isDesk:'(min-width: 761px)'}, (ctx)=>{
      // 스크롤이 책 섹션에 닿으면 책 → 노트북(모바일은 핸드폰) 전환이 자동으로 한 번 재생됨 (스크롤 고정·스크럽 없음)
      // 섹션 위로 다시 올라가면 처음 상태(책)로 돌아가고, 다시 내려오면 또 재생
      const isM = ctx.conditions.isMobile;
      isPhone = false;   // PC·모바일 공통: 태블릿
      Object.assign(S,{ry:0, sc:1, bz:1, deck:0, tilt:0, y:0, pp:.18}); render();
      const tl = gsap.timeline({
        defaults:{ease:'none'},
        onUpdate: render,
        paused: true,
        scrollTrigger: {trigger:'#course', start: isM ? 'top 55%' : 'top 35%', toggleActions:'play none none reset', invalidateOnRefresh:true, onLeaveBack:()=> requestAnimationFrame(()=>{ render(); placeCap && placeCap(); })}
      });
      tl.to(S, {sc:1, duration:1, ease:'power2.out'}, 0)
        .to(S, {ry:90, sc:1, duration:1.8, ease:'power1.in'}, 1)   // 회전 빠르게 (기존 3 → 1.8)
        .to(S, {bz:.32, duration:.9, ease:'power1.in'}, 1.9)
        .to(cap1, {opacity:0, y:-8, duration:.4}, 2.4)
        .to(S, {ry:180, sc:1, duration:1.8, ease:'power1.out'}, 2.8)
        .fromTo(cap2, {opacity:0, y:8}, {opacity:1, y:0, duration:.5}, 3.1)
      if (isPhone){
        // 핸드폰(PC·모바일 공통): 키보드 펼침 없이 정면으로 살짝 커졌다가 자리잡음
        tl.to(S, {sc:1, duration:1.6, ease:'none'}, 6.6)   // 크기 변화 없음(전체 크기 고정)
          .to(S, {sc:1, duration:1.4, ease:'power2.inOut'}, 7.4)
          .to({}, {duration:.8});
      } else {
        // 노트북 이미지(키보드 없음): 키보드 펼침·기울기 없이 정면으로 살짝 커졌다가 자리잡음
        tl.to(S, {sc:1, duration:1.6, ease:'none'}, 6.6)   // 크기 변화 없음(전체 크기 고정)
          .to(S, {sc:1, duration:1.4, ease:'power2.inOut'}, 7.4)
          .to({}, {duration:.8});
      }
      tl.duration(reduceMotionAll ? .01 : 2.8);   // 전환 전체 재생 시간(초)
    });

    // SECTION 03 — line highlight
    gsap.utils.toArray('.why .hl').forEach(el=>{
      gsap.fromTo(el, {opacity:.14}, {opacity:1, ease:'none', scrollTrigger:{trigger:el, start:'top 78%', end:'top 48%', scrub:true}});
    });

    // generic reveals
    gsap.utils.toArray('[data-reveal]').forEach(el=>{
      gsap.from(el, {y:40, opacity:0, duration:.9, ease:'power3.out', scrollTrigger:{trigger:el, start:'top 88%', once:true}});
    });

    // sticky mobile CTA
    const mcta = document.getElementById('mcta');
    ScrollTrigger.create({trigger:'#curriculum', start:'top bottom', endTrigger:'#enroll', end:'top bottom', onToggle:self=> mcta.classList.toggle('on', self.isActive)});

    // smooth anchor
    document.querySelectorAll('a[href^="#"]').forEach(a=>{
      a.addEventListener('click', e=>{
        const id = a.getAttribute('href'); if (id.length < 2) return;
        const t = document.querySelector(id); if (!t) return;
        e.preventDefault();
        const st = ScrollTrigger.getAll().find(s=> s.pin === t);
        const y = st ? st.start : t.getBoundingClientRect().top + scrollY - 60;
        scrollTo({top: id === '#course' ? (st ? st.start : y) : y, behavior:'smooth'});
      });
    });

    addEventListener('load', ()=> ScrollTrigger.refresh());
    document.fonts && document.fonts.ready.then(()=> ScrollTrigger.refresh());

  }

  /* ---------- 실행 ---------- */
  async function start(){
    await loadPartials();
    initInteractions();
    initScroll();
    if (window.LandingAnalytics) window.LandingAnalytics.init();
    // 페이지가 이미 로드된 뒤 삽입되므로 위치 재계산
    if (window.ScrollTrigger){
      requestAnimationFrame(() => window.ScrollTrigger.refresh());
      if (document.readyState === 'complete') setTimeout(() => window.ScrollTrigger.refresh(), 300);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
