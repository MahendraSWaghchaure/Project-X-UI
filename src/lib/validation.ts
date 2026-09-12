import { z } from 'zod';

/** Mirrors backend/common/.../validation/Patterns.java's PHONE constant - keep both in sync. Permissive international check (not India-only), since school/emergency contacts may be landlines or non-Indian numbers. */
export const PHONE_REGEX = /^\+?[0-9]{7,15}$/;
const PHONE_MESSAGE = 'Must be a valid phone number (digits only, optional leading +)';

/** For a phone field that's required. */
export const phoneSchema = z.string().min(1, 'Phone is required').regex(PHONE_REGEX, PHONE_MESSAGE);

/** For a phone field that may be left blank - an empty string is fine, anything else must match. */
export const optionalPhoneSchema = z
  .string()
  .optional()
  .refine((value) => !value || PHONE_REGEX.test(value), PHONE_MESSAGE);
