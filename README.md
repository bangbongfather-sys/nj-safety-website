# NJ SAFETY — 회사 웹사이트

나정엔터프라이즈(Najung Enterprise Co., Ltd.)의 NJ SAFETY 브랜드 웹사이트.
산업용 방염 작업복(아라미드, 용접복) 제조사 브랜드 사이트로, B2B 고객(중공업·조선·철강·플랜트·건설사)을 대상으로 합니다.

기존 도메인 `njfashion.co.kr`(가비아 호스팅)에 정적 빌드 결과물을 업로드해 서빙합니다.

---

## 기술 스택

- **Next.js 14 (App Router)** + **TypeScript**
- **Tailwind CSS 3** (커스텀 토큰, `globals.css`에 디자인 시스템 포팅)
- **Static Export** (`output: 'export'`) — 가비아 일반 웹호스팅용
- **i18n**: 한국어(`/ko`) + 영어(`/en`) — `/[locale]/...` 라우팅 + `locales/*.json` 사전
- **폰트**: Pretendard (한글) + Inter (영문) + JetBrains Mono (mono)

디자인 토큰:

| Token       | Value     | Usage              |
| ----------- | --------- | ------------------ |
| `--bg`      | `#1c1c1e` | 메인 배경          |
| `--bg-3`    | `#0d0d0e` | 푸터, 히어로 베이스 |
| `--card`    | `#252527` | 카드/프레임 표면   |
| `--accent`  | `#ff6b1a` | 오렌지 강조        |
| `--text`    | `#ffffff` | 본문 텍스트        |
| `--muted`   | `#a1a1a6` | 보조 텍스트        |

---

## 로컬 실행

```bash
npm install        # 최초 1회
npm run dev        # http://localhost:3000
```

## 정적 빌드 (배포용)

```bash
npm run build
```

결과물은 `out/` 폴더에 생성됩니다:

```
out/
├── index.html              # / → /ko/ 클라이언트 리다이렉트
├── 404.html
├── _next/                  # JS / CSS 청크
├── ko/
│   ├── index.html          # 메인 (한국어)
│   ├── about/index.html
│   ├── products/index.html
│   ├── certifications/index.html
│   ├── clients/index.html
│   ├── news/index.html
│   └── contact/index.html
└── en/
    └── ... (영문 동일 구조)
```

---

## 공개 미리보기 배포 — Cloudflare Pages

본 배포(`njfashion.co.kr` / 가비아)는 사이트 최종 완성 후 진행. 그 전까지는 **Cloudflare Pages 무료 도메인**(`nj-safety-website.pages.dev`)으로 공개 미리보기를 유지하고 main 브랜치 push마다 자동 재배포됩니다.

### 최초 1회 설정

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. GitHub 인증 후 `bangbongfather-sys/nj-safety-website` 저장소 선택 → **Begin setup**
3. 빌드 설정:
   - **Project name**: `nj-safety-website`
   - **Production branch**: `main`
   - **Framework preset**: `Next.js (Static HTML Export)`
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Root directory**: (비워두기)
   - Environment variables: 없음
4. **Save and Deploy** → 1~2분 후 배포 완료 → `https://nj-safety-website.pages.dev` 활성화

### 이후 워크플로

```bash
# 로컬에서 작업
git add -A
git commit -m "..."
git push          # main에 push하면 Cloudflare Pages가 자동 빌드 + 배포
```

브랜치 push는 자동으로 preview deployment (별도 URL) 생성. PR 미리보기로 사용 가능.

---

## 가비아 FTP 배포 방법 (사이트 완성 후 본배포)

1. 로컬에서 `npm run build` 실행.
2. `out/` 폴더의 **전체 내용**을 가비아 웹호스팅의 web root에 업로드.
   - 가비아 매니저 → "FTP/SFTP 접속" → 호스트·계정 확인
   - 권장 FTP 클라이언트: FileZilla, WinSCP
   - 업로드 경로: 일반적으로 `/www/` 또는 `/html/` (가비아 상품에 따라 다름)
3. 도메인(`njfashion.co.kr`)으로 접속 → `/index.html`이 `/ko/`로 자동 리다이렉트됨.

**참고**: `trailingSlash: true` 설정으로 URL은 항상 `/path/` 형태 (e.g. `/ko/products/`).
가비아 호스팅(Apache)이 폴더 안의 `index.html`을 자동 서빙하므로 별도 설정 불필요.

---

## 디렉토리 구조

