import React from 'react';
import { useApp } from '../../context/AppContext';
import { CheckCircle2, AlertCircle, Info, XCircle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border text-right transition-all animate-in slide-in-from-bottom-5 duration-200 ${
              isSuccess
                ? 'bg-white border-emerald-200 text-slate-800'
                : isError
                ? 'bg-white border-rose-200 text-slate-800'
                : isWarning
                ? 'bg-white border-amber-200 text-slate-800'
                : 'bg-white border-slate-200 text-slate-800'
            }`}
          >
            <div className="shrink-0 pt-0.5">
              {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
              {isError && <XCircle className="w-5 h-5 text-rose-600" />}
              {isWarning && <AlertCircle className="w-5 h-5 text-amber-600" />}
              {!isSuccess && !isError && !isWarning && <Info className="w-5 h-5 text-teal-600" />}
            </div>

            <div className="flex-1 min-w-0">
              {toast.title && <h5 className="font-semibold text-xs text-slate-900 mb-0.5">{toast.title}</h5>}
              <p className="text-xs text-slate-600 leading-normal">{toast.message}</p>
            </div>

            <button
              onClick={() => removeToast(toast.id)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
