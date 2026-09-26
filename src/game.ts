import vocabulary from './vocab.json' with { type: 'json' };

export type Direction = 'NL_FR' | 'FR_NL';
export type ItemType = 'all' | 'woordje' | 'uitdrukking';
export type VocabularyItem = {
  id: string;
  contact: string;
  type: 'woordje' | 'uitdrukking';
  dutch: string;
  correct: string;
  alt: string[];
};
export type Question = {
  id: string;
  prompt: string;
  answer: string;
  options: string[];
};
export type Settings = {
  groupCount: 2 | 3;
  contact: string;
  itemType: ItemType;
  direction: Direction;
  questionCount: number;
  pigeons: boolean;
  sound: boolean;
};

export const vocab = vocabulary as Record<string, VocabularyItem[]>;
export const contacts = Object.keys(vocab).sort((a, b) => Number(a.replace('contact', '')) - Number(b.replace('contact', '')));

export function getPool(settings: Pick<Settings, 'contact' | 'itemType'>): VocabularyItem[] {
  const source = settings.contact === 'all' ? Object.values(vocab).flat() : (vocab[settings.contact] ?? []);
  return source.filter((item) => settings.itemType === 'all' || item.type === settings.itemType);
}

export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    [result[index], result[swap]] = [result[swap], result[index]];
  }
  return result;
}

export function makeQuestions(settings: Settings, random: () => number = Math.random): Question[] {
  const pool = getPool(settings);
  if (!Number.isInteger(settings.questionCount) || settings.questionCount < 1 || settings.questionCount > pool.length) {
    throw new Error(`Kies tussen 1 en ${pool.length} oefeningen.`);
  }
  const selected = shuffle(pool, random).slice(0, settings.questionCount);
  const translations = new Map<string, string>();
  for (const item of Object.values(vocab).flat()) {
    translations.set(item.correct.trim().toLocaleLowerCase('fr'), item.dutch);
  }

  return selected.map((item) => {
    const answer = settings.direction === 'NL_FR' ? item.correct : item.dutch;
    const prompt = settings.direction === 'NL_FR' ? item.dutch : item.correct;
    const alternatives = item.alt.map((value) =>
      settings.direction === 'NL_FR' ? value : (translations.get(value.trim().toLocaleLowerCase('fr')) ?? value)
    );
    const fallback = shuffle(pool, random).map((candidate) =>
      settings.direction === 'NL_FR' ? candidate.correct : candidate.dutch
    );
    const unique = new Set<string>([answer]);
    const wrong: string[] = [];
    for (const value of [...alternatives, ...fallback]) {
      const trimmed = value.trim();
      const key = trimmed.toLocaleLowerCase('nl');
      if (!trimmed || unique.has(key) || trimmed.toLocaleLowerCase('nl') === answer.toLocaleLowerCase('nl')) continue;
      unique.add(key);
      wrong.push(trimmed);
      if (wrong.length === 2) break;
    }
    if (wrong.length < 2) throw new Error('Er zijn te weinig verschillende antwoordmogelijkheden.');
    return { id: item.id, prompt, answer, options: [answer, ...wrong] };
  });
}

export function makeOrders(questions: readonly Question[], groupCount: 2 | 3, random: () => number = Math.random): string[][] {
  const ids = questions.map((question) => question.id);
  const orders: string[][] = [];
  for (let group = 0; group < groupCount; group++) {
    let order = shuffle(ids, random);
    if (ids.length >= groupCount) {
      let attempts = 0;
      while (orders.some((other) => other[0] === order[0]) && attempts++ < 30) order = shuffle(ids, random);
      if (orders.some((other) => other[0] === order[0])) {
        const available = order.findIndex((id) => orders.every((other) => other[0] !== id));
        if (available > 0) [order[0], order[available]] = [order[available], order[0]];
      }
    }
    orders.push(order);
  }
  return orders;
}

// Swap a future question forward when another group is currently seeing the same one.
// Each group still receives every selected question exactly once.
export function avoidCurrentDuplicate(order: string[], nextIndex: number, otherCurrentIds: readonly string[]): string[] {
  if (nextIndex >= order.length || !otherCurrentIds.includes(order[nextIndex])) return order;
  const alternative = order.findIndex((id, index) => index > nextIndex && !otherCurrentIds.includes(id));
  if (alternative < 0) return order;
  const adjusted = [...order];
  [adjusted[nextIndex], adjusted[alternative]] = [adjusted[alternative], adjusted[nextIndex]];
  return adjusted;
}
