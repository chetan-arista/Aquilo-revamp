import Link from "@/components/transition/TransitionLink";
import Logo from "./Logo";
import { centres, collections, contact, presence } from "@/data/site";

export default function Footer() {
  return (
    <footer className="relative overflow-clip bg-onyx px-[var(--gutter)] pb-8 pt-28 text-bone">
      <div className="grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow mb-6 text-champagne">Private consultation</p>
          <a href={contact.phoneHref} className="display block text-4xl md:text-6xl">{contact.phone}</a>
          <a href={`mailto:${contact.email}`} className="link-u mt-4 inline-block text-lg text-bone/80">{contact.email}</a>
          <Link href="/visit#appointment" data-magnetic className="eyebrow mt-10 inline-flex items-center gap-3 rounded-full border border-bone/25 px-6 py-4 transition-colors duration-500 hover:border-champagne hover:text-champagne">
            Book an appointment
          </Link>
        </div>
        <div className="md:col-span-4">
          <p className="eyebrow mb-6 text-bone/50">Experience Centres</p>
          <ul className="space-y-5">
            {centres.map((c) => (
              <li key={c.city}>
                <p className="font-display text-2xl">{c.city}</p>
                <p className="mt-1 max-w-xs text-sm leading-relaxed text-bone/55">{c.address}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="eyebrow mb-6 text-bone/50">Collections</p>
          <ul className="space-y-1.5">
            {collections.map((c) => (
              <li key={c.slug}>
                <Link href={`/collections/${c.slug}`} className="link-u font-display text-2xl">{c.name}</Link>
              </li>
            ))}
          </ul>
          <p className="eyebrow mb-3 mt-10 text-bone/50">Presence</p>
          <p className="text-sm leading-relaxed text-bone/55">{presence.join(", ")}</p>
        </div>
      </div>

      <div className="mt-24 flex items-end gap-6">
        <Logo className="w-full text-bone/[0.06]" />
      </div>
      <p className="eyebrow mt-4 text-right text-[10px] tracking-[0.6em] text-bone/30">Altier</p>

      <div className="mt-6 flex flex-col justify-between gap-3 text-xs text-bone/45 md:flex-row">
        <p>© AQUILO, since 2010. Head office: {contact.headOffice}.</p>
        <p>Designed around water.</p>
      </div>
    </footer>
  );
}
