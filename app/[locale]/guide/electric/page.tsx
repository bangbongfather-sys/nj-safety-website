/**
 * 전기 방염복 (/ko/guide/electric).
 *
 * '전기 방염복' 한 검색어만 다루는 페이지. 용도별 가이드(/guide)에도
 * 전기 섹션이 있지만, 그 페이지는 h1 이 '용도별 방염복 선택 가이드'라
 * 전기·산업용을 함께 다룬다. 네이버는 검색어를 정면으로 다루는 문서 —
 * 제목·h1·본문이 한 주제인 페이지 — 를 더 높게 친다.
 *
 * 사실관계는 제품 데이터에 있는 것만 쓴다.
 *  - 아크 시험은 춘추 자켓·PK 티셔츠 두 제품의 인증 칸에 'EN IEC
 *    61482-1-1, 약 11.4 cal/cm² 노출 조건 시험'으로 적힌 그대로 옮긴다.
 *    노출 조건이지 등급(ATPV)이 아니므로 등급을 받았다고 쓰지 않는다.
 *  - NFPA 2112 는 '기준 설계 · UL 인증 진행 중'.
 *  - 전 제품의 현장 태그에 전기(ELECTRICAL/ELEC.)가 있어 라인업 전체를
 *    전기 현장용으로 소개한다.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import { getProduct } from '@/lib/products';
import JsonLd from '@/components/seo/JsonLd';
import { SITE_URL } from '@/lib/site';
import { absoluteImage, plain } from '@/lib/seo';
import '../guide.css';
import './electric.css';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

const ARC_TESTED = ['njs-aj200', 'njs-ar204'];
const ARC_NOTE_KO = 'EN IEC 61482-1-1, 약 11.4 cal/cm² 노출 조건 아크 시험';
const ARC_NOTE_EN = 'Arc tested to EN IEC 61482-1-1 at approx. 11.4 cal/cm² exposure';

const LINEUP: { season: { ko: string; en: string }; slugs: string[] }[] = [
  { season: { ko: '춘추용', en: 'Mid-season' }, slugs: ['njs-aj200', 'njfwp25'] },
  { season: { ko: '하계용', en: 'Summer' }, slugs: ['njs-ar204', 'njs-ar301', 'njssyyy', 'njssp', 'njs-av100'] },
  { season: { ko: '동계용', en: 'Winter' }, slugs: ['njs-aj100', 'njwwp26'] },
];

const KO = {
  metaTitle: '전기 방염복 — 한전 협력업체 방염복 · 아크 플래시 대비 아라미드 방염복 | NJ SAFETY',
  metaDesc:
    '전기·전력 현장용 전기 방염복. 원사 자체가 방염인 아라미드 원단, EN IEC 61482-1-1 아크 시험, ' +
    '한전 협력업체 방염복 제작. 춘추·하계·동계 라인업과 시험성적서 제공 — 나정엔터프라이즈.',
  crumbGuide: '방염복 선택 가이드',
  eyebrow: '— Electrical FR Wear',
  title: '전기 방염복',
  intro:
    '전기 방염복은 배전·송전·변전 설비와 전기공사 현장에서 아크 플래시로부터 작업자를 지키는 ' +
    '작업복입니다. 나정엔터프라이즈는 1987년부터 산업 안전복을 만들어 왔고, 한전 협력업체 ' +
    '방염복을 제작해 왔습니다. 전기 현장에 맞춘 아라미드 방염복을 계절별로 공급합니다.',
  whyTitle: '전기 현장에 방염복이 필요한 이유',
  whyBody:
    '단락·지락 사고가 나면 순간적으로 아크 플래시가 발생합니다. 수천 도의 열과 섬광, 압력이 ' +
    '한꺼번에 몰려오는데, 일반 면·합성섬유 작업복은 이때 불이 붙거나 녹아 피부에 달라붙어 ' +
    '화상을 키웁니다. 전기 방염복은 불이 붙지 않고, 붙더라도 스스로 꺼지며, 녹아내리지 않는 ' +
    '원단으로 만들어 그 짧은 순간의 피해를 줄입니다.',
  checkTitle: '전기 방염복 고를 때 확인할 것',
  checks: [
    { h: '아크 시험 자료', p: '아크 에너지(cal/cm²)에 대한 시험 기준과 결과를 시험성적서로 확인하세요. 발주처 제출용으로도 필요합니다.' },
    { h: '원사 자체가 방염인지', p: '약품으로 후처리한 방염 작업복은 세탁할수록 성능이 떨어집니다. 아라미드는 섬유 자체가 방염이라 세탁 후에도 유지됩니다.' },
    { h: '정전기 방지 사양', p: '전기 설비 주변 작업이라면 정전기 방지 사양이 있는지 함께 확인하세요.' },
    { h: '계절과 현장 조건', p: '한여름 옥외 작업이 많다면 통기 구조, 겨울 철탑·옥외 작업이라면 보온과 방염을 함께 갖춘 제품이 필요합니다.' },
  ],
  lineupTitle: '나정엔터프라이즈 전기 방염복 라인업',
  lineupLede: '모든 제품이 아라미드 원단, NFPA 2112 기준으로 설계되었습니다. (UL 인증 진행 중)',
  view: '제품 보기',
  orderTitle: '한전 협력업체 · 전기공사 단체 주문',
  orderBody:
    '사이즈를 섞어 수십 벌 이상 주문하시는 경우 본사에서 직접 견적을 드립니다. 로고 자수, 납기, ' +
    '시험성적서(혼용률·방염·ARC) 발급까지 한 번에 상담하세요. 가까운 공식 대리점에서도 구매하실 수 있습니다.',
  faqTitle: '전기 방염복 자주 묻는 질문',
  faqs: [
    {
      q: '전기 방염복과 일반 방염복은 다른가요?',
      a: '불에 잘 타지 않는다는 점은 같지만, 전기 방염복은 아크 플래시에 대한 시험 자료가 있어야 합니다. ' +
        '나정엔터프라이즈 춘추 자켓과 PK 티셔츠는 EN IEC 61482-1-1 기준, 약 11.4 cal/cm² 노출 조건으로 아크 시험을 진행했습니다.',
    },
    {
      q: '한전 협력업체 납품용으로 구매할 수 있나요?',
      a: '네. 한전 협력업체 방염복을 제작해 온 경험이 있으며, 발주처 제출용 시험성적서를 PDF로 보내 드립니다.',
    },
    {
      q: '여름에도 입을 수 있는 전기 방염복이 있나요?',
      a: '아라미드 PK 티셔츠, 하계 방염 자켓, 하계 Y셔츠, 하계 팬츠, 메쉬 조끼 등 통기성을 높인 하계 라인업이 있습니다.',
    },
    {
      q: 'NFPA 2112 인증을 받았나요?',
      a: 'NFPA 2112 기준으로 설계했으며, UL 인증은 2026년 내 취득을 목표로 진행 중입니다.',
    },
  ],
  ctaQuote: '견적 문의',
  ctaDealers: '공식 대리점 찾기',
  ctaGuide: '산업용 방염복도 보기',
};

const EN: typeof KO = {
  ...KO,
  metaTitle: 'Electrical FR Workwear — Arc Flash Protection, Aramid | NJ SAFETY',
  metaDesc:
    'Flame-resistant workwear for electrical and utility sites. Inherently FR aramid, arc tested to ' +
    'EN IEC 61482-1-1, supplied to KEPCO contractors. Seasonal lineup with test reports.',
  crumbGuide: 'FR wear guide',
  title: 'Electrical FR workwear',
  intro:
    'Workwear that protects people on distribution, transmission and substation work from arc flash. ' +
    'Najung Enterprise has made industrial safety wear since 1987 and has supplied KEPCO contractors.',
  whyTitle: 'Why electrical sites need FR wear',
  whyBody:
    'A fault releases an arc flash — intense heat, light and pressure in an instant. Ordinary workwear ' +
    'can ignite or melt onto skin. FR fabric resists ignition, self-extinguishes and does not melt.',
  checkTitle: 'What to check',
  checks: [
    { h: 'Arc test data', p: 'Check the arc test standard and report. Clients often require it.' },
    { h: 'Inherently FR fibre', p: 'Chemically treated workwear loses protection with washing; aramid does not.' },
    { h: 'Anti-static', p: 'Check for anti-static properties when working near live equipment.' },
    { h: 'Season and site', p: 'Ventilation for summer outdoor work, insulation for winter.' },
  ],
  lineupTitle: 'Our electrical FR lineup',
  lineupLede: 'All aramid, designed to NFPA 2112 (UL certification in progress).',
  view: 'View',
  orderTitle: 'Bulk orders for utility contractors',
  orderBody: 'For mixed-size orders we quote directly, including logo embroidery, lead time and test reports.',
  faqTitle: 'FAQ',
  faqs: [
    { q: 'Is NFPA 2112 certified?', a: 'Designed to NFPA 2112; UL certification is targeted within 2026.' },
    { q: 'Can I get test reports?', a: 'Fibre-content, flame and arc test reports are available as PDF.' },
  ],
  ctaQuote: 'Request a quote',
  ctaDealers: 'Find a dealer',
  ctaGuide: 'Industrial FR wear',
};

function contentFor(locale: Locale) {
  return locale === 'en' ? EN : KO;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = contentFor(locale as Locale);
  return {
    title: { absolute: c.metaTitle },
    description: c.metaDesc,
    alternates: { canonical: `/${locale}/guide/electric/` },
    openGraph: {
      type: 'article',
      title: c.metaTitle,
      description: c.metaDesc,
      url: `/${locale}/guide/electric/`,
      images: [{ url: '/og.jpg', width: 1200, height: 630 }],
    },
  };
}

export default async function ElectricGuidePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const c = contentFor(loc);

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
      { '@type': 'ListItem', position: 2, name: c.crumbGuide, item: `${SITE_URL}/${loc}/guide/` },
      { '@type': 'ListItem', position: 3, name: c.title, item: `${SITE_URL}/${loc}/guide/electric/` },
    ],
  };

  return (
    <section className="skeleton-page gd-page">
      <JsonLd data={faqSchema} />
      <JsonLd data={crumbSchema} />
      <div className="wrap gd-wrap el-wrap">
        <nav className="el-crumb" aria-label="breadcrumb">
          <Link href={`/${loc}/`}>NJ SAFETY</Link>
          <span>/</span>
          <Link href={`/${loc}/guide/`}>{c.crumbGuide}</Link>
          <span>/</span>
          <b>{c.title}</b>
        </nav>

        <span className="eyebrow">{c.eyebrow}</span>
        <h1 className="gd-title">{c.title}</h1>
        <p className="gd-intro">{c.intro}</p>

        <article className="gd-sec">
          <h2>{c.whyTitle}</h2>
          <p className="gd-lede">{c.whyBody}</p>
        </article>

        <article className="gd-sec">
          <h2>{c.checkTitle}</h2>
          <div className="el-checks">
            {c.checks.map((ck, i) => (
              <div key={ck.h} className="el-check">
                <span className="el-check-n">{String(i + 1).padStart(2, '0')}</span>
                <h3>{ck.h}</h3>
                <p>{ck.p}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="gd-sec">
          <h2>{c.lineupTitle}</h2>
          <p className="gd-lede">{c.lineupLede}</p>
          {LINEUP.map((group) => (
            <div key={group.season.ko} className="el-group">
              <h3>{group.season[loc === 'en' ? 'en' : 'ko']}</h3>
              <ul className="el-cards">
                {group.slugs.map((slug) => {
                  const p = getProduct(slug);
                  if (!p) return null;
                  const name = plain(p.name).replace(/\.$/, '');
                  // 제품 사진은 카탈로그 앱이 호스팅한다 — 상세페이지·검색
                  // 데이터와 같은 규칙으로 절대 주소로 바꾼다.
                  const img = absoluteImage((p.hero as { image?: string } | undefined)?.image);
                  const arc = ARC_TESTED.includes(slug);
                  return (
                    <li key={slug}>
                      <Link href={`/${loc}/products/${slug}/`} className="el-card">
                        <span className="el-card-img">
                          {img ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={img} alt={name} loading="lazy" />
                          ) : null}
                        </span>
                        <span className="el-card-body">
                          <b>{name}</b>
                          {arc ? (
                            <span className="el-card-arc">{loc === 'en' ? ARC_NOTE_EN : ARC_NOTE_KO}</span>
                          ) : null}
                          <span className="el-card-view">{c.view} →</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </article>

        <article className="gd-sec">
          <h2>{c.orderTitle}</h2>
          <p className="gd-lede">{c.orderBody}</p>
        </article>

        <section className="gd-faq">
          <h2>{c.faqTitle}</h2>
          {c.faqs.map((f) => (
            <div key={f.q} className="gd-faq-item">
              <h3>{f.q}</h3>
              <p>{f.a}</p>
            </div>
          ))}
        </section>

        <section className="gd-cta">
          <h2>{c.orderTitle}</h2>
          <div className="gd-cta-row">
            <Link href={`/${loc}/contact/`} className="btn primary">{c.ctaQuote}</Link>
            <Link href={`/${loc}/dealers/`} className="btn ghost">{c.ctaDealers}</Link>
            <Link href={`/${loc}/guide/#industrial`} className="btn ghost">{c.ctaGuide}</Link>
          </div>
        </section>
      </div>
    </section>
  );
}
