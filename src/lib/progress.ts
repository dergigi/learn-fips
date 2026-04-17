/**
 * Client-side learning progress for Learn FIPS.
 *
 * All state lives in a single versioned localStorage key (`fips-progress`).
 * A node is:
 *   - visited  when the user has opened the lesson page at least once;
 *   - passed   when the user has submitted that lesson's quiz with all
 *              answers correct;
 *   - completed when it is visited AND (either has no quiz, or is passed).
 *
 * This file must stay safe to import from both browser scripts (script
 * tags inside .astro files) and React components.
 */

export interface QuizAttempt {
  /** 0-based answer index per question, in order. */
  answers: number[];
  /** Number of correct answers. */
  score: number;
  /** Total number of questions. */
  total: number;
  /** Unix ms when the attempt was submitted. */
  ts: number;
}

export interface Progress {
  version: 1;
  /** lesson slug -> unix ms of the first visit. */
  visited: Record<string, number>;
  /** lesson slug -> last quiz attempt. */
  quizzes: Record<string, QuizAttempt>;
}

const STORAGE_KEY = "fips-progress";
const LEGACY_VISITED_KEY = "fips-visited";

/** Slugs whose lesson has a quiz. Kept in sync with src/data/quizzes.ts. */
export const LESSONS_WITH_QUIZ = new Set<string>([
  "1-what-is-fips",
  "2-identity",
  "3-protocol-stack",
  "4-transports",
  "5-spanning-tree",
  "6-encryption",
  "7-putting-it-together",
  "8-recovery",
  "9-wire-formats",
  "10-mmp",
  "11-threat-model",
  "12-ipv6-gateway",
]);

function empty(): Progress {
  return { version: 1, visited: {}, quizzes: {} };
}

function migrateLegacyVisited(
  legacy: unknown,
  lessonSlugByNumber: Map<number, string>
): Record<string, number> {
  if (!Array.isArray(legacy)) return {};
  const out: Record<string, number> = {};
  const now = Date.now();
  for (const entry of legacy) {
    if (typeof entry === "number") {
      const slug = lessonSlugByNumber.get(entry);
      if (slug) out[slug] = now;
    }
  }
  return out;
}

/**
 * Read progress from storage. Safe to call in SSR (returns an empty state
 * if `localStorage` is unavailable). Performs a one-shot migration from
 * the legacy `fips-visited` array.
 */
export function loadProgress(lessonSlugByNumber?: Map<number, string>): Progress {
  if (typeof localStorage === "undefined") return empty();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Progress>;
      if (parsed && parsed.version === 1) {
        return {
          version: 1,
          visited: parsed.visited ?? {},
          quizzes: parsed.quizzes ?? {},
        };
      }
    }
    // Migration path: pull old fips-visited array into the new shape.
    const legacyRaw = localStorage.getItem(LEGACY_VISITED_KEY);
    if (legacyRaw && lessonSlugByNumber) {
      const state = empty();
      state.visited = migrateLegacyVisited(JSON.parse(legacyRaw), lessonSlugByNumber);
      saveProgress(state);
      return state;
    }
  } catch {
    // Bad JSON: fall through to an empty state.
  }
  return empty();
}

export function saveProgress(p: Progress): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
  } catch {
    // Quota or private-mode: silently ignore.
  }
}

export function markVisited(slug: string): void {
  const p = loadProgress();
  if (!p.visited[slug]) {
    p.visited[slug] = Date.now();
    saveProgress(p);
  }
}

export function recordQuizAttempt(slug: string, attempt: QuizAttempt): void {
  const p = loadProgress();
  p.quizzes[slug] = attempt;
  saveProgress(p);
}

export function resetProgress(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_VISITED_KEY);
  } catch {
    // Ignore.
  }
}

export function isVisited(p: Progress, slug: string): boolean {
  return Boolean(p.visited[slug]);
}

export function isPassed(p: Progress, slug: string): boolean {
  const q = p.quizzes[slug];
  return Boolean(q && q.score === q.total && q.total > 0);
}

export function isCompleted(p: Progress, slug: string): boolean {
  if (!isVisited(p, slug)) return false;
  if (!LESSONS_WITH_QUIZ.has(slug)) return true;
  return isPassed(p, slug);
}

export function completionCounts(
  p: Progress,
  slugs: string[]
): { completed: number; visited: number; total: number } {
  let completed = 0;
  let visited = 0;
  for (const s of slugs) {
    if (isVisited(p, s)) visited++;
    if (isCompleted(p, s)) completed++;
  }
  return { completed, visited, total: slugs.length };
}
