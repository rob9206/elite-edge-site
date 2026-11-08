import { z } from 'zod';
import { JOB_TYPE_KEYS } from './estimate/catalog';

/** Public intake form submission. */
export const intakeSchema = z.object({
  customerName: z.string().min(1, 'Name is required').max(120),
  phone: z.string().min(7, 'Phone is required').max(40),
  email: z.string().email('Enter a valid email').max(180),
  address: z.string().min(1, 'Address is required').max(240),
  jobType: z.enum(JOB_TYPE_KEYS as [string, ...string[]]),
  description: z.string().min(1, 'Tell us about the job').max(4000),
  // Measurements arrive as a flat record of numbers (strings from the form).
  measurements: z.record(z.coerce.number().nonnegative()).default({}),
  siteConditions: z.record(z.string()).default({}),
});
export type IntakeInput = z.infer<typeof intakeSchema>;

/** A single estimate line (manual or edited catalog line). */
export const lineItemSchema = z.object({
  id: z.string().min(1).max(64),
  description: z.string().min(1).max(240),
  category: z.enum(['material', 'labor', 'permit', 'equipment', 'other']),
  qty: z.coerce.number().nonnegative(),
  unit: z.string().min(1).max(24),
  unitCostCents: z.coerce.number().int().nonnegative(),
  markupBps: z.coerce.number().int().min(0).max(100_000),
  source: z.enum(['catalog', 'manual']),
});

/** Saving/revising an estimate. */
export const estimateSchema = z.object({
  jobId: z.string().min(1),
  lineItems: z.array(lineItemSchema).min(1, 'At least one line item'),
  contingencyBps: z.coerce.number().int().min(0).max(100_000),
  taxBps: z.coerce.number().int().min(0).max(100_000),
});
export type EstimateInput = z.infer<typeof estimateSchema>;

/** Issue a Uniwire invoice for a manual amount. */
export const invoiceSchema = z.object({
  jobId: z.string().min(1),
  estimateId: z.string().min(1),
  amountUsd: z
    .string()
    .regex(/^\d+(\.\d{1,2})?$/, 'Enter a dollar amount like 1500 or 1500.00')
    .refine((v) => Number(v) > 0, 'Amount must be greater than 0'),
  kind: z.enum(['BTC', 'BTC_LIGHTNING']),
  notes: z.string().max(500).optional(),
});
export type InvoiceInput = z.infer<typeof invoiceSchema>;

/** Reassign a task to the other crew member. */
export const reassignSchema = z.object({
  taskId: z.string().min(1),
  assignedTo: z.enum(['foti', 'steve']),
});

/** Steve updating one of his own task statuses. */
export const taskStatusSchema = z.object({
  taskId: z.string().min(1),
  status: z.enum(['pending', 'active', 'blocked', 'done']),
});
