import catalog from "./altier-collections.json";
import type { MenuGroup } from "@/components/Header";

const LEGACY = "https://www.aquilo.in";
export const m = (name: string) => `/media/${name}.webp`;

export const brand = {
  name: "AQUILO Altier",
  tier: "Ultra Luxury",
  line: "Water, rendered as architecture.",
};

export const contact = {
  phone: "+91 93256 38368",
  phoneHref: "tel:+919325638368",
  landline: "+91 712 272 1196",
  email: "info@aquilo.in",
  headOffice: "2nd Floor, Radhakrishna Mangal Karyalaya, Naalsaheb Chowk, Hansapuri, Nagpur 440018",
};

export const centres = [
  { city: "New Delhi", address: "Plot No 8, Ground Floor, Country Club Drive, Gadaipur, Ghitorni, New Delhi 110030", image: m("showroom-1") },
  { city: "Mumbai", address: "31 P, Laxmi Industrial Estate, Suresh Nagar, Andheri West, Mumbai 400053", image: m("showroom-2") },
  { city: "Nagpur", address: "Himalay Harmony, West High Court Road, beside Neeri Gate, Laxminagar, Nagpur 440010", image: m("showroom-3") },
];

export const presence = [
  "Maharashtra", "Madhya Pradesh", "Rajasthan", "Delhi NCR", "Punjab", "Haryana", "Telangana",
  "Karnataka", "Chhattisgarh", "West Bengal", "Mizoram", "Andhra Pradesh",
];

export type Piece = { slug: string; type: string; code: string; size: string; area: string; image: string; w: number; h: number; source: string };
export type Collection = {
  slug: string; name: string; finish: string; line: string; story: string; tone: string; accent: string;
  count: number; hero: string | null; pieces: Piece[]; source: string; paper: string;
};

/** Warm paper tones for the collections on beige pages (the dark `tone` is used on black ones). */
const PAPER: Record<string, string> = {
  moonlight: "#e8dcd3", morandi: "#e6ddd2", "champagne-gold": "#ebe2d2", pei: "#ece3d1",
  "silk-rain": "#dfe0df", liberty: "#e6dfd2", copper: "#e8dacd",
};

/** The Altier collections: the most luxurious finishes of the AQUILO range, each piece cut out of its studio background. */
export const collections = (catalog as Omit<Collection, "paper">[]).map((c) => ({ ...c, paper: PAPER[c.slug] ?? "#e9e3d9" })) as Collection[];
export const collectionBySlug = (slug: string) => collections.find((c) => c.slug === slug);

export const technologies = [
  { value: "38", unit: "°C", title: "Thermostatic safety", body: "A VERNET thermostatic valve holds the temperature you choose. The 38°C safety button and anti scald shut off protect every shower." },
  { value: "20", unit: "%", title: "Air in rain", body: "Air is drawn into every droplet for a fuller, softer rain that uses a fifth less water." },
  { value: "0", unit: "Pb", title: "Lead free", body: "Faucets meet cUPC guidelines, and kitchen faucets are certified safe for drinking water." },
  { value: "5", unit: "modes", title: "Ceiling showers", body: "Rain, rain curtain, spray, mist and waterfall, concealed in the ceiling and governed by one thermostat." },
] as const;

/** Hero product model for the Tap Studio. A GLB in /public/models replaces the procedural mixer; null keeps it. */
export const heroModel: string | null = null;

export const finishes = [
  { name: "Champagne Gold", color: "#d6b87e", roughness: 0.2, metalness: 1 },
  { name: "Brushed Rose Gold", color: "#d8a28a", roughness: 0.3, metalness: 1 },
  { name: "Matt Black", color: "#1b1a19", roughness: 0.5, metalness: 0.55 },
  { name: "Steel Grey", color: "#8e9296", roughness: 0.28, metalness: 1 },
  { name: "Polished Chrome", color: "#e9eaec", roughness: 0.06, metalness: 1 },
] as const;

/** The finish line up from the catalogue, left to right as photographed. */
export const finishLine = [
  { name: "Polished Chrome", collection: "silk-rain", x: 20, y: 78 },
  { name: "Gold", collection: "pei", x: 25.5, y: 67 },
  { name: "Matt Black", collection: "morandi", x: 36.5, y: 61 },
  { name: "Rose Gold", collection: "moonlight", x: 49.5, y: 48 },
  { name: "Copper", collection: "copper", x: 62, y: 36 },
  { name: "Gun Metal", collection: "silk-rain", x: 74.5, y: 25 },
];

