/* =========================================================
   미국 ETF 투자법 랜딩페이지 — script.js
   1) Header / Body / Footer HTML 불러오기
   2) 원칙 카드 탭 · 모바일 카드 넘김 버튼
   3) 스크롤 애니메이션 (GSAP + ScrollTrigger)
   ========================================================= */
(function(){
  'use strict';

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
      {name:'분산', lessons:[['7강','한국에서도 투자 가능한 미국지수 ETF','17:24'],['8강','S&P500 ETF','15:54'],['9강','나스닥100 ETF','12:32']]},
      {name:'저비용', lessons:[['5강','저자가 미국 ETF를 선택한 이유','09:44'],['6강','ETF 기본 상식','22:42']]},
      {name:'안정성', lessons:[['12강','손실률 제로 주식 투자법','09:26'],['14강','파이어를 위한 포트폴리오 전략','26:05'],['15강','절세계좌 인출 전략','14:55']]}
    ];
    const tiles = [...document.querySelectorAll('.pgrid .ptile')];
    const list = document.getElementById('pdList'), nameEl = document.getElementById('pdName'), panel = document.getElementById('pdetail');
    const esc = s => s.replace(/&/g,'&amp;');
    function select(i){
      tiles.forEach((t,k)=>{ const on = k===i; t.classList.toggle('is-active', on); t.setAttribute('aria-selected', on); });
      nameEl.textContent = PRINCIPLES[i].name;
      panel.setAttribute('aria-labelledby','pt-'+i);
      list.innerHTML = PRINCIPLES[i].lessons.map((l,k)=>`<li style="animation-delay:${k*60}ms"><span>${l[0]}</span>${esc(l[1])}<em>${l[2]}</em></li>`).join('');
    }
    tiles.forEach((t,i)=>{
      t.addEventListener('click', ()=> select(i));
      t.addEventListener('keydown', e=>{ if(e.key==='ArrowRight'||e.key==='ArrowLeft'){ e.preventDefault(); const n=(i+(e.key==='ArrowRight'?1:-1)+tiles.length)%tiles.length; tiles[n].focus(); select(n);} });
    });
    if (tiles.length) select(0);

    // 모바일 가로 카드: 이전/다음 버튼 + 1/3 표시
    const arrow = d => `<svg viewBox="0 0 24 24"><path d="${d}"/></svg>`;
    document.querySelectorAll('.m-row').forEach(row=>{
      const items = [...row.children];
      const ctrl = document.createElement('div');
      ctrl.className = 'm-ctrl';
      ctrl.innerHTML = `<span class="cnt"><b>1</b> / ${items.length}</span><button type="button" aria-label="이전 카드">${arrow('M15 5l-7 7 7 7')}</button><button type="button" aria-label="다음 카드">${arrow('M9 5l7 7-7 7')}</button>`;
      row.after(ctrl);
      const [prev, next] = ctrl.querySelectorAll('button'), cnt = ctrl.querySelector('b');
      const step = ()=> items[0].getBoundingClientRect().width + parseFloat(getComputedStyle(row).columnGap || 10);
      function update(){
        const max = row.scrollWidth - row.clientWidth - 2;
        const idx = row.scrollLeft >= max ? items.length - 1 : Math.round(row.scrollLeft / step());
        cnt.textContent = Math.min(items.length, idx + 1);
        prev.disabled = row.scrollLeft <= 2;
        next.disabled = row.scrollLeft >= max;
      }
      prev.addEventListener('click', ()=> row.scrollBy({left:-step(), behavior:'smooth'}));
      next.addEventListener('click', ()=> row.scrollBy({left: step(), behavior:'smooth'}));
      row.addEventListener('scroll', ()=> requestAnimationFrame(update), {passive:true});
      addEventListener('resize', update);
      update();
    });

  }

  /* ---------- 3. 스크롤 애니메이션 ---------- */
  function initScroll(){


    const hdr = document.getElementById('hdr');
    const heroEl = document.querySelector('.shift-dark');
    const onScroll = ()=>{ hdr.classList.toggle('scrolled', scrollY > 8); hdr.classList.toggle('on-dark', !!heroEl && heroEl.getBoundingClientRect().bottom > 60); };
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
    fit(); addEventListener('resize', fit);

    // 3D state
    const obj = document.getElementById('obj'), book = document.getElementById('book'),
          laptop = document.getElementById('laptop'), deck = document.getElementById('deck'),
          ground = document.getElementById('ground'), prog = document.getElementById('prog');
    const shades = {};
    document.querySelectorAll('[data-shade]').forEach(el=> shades[el.dataset.shade] = el);
    const S = {ry:0, sc:.9, bz:1, deck:0, tilt:0, y:0, pp:0};
    const rad = d => d*Math.PI/180;
    function render(){
      obj.style.transform = `translateY(${S.y}px) rotateX(${S.tilt}deg) rotateY(${S.ry}deg) scale3d(${S.sc},${S.sc},${S.sc})`;
      book.style.transform = `scaleZ(${S.bz})`;
      const isBook = S.ry < 90;
      book.style.visibility = isBook ? 'visible' : 'hidden';
      laptop.style.visibility = isBook ? 'hidden' : 'visible';
      deck.style.transform = `rotateX(90deg) scaleY(${S.deck})`;
      const c = Math.cos(rad(S.ry)), s = Math.abs(Math.sin(rad(S.ry)));
      shades.front.style.opacity = ((1 - Math.max(c,0)) * .45).toFixed(3);
      shades.spine.style.opacity = ((1 - s) * .35 + .04).toFixed(3);
      shades.back.style.opacity = .2;
      shades.lap.style.opacity = ((1 + Math.min(c,0)) * .5).toFixed(3);
      const g = isBook ? (.55 + .45*Math.abs(c)) : (.35 + .65*Math.abs(c));
      ground.style.transform = `translateY(${(S.y + S.deck*40).toFixed(1)}px) scaleX(${(g*S.sc).toFixed(3)})`;
      ground.style.opacity = (0.5 + 0.5*Math.abs(c)).toFixed(3);
      prog.style.setProperty('--pp', (S.pp*100).toFixed(1)+'%');
    }
    render();

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cap1 = document.getElementById('cap1'), cap2 = document.getElementById('cap2');

    if (!window.gsap || !window.ScrollTrigger || reduce){
      // 정적 상태: 최종 노트북 화면을 보여줌
      Object.assign(S,{ry:180, sc:.84, bz:.32, deck:1, tilt:-12, y:-55, pp:.18}); render();
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
      gsap.set(words, {opacity:0, yPercent:60, color:'#FFFFFF'});
      gsap.set(words[0], {opacity:1, yPercent:0});
      gsap.set(strikes, {scaleX:0});
      gsap.set('#sL2', {opacity:0, yPercent:50});
      gsap.set('#sU', {'--ux':0});
      const tl = gsap.timeline({defaults:{ease:'power2.inOut'}, scrollTrigger:{
        trigger:'#shift', start:'top top', end:()=> '+=' + (innerWidth < 761 ? 1200 : 1600),
        pin:true, scrub:.6, anticipatePin:1, invalidateOnRefresh:true,
        onUpdate:self=>{ const p = self.progress; setDot(p < .5 ? 0 : 1); }
      }});
      words.forEach((w,i)=>{
        tl.to(strikes[i], {scaleX:1, duration:1, ease:'power1.inOut'})
          .to(w, {color:'#5E6B63', duration:.6}, '<.3');
        if (i < words.length - 1){
          tl.to(w, {yPercent:-60, opacity:0, duration:.6}, '+=.25')
            .to(words[i+1], {yPercent:0, opacity:1, duration:.6}, '<.15');
        }
      });
      tl.to('#sL2', {opacity:1, yPercent:0, duration:1, ease:'power3.out'}, '+=.3')
        .to('#sU', {'--ux':1, duration:.8, ease:'power2.out'}, '-=.3')
        .to({}, {duration:.8});
    })();

    // SECTION 02 — book → laptop
    const mm = gsap.matchMedia();
    mm.add({isMobile:'(max-width: 760px)', isDesk:'(min-width: 761px)'}, (ctx)=>{
      const len = ctx.conditions.isMobile ? 2200 : 3400;
      Object.assign(S,{ry:0, sc:.9, bz:1, deck:0, tilt:0, y:0, pp:0}); render();
      const tl = gsap.timeline({
        defaults:{ease:'none'},
        onUpdate: render,
        scrollTrigger:{trigger:'#course', start:'top top', end:'+='+len, pin:true, scrub:.6, anticipatePin:1, invalidateOnRefresh:true}
      });
      tl.to(S, {sc:1, duration:1, ease:'power2.out'}, 0)
        .to(S, {ry:90, sc:1.02, duration:3, ease:'power1.in'}, 1)
        .to(S, {bz:.32, duration:1.4, ease:'power1.in'}, 2.6)
        .to(cap1, {opacity:0, y:-8, duration:.5}, 3.4)
        .to(S, {ry:180, sc:1, duration:3, ease:'power1.out'}, 4)
        .fromTo(cap2, {opacity:0, y:8}, {opacity:1, y:0, duration:.5}, 4.3)
        .to(S, {tilt:-12, deck:1, duration:1.6, ease:'power2.out'}, 6.6)
        .to(S, {sc:.84, y:-55, duration:1.4, ease:'power2.inOut'}, 7.4)
        .to(S, {pp:.18, duration:2.2}, 7.8)
        .to({}, {duration:.8});
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
    // 페이지가 이미 로드된 뒤 삽입되므로 위치 재계산
    if (window.ScrollTrigger){
      requestAnimationFrame(() => window.ScrollTrigger.refresh());
      if (document.readyState === 'complete') setTimeout(() => window.ScrollTrigger.refresh(), 300);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
