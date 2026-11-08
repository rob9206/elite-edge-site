'use server';

import { redirect } from 'next/navigation';
import { buildEstimateAction, approveEstimateAction } from '@/app/actions/estimate';
import { reassignTaskAction, setTaskStatusAction } from '@/app/actions/tasks';
import { issueInvoiceAction } from '@/app/actions/payment';
import { addNoteAction, closeJobAction } from '@/app/actions/job';

/** Redirect back to the job with an error banner. */
function back(jobId: string, error?: string): never {
  redirect(error ? `/jobs/${jobId}?error=${encodeURIComponent(error)}` : `/jobs/${jobId}`);
}

export async function buildEstimateForm(formData: FormData) {
  const jobId = String(formData.get('jobId'));
  const r = await buildEstimateAction(jobId);
  back(jobId, 'error' in r ? r.error : undefined);
}

export async function approveEstimateForm(formData: FormData) {
  const jobId = String(formData.get('jobId'));
  const estimateId = String(formData.get('estimateId'));
  const r = await approveEstimateAction(estimateId);
  back(jobId, 'error' in r ? r.error : undefined);
}

export async function reassignForm(formData: FormData) {
  const jobId = String(formData.get('jobId'));
  const r = await reassignTaskAction(formData);
  back(jobId, r && 'error' in r ? r.error : undefined);
}

export async function setTaskStatusForm(formData: FormData) {
  const jobId = String(formData.get('jobId'));
  const r = await setTaskStatusAction(formData);
  back(jobId, r && 'error' in r ? r.error : undefined);
}

export async function issueInvoiceForm(formData: FormData) {
  const jobId = String(formData.get('jobId'));
  const r = await issueInvoiceAction(null, formData);
  back(jobId, r && 'error' in r ? r.error : undefined);
}

export async function addNoteForm(formData: FormData) {
  const jobId = String(formData.get('jobId'));
  const r = await addNoteAction(formData);
  back(jobId, r && 'error' in r ? r.error : undefined);
}

export async function closeJobForm(formData: FormData) {
  const jobId = String(formData.get('jobId'));
  const r = await closeJobAction(formData);
  back(jobId, r && 'error' in r ? r.error : undefined);
}