export const craftSteps = [
  { n: "01", t: "Brass ingot", d: "High standard brass, chosen for strength and longevity.", img: m("craft-ingot") },
  { n: "02", t: "Sand core", d: "Precise sand cores define every internal waterway.", img: m("craft-core") },
  { n: "03", t: "Casting", d: "Pressure, speed and temperature, precisely controlled.", img: m("craft-casting") },
  { n: "04", t: "Machining", d: "CNC precision, then the human eye.", img: m("craft-machining") },
  { n: "05", t: "Polishing", d: "Robotic finesse meets the craftsman's hand.", img: m("craft-polishing") },
  { n: "06", t: "Plating", d: "Automated electroplating for an enduring glow.", img: m("craft-plating") },
  { n: "07", t: "Assembly", d: "Inspected, tested and sealed. Nothing left unturned.", img: m("craft-assembly") },
];

export const showerModes = [
  { key: "rain", word: "Rain", line: "Air filled droplets, full and soft.", img: m("cat-rain-gold-dark") },
  { key: "mist", word: "Mist", line: "A warm cloud that settles on the skin.", img: m("cat-mist-shower") },
  { key: "cascade", word: "Cascade", line: "A curtain of water, falling as one.", img: m("cat-cascade-shower") },
] as const;

export const spaces = [
  { key: "shower", name: "The Shower", line: "Ceiling rain, mist and cascade, under one thermostat.", image: m("cat-rain-column-gold"), href: "/#showers" },
  { key: "basin", name: "The Basin", line: "Sculpted mixers over stone, concrete and glass.", image: m("cat-gold-pour"), href: "/#tap" },
  { key: "bath", name: "The Bath", line: "Free standing tubs, steam and spa for slow rituals.", image: m("cat-blush-tub"), href: "/#wellness" },
] as const;

export const basins = [
  { name: "Free standing basin", finish: "Black and rose gold", image: m("basin-dark-rosegold") },
  { name: "Concrete vessel", finish: "Hand cast", image: m("basin-concrete") },
  { name: "Vessel basin", finish: "Gloss black ceramic", image: m("cat-black-vessel") },
];

// ——— Navigation ———

export const quickLinks = [
  { label: "Collections", href: "/collections" },
  { label: "Our World", href: "/world" },
  { label: "Visit", href: "/visit" },
];

export const menu: MenuGroup[] = [
  {
    title: "Collections",
    links: [
      ...collections.map((c) => ({ label: c.name, href: `/collections/${c.slug}`, meta: c.finish, image: c.hero ?? undefined })),
      { label: "All collections", href: "/collections", image: m("ceiling-shower") },
    ],
  },
  {
    title: "Experience",
    links: [
      { label: "The Rain", href: "/#rain", image: m("cat-rain-gold-dark") },
      { label: "The Tap Studio", href: "/#tap", image: m("cat-copper-wall-pour") },
      { label: "Finishes", href: "/#finishes", image: m("cat-finishes") },
      { label: "Showers", href: "/#showers", image: m("cat-rain-column-gold") },
      { label: "Wellness", href: "/#wellness", image: m("cat-jacuzzi-night") },
      { label: "Basins", href: "/#basins", image: m("basin-concrete") },
    ],
  },
  {
    title: "The House",
    links: [
      { label: "Our World", href: "/world", image: m("columns") },
      { label: "Craftsmanship", href: "/world#craft", image: m("craft-casting") },
      { label: "Technology", href: "/world#technology", image: m("cat-led-rain") },
      { label: "Product Care", href: `${LEGACY}/product-care-guidelines/` },
      { label: "Catalogue", href: `${LEGACY}/catalog/` },
    ],
  },
  {
    title: "Visit",
    links: [
      ...centres.map((c) => ({ label: c.city, href: "/visit", meta: "Experience Centre", image: c.image })),
      { label: "Private appointment", href: "/visit#appointment", image: m("cat-dark-suite") },
    ],
  },
];

/** Page names used by the page transition curtain. */
export function pageLabel(path: string): { eyebrow: string; title: string } {
  const [, a, b] = path.split("/");
  if (a === "collections" && b) return { eyebrow: "Collection", title: collectionBySlug(b)?.name ?? "Collection" };
  if (a === "collections") return { eyebrow: "AQUILO Altier", title: "Collections" };
  if (a === "world") return { eyebrow: "AQUILO Altier", title: "Our World" };
  if (a === "visit") return { eyebrow: "AQUILO Altier", title: "Visit" };
  return { eyebrow: "AQUILO", title: "Altier" };
}
