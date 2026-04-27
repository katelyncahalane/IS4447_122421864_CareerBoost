// preset colours + icon keys for category create / edit (matches seed style)

// colours – hex swatches (tap one when adding or editing a category)
export const CATEGORY_COLOR_OPTIONS = [
  '#2563eb',
  '#16a34a',
  '#a855f7',
  '#dc2626',
  '#ca8a04',
  '#0891b2',
  '#64748b',
] as const;

// icons – short text labels stored in sqlite (keep simple for coursework)
export const CATEGORY_ICON_OPTIONS = ['code', 'chart', 'palette', 'briefcase', 'school', 'heart'] as const;
