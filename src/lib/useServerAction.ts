'use client';

import { useState, useTransition } from 'react';

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

/**
 * Client bridge for server actions with success/failure handled at the call
 * site (event-driven — no setState-in-effect). `submit` accepts a FormData
 * like a plain form action and resolves after the server action completes.
 */
export function useServerAction<TState extends ActionState>(
  action: (prev: TState, formData: FormData) => Promise<TState>,
  initialState: TState,
) {
  const [state, setState] = useState<TState>(initialState);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData): void {
    startTransition(async () => {
      const result = await action(initialState, formData);
      setState(result);
    });
  }

  return [state, submit, pending] as const;
}
