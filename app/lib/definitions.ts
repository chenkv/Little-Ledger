import * as z from 'zod'
import { ZodSafeParseResult } from 'zod'
 
export const SignupFormSchema = z.object({
  username: z
    .string()
    .min(2, { error: 'Username must be at least 2 characters long.' })
    .trim(),
  email: z.email({ error: 'Please enter a valid email.' }).trim(),
  password: z
    .string()
    .min(8, { error: 'Be at least 8 characters long' })
    .regex(/[a-zA-Z]/, { error: 'Contain at least one letter.' })
    .regex(/[0-9]/, { error: 'Contain at least one number.' })
    .regex(/[^a-zA-Z0-9]/, {
      error: 'Contain at least one special character.',
    })
    .trim(),
})

export function prettifyError(result: ZodSafeParseResult<{
    username: string;
    email: string;
    password: string;
}>) : string {
  if (!result.success) {
    return z.prettifyError(result.error);
  }
  return "Error in prettifying error.";
}