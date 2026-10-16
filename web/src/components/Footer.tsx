import Link from "@/components/transition/TransitionLink";
import Logo from "./Logo";
import { businesses, centres, contact, presence } from "@/data/site";

export default function Footer({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const dark = tone === "dark";
  return (
    <footer className={`relative overflow-clip px-[var(--gutter)] pb-8 pt-24 ${dark ? "bg-ink text-bone" : "bg-stone text-ink"}`}>
      <div className="grid gap-14 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="eyebrow mb-6 opacity-50">Need an expert?</p>
          <a href={contact.phoneHref} className="display block text-4xl md:text-6xl">{contact.phone}</a>
          <a href={`mailto:${contact.email}`} className="link-u mt-4 inline-block text-lg opacity-80">{contact.email}</a>
        </div>
        <div className="md:col-span-4">
          <p className="eyebrow mb-6 opacity-50">Experience Centres</p>
          <ul className="space-y-5">
            {centres.map((c) => (
              <li key={c.city}>
                <p className="font-display text-2xl">{c.city}</p>
                <p className="mt-1 max-w-xs text-sm leading-relaxed opacity-60">{c.address}</p>
              </li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-3">
          <p className="eyebrow mb-6 opacity-50">The AQUILO World</p>
          <ul className="space-y-2">
            {businesses.map((b) => (
              <li key={b.key}>
                <Link href={b.href} className="link-u font-display text-2xl">AQUILO {b.name}</Link>
                <span className="eyebrow ml-2 text-[9px] opacity-40">{b.tier}</span>
              </li>
            ))}
          </ul>
          <p className="eyebrow mb-3 mt-10 opacity-50">Presence</p>
          <p className="text-sm leading-relaxed opacity-60">{presence.join(" · ")}</p>
        </div>
      </div>

      <Logo className={`mt-24 w-full ${dark ? "text-bone/[0.07]" : "text-ink/[0.08]"}`} />

      <div className="mt-6 flex flex-col justify-between gap-3 text-xs opacity-50 md:flex-row">
        <p>© {2010}–present AQUILO. Head office: {contact.headOffice}.</p>
        <p>Designed for water.</p>
      </div>
    </footer>
  );
}
