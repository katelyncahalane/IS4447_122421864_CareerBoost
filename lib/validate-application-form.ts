// shared validation – add / edit job application (date, metric, category, notes optional)

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

// function – return errors map or valid payload (metric stored as whole number in sqlite)
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
    errors.metricValue = 'Enter a positive whole number.';
  }

  if (input.categoryId == null) {
    errors.category = 'Pick a category.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  return {
    ok: true,
    values: { company, role, appliedDate, metricValue, categoryId: input.categoryId as number },
  };
}
