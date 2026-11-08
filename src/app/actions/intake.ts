'use server';

import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { appendLedger } from '@/lib/ledger';
import { intakeSchema } from '@/lib/validation';
import { checkRateLimit } from '@/lib/rate-limit';
import { clientIp } from '@/lib/request';

/** Public, no-login estimate request. Creates a draft job (acceptance #1). */
export async function submitIntake(_prev: unknown, formData: FormData) {
  if (!checkRateLimit(`intake:${clientIp()}`, 5, 60_000)) {
    return { error: 'Too many requests. Please wait a minute and try again.' };
  }

  // Measurement inputs are named "m_<key>"; collect the positive ones.
  const measurements: Record<string, number> = {};
  for (const [k, v] of formData.entries()) {
    if (k.startsWith('m_') && typeof v === 'string' && v.trim() !== '') {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) measurements[k.slice(2)] = n;
    }
  }

  const parsed = intakeSchema.safeParse({
    customerName: formData.get('customerName'),
    phone: formData.get('phone'),
    email: formData.get('email'),
    address: formData.get('address'),
    jobType: formData.get('jobType'),
    description: formData.get('description'),
    measurements,
    siteConditions: {},
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your entries.' };
  }

  const data = parsed.data;
  const job = await prisma.job.create({
    data: {
      customerName: data.customerName,
      phone: data.phone,
      email: data.email,
      address: data.address,
      jobType: data.jobType,
      description: data.description,
      measurements: data.measurements,
      siteConditions: data.siteConditions,
      status: 'draft',
    },
  });

  await appendLedger(prisma, {
    jobId: job.id,
    event: 'created',
    actor: 'customer',
    payload: { source: 'public_intake', jobType: data.jobType },
  });

  redirect('/request/thanks');
}
