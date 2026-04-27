// Shared validation for primary application records: **date**, **measurable metric**, and **category** are required
// (matches `applications` NOT NULL columns). Notes optional. All validated before Drizzle writes to SQLite.

// types – raw form strings before save
export type ApplicationFormInput = {
  company: string;
  role: string;
  appliedDate: string;
  metricValue: string;
  categoryId: number | null;
};

// types – field keys we show inline errors for
export type ApplicationFormErrorKey = 'company' | 'role' | 'appliedDate' | 'metricValue' | 'category';

export type ApplicationFormErrors = Partial<Record<ApplicationFormErrorKey, string>>;

// types – trimmed + parsed values when valid
export type ValidApplicationForm = {
  company: string;
  role: string;
  appliedDate: string;
  metricValue: number;
  categoryId: number;
};

// function – return errors map or valid payload (`applications.metric_value` is an integer in drizzle schema)
export function validateApplicationForm(input: ApplicationFormInput):
  | { ok: true; values: ValidApplicationForm }
  | { ok: false; errors: ApplicationFormErrors } {
  const errors: ApplicationFormErrors = {};

  const company = input.company.trim();
  const role = input.role.trim();
  const appliedDate = input.appliedDate.trim();
  const metricRaw = input.metricValue.trim();

  if (!company) errors.company = 'Company is required.';
  if (!role) errors.role = 'Role is required.';

  if (!/^\d{4}-\d{2}-\d{2}$/.test(appliedDate)) {
    errors.appliedDate = 'Use date format YYYY-MM-DD.';
  }

  const metricValue = Number.parseInt(metricRaw, 10);
  if (!Number.isFinite(metricValue) || metricValue <= 0) {
    errors.metricValue =
      'Primary metric: enter a positive whole number (e.g. minutes or hours for duration, or a count).';
  }

  if (input.categoryId == null) {
    errors.category = 'Category is required, choose one to group this record.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: { company, role, appliedDate, metricValue, categoryId: input.categoryId as number },
  };
}
