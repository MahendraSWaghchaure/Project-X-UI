import { z } from 'zod';

/** Mirrors backend/common/.../validation/Patterns.java's PHONE constant - keep both in sync. Permissive international check (not India-only), since school/emergency contacts may be landlines or non-Indian numbers. */
export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;

/** Schema messages are i18n keys (see locales/en.common.ts `validation.*`); forms render them with t(). */
const PHONE_MESSAGE = 'validation.phone';

/** For a phone field that's required. */
export const phoneSchema = z.string().min(1, 'validation.required').regex(PHONE_REGEX, PHONE_MESSAGE);

/** For a phone field that may be left blank - an empty string is fine, anything else must match. */
export const optionalPhoneSchema = z
  .string()
  .optional()
  .refine((value) => !value || PHONE_REGEX.test(value), PHONE_MESSAGE);
