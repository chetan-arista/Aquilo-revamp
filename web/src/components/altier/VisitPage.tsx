"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import PageHero from "./PageHero";
import Centres from "./Centres";
import { centres, collections, contact, m } from "@/data/site";

const INTERESTS = ["Architect or interior designer", "Homeowner", "Developer", "Dealer"];

/** Visit: experience centres and a private appointment request (opens the visitor's mail app). */
export default function VisitPage() {
  const root = useRef<HTMLDivElement>(null);
  const [sent, setSent] = useState(false);
  useGSAP(() => {
    const q = gsap.utils.selector(root);
    gsap.from(q(".vf-field"), {
      y: 30, autoAlpha: 0, duration: 1, stagger: 0.06, ease: "expo.out",
      scrollTrigger: { trigger: q(".vf-form")[0], start: "top 80%" },
    });
  }, { scope: root });

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = ["name", "phone", "email", "interest", "centre", "collection", "message"]
      .map((k) => `${k[0].toUpperCase() + k.slice(1)}: ${f.get(k) ?? ""}`).join("\n");
    window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent("AQUILO Altier appointment request")}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  const field = "vf-field block w-full border-b border-bone/20 bg-transparent py-4 text-lg outline-none transition-colors placeholder:text-bone/30 focus:border-champagne";

  return (
    <div ref={root} className="bg-onyx text-bone">
      <Header />
      <main>
        <PageHero eyebrow="Experience Centres" title="Visit" line="See, touch and hear the water before it reaches your home." image={m("cat-dark-suite")} crumbs={[{ label: "Altier", href: "/" }, { label: "Visit" }]} />
        <Centres />

        <section id="appointment" className="grid gap-16 px-[var(--gutter)] py-[16vh] md:grid-cols-12">
          <div className="md:col-span-5">
            <p className="eyebrow mb-6 text-champagne">Private appointment</p>
            <h2 className="display text-[clamp(2.8rem,6vw,6rem)]">We would love to <em>welcome you</em></h2>
            <p className="mt-6 max-w-sm text-[15px] leading-relaxed text-bone/60">Tell us when and where. A specialist will prepare the collections you are interested in and walk you through every finish under real water.</p>
            <dl className="mt-12 space-y-6 text-sm">
              <div><dt className="eyebrow mb-2 text-bone/45">Phone</dt><dd><a href={contact.phoneHref} className="link-u font-display text-3xl">{contact.phone}</a></dd></div>
              <div><dt className="eyebrow mb-2 text-bone/45">Email</dt><dd><a href={`mailto:${contact.email}`} className="link-u font-display text-3xl">{contact.email}</a></dd></div>
            </dl>
          </div>
          <form onSubmit={onSubmit} className="vf-form grid gap-6 md:col-span-6 md:col-start-7 md:grid-cols-2">
            <input name="name" required placeholder="Your name" autoComplete="name" className={field} />
            <input name="phone" required placeholder="Phone" type="tel" autoComplete="tel" className={field} />
            <input name="email" placeholder="Email" type="email" autoComplete="email" className={`${field} md:col-span-2`} />
            <select name="interest" defaultValue="" className={`${field} [&>option]:bg-graphite`}>
              <option value="" disabled>I am a</option>
              {INTERESTS.map((i) => <option key={i}>{i}</option>)}
            </select>
            <select name="centre" defaultValue="" className={`${field} [&>option]:bg-graphite`}>
              <option value="" disabled>Experience centre</option>
              {centres.map((c) => <option key={c.city}>{c.city}</option>)}
            </select>
            <select name="collection" defaultValue="" className={`${field} md:col-span-2 [&>option]:bg-graphite`}>
              <option value="" disabled>Collection of interest</option>
              {collections.map((c) => <option key={c.slug}>{c.name}</option>)}
            </select>
            <textarea name="message" rows={3} placeholder="Anything we should prepare?" className={`${field} resize-none md:col-span-2`} />
            <div className="vf-field flex items-center gap-6 md:col-span-2">
              <button type="submit" data-magnetic className="eyebrow rounded-full bg-bone px-8 py-4 text-onyx transition-colors duration-500 hover:bg-champagne">Request appointment</button>
              {sent && <p className="text-sm text-bone/60" aria-live="polite">Your mail app has opened with the request. Send it and we will reply within a day.</p>}
            </div>
          </form>
        </section>
      </main>
      <Footer />
    </div>
  );
}
