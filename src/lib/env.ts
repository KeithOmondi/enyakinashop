import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z
    .string({ required_error: 'VITE_API_URL is not set. Copy .env.example to .env.' })
    .url('VITE_API_URL must be a full URL, e.g. http://localhost:4000/api')
    // Request paths start with "/", so a trailing slash here would produce "//health".
    .transform((u) => u.replace(/\/+$/, '')),
});

const parsed = envSchema.safeParse(import.meta.env);
if (!parsed.success) {
  const msg = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n');
  // Fail loudly at startup instead of making requests to "undefined/...".
  throw new Error(`Invalid shop app environment:\n${msg}`);
}

export const env = parsed.data;
