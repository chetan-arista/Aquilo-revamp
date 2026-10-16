import catalog from "./catalog.json";
import type { MenuGroup } from "@/components/Header";

const LEGACY = "https://www.aquilo.in";
export const m = (name: string) => `/media/${name}.webp`;

export const contact = {
  phone: "+91 93256 38368",
  phoneHref: "tel:+919325638368",
  landline: "+91 712 272 1196",
  email: "info@aquilo.in",
  headOffice: "2nd Floor, Radhakrishna Mangal Karyalaya, Naalsaheb Chowk, Hansapuri, Nagpur 440018",
};

export const centres = [
  { city: "New Delhi", address: "Plot No-8, GF, Country Club Dr, Gadaipur, Ghitorni, New Delhi 110030", image: m("showroom-1") },
  { city: "Mumbai", address: "31 P, Laxmi Industrial Estate, Suresh Nagar, Andheri West, Mumbai 400053", image: m("showroom-2") },
  { city: "Nagpur", address: "Himalay Harmony, W High Ct Rd, beside Neeri Gate, Laxminagar, Nagpur 440010", image: m("showroom-3") },
];

export const presence = [
  "Maharashtra", "Madhya Pradesh", "Rajasthan", "Delhi NCR", "Punjab", "Haryana", "Telangana",
  "Karnataka", "Chhattisgarh", "West Bengal", "Mizoram", "Andhra Pradesh",
];

/** The three AQUILO businesses — Luxury → Extra Luxury → Ultra Luxury. */
export const businesses = [
  {
    key: "sanitaryware",
    index: "01",
    name: "Sanitaryware",
    tier: "Luxury",
    href: "/sanitaryware",
    intro:
      "The house's founding craft. Designer faucets, rain and mist showers, sculpted basins and wellness — composed as one complete bath suite since 2010.",
    image: m("rain-gold-1"),
    video: "rain-gold" as string | null,
    tone: { bg: "#e9e3d9", fg: "#12110f", accent: "#9c7a4d" },
  },
  {
    key: "exclusive",
    index: "02",
    name: "Exclusive",
    tier: "Extra Luxury",
    href: "/exclusive",
    intro:
      "A rarer register. Limited pieces, precious finishes and a quieter, more sophisticated language of material — reserved for the few.",
    image: m("basin-dark-rosegold"),
    video: "basin-rosegold" as string | null,
    tone: { bg: "#2b231d", fg: "#ede8df", accent: "#c8a97e" },
  },
  {
    key: "altier",
    index: "03",
    name: "Altier",
    tier: "Ultra Luxury",
    href: "/altier",
    intro:
      "The summit of the house. Water rendered as architecture — an ultra-luxury world of shadow, steel and light, revealed in motion.",
    image: m("spray-dark-1"),
    video: "spray-dark" as string | null,
    tone: { bg: "#0a0a0a", fg: "#ede8df", accent: "#9a9a98" },
  },
] as const;

/** Curated collection stories for the Sanitaryware homepage (collections, not categories). */
export const collections = [
  {
    name: "Moonlight",
    line: "Soft geometry, six finishes, one quiet glow.",
    finishes: ["Chrome", "Black Matt", "Brush Gold", "Rose Gold", "Brushed Rose Gold", "Porcelain White"],
    pieces: 67,
    image: m("p-moonlight-rosegold"),
    tone: "#e8dcd3",
    href: `${LEGACY}/category/collections/colour-finish/moonlight-brushed-rose-gold-series/`,
  },
  {
    name: "Morandi",
    line: "Named for the painter of stillness. Pure cylinders, perfectly balanced.",
    finishes: ["Chrome", "Gold", "Rose Gold", "Black Matt"],
    pieces: 53,
    image: m("p-morandi-rosegold"),
    tone: "#e6ddd2",
    href: `${LEGACY}/category/collections/colour-finish/morandi-rose-gold-series/`,
  },
  {
    name: "Liberty",
    line: "Classical proportions, re-cut for the modern bath.",
    finishes: ["Chrome", "Oil-Rubbed Bronze", "Brush Brass", "Brush Nickel"],
    pieces: 48,
    image: m("p-liberty-chrome"),
    tone: "#e3e2de",
    href: `${LEGACY}/category/collections/chrome-finish/liberty-chrome-series/`,
  },
  {
    name: "Silk Rain",
    line: "A blade of water, falling like silk.",
    finishes: ["Chrome", "Steel Grey"],
    pieces: 25,
    image: m("p-silkrain-steel"),
    tone: "#dfe0df",
    href: `${LEGACY}/category/collections/colour-finish/silk-rain-steel-grey-series/`,
  },
  {
    name: "Champagne Gold",
    line: "Architectural squares in a warm, celebratory gold.",
    finishes: ["Champagne Gold"],
    pieces: 13,
    image: m("p-champagne-gold"),
    tone: "#ebe2d2",
    href: `${LEGACY}/category/collections/colour-finish/champagne-gold/`,
  },
  {
    name: "Spring",
    line: "Light, upright, effortless — the everyday made elegant.",
    finishes: ["Chrome", "Brush Gold"],
    pieces: 14,
    image: m("p-spring-chrome"),
    tone: "#e4e3e0",
    href: `${LEGACY}/category/collections/chrome-finish/spring-series/`,
  },
  {
    name: "Lute",
    line: "Curves drawn like an instrument, tuned to the hand.",
    finishes: ["Chrome"],
    pieces: 8,
    image: m("p-lute-chrome"),
    tone: "#e2e1dd",
    href: `${LEGACY}/category/collections/chrome-finish/lute-collections/`,
  },
  {
    name: "PEI Gold",
    line: "Faceted, ornamental, unapologetically gold.",
    finishes: ["Gold"],
    pieces: 20,
    image: m("p-pei-gold"),
    tone: "#ece3d1",
    href: `${LEGACY}/category/collections/colour-finish/pei-gold-series/`,
  },
] as const;

