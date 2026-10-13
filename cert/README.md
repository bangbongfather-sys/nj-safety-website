# 시험성적서 QR 모아보기 (cert.njfashion.co.kr)

카탈로그와 옷 라벨에 공통 QR 하나를 넣는다. QR을 찍으면 전 제품 목록이 열리고,
제품을 누르면 KOTITI 시험성적서 원본 PDF가 열린다.

- 주소: `https://cert.njfashion.co.kr` (QR에 들어간 값. 바꾸면 인쇄된 라벨이 깨진다)
- 호스팅: Cloudflare Pages 프로젝트 `nj-cert` — 메인 사이트(Workers)와 분리
- 성적서는 겉감 기준만 연결 (안감·내피 제외)

```
cert/
├── wrangler.toml   Pages 프로젝트 설정 (출력 폴더 = site)
├── site/           배포되는 폴더
│   ├── index.html  모바일 목록 페이지. 제품 데이터는 const D 배열
│   ├── _headers    noindex, PDF 캐시 1시간
│   └── pdf/        KOTITI 원본 PDF 10개 (제품 11개 — NWWP26은 점퍼 성적서 공용)
└── qr/             인쇄용 QR (배포 안 됨)
    ├── NJ_성적서QR_벡터.svg      인쇄소 전달용 원본 (오류보정 H, 버전 4)
    ├── NJ_성적서QR_라벨용.png
    └── NJ_성적서QR_카탈로그용.png
```

## 배포

```sh
cd cert
npx wrangler pages deploy
```

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` 환경변수가 필요하다
(토큰 권한: Cloudflare Pages Edit).

처음 한 번만: Pages > nj-cert > Custom domains 에 `cert.njfashion.co.kr` 추가.
njfashion.co.kr 의 네임서버가 Cloudflare 이므로 DNS 레코드와 인증서는 자동 생성된다
(가비아 DNS 설정은 필요 없음).

## 성적서 갱신

1. `site/pdf/` 의 파일을 같은 이름으로 교체
2. `site/index.html` 의 `D` 배열에서 성적서 번호(`no`)·발행일(`d`) 수정
3. 재배포

QR 주소는 그대로라 이미 인쇄된 라벨도 계속 쓸 수 있다.
특정 제품으로 바로 가려면 `https://cert.njfashion.co.kr/#NWWJ26` 처럼 모델코드 앵커를 붙인다.

## 공개 전 확인

- KOTITI 홍보 목적 사용 동의 (성적서에 "사전 서면 동의 없이 광고·홍보 사용 불가" 문구)
- 폰으로 QR을 찍어 페이지·PDF가 열리는지 확인한 뒤에 라벨·카탈로그 인쇄
