/**
 * 용도별 방염복 선택 가이드 (/ko/guide).
 *
 * '아라미드 방염복'은 사이트 제목·설명에 그대로 있어 네이버 상단에
 * 뜨지만, '전기 방염복'·'산업용 방염복'·'한전 방염복'은 사이트 어디에도
 * 그 말로 다룬 페이지가 없어(전기 방염복 0회) 검색에 걸릴 근거가
 * 없었다. 그 검색어를 정면으로 다루는 문서를 둔다.
 *
 * 검색어를 채워 넣은 페이지가 아니라 현장 담당자가 실제로 궁금한
 * 것 — 무슨 위험 때문에, 무엇을 확인하고, 어떤 제품을 고르는지 — 을
 * 답하는 페이지여야 네이버가 좋은 문서로 친다.
 *
 * 인증 표현은 사이트의 다른 자료와 맞춘다. ARC 시험성적서는 제품별로
 * 있고, NFPA 2112 UL 인증은 FAQ 기준 '2026년 내 취득 예정'이라 여기서
 * 취득했다고 쓰지 않는다.
 */
import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isLocale, type Locale } from '@/lib/i18n';
import JsonLd from '@/components/seo/JsonLd';
import './guide.css';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

type Section = {
  id: string;
  eyebrow: string;
  title: string;
  lede: string;
  risk: string;
  checks: string[];
  products: { slug: string; name: string }[];
};

type Content = {
  metaTitle: string;
  metaDesc: string;
  eyebrow: string;
  title: string;
  intro: string;
  riskLabel: string;
  checkLabel: string;
  productLabel: string;
  sections: Section[];
  faqTitle: string;
  faqs: { q: string; a: string }[];
  ctaTitle: string;
  ctaBody: string;
  ctaQuote: string;
  ctaDealers: string;
};

