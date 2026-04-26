// unit test – shared application form validation rules

// imports
import { validateApplicationForm } from '@/lib/validate-application-form';

// tests
describe('validateApplicationForm', () => {
  it('returns ok when all required fields are valid', () => {
    const r = validateApplicationForm({
      company: ' Acme ',
      role: ' Dev ',
      appliedDate: '2026-04-26',
      metricValue: '3',
      categoryId: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.values.company).toBe('Acme');
      expect(r.values.role).toBe('Dev');
      expect(r.values.metricValue).toBe(3);
      expect(r.values.categoryId).toBe(1);
    }
  });

  it('returns errors when fields are missing or invalid', () => {
    const r = validateApplicationForm({
      company: '   ',
      role: '',
      appliedDate: '99-99-99',
      metricValue: '0',
      categoryId: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.company).toBeTruthy();
      expect(r.errors.role).toBeTruthy();
      expect(r.errors.appliedDate).toBeTruthy();
      expect(r.errors.metricValue).toBeTruthy();
      expect(r.errors.category).toBeTruthy();
    }
  });
});
