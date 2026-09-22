import type { FormInstance } from 'antd';

export const COMMON_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^0\d{9,10}$/,
  USERNAME: /^[A-Za-z0-9_]{3,50}$/,
  TAX_CODE: /^\d{10}(-\d{3})?$/,
} as const;

type ErrorPayload = {
  message?: unknown;
  error?: unknown;
  detail?: unknown;
};

/** Giữ lại thông báo nghiệp vụ do backend trả về, kể cả khi body không phải JSON. */
export const parseApiError = async (
  response: Response,
  fallbackMessage: string,
): Promise<Error> => {
  try {
    const rawBody = await response.text();
    if (!rawBody) return new Error(fallbackMessage);

    try {
      const payload = JSON.parse(rawBody) as ErrorPayload;
      const message = payload.message ?? payload.error ?? payload.detail;
      return new Error(typeof message === 'string' && message.trim() ? message : fallbackMessage);
    } catch {
      return new Error(rawBody.trim() || fallbackMessage);
    }
  } catch {
    return new Error(fallbackMessage);
  }
};

export const getErrorMessage = (error: unknown, fallbackMessage: string): string => {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === 'string' && error.trim()) return error;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) return message;
  }
  return fallbackMessage;
};

export const isFormValidationError = (error: unknown): boolean =>
  typeof error === 'object' && error !== null && 'errorFields' in error;

/** Gắn lỗi backend vào đúng field; trả false khi đây là lỗi chung cần hiển thị toast. */
export const applyFormErrors = (
  form: FormInstance,
  errorMessage: string,
  mappings: Record<string, readonly string[]>,
): boolean => {
  const normalizedMessage = errorMessage.toLocaleLowerCase('vi-VN');
  const fields = Object.entries(mappings)
    .filter(([, keywords]) =>
      keywords.some((keyword) => normalizedMessage.includes(keyword.toLocaleLowerCase('vi-VN'))),
    )
    .map(([name]) => ({ name, errors: [errorMessage] }));

  if (fields.length === 0) return false;
  form.setFields(fields);
  return true;
};