```
nj-safety-website/
├── app/
│   ├── layout.tsx                 # 루트 레이아웃 (HTML/body, 폰트 로딩)
│   ├── page.tsx                   # / → /ko/ 클라이언트 리다이렉트
│   ├── globals.css                # 디자인 시스템 + 모든 섹션 CSS
│   └── [locale]/
│       ├── layout.tsx             # Nav + Footer 래퍼 (locale validation)
│       ├── page.tsx               # 메인 (8개 섹션 컴포지션)
│       ├── about/page.tsx         # 스켈레톤
│       ├── products/page.tsx      # 스켈레톤
│       ├── certifications/page.tsx
│       ├── clients/page.tsx
│       ├── news/page.tsx
│       └── contact/page.tsx
├── components/
│   ├── layout/
│   │   ├── Navigation.tsx         # client 컴포넌트 (스크롤 효과, lang 토글)
│   │   └── Footer.tsx
│   └── sections/
│       ├── Hero.tsx               # 풀블리드 히어로 + 시네마틱 SVG 배경
│       ├── Products.tsx           # 시즌 3종 (Summer/SF/Winter)
│       ├── Showcase.tsx           # 현장 컷
│       ├── Manifesto.tsx          # 브랜드 스테이트먼트
│       ├── Certifications.tsx     # 인증 그리드 3종
│       ├── Clients.tsx            # 로고 12개 + 통계 3개
│       ├── Insights.tsx           # 아티클 3개
│       ├── ContactCTA.tsx         # 문의 섹션
│       └── SkeletonPage.tsx       # 미공개 서브페이지 공용 컴포넌트
├── locales/
│   ├── ko.json                    # 한국어 사전
│   └── en.json                    # 영문 사전
├── lib/
│   └── i18n.ts                    # locale 유틸 + 사전 로더
├── public/                        # 정적 자산 (이미지 추후 추가)
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
└── package.json
```

---

## ⚠️ 수정 필요 항목 (시안 그대로 들어간 placeholder)

배포 전에 반드시 확인·수정해야 할 회사 정보 / 데이터입니다.
대부분 **`locales/ko.json`** 과 **`locales/en.json`** 에서 변경할 수 있습니다.

### 1. 회사 정보 (양 locale 동일하게)
- `company.tel` — `02-545-1992` ← 실제 대표번호로 교체
- `company.fax` — `02-545-1993` ← 실제 팩스로 교체
- `company.email` — `sales@njsafety.co.kr` ← 실제 영업 이메일
- `company.hours` — `Mon–Fri · 09:00 – 18:00 KST`
- `company.addressShort` / `company.addressFull` — `청주시 흥덕구 산단로 142` ← 실제 주소
- `company.brn` — `BRN 123-45-67890` ← 실제 사업자등록번호
- `company.copyright` — `© 2026 NAJUNG ENTERPRISE CO., LTD.` ← 연도 자동 갱신 원하면 컴포넌트로 분리

### 2. 통계 (`clients.stats`)
- 34년 / 500+ 파트너 / 50+ 수출국 — 시안 값이라 실수 검증 필요

### 3. 고객사 로고 (`clients.logos`)
- 한전 협력사, SK, LG 화학, CLIENT 04~12 placeholder — 실제 클라이언트 로고 SVG/PNG로 교체 예정
- 현재 텍스트 placeholder. `components/sections/Clients.tsx`에서 `<span class="ph">{label}</span>`를 `<img>`로 교체

### 4. 히어로 / Showcase SVG 배경
- 현재 컴포넌트 내 SVG로 그려진 stripe/spark placeholder
- 실제 현장 사진(용접 스파크, 제철소, 조선소 등)으로 교체 예정
- 교체 시 `public/hero.jpg` 등으로 저장하고 `<svg>` 자리에 `<img>` / `<picture>` 삽입

### 5. 인사이트 아티클 (`insights.items`)
- 3건 모두 가상 콘텐츠. 실제 발행 시 별도 데이터 소스(MD/CMS)로 분리 권장

### 6. SNS / Legal 링크 (Footer)
- Instagram, LinkedIn — 현재 `href="#"`. 실제 URL로 교체
- Privacy, Terms, Sitemap 페이지 — 현재 `href="#"`. 필요시 정적 페이지로 추가

### 7. SEO / Open Graph
- `app/layout.tsx`의 메타데이터 (favicon, og:image 등)
- favicon은 `public/favicon.ico` 추가 필요

---

## 추후 페이지 추가 가이드

새 페이지(예: `/[locale]/services`) 추가하려면:

1. `app/[locale]/services/page.tsx` 생성
2. `locales/ko.json`, `locales/en.json`에 페이지 텍스트 추가
3. `components/layout/Navigation.tsx`의 `links` 배열에 항목 추가
4. (선택) `lib/i18n.ts`의 dictionary 타입은 ko.json에서 자동 추론됨

서브페이지가 메인의 한 섹션이면 `components/sections/`에 컴포넌트 추가 후 `app/[locale]/page.tsx`에 임포트.

---

## 디자인 시안 출처

- `C:\Users\njsaf\Projects\_nj-safety-design\NJ Safety.html` — Mammut 시네마틱 다크 스타일 (채택)
- `C:\Users\njsaf\Projects\_nj-safety-design\NJ Safety K2 Style.html` — K2 라이트 retail 스타일 (참고용, 미채택)

---

## 라이선스

© 2026 NAJUNG ENTERPRISE CO., LTD. All rights reserved.
