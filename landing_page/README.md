# 미국 ETF 투자법 랜딩페이지

## 실행
- **그냥 열기:** `index.html`을 더블클릭하면 바로 열립니다. (서버 설치 필요 없음)
- **로컬 서버(권장):** 폴더에서 `python3 -m http.server 8000` 실행 후 http://localhost:8000 접속
  - VS Code라면 Live Server 확장으로 `index.html`을 열어도 됩니다.

## 폴더 구조
```
landing-page/
├── index.html            # 뼈대 + CSS/JS 연결
├── html/
│   ├── header.html       # 상단 메뉴
│   ├── body.html         # 히어로 · 책→노트북 · 핵심 내용 · 강사 소개 · 최종 CTA
│   └── footer.html       # 하단 정보 · 모바일 고정 버튼
├── css/
│   └── style.css
├── js/
│   ├── script.js         # HTML 불러오기 · 인터랙션 · 스크롤 애니메이션
│   ├── partials.js       # html/ 내용의 예비 사본 (더블클릭 실행용)
│   └── vendor/           # GSAP 로컬 사본 (인터넷이 없을 때 사용)
└── assets/
    └── images/           # course-preview.jpg, instructor.jpg, logo.png
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

## 임시 콘텐츠 (교체 필요)
- 책 표지: 실제 표지 이미지 대신 임시 표지 (`body.html`의 `cover` 영역)
- 도서 소개 문구
- 헤더 "블로그" 링크 주소 (`header.html`의 `nav-blog`)
