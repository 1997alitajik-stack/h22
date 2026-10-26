'use client';

import { useState, useTransition } from 'react';

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

/** Client bridge for server actions. Every rejected action becomes a visible form error. */
export function useServerAction<TState extends ActionState>(
  action: (prev: TState, formData: FormData) => Promise<TState>,
  initialState: TState,
) {
  const [state, setState] = useState<TState>(initialState);
  const [pending, startTransition] = useTransition();

  function submitAndWait(formData: FormData): Promise<TState> {
    return new Promise<TState>((resolve) => {
      startTransition(async () => {
        try {
          const result = await action(initialState, formData);
          setState(result);
          resolve(result);
        } catch (error) {
          const failure = {
            ...initialState,
            ok: false,
            error: error instanceof Error ? error.message : 'عملیات ناموفق بود. دوباره تلاش کنید.',
          } as TState;
          setState(failure);
          resolve(failure);
        }
      });
    });
  }

  function submit(formData: FormData): void {
    void submitAndWait(formData);
  }

  return [state, submit, pending, submitAndWait] as const;
}
