'use client';

import { useState, useTransition } from 'react';

export interface ActionState {
  ok: boolean;
  error?: string;
  message?: string;
}

/** Client bridge for server actions. Awaitable submission lets callers refresh/close
 * dialogs only after the server confirms success. */
export function useServerAction<TState extends ActionState>(
  action: (prev: TState, formData: FormData) => Promise<TState>,
  initialState: TState,
) {
  const [state, setState] = useState<TState>(initialState);
  const [pending, startTransition] = useTransition();

  function submitAndWait(formData: FormData): Promise<TState> {
    return new Promise<TState>((resolve, reject) => {
      startTransition(async () => {
        try {
          const result = await action(initialState, formData);
          setState(result);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  function submit(formData: FormData): void {
    void submitAndWait(formData).catch((error: unknown) => {
      console.error('[RASTA_ACTION] Server action rejected', error);
    });
  }

  return [state, submit, pending, submitAndWait] as const;
}