const KO: Content = {
  metaTitle: '전기 방염복 · 산업용 방염복 선택 가이드 — 한전 협력업체 방염복 | NJ SAFETY',
  metaDesc:
    '전기·전력 현장용 전기 방염복과 플랜트·설비 현장용 산업용 방염복을 용도별로 안내합니다. ' +
    '한전 협력업체 방염복 제작, 제품별 ARC 시험성적서 제공. 1987년부터 나정엔터프라이즈.',
  eyebrow: '— Guide · 방염복 선택',
  title: '용도별 방염복 선택 가이드',
  intro:
    '방염복은 현장의 위험이 무엇이냐에 따라 확인할 기준이 다릅니다. 전기·전력 현장은 아크 ' +
    '플래시를, 플랜트·설비 현장은 순간 화염과 불티를 먼저 봐야 합니다. 아래에서 현장에 맞는 ' +
    '기준과 제품을 확인하세요.',
  riskLabel: '주요 위험',
  checkLabel: '고를 때 확인할 것',
  productLabel: '추천 제품',
  sections: [
    {
      id: 'electric',
      eyebrow: '01 · 전기 방염복',
      title: '전기 방염복 — 전기·전력 현장, 한전 협력업체용',
      lede:
        '배전·송전·변전 설비, 전기공사 현장에서 입는 방염복입니다. 나정엔터프라이즈는 한전 ' +
        '협력업체 방염복을 제작해 온 경험을 바탕으로, 전기 현장 기준에 맞춘 아라미드 방염복을 공급합니다.',
      risk:
        '아크 플래시 — 단락·지락 순간 발생하는 고열과 섬광. 일반 작업복은 불이 붙거나 녹아 ' +
        '피부에 달라붙어 화상을 키웁니다.',
      checks: [
        'ARC 등급(cal/cm²) — 아크 에너지를 얼마나 견디는지. 시험성적서로 확인하세요',
        '원단 자체가 방염인지 — 후처리 방염은 세탁할수록 성능이 떨어집니다',
        '정전기 방지 기능 — 전기 설비 주변 작업에 필요합니다',
        '발주처(한전 등) 제출용 시험성적서 발급 가능 여부',
      ],
      products: [
        { slug: 'njs-aj200', name: '아라미드 춘추 자켓' },
        { slug: 'njfwp25', name: '아라미드 춘추 팬츠' },
        { slug: 'njs-ar204', name: '아라미드 PK 티셔츠' },
        { slug: 'njssp', name: '아라미드 하계 팬츠' },
      ],
    },
    {
      id: 'industrial',
      eyebrow: '02 · 산업용 방염복',
      title: '산업용 방염복 — 플랜트·정유·가스·설비 현장용',
      lede:
        '정유·화학 플랜트, 가스 설비, 제철·설비 정비 현장에서 입는 산업용 방염복입니다. ' +
        '불꽃에 노출돼도 스스로 꺼지고, 녹아 붙지 않는 아라미드 원단을 씁니다.',
      risk:
        '순간 화염(flash fire)과 불티 — 가연성 가스·분진이 있는 곳에서는 짧은 순간의 화염에도 ' +
        '옷에 불이 옮겨붙는 것이 가장 큰 위험입니다.',
      checks: [
        '원사 자체가 방염인 아라미드인지 — 세탁 후에도 방염 성능이 유지됩니다',
        '방염 시험성적서와 혼용률 시험성적서',
        '계절 — 한여름엔 통기 구조, 겨울엔 보온과 방염을 함께',
        '반사띠·포켓 등 현장 편의 사양',
      ],
      products: [
        { slug: 'njs-ar301', name: '아라미드 하계 방염 자켓' },
        { slug: 'njs-av100', name: '아라미드 메쉬 유틸리티 조끼' },
        { slug: 'njs-aj100', name: '아라미드 방한 솜점퍼' },
        { slug: 'njwwp26', name: '아라미드 방한 웜 팬츠' },
      ],
    },
  ],
  faqTitle: '자주 묻는 질문',
  faqs: [
    {
      q: '방염복과 방염 처리한 작업복은 무엇이 다른가요?',
      a:
        '일반 면 원단에 약품을 입힌 후처리 방염은 세탁을 거듭할수록 방염 성능이 떨어집니다. ' +
        '아라미드 방염복은 원사 자체가 불에 타지 않는 섬유라 세탁 후에도 성능이 유지됩니다.',
    },
    {
      q: '전기 방염복은 무엇을 기준으로 골라야 하나요?',
      a:
        '아크 플래시를 견디는 정도인 ARC 등급(cal/cm²)이 핵심입니다. 나정엔터프라이즈는 제품별 ' +
        'ARC 시험성적서를 제공하며, 발주처 제출용으로 PDF 발송이 가능합니다.',
    },
    {
      q: '한전 협력업체 단체 주문도 가능한가요?',
      a:
        '가능합니다. 한전 협력업체 방염복 제작 경험이 있으며, 수량·납기·로고 자수 등은 견적 문의 ' +
        '또는 가까운 공식 대리점으로 상담해 주세요.',
    },
    {
      q: '시험성적서를 받을 수 있나요?',
      a:
        '제품별 혼용률 시험성적서, 방염 시험성적서, ARC 시험성적서를 PDF로 보내 드립니다. ' +
        '자료실에서도 일부 시험성적서를 확인할 수 있습니다.',
    },
  ],
  ctaTitle: '현장에 맞는 방염복, 상담해 드립니다',
  ctaBody: '수량과 현장 조건을 알려주시면 알맞은 제품과 시험성적서를 함께 안내해 드립니다.',
  ctaQuote: '견적 문의',
  ctaDealers: '공식 대리점 찾기',
};

