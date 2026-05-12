import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n';

type Props = { locale: Locale; dict: Dictionary };

export default function ContactCTA({ locale, dict }: Props) {
  const c = dict.cta;
  const co = dict.company;
  return (
    <section className="cta" id="contact" data-screen-label="08 CTA">
      <div className="wrap">
        <div className="eyebrow" style={{ marginBottom: 48, display: 'block' }}>
          {c.eyebrow}
        </div>
        <div className="cta-inner">
          <div className="left">
            <h2>
              {c.titleLine1}
              <br />
              <em>{c.titleLine2Em}</em>
              {c.titleLine2End}
            </h2>
            <p className="sub">{c.sub}</p>
            <div style={{ marginTop: 48 }}>
              <Link href={`/${locale}/contact`} className="btn btn-primary big-btn">
                {c.button} <span className="arr">→</span>
              </Link>
            </div>
          </div>
          <div className="right">
            <div className="contact">
              <div><span className="k">TEL</span><span className="v">{co.tel}</span></div>
              <div><span className="k">EMAIL</span><span className="v">{co.email}</span></div>
              <div><span className="k">HOURS</span><span className="v">{co.hours}</span></div>
              <div style={{ marginTop: 18 }}>
                <span className="k">ADDR</span>
                <span className="v">{co.addressShort}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
