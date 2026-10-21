import type { Collection } from "@/data/site";

/**
 * Reads a room photo's overall colour (in the browser, nothing is uploaded) and suggests the collections whose
 * finish suits it, with a reason a person can follow. Plain rules, no AI: warm or cool, light or dark, muted or
 * colourful (feature 2, rich/02-room-panorama-try-on.md; Phase B can add CLIP style matching on top).
 */
export type RoomStyle = {
  /** 0 = black, 1 = white. */
  lightness: number;
  /** -1 = cool (blue, grey green), +1 = warm (wood, beige, terracotta). */
  warmth: number;
  /** 0 = greys, 1 = strong colour. */
  colour: number;
  label: string;
  words: string[];
};

export type Suggestion = { collection: Collection; score: number; reason: string };

/** Average colour of the room. A panorama's top and bottom rows (ceiling, floor at the poles) count less. */
export async function analyseRoom(src: string, panorama: boolean): Promise<RoomStyle> {
  const bmp = await createImageBitmap(await (await fetch(src)).blob(), { resizeWidth: 160, resizeHeight: panorama ? 80 : 120, resizeQuality: "low" });
  const canvas = document.createElement("canvas");
  canvas.width = bmp.width;
  canvas.height = bmp.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bmp, 0, 0);
  bmp.close();
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let r = 0, g = 0, b = 0, sat = 0, wsum = 0;
  for (let y = 0; y < height; y++) {
    // Rows near the poles of a panorama are stretched: weight by cos(latitude).
    const w = panorama ? Math.cos(((y + 0.5) / height - 0.5) * Math.PI) : 1;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4, R = data[i] / 255, G = data[i + 1] / 255, B = data[i + 2] / 255;
      const max = Math.max(R, G, B), min = Math.min(R, G, B);
      r += R * w; g += G * w; b += B * w; sat += (max - min) * w; wsum += w;
    }
  }
  r /= wsum; g /= wsum; b /= wsum; sat /= wsum;
  const lightness = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const warmth = Math.max(-1, Math.min(1, ((r - b) / Math.max(lightness, 0.05)) * 2.2));
  const colour = Math.min(1, sat * 3);
  const words = [
    lightness > 0.58 ? "light" : lightness < 0.33 ? "dark" : "mid toned",
    warmth > 0.18 ? "warm" : warmth < -0.08 ? "cool" : "neutral",
    colour < 0.35 ? "muted" : "rich",
  ];
  const label = `${words[0][0].toUpperCase()}${words[0].slice(1)}, ${words[1]} and ${words[2]}`;
  return { lightness, warmth, colour, label, words };
}

// Each finish's character: how warm it reads, and how much it stands out from (contrast) or blends with the room.
const FINISH_TRAITS: Record<string, { warm: number; light: number; note: string }> = {
  "Brushed Rose Gold": { warm: 0.7, light: 0.65, note: "soft rose metal that glows against cream stone and pale wood" },
  "Champagne Gold": { warm: 0.55, light: 0.7, note: "a quiet gold that warms a pale room without shouting" },
  "Gold": { warm: 0.8, light: 0.6, note: "polished gold, a jewel against dark or deep coloured walls" },
  "Brushed Brass": { warm: 0.75, light: 0.55, note: "brushed brass that sits naturally with wood and warm stone" },
  "Oil Rubbed Copper": { warm: 0.9, light: 0.35, note: "deep copper that belongs with dark wood and moody tones" },
  "Steel Grey": { warm: -0.4, light: 0.55, note: "cool steel grey, calm and modern against white and grey marble" },
  "Black Matt and Rose Gold": { warm: 0.1, light: 0.1, note: "matt black lines that give a light room crisp contrast" },
};

/** The best collections for a room, most suitable first. */
export function suggestCollections(style: RoomStyle, collections: Collection[], count = 3): Suggestion[] {
  return collections
    .map((collection) => {
      const t = FINISH_TRAITS[collection.finish] ?? { warm: 0, light: 0.5, note: collection.line };
      // Warm finishes for warm rooms, cool for cool; plus contrast: light rooms take a darker accent well and
      // dark rooms a brighter one.
      const harmony = 1 - Math.abs(t.warm - style.warmth) / 2;
      const contrast = Math.abs(t.light - style.lightness);
      const score = harmony * 0.65 + contrast * 0.35 + (style.colour > 0.5 && t.warm > 0.5 ? 0.05 : 0);
      const roomWords = `${style.words[0]} ${style.words[1]}`;
      return { collection, score, reason: `Your room is ${roomWords}: ${t.note}.` };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, count);
}
