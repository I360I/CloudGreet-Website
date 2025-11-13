import { z } from 'zod'

export const channelEnum = z.enum(['email', 'sms', 'call'])

export const templateInputSchema = z
  .object({
    name: z.string().min(2, 'Template name must be at least 2 characters'),
    channel: z.enum(['email', 'sms']),
    subject: z
      .string()
      .min(3, 'Subject must be at least 3 characters')
      .optional()
      .or(z.literal('')),
    body: z.string().min(10, 'Body must be at least 10 characters'),
    complianceFooter: z.string().min(10, 'Compliance footer is required'),
    isActive: z.boolean().optional().default(true),
    isDefault: z.boolean().optional().default(false),
    metadata: z.record(z.any()).optional().default({})
  })
  .superRefine((value, ctx) => {
    if (value.channel === 'email' && !value.subject) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['subject'],
        message: 'Email templates require a subject line'
      })
    }
  })

export const stepInputSchema = z
  .object({
    stepOrder: z.number().int().min(1),
    channel: channelEnum,
    waitMinutes: z.number().int().min(0).default(0),
    templateId: z.string().uuid().optional(),
    fallbackChannel: channelEnum.optional(),
    sendWindowStart: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM 24h format')
      .optional(),
    sendWindowEnd: z
      .string()
      .regex(/^\d{2}:\d{2}$/, 'End time must be HH:MM 24h format')
      .optional(),
    metadata: z.record(z.any()).optional()
  })
  .superRefine((value, ctx) => {
    if ((value.channel === 'email' || value.channel === 'sms') && !value.templateId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['templateId'],
        message: 'Template is required for email and SMS steps'
      })
    }

    if (value.sendWindowStart && value.sendWindowEnd) {
      if (value.sendWindowStart >= value.sendWindowEnd) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['sendWindowEnd'],
          message: 'End time must be after start time'
        })
      }
    }
  })

const sequenceBaseSchema = z.object({
  name: z.string().min(3, 'Sequence name must be at least 3 characters'),
  description: z.string().max(500).optional(),
  throttlePerDay: z.number().int().min(1).max(1000).default(100),
  sendWindowStart: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Start time must be HH:MM 24h format')
    .optional(),
  sendWindowEnd: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'End time must be HH:MM 24h format')
    .optional(),
  timezone: z.string().min(2).default('UTC'),
  status: z.enum(['draft', 'active', 'paused']).default('draft'),
  autoPauseOnReply: z.boolean().default(true),
  steps: z.array(stepInputSchema).min(1, 'At least one step is required'),
  config: z.record(z.any()).optional().default({})
})

export const sequenceInputSchema = sequenceBaseSchema.superRefine((value, ctx) => {
  if (value.sendWindowStart && value.sendWindowEnd && value.sendWindowStart >= value.sendWindowEnd) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['sendWindowEnd'],
      message: 'Sequence end time must be after start time'
    })
  }

  const orders = new Set<number>()
  for (const step of value.steps) {
    if (orders.has(step.stepOrder)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['steps'],
        message: 'Step order values must be unique'
      })
      break
    }
    orders.add(step.stepOrder)
  }
})

export const sequenceUpdateSchema = sequenceBaseSchema
  .partial()
  .superRefine((value, ctx) => {
    if (value.sendWindowStart && value.sendWindowEnd && value.sendWindowStart >= value.sendWindowEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['sendWindowEnd'],
        message: 'Sequence end time must be after start time'
      })
    }

    if (value.steps) {
      const orders = new Set<number>()
      for (const step of value.steps) {
        if (orders.has(step.stepOrder)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['steps'],
            message: 'Step order values must be unique'
          })
          break
        }
        orders.add(step.stepOrder)
      }
    }
  })

export const statsQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('7d')
})

export type TemplateInput = z.infer<typeof templateInputSchema>
export type StepInput = z.infer<typeof stepInputSchema>
export type SequenceInput = z.infer<typeof sequenceInputSchema>
export type SequenceUpdateInput = z.infer<typeof sequenceUpdateSchema>
export type StatsQuery = z.infer<typeof statsQuerySchema>


