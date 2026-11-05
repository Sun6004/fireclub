# 미국 ETF 투자법 랜딩페이지

## 실행
- **그냥 열기:** `index.html`을 더블클릭하면 바로 열립니다. (서버 설치 필요 없음)
- **로컬 서버(권장):** 폴더에서 `python3 -m http.server 8000` 실행 후 http://localhost:8000 접속
  - VS Code라면 Live Server 확장으로 `index.html`을 열어도 됩니다.

## 폴더 구조
```
landing-page/
├── index.html            # 뼈대 + CSS/JS 연결
├── blog.html             # 블로그 (글쓰기·댓글·검색 등)
├── html/
│   ├── header.html       # 상단 메뉴
│   ├── body.html         # 히어로 · 책→노트북 · 핵심 내용 · 강사 소개 · 최종 CTA
│   └── footer.html       # 하단 정보 · 모바일 고정 버튼
├── css/
│   ├── style.css
│   └── blog.css          # 블로그 페이지 전용
├── js/
│   ├── script.js         # HTML 불러오기 · 인터랙션 · 스크롤 애니메이션
│   ├── partials.js       # html/ 내용의 예비 사본 (더블클릭 실행용)
│   ├── blog.js           # 블로그 기능 전체
│   └── vendor/           # GSAP 로컬 사본 (인터넷이 없을 때 사용)
└── assets/
    └── images/           # course-preview.jpg, instructor.jpg, logo.png, book-cover/spine
```

