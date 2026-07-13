import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import Hero from '@/components/sections/Hero';
import BrandIntro from '@/components/layout/BrandIntro';
import Products from '@/components/sections/Products';
import Manifesto from '@/components/sections/Manifesto';
// import Certifications from '@/components/sections/Certifications';  // replaced by InField (2026-05)
import InField from '@/components/sections/InField';
import ContactCTA from '@/components/sections/ContactCTA';
import { CustomBlocksLayer } from '@/components/admin/CustomBlocks';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export default async function HomePage({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  const dict = getDictionary(locale);

  return (
    <div className="cb-page-root">
      {/* First-visit animated splash — once per session, skippable. */}
      <BrandIntro locale={locale} />
      <Hero locale={locale} dict={dict} />
      <Products locale={locale} dict={dict} products={getAllProducts()} />
      {/* ProductFilm band removed 2026-07 — the PK film now plays as the
       * FIRST hero slide (hero.slides[0].video). Showcase (현장에서 증명됩니다)
       * removed 2026-07 too — its field photo moved to the About page's
       * CEO section as a wide cinematic band. */}
      <Manifesto dict={dict} />
      {/* Certifications block replaced by InField (2026-05) — the
       * homepage no longer duplicates what's already on /certifications
       * and /resources. InField surfaces a single field photo + the
       * industries / partners actually buying from NJ instead. */}
      <InField dict={dict} />
      {/* /clients + /news sections removed 2026-05 (component files deleted). */}
      <ContactCTA locale={locale} dict={dict} />
      <CustomBlocksLayer blocks={dict.customBlocks} route="home" />
    </div>
  );
}
