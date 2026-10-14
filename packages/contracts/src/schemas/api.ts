import { z } from 'zod';

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string().optional(),
  details: z.unknown().optional(),
});

export function createApiSuccessResponse<T>(data: T) {
  return { success: true as const, data };
}

export function createApiErrorResponse(code: string, message: string, requestId?: string) {
  return { success: false as const, error: { code, message, requestId } };
}

export type ApiError = z.infer<typeof ApiErrorSchema>;
