import { z } from 'zod';

const phonePattern = /^[+()\-\d\s]{7,20}$/;
const idPattern = /^[A-Za-z0-9][A-Za-z0-9/_-]{2,29}$/;

export const studentInputSchema = z
  .object({
    studentId: z.string().trim().min(3).max(30).regex(idPattern, 'Use letters, numbers, /, _ or -.'),
    fullName: z.string().trim().min(2).max(120),
    email: z.email().max(254),
    phone: z.union([z.literal(''), z.string().trim().regex(phonePattern, 'Enter a valid phone number.')]).optional(),
    department: z.string().trim().min(2).max(100),
    course: z.string().trim().min(2).max(120),
    year: z.coerce.number().int().min(1).max(4)
  })
  .strict();

export function validateStudent(input) {
  const result = studentInputSchema.safeParse(input);
  if (!result.success) {
    return {
      success: false,
      errors: result.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'form',
        message: issue.message
      }))
    };
  }

  return {
    success: true,
    data: {
      ...result.data,
      studentId: result.data.studentId.toUpperCase(),
      email: result.data.email.toLowerCase(),
      phone: result.data.phone ?? ''
    }
  };
}
