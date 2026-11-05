/* =========================================================
   블로그 — blog.js
   글쓰기 에디터 · 이미지 첨부 · 임시 저장 · 미리보기 · 카테고리/태그
   검색 · 게시글 관리 · 댓글/답글 · 통계
   ※ 서버가 없는 정적 페이지라 데이터는 이 브라우저(localStorage)에 저장됩니다.
   ========================================================= */
(function(){
  'use strict';

  /* ---------------- 설정 ---------------- */
  const KEY_POSTS = 'fc_blog_posts_v1';
  const KEY_DRAFT = 'fc_blog_draft_v1';
  // 관리자 비밀번호 (원문 대신 해시만 저장). 바꾸려면 README의 '비밀번호 바꾸기' 참고
  const ADMIN_PW_HASHES = ['sha256:f15522669dd9aa6a551960229cbeace904ec44a40db93701196d23934700e80f', 'fb:2fdc9ec43de4f80'];
  const KEY_SESSION = 'fc_blog_admin_session'; // 로그인 상태(탭을 닫으면 해제)
  const PAGE_SIZE = 3;                         // 한 번에 보여 줄 글 수 (MORE를 누르면 3개씩 추가)
  const AUTOSAVE_MS = 700;
  const IMG_MAX = 1600;          // 첨부 이미지 최대 가로(px)
  const IMG_QUALITY = 0.85;

  /* ---------------- 저장소 ---------------- */
  const mem = {};
  const store = {
    get(k, d){ try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch(e){ return k in mem ? mem[k] : d; } },
    set(k, v){
      try { localStorage.setItem(k, JSON.stringify(v)); return true; }
      catch(e){
        mem[k] = v;
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) toast('저장 공간이 부족해요. 이미지를 줄이거나 오래된 글을 정리해 주세요.');
        return false;
      }
    },
    del(k){ try { localStorage.removeItem(k); } catch(e){ delete mem[k]; } }
  };
  let posts = store.get(KEY_POSTS, []);
  const savePosts = () => store.set(KEY_POSTS, posts);
  const isAdmin = () => { try { return sessionStorage.getItem(KEY_SESSION) === '1'; } catch(e){ return !!mem.__session; } };

  /* ---------------- 유틸 ---------------- */
  const $ = id => document.getElementById(id);
  const app = document.querySelector('.blog-app');
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const pad = n => String(n).padStart(2,'0');
  const fmt = t => { const d = new Date(t); return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtDate = t => { const d = new Date(t); return `${d.getFullYear()}.${pad(d.getMonth()+1)}.${pad(d.getDate())}`; };
  const fmtTime = t => { const d = new Date(t); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const textOf = html => { const d = document.createElement('div'); d.innerHTML = html; return (d.textContent || '').replace(/\s+/g,' ').trim(); };
  const firstImg = html => { const m = /<img[^>]+src="([^"]+)"/i.exec(html); return m ? m[1] : ''; };
  const readMin = html => Math.max(1, Math.round(textOf(html).length / 500));
  const durText = ms => { const m = Math.round((ms||0)/60000); return m < 1 ? '1분 미만' : (m < 60 ? m + '분' : Math.floor(m/60) + '시간 ' + (m%60) + '분'); };

  let toastTimer;
  function toast(msg){
    const t = $('toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(()=> t.hidden = true, 2600);
  }

  /* ---------------- HTML 정리 (허용된 태그만 남김) ---------------- */
  const ALLOWED = { P:1, BR:1, H1:1, H2:1, H3:1, B:1, STRONG:1, I:1, EM:1, A:1, BLOCKQUOTE:1, FIGURE:1, IMG:1, FIGCAPTION:1, UL:1, OL:1, LI:1 };
  const FIG_CLASSES = /^(w-25|w-50|w-75|w-100|al-left|al-center|al-right)$/;
  function sanitize(html){
    const doc = new DOMParser().parseFromString('<div>' + html + '</div>', 'text/html');
    const root = doc.body.firstChild;
    (function walk(node){
      [...node.childNodes].forEach(ch => {
        if (ch.nodeType === 3) return;
        if (ch.nodeType !== 1){ ch.remove(); return; }
        let tag = ch.tagName;
        if (tag === 'DIV'){ const p = doc.createElement('p'); while (ch.firstChild) p.appendChild(ch.firstChild); ch.replaceWith(p); ch = p; tag = 'P'; }
        if (!ALLOWED[tag]){ walk(ch); ch.replaceWith(...ch.childNodes); return; }
        [...ch.attributes].forEach(a => {
          const n = a.name.toLowerCase(), v = a.value;
          let keep = false;
          if (tag === 'A' && n === 'href' && /^(https?:|mailto:)/i.test(v.trim())) keep = true;
          if (tag === 'IMG' && n === 'src' && /^(data:image\/(png|jpe?g|gif|webp);base64,|https?:)/i.test(v.trim())) keep = true;
          if (tag === 'IMG' && n === 'alt') keep = true;
          if (tag === 'FIGURE' && n === 'class'){ ch.setAttribute('class', v.split(/\s+/).filter(c => FIG_CLASSES.test(c)).join(' ')); keep = true; }
          if (!keep) ch.removeAttribute(a.name);
        });
        if (tag === 'A'){ ch.setAttribute('target','_blank'); ch.setAttribute('rel','noopener'); }
        if (tag === 'IMG' && !ch.getAttribute('src')){ ch.remove(); return; }
        walk(ch);
      });
    })(root);
    root.querySelectorAll('p').forEach(p => { if (!p.textContent.trim() && !p.querySelector('img,br')) p.remove(); });
    return root.innerHTML.trim();
  }

  /* ---------------- 관리자 로그인 ----------------
     ※ 서버가 없는 정적 페이지라 비밀번호는 이 브라우저에만 저장됩니다.
       화면을 숨기는 용도이며, 실제 서비스에서는 서버 로그인이 필요합니다. */
  async function hashPw(pw){
    const salt = 'fireup-blog::';
    try {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(salt + pw));
      return 'sha256:' + [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2,'0')).join('');
    } catch(e){   // file:// 등에서 crypto.subtle이 없을 때
      let h1 = 0xdeadbeef, h2 = 0x41c6ce57; const str = salt + pw;
      for (let i = 0; i < str.length; i++){ const c = str.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
      return 'fb:' + (h2 >>> 0).toString(16) + (h1 >>> 0).toString(16);
    }
  }
  function setSession(on){
    try { on ? sessionStorage.setItem(KEY_SESSION,'1') : sessionStorage.removeItem(KEY_SESSION); } catch(e){ mem.__session = on; }
  }
  function applyAdmin(){ app.classList.toggle('is-admin', isAdmin()); }

  const lm = $('loginModal');
  function openLogin(){
    $('lgTitle').textContent = '관리자 로그인';
    $('lgDesc').textContent = '관리자 비밀번호를 입력하세요.';
    $('lgPw2Row').hidden = true; $('lgPw2').required = false;
    $('lgSubmit').textContent = '로그인';
    $('lgPw').value = ''; $('lgPw2').value = ''; $('lgError').textContent = '';
    lm.hidden = false; document.body.classList.add('modal-open');
    setTimeout(() => $('lgPw').focus(), 30);
  }
  function closeLogin(){ lm.hidden = true; document.body.classList.remove('modal-open'); }
  document.querySelectorAll('[data-open-login]').forEach(b => b.addEventListener('click', openLogin));
  lm.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', closeLogin));
  $('loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = $('lgPw').value;
    if (!ADMIN_PW_HASHES.includes(await hashPw(pw))){
      $('lgError').textContent = '비밀번호가 맞지 않아요.'; $('lgPw').select(); return;
    }
    setSession(true); applyAdmin(); closeLogin(); toast('관리자로 로그인했어요.'); route();
  });
  $('logoutBtn').addEventListener('click', () => {
    if (leavingEditor){ leavingEditor(); leavingEditor = null; }
    setSession(false); applyAdmin(); toast('로그아웃했어요.');
    if (/^#(write|edit-)/.test(location.hash)) location.hash = '#list'; else route();
  });

  /* ---------------- 라우팅 (#list, #post-ID, #write, #edit-ID) ---------------- */
  const views = ['viewList','viewPost','viewEditor','viewLocked'];
  function show(id){ views.forEach(v => $(v).hidden = v !== id); }
  let leavingEditor = null;
  function route(){
    const h = location.hash.replace('#','');
    if (leavingEditor && !/^write$|^edit-/.test(h)){ leavingEditor(); leavingEditor = null; }
    if (h === 'admin'){ history.replaceState(null,'','#list'); renderList(); show('viewList'); if (!isAdmin()) openLogin(); return; }
    if (h === 'write' || h.startsWith('edit-')){
      if (!isAdmin()){ show('viewLocked'); return; }
      openEditor(h === 'write' ? null : h.slice(5));
      show('viewEditor'); setBoardTitle(h === 'write' ? '글쓰기' : '글 수정');
    } else if (h.startsWith('post-')){
      renderPost(h.slice(5)); show('viewPost'); setBoardTitle('블로그');
    } else {
      renderList(); show('viewList');
    }
    window.scrollTo(0,0);
  }
  addEventListener('hashchange', route);

  /* ---------------- 목록 ---------------- */
  const filter = { tag:'', q:'', scope:'title', page:1 };
  const visiblePosts = () => posts.filter(p => isAdmin() || p.visibility === 'public');
  const cmtCount = p => (p.comments||[]).reduce((a,c)=> a + 1 + (c.replies||[]).length, 0);
  function setBoardTitle(t){ $('boardTitle').textContent = t; $('crumbLast').textContent = t; }

  function match(p){
    if (filter.tag && !(p.tags||[]).includes(filter.tag)) return false;
    const q = filter.q.trim().toLowerCase();
    if (!q) return true;
    const title = (p.title||'').toLowerCase(), body = textOf(p.html).toLowerCase(), tags = (p.tags||[]).join(' ').toLowerCase();
    if (filter.scope === 'title') return title.includes(q);
    if (filter.scope === 'body') return body.includes(q);
    if (filter.scope === 'tag') return (p.tags||[]).some(t => t.toLowerCase().includes(q.replace(/^#/,'')));
    return title.includes(q) || body.includes(q) || tags.includes(q.replace(/^#/,''));
  }

  function renderList(){
    setBoardTitle('블로그');
    const tf = $('tagFilter');
    tf.hidden = !filter.tag;
    tf.innerHTML = filter.tag ? `태그 <b>#${esc(filter.tag)}</b> 글만 보는 중 <button type="button" id="clearTag">해제</button>` : '';
    if (filter.tag) $('clearTag').onclick = () => { filter.tag = ''; filter.page = 1; renderList(); };

    const all = visiblePosts().filter(match).sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0) || b.createdAt - a.createdAt);
    const shown = all.slice(0, filter.page * PAGE_SIZE);   // MORE를 누를 때마다 3개씩 더
    const any = visiblePosts().length > 0;
    $('resultLine').innerHTML = any ? `총 <b>${all.length}</b>건` + (filter.q ? ` · ‘${esc(filter.q)}’ 검색 결과` : '') : '';

    $('postList').innerHTML = shown.map(p => {
      const img = firstImg(p.html), c = cmtCount(p), d = new Date(p.createdAt);
      return `<article class="card">
        <a href="#post-${p.id}">
          <div class="card-thumb${img ? '' : ' no-img'}">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : '<span>Fire.up</span>'}
            ${p.pinned ? '<span class="badge">공지</span>' : ''}${p.visibility === 'private' ? '<span class="badge priv">비공개</span>' : ''}</div>
          <div class="card-body">
            <h3>${esc(p.title)}</h3>
            <p>${esc(textOf(p.html).slice(0,140))}</p>
            <div class="card-meta"><time>${fmtDate(p.createdAt).replace(/\./g,'-')}</time><span>${fmtTime(p.createdAt)}</span><span class="v">조회 ${p.views||0}${c ? ` · 댓글 ${c}` : ''}</span></div>
          </div>
        </a>
      </article>`;
    }).join('');
    $('moreBtn').hidden = shown.length >= all.length;
    $('postList').scrollLeft = 0;
    requestAnimationFrame(updateCardCtrl);   // 화면에 보인 뒤 넘김 버튼 표시 여부 계산

    const empty = $('emptyList');
    empty.hidden = all.length > 0;
    if (!any){
      empty.innerHTML = isAdmin()
        ? '<h3>아직 등록된 글이 없어요</h3><p>오른쪽 아래 ‘글쓰기’로 첫 글을 등록해 보세요.</p>'
        : '<h3>아직 등록된 글이 없어요</h3><p>새 글이 올라오면 여기에 표시됩니다.</p>';
    } else if (!all.length){
      empty.innerHTML = '<h3>검색 결과가 없어요</h3><p>다른 검색어로 찾아 보세요.</p>';
    }
  }
  $('moreBtn').addEventListener('click', () => {
    const before = filter.page * PAGE_SIZE;
    filter.page += 1; renderList();
    const list = $('postList'), card = list.children[before];
    if (card && list.scrollWidth > list.clientWidth + 2) list.scrollTo({left: card.offsetLeft - list.offsetLeft, behavior:'smooth'});   // 모바일: 새로 불러온 첫 글로 이동
  });

  // 모바일: 카드 한 장씩 좌우로 넘기기
  const cardList = $('postList');
  const cardStep = () => { const c = cardList.children[0]; return c ? c.getBoundingClientRect().width + parseFloat(getComputedStyle(cardList).columnGap || 0) : 1; };
  function updateCardCtrl(){
    const n = cardList.children.length, ctrl = $('cardCtrl');
    const scrollable = cardList.scrollWidth > cardList.clientWidth + 2;
    ctrl.hidden = !scrollable || n < 2;
    if (ctrl.hidden) return;
    const max = cardList.scrollWidth - cardList.clientWidth - 2;
    const idx = cardList.scrollLeft >= max ? n - 1 : Math.round(cardList.scrollLeft / cardStep());
    $('cardCnt').innerHTML = `<b>${idx + 1}</b> / ${n}`;
    $('cardPrev').disabled = cardList.scrollLeft <= 2;
    $('cardNext').disabled = cardList.scrollLeft >= max;
  }
  $('cardPrev').addEventListener('click', () => cardList.scrollBy({left: -cardStep(), behavior:'smooth'}));
  $('cardNext').addEventListener('click', () => cardList.scrollBy({left: cardStep(), behavior:'smooth'}));
  cardList.addEventListener('scroll', () => requestAnimationFrame(updateCardCtrl), {passive:true});
  addEventListener('resize', updateCardCtrl);

  $('searchForm').addEventListener('submit', e => { e.preventDefault(); filter.q = $('searchInput').value; filter.scope = $('searchScope').value; filter.page = 1; renderList(); });
  $('searchInput').addEventListener('input', () => { filter.q = $('searchInput').value; filter.scope = $('searchScope').value; filter.page = 1; renderList(); });
  $('searchScope').addEventListener('change', () => { filter.scope = $('searchScope').value; filter.page = 1; renderList(); });

  /* ---------------- 글 보기 ---------------- */
  function postHead(p){
    return `<header class="pv-head">
      <div class="pi-top">${p.pinned ? '<span class="badge">공지</span>' : ''}${p.visibility === 'private' ? '<span class="badge priv">비공개</span>' : ''}</div>
      <h1>${esc(p.title || '제목 없음')}</h1>
      <div class="pi-meta">
        <span><b>작성자</b>포메뽀꼬</span>
        <span><b>작성일</b>${fmt(p.createdAt)}</span>
        ${p.updatedAt && p.updatedAt - p.createdAt > 60000 ? `<span><b>수정일</b>${fmt(p.updatedAt)}</span>` : ''}
        <span><b>조회</b>${p.views||0}</span>
        ${isAdmin() && p.writeMs ? `<span><b>작성 소요</b>${durText(p.writeMs)}</span>` : ''}
      </div>
    </header>
    <div class="pv-body prose">${p.html}</div>`;
  }
  function postExtras(p){
    const imgs = [];
    const d = document.createElement('div'); d.innerHTML = p.html;
    d.querySelectorAll('figure').forEach((f,i) => { const im = f.querySelector('img'); if (im) imgs.push({ src: im.getAttribute('src'), name: (f.querySelector('figcaption') || {}).textContent || ('이미지 ' + (i+1)) }); });
    return `${(p.tags||[]).length ? `<div class="pv-tags">${p.tags.map(t => `<a href="#list" data-tag="${esc(t)}">#${esc(t)}</a>`).join('')}</div>` : ''}
      <div class="pv-share"><button type="button" data-share="copy"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/></svg>링크 복사</button></div>
      ${imgs.length ? `<div class="pv-files"><b>첨부 이미지</b>${imgs.map((m,i) => `<a href="#" data-img="${i}">${esc(m.name.trim() || ('이미지 ' + (i+1)))}</a>`).join('')}</div>` : ''}`;
  }

  function renderPost(id){
    const p = posts.find(x => x.id === id);
    const art = $('postArticle');
    const clear = msg => { art.innerHTML = `<div class="private-note">${msg}</div>`; $('postAdmin').innerHTML=''; $('related').hidden = true; $('comments').innerHTML=''; $('prevNext').innerHTML=''; };
    if (!p){ clear('글을 찾을 수 없어요.'); return; }
    if (p.visibility === 'private' && !isAdmin()){ clear('비공개 글입니다.'); return; }

    // 조회수: 세션당 1회
    const vk = 'fc_viewed_' + id;
    let counted = false; try { counted = sessionStorage.getItem(vk) === '1'; } catch(e){}
    if (!counted){ p.views = (p.views||0) + 1; savePosts(); try { sessionStorage.setItem(vk,'1'); } catch(e){} }

    art.innerHTML = postHead(p) + postExtras(p);
    art.querySelectorAll('[data-tag]').forEach(a => a.addEventListener('click', () => { filter.tag = a.dataset.tag; filter.page = 1; }));
    const copyBtn = art.querySelector('[data-share="copy"]');
    copyBtn.addEventListener('click', () => {
      const url = location.href;
      const done = () => toast('글 주소를 복사했어요.');
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done).catch(() => toast('복사하지 못했어요. 주소창의 주소를 복사해 주세요.'));
      else toast(url);
    });
    art.querySelectorAll('[data-img]').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const figs = art.querySelectorAll('.pv-body figure'); const f = figs[+a.dataset.img];
      if (f) f.scrollIntoView({behavior:'smooth', block:'center'});
    }));

    $('postAdmin').innerHTML = `<span class="lbl">관리자 · 게시글 관리</span>
      <a class="btn btn-ghost" href="#edit-${p.id}">수정</a>
      <button type="button" class="btn btn-ghost" id="togglePin">${p.pinned ? '공지 해제' : '공지로 고정'}</button>
      <button type="button" class="btn btn-ghost" id="togglePub">${p.visibility === 'public' ? '비공개로 전환' : '공개로 전환'}</button>
      <button type="button" class="btn btn-danger" id="delPost">삭제</button>`;
    $('togglePin').onclick = () => { p.pinned = !p.pinned; savePosts(); toast(p.pinned ? '공지로 고정했어요.' : '공지를 해제했어요.'); renderPost(id); };
    $('togglePub').onclick = () => { p.visibility = p.visibility === 'public' ? 'private' : 'public'; savePosts(); toast(p.visibility === 'public' ? '공개로 바꿨어요.' : '비공개로 바꿨어요.'); renderPost(id); };
    $('delPost').onclick = () => confirmBox('이 글을 삭제할까요?', '삭제한 글과 댓글은 되돌릴 수 없어요.', '삭제', () => {
      posts = posts.filter(x => x.id !== id); savePosts(); toast('글을 삭제했어요.'); location.hash = '#list';
    });

    // 이전글 / 다음글 (등록일 기준)
    const seq = visiblePosts().sort((a,b) => a.createdAt - b.createdAt);
    const i = seq.findIndex(x => x.id === id);
    const prev = seq[i-1], next = seq[i+1];
    const pn = (cls, k, x, none) => `<div class="pn-row ${cls}"><span class="k">${k}</span>${x ? `<a href="#post-${x.id}">${esc(x.title)}</a><time>${fmtDate(x.createdAt)}</time>` : `<span class="none">${none}</span>`}</div>`;
    $('prevNext').innerHTML = pn('next','다음 글', next, '다음 글이 없습니다.') + pn('prev','이전 글', prev, '이전 글이 없습니다.');

    renderRelated(p);
    renderComments(p);
  }

  function renderRelated(p){
    const box = $('related');
    const tags = p.tags || [];
    const rel = visiblePosts().filter(x => x.id !== p.id).map(x => {
      const shared = (x.tags||[]).filter(t => tags.includes(t));
      return { x, shared, score: shared.length };
    }).filter(r => r.score > 0).sort((a,b) => b.score - a.score || b.x.createdAt - a.x.createdAt).slice(0,3);
    box.hidden = !rel.length;
    box.innerHTML = rel.length ? `<h2>관련 글</h2><ul>${rel.map(r => `<li><a href="#post-${r.x.id}">
      <span class="r-cat">${fmtDate(r.x.createdAt)}</span><p class="r-title">${esc(r.x.title)}</p>
      <p class="r-why">${r.shared.map(t => '#' + esc(t)).join(' ')}</p></a></li>`).join('')}</ul>` : '';
  }

  /* ---------------- 댓글 / 답글 ---------------- */
  function cForm(placeholder, submitLabel){
    return `<form class="c-form">
      <div class="row"><input type="text" name="name" maxlength="20" placeholder="이름 (선택)" aria-label="이름"></div>
      <textarea name="text" maxlength="1000" placeholder="${placeholder}" aria-label="내용" required></textarea>
      <div class="c-actions">${submitLabel === '답글 등록' ? '<button type="button" class="btn btn-ghost" data-cancel-reply>취소</button>' : ''}<button type="submit" class="btn btn-primary">${submitLabel === '답글 등록' ? '답글 등록' : '등록'}</button></div>
    </form>`;
  }
  function cItem(c, isReply){
    return `<li class="c-item" data-cid="${c.id}">
      <div class="c-head"><b>${esc(c.name || '익명')}</b>${c.author ? '<span class="author">작성자</span>' : ''}<time>${fmt(c.createdAt)}</time></div>
      <p class="c-text">${esc(c.text)}</p>
      <div class="c-tools">${isReply ? '' : '<button type="button" data-reply>답글</button>'}${isAdmin() ? '<button type="button" class="danger" data-del>삭제</button>' : ''}</div>
      ${isReply ? '' : `<ul class="c-replies"${(c.replies||[]).length ? '' : ' hidden'}>${(c.replies||[]).map(r => cItem(r, true)).join('')}</ul><div class="reply-slot"></div>`}
    </li>`;
  }
  function renderComments(p){
    p.comments = p.comments || [];
    const total = p.comments.reduce((a,c)=> a + 1 + (c.replies||[]).length, 0);
    const box = $('comments');
    box.innerHTML = `<h2>댓글 <em>${total}</em></h2>${cForm('댓글을 남겨 주세요', '댓글 등록')}
      ${p.comments.length ? `<ul class="c-list">${p.comments.map(c => cItem(c,false)).join('')}</ul>` : '<p class="c-empty">첫 댓글을 남겨 주세요.</p>'}`;
    const make = f => ({ id: uid(), name: f.name.value.trim().slice(0,20), text: f.text.value.trim().slice(0,1000), createdAt: Date.now(), author: isAdmin() });
    box.querySelector('.c-form').addEventListener('submit', e => {
      e.preventDefault(); const f = e.target; if (!f.text.value.trim()) return;
      p.comments.push(Object.assign(make(f), { replies: [] })); savePosts(); renderComments(p); toast('댓글을 등록했어요.');
    });
    box.querySelectorAll('[data-reply]').forEach(b => b.addEventListener('click', () => {
      const li = b.closest('.c-item'), slot = li.querySelector('.reply-slot');
      if (slot.innerHTML){ slot.innerHTML = ''; return; }
      slot.innerHTML = cForm('답글을 남겨 주세요', '답글 등록');
      const f = slot.querySelector('form'); f.text.focus();
      f.querySelector('[data-cancel-reply]').onclick = () => slot.innerHTML = '';
      f.addEventListener('submit', e => {
        e.preventDefault(); if (!f.text.value.trim()) return;
        const c = p.comments.find(x => x.id === li.dataset.cid); (c.replies = c.replies || []).push(make(f));
        savePosts(); renderComments(p); toast('답글을 등록했어요.');
      });
    }));
    box.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', () => {
      const li = b.closest('.c-item'), id = li.dataset.cid;
      confirmBox('댓글을 삭제할까요?', '답글이 달린 댓글은 답글도 함께 삭제돼요.', '삭제', () => {
        p.comments = p.comments.filter(c => c.id !== id).map(c => Object.assign(c, { replies: (c.replies||[]).filter(r => r.id !== id) }));
        savePosts(); renderComments(p); toast('댓글을 삭제했어요.');
      });
    }));
  }

  /* ---------------- 확인 창 ---------------- */
  function confirmBox(title, desc, okLabel, onOk){
    const m = $('confirmModal'); $('cfTitle').textContent = title; $('cfDesc').textContent = desc; $('cfOk').textContent = okLabel;
    m.hidden = false; document.body.classList.add('modal-open'); $('cfOk').focus();
    const close = () => { m.hidden = true; document.body.classList.remove('modal-open'); };
    $('cfOk').onclick = () => { close(); onOk(); };
    m.querySelectorAll('[data-cancel]').forEach(b => b.onclick = close);
  }

  /* =========================================================
     에디터
     ========================================================= */
  const ed = $('editor');
  try { document.execCommand('defaultParagraphSeparator', false, 'p'); } catch(e){}
  const state = { postId: null, tags: [], visibility: 'public', writeMs: 0, lastInput: 0, dirty: false };

  function setVisibility(v){
    state.visibility = v;
    $('edVisibility').querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v === v)));
  }
  $('edVisibility').addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b){ setVisibility(b.dataset.v); scheduleSave(); } });

  // 태그
  function renderTags(){
    $('edTagChips').innerHTML = state.tags.map((t,i) => `<span class="tag-chip">#${esc(t)}<button type="button" data-i="${i}" aria-label="${esc(t)} 태그 삭제">×</button></span>`).join('');
  }
  function addTag(raw){
    raw.split(',').map(s => s.trim().replace(/^#/,'').slice(0,20)).filter(Boolean).forEach(t => { if (!state.tags.includes(t) && state.tags.length < 10) state.tags.push(t); });
    renderTags(); scheduleSave();
  }
  $('edTagInput').addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ',') && !e.isComposing){ e.preventDefault(); addTag(e.target.value); e.target.value = ''; }
    else if (e.key === 'Backspace' && !e.target.value && state.tags.length){ state.tags.pop(); renderTags(); scheduleSave(); }
  });
  $('edTagInput').addEventListener('blur', e => { if (e.target.value.trim()){ addTag(e.target.value); e.target.value = ''; } });
  $('edTagChips').addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b){ state.tags.splice(+b.dataset.i,1); renderTags(); scheduleSave(); } });
  $('tagInputBox').addEventListener('click', e => { if (e.target === e.currentTarget) $('edTagInput').focus(); });

  // 에디터 열기
  function openEditor(postId){
    hideImgTools(); hideLinkPop();
    const p = postId ? posts.find(x => x.id === postId) : null;
    if (postId && !p){ location.hash = '#list'; return; }
    state.postId = postId; state.dirty = false;
    $('edHeading').textContent = p ? '글 수정' : '새 글 쓰기';
    $('edPublish').textContent = p ? '수정 완료' : '등록';
    fill(p ? { title:p.title, html:p.html, tags:p.tags, visibility:p.visibility, writeMs:p.writeMs, pinned:!!p.pinned } : { title:'', html:'', tags:[], visibility:'public', writeMs:0, pinned:false });
    setStatus('');

    // 임시 저장본이 있으면 이어서 작성할지 묻기
    const d = store.get(KEY_DRAFT, null);
    const banner = $('draftBanner');
    const matches = d && ((postId && d.postId === postId) || (!postId && !d.postId));
    if (matches && (d.title || textOf(d.html) || firstImg(d.html))){
      banner.hidden = false;
      banner.innerHTML = `<span>${fmt(d.savedAt)}에 임시 저장된 ${postId ? '수정본' : '글'}이 있어요.</span><span class="grow"></span>
        <button type="button" class="go" id="draftGo">이어서 작성</button><button type="button" class="no" id="draftNo">${postId ? '저장된 원본으로' : '새로 쓰기'}</button>`;
      $('draftGo').onclick = () => { fill(d); banner.hidden = true; setStatus('임시 저장본을 불러왔어요', true); };
      $('draftNo').onclick = () => { store.del(KEY_DRAFT); banner.hidden = true; };
    } else banner.hidden = true;

    leavingEditor = () => { if (state.dirty) saveDraft(true); hideImgTools(); hideLinkPop(); };
    setTimeout(() => (p ? ed : $('edTitle')).focus(), 50);
  }
  function fill(d){
    $('edTitle').value = d.title || '';
    ed.innerHTML = d.html || '';
    prepFigures();
    state.tags = [...(d.tags || [])]; renderTags();
    setVisibility(d.visibility || 'public');
    state.writeMs = d.writeMs || 0;
    $('edPinned').checked = !!d.pinned;
  }
  function prepFigures(){
    ed.querySelectorAll('figure').forEach(f => {
      f.setAttribute('contenteditable','false');
      let cap = f.querySelector('figcaption');
      if (cap) cap.setAttribute('contenteditable','true');
    });
  }

  // 임시 저장 (자동)
  let saveTimer;
  function editorHTML(){
    const clone = ed.cloneNode(true);
    clone.querySelectorAll('figure').forEach(f => { f.removeAttribute('contenteditable'); f.classList.remove('is-selected'); const c = f.querySelector('figcaption'); if (c){ c.removeAttribute('contenteditable'); if (!c.textContent.trim()) c.remove(); } });
    return sanitize(clone.innerHTML);
  }
  function collect(){
    return { postId: state.postId, title: $('edTitle').value.trim(), html: editorHTML(), tags: [...state.tags], visibility: state.visibility, writeMs: state.writeMs, pinned: $('edPinned').checked };
  }
  function saveDraft(silent){
    const d = Object.assign(collect(), { savedAt: Date.now() });
    if (store.set(KEY_DRAFT, d)){ state.dirty = false; if (!silent) setStatus('자동 저장됨 ' + fmtTime(d.savedAt), true); }
  }
  function scheduleSave(){
    state.dirty = true;
    const now = Date.now();
    if (state.lastInput && now - state.lastInput < 60000) state.writeMs += now - state.lastInput;   // 작성 소요 시간
    state.lastInput = now;
    setStatus('저장 중…');
    clearTimeout(saveTimer); saveTimer = setTimeout(() => saveDraft(false), AUTOSAVE_MS);
  }
  function setStatus(msg, ok){ const s = $('edStatus'); s.textContent = msg; s.classList.toggle('saved', !!ok); }
  ed.addEventListener('input', scheduleSave);
  $('edTitle').addEventListener('input', scheduleSave);
  $('edPinned').addEventListener('change', scheduleSave);
  $('edSaveDraft').addEventListener('click', () => { saveDraft(false); toast('임시 저장했어요. 나중에 이어서 작성할 수 있어요.'); });

  // 발행 / 수정
  $('edPublish').addEventListener('click', () => {
    const d = collect();
    if (!d.title){ toast('제목을 입력해 주세요.'); $('edTitle').focus(); return; }
    if (!textOf(d.html) && !firstImg(d.html)){ toast('본문을 입력해 주세요.'); ed.focus(); return; }
    const now = Date.now();
    let id = state.postId;
    if (id){
      const p = posts.find(x => x.id === id);
      Object.assign(p, { title:d.title, html:d.html, tags:d.tags, visibility:d.visibility, writeMs:d.writeMs, pinned:d.pinned, updatedAt:now });
    } else {
      id = uid();
      posts.push({ id, title:d.title, html:d.html, tags:d.tags, visibility:d.visibility, pinned:d.pinned, createdAt:now, updatedAt:now, views:0, comments:[], writeMs:d.writeMs });
    }
    if (savePosts()){
      store.del(KEY_DRAFT); state.dirty = false; leavingEditor = null;
      toast(state.postId ? '수정을 저장했어요.' : '글을 등록했어요.');
      location.hash = '#post-' + id;
    }
  });
  $('edCancel').addEventListener('click', () => {
    if (state.dirty) saveDraft(true);
    location.hash = state.postId ? '#post-' + state.postId : '#list';
  });

  /* ---------- 툴바 ---------- */
  let savedRange = null;
  function saveRange(){ const s = getSelection(); if (s.rangeCount && ed.contains(s.anchorNode)) savedRange = s.getRangeAt(0).cloneRange(); }
  function restoreRange(){ if (!savedRange) return; ed.focus(); const s = getSelection(); s.removeAllRanges(); s.addRange(savedRange); }
  function currentBlock(){
    const s = getSelection(); if (!s.rangeCount) return null;
    let n = s.anchorNode; if (!ed.contains(n)) return null;
    while (n && n !== ed){ if (n.nodeType === 1 && /^(P|H1|H2|H3|BLOCKQUOTE|DIV)$/.test(n.tagName)) return n; n = n.parentNode; }
    return null;
  }
  function updateToolbar(){
    const blk = currentBlock(), tag = blk ? blk.tagName.toLowerCase() : '';
    $('toolbar').querySelectorAll('[data-block]').forEach(b => b.classList.toggle('on', b.dataset.block === (tag === 'div' ? 'p' : tag)));
    let bold = false; try { bold = document.queryCommandState('bold'); } catch(e){}
    $('toolbar').querySelector('[data-cmd="bold"]').classList.toggle('on', bold && !!blk);
  }
  document.addEventListener('selectionchange', () => { if (!$('viewEditor').hidden){ saveRange(); updateToolbar(); } });

  $('toolbar').addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); });   // 선택 영역 유지
  $('toolbar').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.block){
      restoreRange();
      const blk = currentBlock(), cur = blk ? blk.tagName.toLowerCase() : '';
      const target = (b.dataset.block === cur && b.dataset.block !== 'p') ? 'p' : b.dataset.block;   // 같은 버튼을 다시 누르면 본문으로
      document.execCommand('formatBlock', false, '<' + target + '>');
      scheduleSave(); updateToolbar();
    } else if (b.dataset.cmd === 'bold'){
      restoreRange(); document.execCommand('bold'); scheduleSave(); updateToolbar();
    } else if (b.dataset.cmd === 'link'){
      openLinkPop(b);
    } else if (b.dataset.cmd === 'image'){
      saveRange(); $('imgFile').click();
    }
  });
  ed.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b'){ e.preventDefault(); document.execCommand('bold'); scheduleSave(); }
  });
  // 붙여넣기: 서식 없는 텍스트로
  ed.addEventListener('paste', e => {
    const files = [...(e.clipboardData && e.clipboardData.files || [])].filter(f => f.type.startsWith('image/'));
    e.preventDefault();
    if (files.length){ saveRange(); insertImages(files); return; }
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  });

  /* ---------- 링크 ---------- */
  function openLinkPop(btn){
    saveRange();
    const pop = $('linkPop'), wrap = $('editorWrap');
    let a = null; const s = getSelection();
    if (s.rangeCount){ let n = s.anchorNode; while (n && n !== ed){ if (n.tagName === 'A'){ a = n; break; } n = n.parentNode; } }
    $('linkInput').value = a ? a.getAttribute('href') : '';
    $('linkRemove').hidden = !a;
    pop.hidden = false;
    const r = btn.getBoundingClientRect(), w = wrap.getBoundingClientRect();
    pop.style.left = Math.max(0, Math.min(r.left - w.left, w.width - pop.offsetWidth)) + 'px';
    pop.style.top = '6px';
    $('linkInput').focus();
  }
  function hideLinkPop(){ $('linkPop').hidden = true; }
  function applyLink(){
    let url = $('linkInput').value.trim();
    if (url && !/^(https?:|mailto:)/i.test(url)) url = 'https://' + url;
    restoreRange();
    if (!url){ hideLinkPop(); return; }
    const s = getSelection();
    if (s.isCollapsed){ document.execCommand('insertHTML', false, `<a href="${esc(url)}">${esc(url)}</a>`); }
    else document.execCommand('createLink', false, url);
    hideLinkPop(); scheduleSave();
  }
  $('linkApply').addEventListener('click', applyLink);
  $('linkInput').addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); applyLink(); } if (e.key === 'Escape') hideLinkPop(); });
  $('linkRemove').addEventListener('click', () => { restoreRange(); document.execCommand('unlink'); hideLinkPop(); scheduleSave(); });
  document.addEventListener('mousedown', e => { if (!$('linkPop').hidden && !e.target.closest('#linkPop') && !e.target.closest('[data-cmd="link"]')) hideLinkPop(); });

  /* ---------- 이미지 ---------- */
  $('imgFile').addEventListener('change', e => { insertImages([...e.target.files]); e.target.value = ''; });
  function compress(file){
    return new Promise((resolve, reject) => {
      if (file.type === 'image/gif'){ const fr = new FileReader(); fr.onload = () => resolve(fr.result); fr.onerror = reject; fr.readAsDataURL(file); return; }
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(1, IMG_MAX / img.naturalWidth), c = document.createElement('canvas');
        c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        const g = c.getContext('2d');
        const png = file.type === 'image/png';
        if (!png){ g.fillStyle = '#fff'; g.fillRect(0,0,c.width,c.height); }
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        let out = c.toDataURL(png ? 'image/png' : 'image/jpeg', IMG_QUALITY);
        if (png && out.length > 900000) out = c.toDataURL('image/jpeg', IMG_QUALITY);   // 큰 PNG는 JPG로
        resolve(out);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('이미지를 읽을 수 없어요')); };
      img.src = url;
    });
  }
  async function insertImages(files){
    for (const f of files){
      if (!f.type.startsWith('image/')) continue;
      try {
        const src = await compress(f);
        const fig = document.createElement('figure');
        fig.className = 'w-100 al-center'; fig.setAttribute('contenteditable','false');
        fig.innerHTML = `<img src="${src}" alt=""><figcaption contenteditable="true"></figcaption>`;
        const p = document.createElement('p'); p.innerHTML = '<br>';
        restoreRange();
        const s = getSelection();
        let blk = currentBlock();
        if (blk && blk.parentNode === ed){ blk.after(fig); }
        else if (s.rangeCount && ed.contains(s.anchorNode)){ const r = s.getRangeAt(0); r.collapse(false); r.insertNode(fig); }
        else ed.appendChild(fig);
        fig.after(p);
        const r = document.createRange(); r.setStart(p, 0); r.collapse(true); s.removeAllRanges(); s.addRange(r); saveRange();
        scheduleSave();
      } catch(err){ toast(err.message || '이미지를 넣지 못했어요.'); }
    }
  }

  let selFig = null;
  ed.addEventListener('click', e => {
    const fig = e.target.closest('figure');
    if (fig && !e.target.closest('figcaption')){ selectFig(fig); }
    else if (!e.target.closest('figure')) hideImgTools();
  });
  function selectFig(fig){
    ed.querySelectorAll('figure.is-selected').forEach(f => f.classList.remove('is-selected'));
    selFig = fig; fig.classList.add('is-selected');
    const tools = $('imgTools'); tools.hidden = false;
    syncImgTools(); placeImgTools();
  }
  function placeImgTools(){
    if (!selFig) return;
    const tools = $('imgTools'), w = $('editorWrap').getBoundingClientRect(), r = selFig.getBoundingClientRect();
    tools.style.left = Math.max(4, Math.min(r.left - w.left, w.width - tools.offsetWidth - 4)) + 'px';
    tools.style.top = Math.max(0, r.top - w.top - tools.offsetHeight - 8) + 'px';
  }
  function syncImgTools(){
    const t = $('imgTools');
    t.querySelectorAll('[data-w]').forEach(b => b.classList.toggle('on', selFig.classList.contains('w-' + b.dataset.w)));
    t.querySelectorAll('[data-a]').forEach(b => b.classList.toggle('on', selFig.classList.contains('al-' + b.dataset.a)));
  }
  function hideImgTools(){ $('imgTools').hidden = true; if (selFig) selFig.classList.remove('is-selected'); selFig = null; }
  $('imgTools').addEventListener('mousedown', e => e.preventDefault());
  $('imgTools').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b || !selFig) return;
    if (b.dataset.w){ selFig.classList.remove('w-25','w-50','w-75','w-100'); selFig.classList.add('w-' + b.dataset.w); }
    else if (b.dataset.a){ selFig.classList.remove('al-left','al-center','al-right'); selFig.classList.add('al-' + b.dataset.a); }
    else if (b.dataset.act === 'caption'){
      let c = selFig.querySelector('figcaption');
      if (!c){ c = document.createElement('figcaption'); c.setAttribute('contenteditable','true'); selFig.appendChild(c); }
      c.focus(); const r = document.createRange(); r.selectNodeContents(c); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    }
    else if (b.dataset.act === 'remove'){ const f = selFig; hideImgTools(); f.remove(); }
    scheduleSave();
    if (selFig){ syncImgTools(); requestAnimationFrame(placeImgTools); }
  });
  addEventListener('resize', placeImgTools);
  document.addEventListener('keydown', e => {
    if (selFig && (e.key === 'Delete' || e.key === 'Backspace') && !e.target.closest('figcaption') && document.activeElement === ed){ e.preventDefault(); const f = selFig; hideImgTools(); f.remove(); scheduleSave(); }
    if (e.key === 'Escape'){ hideImgTools(); hideLinkPop(); closePreview(); if (!lm.hidden) closeLogin(); }
  });

  /* ---------- 미리보기 (PC · 모바일) ---------- */
  function openPreview(){
    const d = collect();
    const p = { title: d.title, html: d.html, tags: d.tags, visibility: d.visibility, createdAt: Date.now(), views: 0, writeMs: d.writeMs };
    $('pvFrame').innerHTML = postHead(p);
    $('previewModal').hidden = false; document.body.classList.add('modal-open');
    setDevice('pc');
  }
  function setDevice(dv){
    $('pvFrame').classList.toggle('mobile', dv === 'mobile');
    $('pvDevice').querySelectorAll('button').forEach(b => b.setAttribute('aria-checked', String(b.dataset.d === dv)));
  }
  function closePreview(){ if ($('previewModal').hidden) return; $('previewModal').hidden = true; document.body.classList.remove('modal-open'); }
  $('edPreview').addEventListener('click', openPreview);
  $('pvDevice').addEventListener('click', e => { const b = e.target.closest('[data-d]'); if (b) setDevice(b.dataset.d); });
  $('previewModal').addEventListener('click', e => { if (e.target.closest('[data-close]')) closePreview(); if (e.target.closest('a')) e.preventDefault(); });

  /* ---------------- 헤더 테두리 ---------------- */
  const hdr = $('hdr');
  addEventListener('scroll', () => hdr.classList.toggle('scrolled', scrollY > 8), {passive:true});

  // 다른 탭에서 바뀐 내용 반영
  addEventListener('storage', e => { if (e.key === KEY_POSTS){ posts = store.get(KEY_POSTS, []); if ($('viewEditor').hidden) route(); } });

  /* ---------------- 시작 ---------------- */
  applyAdmin();
  route();
})();
