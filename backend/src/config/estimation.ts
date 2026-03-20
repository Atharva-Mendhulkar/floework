export const EFFORT_BASELINE_HOURS: Record<string, number> = {
  S: 2,
  M: 5,
  L: 10,
};

export const HINT_MIN_SAMPLES = 5;
export const HINT_MIN_RATIO   = 1.4; // only hint if actual >= 1.4x estimate

const STOP_WORDS = new Set(['a','an','the','and','or','to','of','for','in','on','with','add','fix','update','create','implement']);

export function extractKeywords(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOP_WORDS.has(w));
}
