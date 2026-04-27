import { validateCategoryForm } from '@/lib/validate-category-form';

describe('validateCategoryForm', () => {
  it('returns ok when name, hex colour, and icon are valid', () => {
    const r = validateCategoryForm({
      name: ' Data ',
      color: '#ABCDEF',
      icon: ' tag ',
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.values.name).toBe('Data');
      expect(r.values.color).toBe('#ABCDEF');
      expect(r.values.icon).toBe('tag');
    }
  });

  it('returns errors for empty name, bad colour, empty icon', () => {
    const r = validateCategoryForm({ name: '   ', color: '#fff', icon: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.name).toBeTruthy();
      expect(r.errors.color).toBeTruthy();
      expect(r.errors.icon).toBeTruthy();
    }
  });
});