## 동작 방식
1. `index.html`이 열리면 `js/script.js`가 `html/header.html`, `body.html`, `footer.html`을 불러와 각 자리에 넣습니다.
2. 더블클릭(file://)으로 열면 브라우저 보안 정책상 HTML 파일을 불러올 수 없어서, 같은 내용을 담은 `js/partials.js`를 사용합니다.
3. 스크롤 애니메이션은 GSAP(ScrollTrigger)를 씁니다. CDN을 먼저 쓰고, 인터넷이 없으면 `js/vendor/`의 로컬 사본을 씁니다.

## 수정할 때
- 문구·구조: `html/*.html`
- 디자인: `css/style.css` (히어로 색상은 `.shift{...}`의 변수)
- 원칙 카드의 관련 강의: `js/script.js`의 `PRINCIPLES`
- 스크롤 길이·타이밍: `js/script.js`의 `initScroll()` 안 타임라인

### partials.js 갱신
`html/*.html`을 고친 뒤 더블클릭 실행에도 반영하려면 `partials.js`를 다시 만들어야 합니다. 폴더에서 아래 명령을 실행하세요.
```
python3 -c "import json;p={n:open(f'html/{n}.html',encoding='utf-8').read() for n in ['header','body','footer']};open('js/partials.js','w',encoding='utf-8').write('window.LANDING_PARTIALS = '+json.dumps(p,ensure_ascii=False,indent=2)+';\n')"
```
로컬 서버로 실행할 때는 `html/` 파일을 바로 읽으므로 갱신하지 않아도 됩니다.

## 블로그 (blog.html)
상단 배너 아래에 **썸네일 카드 목록**(대표 이미지 · 제목 · 요약 · 날짜/시간)이 PC는 한 줄에 3개, 모바일은 1개씩 ‹ › 버튼으로 넘겨 보이고, **MORE**를 누르면 3개씩 더 나옵니다. 글 보기에는 이전글/다음글과 댓글이 있습니다.
**글쓰기는 관리자만** 할 수 있고, 방문자는 글을 읽고 댓글만 남길 수 있어요.

### 관리자 로그인
- 페이지 맨 아래 푸터의 작은 **관리자** 링크를 누르거나, 주소 끝에 `#admin`을 붙여 여세요.
- 정해 둔 관리자 비밀번호로 로그인합니다. 코드에는 비밀번호 원문이 아니라 해시만 들어 있어요.
- 로그인하면 맨 위에 검은 **관리자 바**(글쓰기 · 로그아웃)가 나타나고, 목록에 글쓰기 버튼, 글 보기에 수정 · 공지 고정 · 공개/비공개 · 삭제가 생깁니다.
- 브라우저 탭을 닫으면 로그아웃됩니다.

| 기능 | 내용 |
|---|---|
| 글 작성 에디터 | 제목, 본문, H1~H3, 굵게(Ctrl+B), 링크, 인용문 |
| 이미지 첨부 | 업로드(여러 장·붙여넣기), 크기 25/50/75/100%, 좌·중·우 정렬, 캡션 → 글 보기에서 ‘첨부 이미지’로 표시 |
| 임시 저장 | 입력 즉시 자동 저장, 다시 열면 “이어서 작성” |
| 미리보기 | PC·모바일 화면 전환 |
| 태그 | Enter로 등록, 같은 태그 글을 “관련 글”로 연결 |
| 검색 | 제목·본문·태그·전체 중 선택 |
| 게시글 관리 | 수정, 삭제, 공개·비공개, 공지 고정 |
| 댓글 | 댓글·답글(누구나), 삭제는 관리자만 |
| 조회·기록 | 조회수(세션당 1회, 목록·글 보기에 표시), 작성·수정 일시, 작성 소요 시간(관리자에게만) |
| 목록 | 3개씩 표시, MORE로 3개씩 추가 (`PAGE_SIZE`로 변경). 공지는 맨 앞 고정, 대표 이미지는 본문의 첫 이미지 |

### 비밀번호 바꾸기
폴더에서 아래 명령을 실행해 나온 두 줄을 `js/blog.js`의 `ADMIN_PW_HASHES` 배열에 넣으세요. (`새비밀번호` 부분만 바꾸면 됩니다)
```
node -e "const c=require('crypto'),s='fireup-blog::',p='새비밀번호';console.log('sha256:'+c.createHash('sha256').update(s+p).digest('hex'));let a=0xdeadbeef,b=0x41c6ce57,t=s+p;for(let i=0;i<t.length;i++){const x=t.charCodeAt(i);a=Math.imul(a^x,2654435761);b=Math.imul(b^x,1597334677)}console.log('fb:'+(b>>>0).toString(16)+(a>>>0).toString(16))"
```

### 꼭 알아둘 점
- 서버가 없는 정적 페이지라 글·댓글·비밀번호는 **그 브라우저의 localStorage**에만 저장됩니다. 다른 사람·다른 기기에서는 보이지 않습니다. 실제로 방문자에게 글을 보여주려면 서버(DB)와 서버 로그인이 필요합니다.
- 관리자 비밀번호는 해시로 저장되지만 브라우저 안에서만 확인하므로 **보안 장치가 아니라 화면을 나누는 용도**입니다.
- 이미지는 글 안에 함께 저장되므로(가로 최대 1600px 자동 축소) 브라우저 저장 용량(약 5MB)을 넘으면 저장되지 않을 수 있어요.

## 임시 콘텐츠 (교체 필요)

## 이번 수정에서 추가된 파일 (디자인 리뉴얼)
- `css/style.css` 맨 아래 '리뉴얼 디자인' 구역 — 랜딩페이지 전체 디자인 수정(검정·라임 톤, 섹션 색, 글자 크기, 태블릿, 스티커 등)
- `css/blog.css` 맨 아래 '블로그 리뉴얼' 구역 — 블로그를 랜딩페이지 톤(검정·라임)에 맞춘 수정
- `assets/images/hero-chart.jpg` — 첫 화면 배경 차트 이미지(25% 진하기)
- `assets/images/badges/badge1~3.png` — 강사 소개 스티커(YES24 · 싱글파이어 · 머니쇼)
- `assets/images/instructor.jpg` — 새 강사 사진으로 교체

### 색상
| 이름 | 값 |
|---|---|
| 검정 | #0C0C0C |
| 라임(포인트) | #CBF950 |
| 진한 올리브 | #3C4A18 |
| 연회색 | #ECECEC |
| 형광펜 노랑 | #FFE14D |
