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

## GA4 · 메타 픽셀 행동 추적

기본 태그와 ID는 `index.html`과 `blog.html`, 공통 이벤트 전송은 `js/analytics.js`, FAQ·카드·게임의 상태 이벤트는 `js/script.js`에서 관리합니다. 배포할 때 네 파일을 함께 반영하세요. HTML 예비 사본(`partials.js`)은 이번 변경으로 갱신할 필요가 없습니다.

랜딩페이지는 두 도구에 아래 이름의 맞춤 이벤트를 보냅니다. 메타는 `trackCustom`을 사용합니다.

블로그는 같은 GA4 속성(`G-SM9MT8K5DT`)으로 페이지 조회와 공통 스크롤·섹션 이벤트를 기록합니다. 블로그의 버튼 이벤트는 상단·하단 강의 링크 2개만 추적하며, `button_id`는 각각 `blog_header_course`, `blog_footer_course`입니다. 관리자 편집·댓글 입력 영역의 클릭은 추적하지 않습니다. 블로그에는 메타 기본 태그를 추가하지 않았습니다.

| 이벤트 | 기록하는 행동 | 주요 매개변수 |
|---|---|---|
| `button_click` | 메뉴·로고·강의 링크·FAQ·카드·점 버튼·게임 버튼 클릭 | `button_id`, `button_text`, `section_id`, 링크인 경우 `link_url`, `outbound` |
| `course_cta_click` | 상단·하단·모바일 고정·게임 팝업에서 강의 페이지로 이동하는 링크 클릭 | 위 매개변수 + `course_id` |
| `scroll_depth` | 스크롤 25%, 50%, 75%, 90%, 100% 도달 | `percent_scrolled` |
| `section_view` | 각 콘텐츠 섹션이 화면 중앙 영역에 진입 | `section_id`, `section_title` |
| `faq_toggle` | 질문을 직접 열거나 닫음 | `faq_id`, `question`, `action` (`open`/`close`) |
| `principle_select` | 원칙 카드를 클릭·방향키·점 버튼·가로 스와이프로 선택 | `principle_name`, `interaction_method` |
| `game_open`, `game_close` | 미니게임 열기·닫기 (닫기 버튼·배경·Esc 포함) | `section_id` |
| `game_result` | 미니게임 매수·매도 선택 결과 | `choice`, `result` |

- 스크롤 비율은 **스크롤 가능한 전체 거리 중 내려간 거리**입니다. 스크롤이 불필요한 짧은 화면에서는 발생하지 않습니다. 한 번에 아래로 이동하면 통과한 기준들을 모두 보냅니다. 스크롤 기준별·섹션별 조회는 페이지 로드당 한 번만 전송합니다.
- 버튼 위치는 `section_id`로 구분합니다. `shift`=첫 화면, `enroll`=마지막 신청 영역, `mobile_cta`=모바일 고정 버튼, `game`=미니게임, `hdr`=상단 메뉴입니다.
- 모바일 고정 버튼은 기존 CSS에서 숨겨져 있습니다. 현재 디자인은 유지하며, 나중에 표시하면 동일하게 추적됩니다.
- 카드 자동 전환은 `principle_select`로 집계하지 않습니다. 점 버튼을 눌러도 내부 처리 때문에 `button_click`이 두 번 발생하지 않습니다.
- 하나의 강의 링크 클릭은 `button_click`과 `course_cta_click`으로 각각 기록됩니다. 전체 클릭 수를 계산할 때 두 이벤트를 합산하지 마세요. GA4 향상된 측정의 기본 `click`, `scroll`과도 별도 이벤트입니다.
- `course_cta_click`은 강의에 관심을 보인 클릭입니다. 실제 수강 신청·결제 완료는 외부 강의 서비스에서 별도로 연동해야 하며, 여기서는 `Purchase`/`Lead`를 보내지 않습니다.
- 링크 쿼리 문자열, 입력 내용은 맞춤 이벤트에 보내지 않습니다. 기존 GA4·메타 기본 태그의 자동 수집 설정은 그대로 적용됩니다.

### 수집 확인과 보고서 설정

1. 로컬 또는 배포 주소의 `index.html?analytics_debug=1`을 열면 브라우저 콘솔에 이벤트 이름과 매개변수가 표시되고 GA4 이벤트에는 `debug_mode`가 붙습니다. 네트워크 전송 자체는 기존 실제 태그를 사용합니다.
2. GA4 실시간/DebugView와 메타 이벤트 관리자의 테스트 이벤트에서 실제 수신을 확인하세요. 광고 차단 기능이나 동의 설정에 따라 수집이 제한될 수 있습니다.
3. GA4에서 버튼 위치별 보고서를 만들려면 **관리 → 맞춤 정의**에 이벤트 범위 측정기준 `button_id`, `button_text`, `section_id`를 등록하세요. 필요하면 `faq_id`, `action`, `principle_name`, `interaction_method`, `percent_scrolled`도 등록합니다.
4. 클릭을 주요 이벤트로 활용하려면 GA4에서 `course_cta_click`을 주요 이벤트로 지정하고, 메타에서는 같은 맞춤 이벤트를 기준으로 맞춤 전환을 설정하세요.

공식 참고: [GA4 이벤트 전송](https://developers.google.com/analytics/devguides/collection/ga4/events), [GA4 맞춤 측정기준](https://support.google.com/analytics/answer/14240153?hl=ko), [메타 픽셀 전환 추적](https://developers.facebook.com/documentation/meta-pixel/implementation/conversion-tracking).

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

## 블로그 DB 연결 (Supabase)

블로그 글·댓글을 **모든 방문자에게 보이게** 하려면 Supabase에 연결합니다. 연결 전에는 예전처럼 각 브라우저(localStorage)에만 저장됩니다.

1. [supabase.com](https://supabase.com)에서 가입 → **New project** 생성 (Region: Northeast Asia (Seoul) 권장)
2. 왼쪽 **SQL Editor → New query**에 `supabase/schema.sql` 내용을 전부 붙여 넣고 **Run**
3. **Authentication → Users → Add user**에서 관리자 계정(이메일·비밀번호) 1개 생성 (Auto Confirm 체크)
4. **Authentication → Sign In / Providers**에서 **Allow new users to sign up을 끄기** — 관리자 외에 아무도 가입하지 못하게 (중요)
5. **Project Settings → API**에서 `Project URL`과 `anon public` 키를 복사해 `js/blog-config.js`에 붙여 넣기
   - `service_role` 키는 절대 넣지 마세요.
6. 사이트에 다시 올린 뒤 `blog.html#admin`으로 들어가 3번의 이메일·비밀번호로 로그인 → 글쓰기

| 누가 | 할 수 있는 것 |
|---|---|
| 방문자 | 공개 글·댓글 읽기, 댓글·답글 쓰기, 조회수 +1 |
| 관리자(로그인) | 글 쓰기·수정·삭제·공지·비공개, 비공개 글 보기, 댓글 삭제 |

- 이 권한은 `schema.sql`의 보안 규칙(RLS)으로 DB에서 직접 막습니다. 페이지 코드를 조작해도 우회되지 않습니다.
- 본문 이미지는 글 안에 함께 저장됩니다(최대 가로 1600px로 자동 축소). 이미지가 아주 많아지면 Supabase Storage로 옮기는 것을 권합니다.
- 브라우저에 저장돼 있던 기존 글은 자동으로 옮겨지지 않습니다. 연결 후 다시 등록해 주세요.
- 무료 요금제는 1주일 동안 접속이 없으면 프로젝트가 일시 정지될 수 있습니다(대시보드에서 다시 켜면 데이터는 그대로).
