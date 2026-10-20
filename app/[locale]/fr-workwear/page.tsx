/**
 * 방염복 · 방염작업복 (/ko/fr-workwear) — 사이트의 대표 안내 페이지.
 *
 * 키워드 도구 기준으로 회사를 알려야 할 검색어는 '방염복'(월 약 1,170)과
 * '방염작업복'(월 약 80)이다. 홈은 '아라미드 방염복'으로 1위를 하고
 * 있어 제목을 건드리지 않고, 두 검색어를 정면으로 다루는 문서를 따로
 * 둔다. 세부 페이지(전기 방염복, 용도별 가이드)는 이 페이지 아래에 놓인다.
 *
 * 사실관계는 사이트·제품 데이터에 있는 것만 쓴다.
 *  - 방염성 시험: 9개 전 제품의 인증 칸에 'KS K 0585 시험성적서'.
 *  - 아크 시험: 춘추 자켓·PK 티셔츠 2개 (LineupCards 에 표시).
 *  - EN ISO 11612: 춘추 자켓 소재 설명에만 있다 → 그 제품에 한정해 쓴다.
 *  - NFPA 2112: '기준 설계 · UL 인증 진행 중'.
 *  - 관리법: 9개 제품 모두 같은 4항목.
 *  - 납기·결제: 문의 FAQ 문구.
 *  - 공급처: 회사 소개의 '한전 및 협력사 · SK 계열 · LG 계열'.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import JsonLd from '@/components/seo/JsonLd';
import LineupCards, { LINEUP, productName } from '@/components/guide/LineupCards';
import { SITE_URL } from '@/lib/site';
import { getDealersFile } from '@/lib/dealers';
import '../guide/guide.css';
import '../guide/electric/electric.css';
import './fr-workwear.css';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

type Faq = { q: string; a: string };

function content(locale: Locale, dealerCount: number) {
  if (locale === 'en') {
    return {
      metaTitle: 'Flame-Resistant Workwear — Aramid FR Clothing Manufacturer | NJ SAFETY',
      metaDesc:
        'Najung Enterprise makes aramid flame-resistant workwear since 1987. Every garment has a ' +
        'KS K 0585 flame test report. Seasonal lineup, bulk orders for utilities and plants.',
      eyebrow: '— FR Workwear',
      title: 'Flame-resistant workwear',
      intro:
        'Najung Enterprise (NJ SAFETY) has made industrial safety wear since 1987, supplying KEPCO and ' +
        `its contractors, SK and LG group sites. ${dealerCount} authorised dealers nationwide.`,
      faqs: [
        { q: 'Do you have test reports?', a: 'Every garment has a KS K 0585 flame test report, available as PDF.' },
        { q: 'Is it NFPA 2112 certified?', a: 'Designed to NFPA 2112; UL certification is targeted within 2026.' },
      ] as Faq[],
    };
  }
  return {
    metaTitle: '방염복 · 방염작업복 — 아라미드 방염복 제작 전문 나정엔터프라이즈 | NJ SAFETY',
    metaDesc:
      '방염복·방염작업복 전문 제조사 나정엔터프라이즈. 원사 자체가 방염인 아라미드 방염복, 전 제품 ' +
      'KS K 0585 방염성 시험성적서. 춘추·하계·동계 방염작업복 9종, 한전 협력사·단체 주문 제작. 1987년 설립.',
    eyebrow: '— FR Workwear',
    title: '방염복 · 방염작업복',
    intro:
      '나정엔터프라이즈(NJ SAFETY)는 1987년부터 산업 안전복을 만들어 온 방염복 전문 제조사입니다. ' +
      '한전 및 협력사, SK·LG 계열 현장에 방염작업복을 공급하고 있으며, 전국 ' +
      `${dealerCount}곳의 공식 대리점에서 구매하실 수 있습니다.`,
    faqs: [
      {
        q: '방염복과 방화복은 다른 옷인가요?',
        a: '다릅니다. 방염복(방염작업복)은 전기·플랜트·설비 현장에서 매일 입는 작업복으로, 순간적인 불꽃과 ' +
          '화염에 대비합니다. 방화복은 소방관이 화재 진압 때 입는 보호복입니다. 나정엔터프라이즈는 산업 현장용 방염복을 만듭니다.',
      },
      {
        q: '방염복은 세탁하면 방염 성능이 떨어지나요?',
        a: '약품으로 후처리한 방염 작업복은 세탁을 거듭할수록 성능이 떨어질 수 있습니다. 아라미드는 섬유 자체가 ' +
          '방염이라 세탁 후에도 성능이 유지됩니다. 다만 표백제와 건조기는 섬유를 손상시키므로 피해 주세요.',
      },
      {
        q: '방염 시험성적서를 받을 수 있나요?',
        a: '전 제품에 KS K 0585 방염성 시험성적서가 있으며, 혼용률·ARC 시험성적서와 함께 PDF로 보내 드립니다. 자료실에서도 확인하실 수 있습니다.',
      },
      {
        q: '방염작업복 단체 주문은 얼마나 걸리나요?',
        a: '재고가 있는 기성 제품은 출고일 기준 2영업일 이내, 신규 양산은 3~6주, OEM 제작은 6~10주입니다. 수량과 일정을 알려주시면 정확히 안내해 드립니다.',
      },
      {
        q: 'NFPA 2112 인증을 받았나요?',
        a: 'NFPA 2112 기준으로 설계했으며, UL 인증은 2026년 내 취득을 목표로 진행 중입니다.',
      },
    ] as Faq[],
  };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = content(locale as Locale, getDealersFile().dealers.length);
  return {
    title: { absolute: c.metaTitle },
    description: c.metaDesc,
    alternates: { canonical: `/${locale}/fr-workwear/` },
    openGraph: {
      type: 'article',
      title: c.metaTitle,
      description: c.metaDesc,
      url: `/${locale}/fr-workwear/`,
      images: [{ url: '/og.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function FrWorkwearPage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const dealerCount = getDealersFile().dealers.length;
  const c = content(loc, dealerCount);
  const en = loc === 'en';

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
  const crumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'NJ SAFETY', item: `${SITE_URL}/${loc}/` },
      { '@type': 'ListItem', position: 2, name: c.title, item: `${SITE_URL}/${loc}/fr-workwear/` },
    ],
  };
  // 라인업 9종을 목록으로도 알린다 — 이 페이지가 어떤 제품들을 대표하는지.
  const listSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: c.title,
    itemListElement: LINEUP.flatMap((g) => g.slugs).map((slug, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: productName(slug),
      url: `${SITE_URL}/${loc}/products/${slug}/`,
    })),
  };

  return (
    <section className="skeleton-page gd-page">
      <JsonLd data={faqSchema} />
      <JsonLd data={crumbSchema} />
      <JsonLd data={listSchema} />
      <div className="wrap gd-wrap el-wrap">
        <nav className="el-crumb" aria-label="breadcrumb">
          <Link href={`/${loc}/`}>NJ SAFETY</Link>
          <span>/</span>
          <b>{c.title}</b>
        </nav>

        <span className="eyebrow">{c.eyebrow}</span>
        <h1 className="gd-title">{c.title}</h1>
        <p className="gd-intro">{c.intro}</p>

        {en ? null : (
          <>
            <nav className="gd-toc">
              <a href="#what">방염복이란</a>
              <a href="#compare">일반 작업복과의 차이</a>
              <a href="#sites">현장별 방염작업복</a>
              <a href="#standards">방염 시험·기준</a>
              <a href="#lineup">라인업</a>
              <a href="#care">세탁·관리</a>
              <a href="#order">단체 주문</a>
            </nav>

            <article id="what" className="gd-sec">
              <h2>방염복(방염작업복)이란</h2>
              <p className="gd-lede">
                방염복은 불꽃·순간 화염·아크 플래시에 노출될 수 있는 현장에서 입는 작업복입니다. 불이 잘
                붙지 않고, 붙더라도 불씨가 사라지면 스스로 꺼지며, 녹아서 피부에 달라붙지 않는 원단으로
                만듭니다. 현장에서는 방염작업복, 난연작업복이라고도 부릅니다.
              </p>
            </article>

            <article id="compare" className="gd-sec">
              <h2>방염복과 일반 작업복은 무엇이 다른가</h2>
              <div className="fw-table-wrap">
                <table className="fw-table">
                  <thead>
                    <tr><th></th><th>아라미드 방염복</th><th>후처리 방염 작업복</th><th>일반 작업복</th></tr>
                  </thead>
                  <tbody>
                    <tr><th>방염 원리</th><td><b>섬유 자체가 방염</b></td><td>원단에 방염 약품을 입힘</td><td>없음</td></tr>
                    <tr><th>세탁 후 성능</th><td><b>유지됨</b></td><td>세탁할수록 떨어질 수 있음</td><td>—</td></tr>
                    <tr><th>불꽃에 닿으면</th><td><b>스스로 꺼지고 녹지 않음</b></td><td>처리 상태에 따라 다름</td><td>불이 붙거나 녹을 수 있음</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="gd-lede">나정엔터프라이즈의 방염작업복은 모두 아라미드 원단으로 만듭니다.</p>
            </article>

            <article id="sites" className="gd-sec">
              <h2>현장별 방염작업복</h2>
              <div className="el-checks">
                <Link href={`/${loc}/guide/electric/`} className="el-check fw-site">
                  <span className="el-check-n">01</span>
                  <h3>전기 방염복</h3>
                  <p>배전·송전·변전, 전기공사 현장. 아크 플래시 대비. 한전 협력업체 방염복.</p>
                  <span className="fw-site-more">자세히 보기 →</span>
                </Link>
                <Link href={`/${loc}/guide/#industrial`} className="el-check fw-site">
                  <span className="el-check-n">02</span>
                  <h3>산업용 방염복</h3>
                  <p>정유·화학 플랜트, 가스 설비. 순간 화염과 불티 대비.</p>
                  <span className="fw-site-more">자세히 보기 →</span>
                </Link>
                <div className="el-check">
                  <span className="el-check-n">03</span>
                  <h3>설비 정비 · 철도</h3>
                  <p>설비 유지보수, 가스·철도 현장. 계절별 라인업으로 연중 착용.</p>
                </div>
              </div>
            </article>

            <article id="standards" className="gd-sec">
              <h2>방염 시험과 기준</h2>
              <ul className="gd-checks">
                <li><b>KS K 0585 방염성 시험</b> — 전 제품 시험성적서 보유</li>
                <li><b>아크 시험 (EN IEC 61482-1-1)</b> — 아라미드 춘추 자켓, 아라미드 PK 티셔츠. 약 11.4 cal/cm² 노출 조건</li>
                <li><b>EN ISO 11612</b> — 아라미드 춘추 자켓 소재</li>
                <li><b>NFPA 2112</b> — 기준 설계 · UL 인증 진행 중 (2026년 내 목표)</li>
              </ul>
              <p className="gd-lede">
                시험성적서는 PDF로 보내 드리며, <Link href={`/${loc}/resources/#test-reports`}>자료실</Link>에서도 확인하실 수 있습니다.
              </p>
            </article>

            <article id="lineup" className="gd-sec">
              <h2>방염작업복 라인업</h2>
              <p className="gd-lede">춘추·하계·동계 9종. 모든 제품이 아라미드 원단입니다.</p>
              <LineupCards locale={loc} />
            </article>

            <article id="care" className="gd-sec">
              <h2>방염복 세탁·관리법</h2>
              <ul className="gd-checks">
                <li><b>손세탁 권장</b> — 중성세제로 손세탁하고 가볍게 털어 응달에서 말립니다</li>
                <li><b>표백제·건조기 금지</b> — 아라미드 섬유가 손상됩니다</li>
                <li><b>저온 텀블 또는 자연건조</b> — 그늘 건조를 권장합니다</li>
                <li><b>중간 온도 다림질</b> — 울·면 온도로 다림질할 수 있습니다</li>
              </ul>
            </article>

            <article id="order" className="gd-sec">
              <h2>방염작업복 단체 주문 · 제작</h2>
              <p className="gd-lede">
                사이즈를 섞어 여러 벌을 주문하시는 경우 본사에서 직접 견적을 드립니다. 재고가 있는 기성
                제품은 출고일 기준 2영업일 이내, 신규 양산은 3~6주, OEM 제작은 6~10주가 걸립니다. 시험성적서
                발급까지 함께 상담하세요. 가까운 공식 대리점({dealerCount}곳)에서도 구매하실 수 있습니다.
              </p>
            </article>
          </>
        )}

        <section className="gd-faq">
          <h2>{en ? 'FAQ' : '방염복 자주 묻는 질문'}</h2>
          {c.faqs.map((f) => (
            <div key={f.q} className="gd-faq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>

        {en ? (
          <article className="gd-sec">
            <LineupCards locale={loc} />
          </article>
        ) : null}

        <section className="gd-cta">
          <h2>{en ? 'Talk to us' : '방염작업복 견적 · 상담'}</h2>
          <div className="gd-cta-row">
            <Link href={`/${loc}/contact/`} className="btn primary">{en ? 'Request a quote' : '견적 문의'}</Link>
            <Link href={`/${loc}/dealers/`} className="btn ghost">{en ? 'Find a dealer' : '공식 대리점 찾기'}</Link>
            <Link href={`/${loc}/products/`} className="btn ghost">{en ? 'All products' : '전체 제품 보기'}</Link>
          </div>
        </section>
      </div>
    </section>
  );
}
