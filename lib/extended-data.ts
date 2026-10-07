import type {CityKey} from './pulse-data';
import dataset from '../data/verified-city-profile.json';

export type ExtendedSection = 'wages' | 'vacancies' | 'unemployment' | 'demography';

export type ExtendedFact = {
  cityKey: CityKey;
  id: string;
  section: ExtendedSection;
  label: string;
  value: number | null;
  interval: [number, number] | null;
  decimals: number;
  unit: string;
  period: string;
  geo: string;
  geoLevel: 'city' | 'federal_subject' | 'region' | 'municipal';
  source: string;
  url: string;
  published: string | null;
  dateChecked: string;
  scope: string;
  description: string;
  basis: 'gross' | 'net' | 'unspecified' | 'not_applicable';
  aggregation: string;
  locator: string;
  evidenceId: string;
  change: number | null;
  changeLabel: string | null;
  approximate?: boolean;
};

export const profileCheckedAt = dataset.checkedAt;
export const extendedFacts = dataset.facts as ExtendedFact[];
export const extendedFactsByCity: Record<CityKey, ExtendedFact[]> = {
  spb: extendedFacts.filter(fact => fact.cityKey === 'spb'),
  krd: extendedFacts.filter(fact => fact.cityKey === 'krd'),
};

export function hasConfirmedValue(fact: ExtendedFact): boolean {
  const hasInterval = fact.interval !== null
    && fact.interval.length === 2
    && fact.interval.every(value => Number.isFinite(value))
    && fact.interval[0] <= fact.interval[1];
  if (fact.id === 'actualModalInterval') {
    return hasInterval && fact.interval![0] < fact.interval![1]
      && /density/i.test(fact.aggregation);
  }
  return (fact.value !== null && Number.isFinite(fact.value)) || hasInterval;
}

export function factsForCity(city: CityKey): ExtendedFact[] {
  return extendedFactsByCity[city].filter(hasConfirmedValue);
}

export function factsForSection(city: CityKey, section: ExtendedSection): ExtendedFact[] {
  return factsForCity(city).filter(fact => fact.section === section);
}

export function findExtendedFact(city: CityKey, id: string): ExtendedFact | undefined {
  return factsForCity(city).find(fact => fact.id === id);
}

export function groupFactsBySection(city: CityKey): Record<ExtendedSection, ExtendedFact[]> {
  return {
    wages: factsForSection(city, 'wages'),
    vacancies: factsForSection(city, 'vacancies'),
    unemployment: factsForSection(city, 'unemployment'),
    demography: factsForSection(city, 'demography'),
  };
}

export function formatExtendedNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatExtendedValue(fact: ExtendedFact): string {
  if (!hasConfirmedValue(fact)) return 'Нет подтверждённого значения';
  if (fact.interval !== null && (fact.id === 'actualModalInterval' || fact.value === null)) {
    return fact.interval.map(value => formatExtendedNumber(value, fact.decimals)).join('–');
  }
  return `${fact.approximate?'≈ ':''}${formatExtendedNumber(fact.value!, fact.decimals)}`;
}

export function formatExtendedDate(value: string): string {
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const dotted = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  const parts = iso
    ? [Number(iso[1]), Number(iso[2]), Number(iso[3])]
    : dotted ? [Number(dotted[3]), Number(dotted[2]), Number(dotted[1])] : null;
  if (!parts) return value;
  const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(date).replace(/\.$/, '');
}

export function isAgeGroupFact(fact: ExtendedFact): boolean {
  return fact.section === 'demography'
    && (/^age(?:Group|Under|Working|Over|_|\d)/.test(fact.id)
      || /age[_-]?(group|band)/i.test(fact.aggregation));
}
