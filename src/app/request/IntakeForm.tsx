'use client';

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { submitIntake } from '@/app/actions/intake';
import { JOB_TYPES } from '@/lib/estimate/catalog';
import { MEASUREMENT_FIELDS } from '@/lib/estimate/measurements';

const JOB_TYPE_ENTRIES = Object.values(JOB_TYPES).map((c) => ({ key: c.key, label: c.label }));

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn-primary w-full" disabled={pending}>
      {pending ? 'Sending…' : 'Request my estimate'}
    </button>
  );
}

export default function IntakeForm() {
  const [state, action] = useFormState(submitIntake, { error: '' as string });
  const [jobType, setJobType] = useState(JOB_TYPE_ENTRIES[0]!.key);
  const fields = MEASUREMENT_FIELDS[jobType] ?? [];

  return (
    <form action={action} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="customerName">Name</label>
          <input id="customerName" name="customerName" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="phone">Phone</label>
          <input id="phone" name="phone" className="input" required />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" className="input" required />
        </div>
        <div>
          <label className="label" htmlFor="address">Service address</label>
          <input id="address" name="address" className="input" required />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="jobType">Service needed</label>
        <select
          id="jobType"
          name="jobType"
          className="input"
          value={jobType}
          onChange={(e) => setJobType(e.target.value)}
        >
          {JOB_TYPE_ENTRIES.map((j) => (
            <option key={j.key} value={j.key}>{j.label}</option>
          ))}
        </select>
      </div>

      {fields.length > 0 && (
        <fieldset className="rounded-md border border-ink-700 p-4">
          <legend className="px-2 text-xs uppercase tracking-wider text-ink-400">
            Rough sizing (optional — helps us pre-estimate)
          </legend>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {fields.map((f) => (
              <div key={f.key}>
                <label className="label" htmlFor={`m_${f.key}`}>
                  {f.label} <span className="text-ink-500 normal-case">({f.unit})</span>
                </label>
                <input id={`m_${f.key}`} name={`m_${f.key}`} type="number" min="0" step="any" className="input mono" />
              </div>
            ))}
          </div>
        </fieldset>
      )}

      <div>
        <label className="label" htmlFor="description">Describe the work</label>
        <textarea id="description" name="description" rows={4} className="input" required />
      </div>

      {state?.error ? <p className="text-sm text-edge-red">{state.error}</p> : null}
      <Submit />
    </form>
  );
}
