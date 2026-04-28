// Shared validation for `categories`: **name**, **colour** (hex), and **icon** label — all NOT NULL in SQLite.
// Application records must reference a category (`applications.category_id`); these fields define how categories appear in lists and charts.

export type CategoryFormErrors = Partial<Record<'name' | 'color' | 'icon', string>>;

export type ValidCategoryForm = { name: string; color: string; icon: string };

function isHexColour(v: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(v.trim());
}

export function validateCategoryForm(input: {
  name: string;
  color: string;
  icon: string;
}): { ok: true; values: ValidCategoryForm } | { ok: false; errors: CategoryFormErrors } {
  const name = input.name.trim();
  const icon = input.icon.trim();
  const color = input.color.trim();
  const errors: CategoryFormErrors = {};

  if (!name) errors.name = 'Name is required.';
  if (!icon) {
    errors.icon = 'Emoji is required. Pick one character you like (e.g. 💻 📊 🎨 🛡️).';
  }
  if (!isHexColour(color)) {
    errors.color = 'Colour must be hex #RRGGBB (e.g. #2563eb).';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, values: { name, color, icon } };
}