export const technologies = [
  { value: "38°", unit: "C", title: "Thermostatic safety", body: "VERNET thermostatic valve holds a constant temperature; the 38℃ safety button and anti-scald shut-off protect every shower." },
  { value: "20", unit: "%", title: "Air-in rain", body: "Air is drawn into every droplet — a fuller, softer rain that uses a fifth less water." },
  { value: "0", unit: "Pb", title: "Lead free", body: "Faucets pass cUPC guidelines; kitchen faucets are certified safe for drinking water." },
  { value: "1", unit: "touch", title: "Smart touch kitchen", body: "Electronic touch control — one touch to open, one touch to close." },
] as const;

/**
 * Hero product model for the Sanitaryware 3D scene. Set to a GLB in /public/models (e.g. an image-to-3D
 * reconstruction of a real AQUILO mixer) to replace the procedural mixer; null keeps the procedural one.
 */
export const heroModel: string | null = null;

export const finishes = [
  { name: "Polished Chrome", color: "#e9eaec", roughness: 0.06, metalness: 1 },
  { name: "Luxury Gold", color: "#d9b36c", roughness: 0.16, metalness: 1 },
  { name: "Rose Gold", color: "#dca48c", roughness: 0.18, metalness: 1 },
  { name: "Matt Black", color: "#1d1c1b", roughness: 0.55, metalness: 0.5 },
  { name: "Brushed Nickel", color: "#b9b6ae", roughness: 0.32, metalness: 1 },
] as const;

// ——— Navigation hierarchy (links point to the live catalogue until inner pages are built) ———

type CatalogItem = { name: string; link: string; count: number };
const cat = catalog as {
  collections: { finish: string; items: CatalogItem[] }[];
  products: { group: string; items: CatalogItem[] }[];
};

const productImages: Record<string, string> = {
  Faucets: m("hero-basin"),
  Showers: m("rain-gold-2"),
  Basins: m("basin-concrete"),
  Toilets: m("showroom-3"),
  Wellness: m("spa-sunset"),
  "Controllers & Diverters": m("ceiling-shower"),
};

const productSlugs: Record<string, string> = {
  Faucets: "faucets",
  Showers: "showers",
  Basins: "table-top-basins",
  Toilets: "toilets",
  Wellness: "bathtub-jaccuzi",
  "Controllers & Diverters": "controllers-and-diverters",
};

export const sanitarywareMenu: MenuGroup[] = [
  {
    title: "Collections",
    links: collections.map((c) => ({ label: c.name, href: c.href, meta: `${c.finishes.length} finish${c.finishes.length > 1 ? "es" : ""}`, image: c.image })),
  },
  {
    title: "Products",
    links: cat.products.map((g) => ({
      label: g.group,
      href: `${LEGACY}/category/${productSlugs[g.group] ?? ""}/`,
      meta: String(g.items.reduce((a, i) => a + i.count, 0)),
      image: productImages[g.group],
    })),
  },
  {
    title: "The House",
    links: [
      { label: "Brand Story", href: `${LEGACY}/brand-story/`, image: m("columns") },
      { label: "Innovative Technologies", href: "/sanitaryware#technology", image: m("spray-dark-2") },
      { label: "Craftsmanship", href: "/sanitaryware#craft", image: m("craft-casting") },
      { label: "Product Care", href: `${LEGACY}/product-care-guidelines/` },
      { label: "Catalogue", href: `${LEGACY}/catalog/` },
      { label: "Journal", href: `${LEGACY}/blog/` },
    ],
  },
  {
    title: "Visit",
    links: [
      ...centres.map((c) => ({ label: c.city, href: "/sanitaryware#visit", meta: "Experience Centre", image: c.image })),
      { label: "Contact", href: `${LEGACY}/contact-us/` },
      { label: "Customer Care", href: `${LEGACY}/customer-care/` },
    ],
  },
  {
    title: "The AQUILO World",
    links: businesses.map((b) => ({ label: `AQUILO ${b.name}`, href: b.href, meta: b.tier, image: b.image })),
  },
];

/** Full category hierarchy, used for the footer index. */
export const catalogIndex = cat;

export const gatewayMenu: MenuGroup[] = [
  { title: "The AQUILO World", links: businesses.map((b) => ({ label: b.name, href: b.href, meta: b.tier, image: b.image })) },
  {
    title: "The House",
    links: [
      { label: "Brand Story", href: `${LEGACY}/brand-story/`, image: m("columns") },
      { label: "Experience Centres", href: "/sanitaryware#visit", image: m("showroom-1") },
      { label: "Contact", href: `${LEGACY}/contact-us/` },
    ],
  },
];
