// api/lib/validate.ts
import { z, ZodSchema } from 'zod'
import type { VercelRequest, VercelResponse } from '@vercel/node'

export function validateBody<T>(req: VercelRequest, res: VercelResponse, schema: ZodSchema<T>): T | null {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      issues: result.error.flatten().fieldErrors,
    })
    return null
  }
  return result.data
}

export function validateQuery<T>(req: VercelRequest, res: VercelResponse, schema: ZodSchema<T>): T | null {
  const result = schema.safeParse(req.query)
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      issues: result.error.flatten().fieldErrors,
    })
    return null
  }
  return result.data
}

// Reusable schemas
export const TaskCreateSchema = z.object({
  title:       z.string().min(1).max(200).trim(),
  description: z.string().max(5000).trim().optional(),
  project_id:  z.string().uuid(),
  sprint_id:   z.string().uuid().nullable().optional(),
  assignee_id: z.string().uuid().optional(),
  priority:    z.enum(['low', 'medium', 'high']).optional(),
  estimate:    z.number().int().min(0).max(999).optional(),
  status:      z.enum(['backlog', 'focus', 'review', 'outcome']).default('backlog'),
  due_date:    z.string().nullable().optional(),
})

export const TaskUpdateSchema = TaskCreateSchema.partial()

export const SprintCreateSchema = z.object({
  name:       z.string().min(1).max(100).trim(),
  project_id: z.string().uuid(),
  status:     z.enum(['ACTIVE', 'COMPLETED', 'PLANNED']).default('ACTIVE'),
})

export const FocusSessionSchema = z.object({
  task_id:    z.string().uuid(),
  started_at: z.string().datetime(),
  ended_at:   z.string().datetime().optional(),
  duration_s: z.number().int().min(0).max(86400),
  note:       z.string().max(1000).trim().optional(),
})

export const ProjectIdQuerySchema = z.object({
  projectId: z.string().uuid()
})

export const MemberUpdateSchema = z.object({
  role: z.enum(['admin', 'member'])
})

export const WorkspaceCreateSchema = z.object({
  name: z.string().min(1).max(80).trim(),
})

export const InviteSchema = z.object({
  email:   z.string().email(),
  team_id: z.string().uuid(),
  role:    z.enum(['admin', 'member']).default('member'),
})