const EN: Content = {
  metaTitle: 'Flame-Resistant Workwear Guide — Electrical & Industrial FR Clothing | NJ SAFETY',
  metaDesc:
    'How to choose FR workwear for electrical/utility sites and industrial plants. ' +
    'Aramid garments with per-product ARC test reports. Najung Enterprise since 1987.',
  eyebrow: '— Guide · Choosing FR wear',
  title: 'Flame-resistant workwear by application',
  intro:
    'What to check depends on the hazard on site: arc flash on electrical and utility work, ' +
    'flash fire and sparks in plants and maintenance.',
  riskLabel: 'Main hazard',
  checkLabel: 'What to check',
  productLabel: 'Recommended',
  sections: [
    {
      id: 'electric',
      eyebrow: '01 · Electrical',
      title: 'Electrical FR wear — utility and power sites',
      lede: 'For distribution, transmission and substation work. We have supplied FR garments to KEPCO contractors.',
      risk: 'Arc flash — intense heat and light from a fault. Ordinary workwear can ignite or melt onto skin.',
      checks: [
        'ARC rating (cal/cm²) backed by a test report',
        'Inherently FR fabric — treated cotton loses protection with washing',
        'Anti-static properties near live equipment',
      ],
      products: KO.sections[0].products,
    },
    {
      id: 'industrial',
      eyebrow: '02 · Industrial',
      title: 'Industrial FR wear — plants, refineries, gas and maintenance',
      lede: 'Aramid fabric self-extinguishes and does not melt when exposed to flame.',
      risk: 'Flash fire and sparks where flammable gas or dust is present.',
      checks: [
        'Inherently FR aramid that keeps its protection after washing',
        'Flame and fibre-content test reports',
        'Seasonal build — ventilation for summer, insulation for winter',
      ],
      products: KO.sections[1].products,
    },
  ],
  faqTitle: 'FAQ',
  faqs: [
    {
      q: 'How is FR clothing different from FR-treated workwear?',
      a: 'Chemical FR treatments wash out over time. Aramid fibre is inherently flame resistant, so protection lasts.',
    },
    {
      q: 'Can I get test reports?',
      a: 'Fibre-content, flame and ARC test reports are available per product as PDF.',
    },
  ],
  ctaTitle: 'Talk to us about your site',
  ctaBody: 'Tell us the quantity and conditions and we will suggest products and send test reports.',
  ctaQuote: 'Request a quote',
  ctaDealers: 'Find a dealer',
};

function contentFor(locale: Locale): Content {
  return locale === 'en' ? EN : KO;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const c = contentFor(locale as Locale);
  return {
    // 루트 템플릿(“%s | NJ SAFETY”)이 브랜드를 한 번 더 붙이지 않게 absolute.
    title: { absolute: c.metaTitle },
    description: c.metaDesc,
    alternates: { canonical: `/${locale}/guide/` },
  };
}

export default async function GuidePage({ params }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const loc = locale as Locale;
  const c = contentFor(loc);

  // 질문·답을 검색엔진이 읽는 형식으로도 싣는다. 화면의 FAQ 와 같은
  // 내용이어야 한다 — 다르면 검색엔진이 신뢰하지 않는다.
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <section className="skeleton-page gd-page">
      <JsonLd data={faqSchema} />
      <div className="wrap gd-wrap">
        <span className="eyebrow">{c.eyebrow}</span>
        <h1 className="gd-title">{c.title}</h1>
        <p className="gd-intro">{c.intro}</p>

        <nav className="gd-toc">
          {c.sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>{s.title.split(' — ')[0]}</a>
          ))}
        </nav>

        {c.sections.map((s) => (
          <article key={s.id} id={s.id} className="gd-sec">
            <span className="gd-sec-eyebrow">{s.eyebrow}</span>
            <h2>{s.title}</h2>
            <p className="gd-lede">{s.lede}</p>

            <div className="gd-risk">
              <b>{c.riskLabel}</b>
              <p>{s.risk}</p>
            </div>

            <h3>{c.checkLabel}</h3>
            <ul className="gd-checks">
              {s.checks.map((ck) => <li key={ck}>{ck}</li>)}
            </ul>

            <h3>{c.productLabel}</h3>
            <ul className="gd-products">
              {s.products.map((p) => (
                <li key={p.slug}>
                  <Link href={`/${loc}/products/${p.slug}/`}>{p.name} →</Link>
                </li>
              ))}
            </ul>
          </article>
        ))}

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
          <h2>{c.ctaTitle}</h2>
          <p>{c.ctaBody}</p>
          <div className="gd-cta-row">
            <Link href={`/${loc}/contact/`} className="btn primary">{c.ctaQuote}</Link>
            <Link href={`/${loc}/dealers/`} className="btn ghost">{c.ctaDealers}</Link>
          </div>
        </section>
      </div>
    </section>
  );
}
