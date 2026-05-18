import { notFound } from 'next/navigation';
import { getDictionary, isLocale, type Locale } from '@/lib/i18n';
import { getAllProducts } from '@/lib/products';
import Hero from '@/components/sections/Hero';
import Products from '@/components/sections/Products';
import Showcase from '@/components/sections/Showcase';
import Manifesto from '@/components/sections/Manifesto';
import Certifications from '@/components/sections/Certifications';
import Clients from '@/components/sections/Clients';
import Insights from '@/components/sections/Insights';
import ContactCTA from '@/components/sections/ContactCTA';

type Props = { params: Promise<{ locale: string }> | { locale: string } };

export default async function HomePage({ params }: Props) {
  const resolved = await params;
  if (!isLocale(resolved.locale)) notFound();
  const locale = resolved.locale as Locale;
  const dict = getDictionary(locale);

  return (
    <>
      <Hero locale={locale} dict={dict} />
      <Products locale={locale} dict={dict} products={getAllProducts()} />
      <Showcase dict={dict} />
      <Manifesto dict={dict} />
      <Certifications dict={dict} />
      <Clients dict={dict} />
      <Insights locale={locale} dict={dict} />
      <ContactCTA locale={locale} dict={dict} />
    </>
  );
}
