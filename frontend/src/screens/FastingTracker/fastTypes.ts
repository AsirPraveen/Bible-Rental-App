/**
 * The fasts the app offers, with what each one actually involves.
 *
 * Shared by the "Start a Fast" picker and the tracker list's info button, so
 * a fast is described the same way wherever it appears. Adding one here adds
 * it to both.
 */
export const FAST_TYPES: { label: string; value: string; description: string }[] = [
  {
    label: 'Daniel Fast',
    value: 'Daniel Fast',
    description:
      'Vegetables, fruit and water only — no meat, bread or wine.\nDaniel 1:12 and 10:2-3.',
  },
  {
    label: 'Partial Fast',
    value: 'Partial Fast',
    description:
      'Giving up certain foods, or eating only within set hours.\nDaniel 10:2-3.',
  },
  {
    label: 'Water Fast',
    value: 'Water Fast',
    description:
      'No food, water only, for a set number of days.\nMatthew 4:2.',
  },
  {
    label: 'Absolute Fast',
    value: 'Absolute Fast',
    description:
      'Neither food nor water. Kept short, and undertaken with care.\nEsther 4:16; Acts 9:9.',
  },
  {
    label: 'Esther Fast',
    value: 'Esther Fast',
    description:
      'Three days without food or water, sought for deliverance.\nEsther 4:16.',
  },
  {
    label: 'Corporate Fast',
    value: 'Corporate Fast',
    description:
      'A congregation fasting together for a shared purpose.\nJoel 2:15-16; Acts 13:2-3.',
  },
  {
    label: 'Elijah Fast',
    value: 'Elijah Fast',
    description:
      'Rest and simple food while recovering from exhaustion.\n1 Kings 19:4-8.',
  },
  {
    label: 'Sunrise to Sunset Fast',
    value: 'Sunrise to Sunset Fast',
    description:
      'No food from dawn until evening, then a simple meal.\nJudges 20:26; 2 Samuel 1:12.',
  },
  {
    label: 'Ezra Fast',
    value: 'Ezra Fast',
    description:
      "Seeking God's protection and direction before a decision.\nEzra 8:21-23.",
  },
  {
    label: 'Ninevite Fast',
    value: 'Ninevite Fast',
    description:
      'A whole community turning back to God, food and drink set aside.\nJonah 3:5-8.',
  },
  {
    label: 'Nazirite Vow',
    value: 'Nazirite Vow',
    description:
      'Abstaining from wine and grape products for a set season.\nNumbers 6:1-4.',
  },
  { label: 'Others', value: 'Others', description: '' },
];

/** The description for a stored fast's type, or null when there is none. */
export function describeFastType(value: string): string | null {
  return FAST_TYPES.find(f => f.value === value)?.description || null;
}
