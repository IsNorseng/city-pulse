import dataset from '../data/sector-wages.json';
import type {CityKey} from './pulse-data';

export type SectorWage = {
  section: string;
  name: string;
  shortName: string;
  value: number;
  locator: string;
};

export type SectorWagesDataset = Omit<typeof dataset, 'cityKey' | 'sectors'> & {
  cityKey: CityKey;
  sectors: SectorWage[];
};

export const sectorWageDatasets: SectorWagesDataset[] = [dataset as SectorWagesDataset];
const byCity = new Map(sectorWageDatasets.map(item => [item.cityKey, item]));

export function sectorWagesForCity(city: CityKey): SectorWagesDataset | undefined {
  return byCity.get(city);
}

export function sectorSourceDate(value: string): string {
  const instant = value.length === 10 ? `${value}T12:00:00+03:00` : value;
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Moscow',
  }).format(new Date(instant)).replace(/\s*г\.$/, '');
}
