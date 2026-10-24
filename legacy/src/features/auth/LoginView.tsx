import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Shield, Eye, EyeOff, Lock, User as UserIcon, CheckCircle2, ArrowRight } from 'lucide-react';
import { BrandLogo } from '../../components/ui/BrandLogo';

interface LoginViewProps {
  onSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { switchRole } = useApp();
  const [username, setUsername] = useState('a.rostami');
  const [password, setPassword] = useState('demo1403');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'ADMIN' | 'VIEWER'>('ADMIN');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!username.trim() || !password.trim()) {
      setErrorMessage('لطفاً نام کاربری و کلمه عبور را وارد فرمایید.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      switchRole(selectedRole);
      onSuccess();
    }, 400);
  };

  const handleQuickRoleSelect = (role: 'ADMIN' | 'VIEWER') => {
    setSelectedRole(role);
    if (role === 'ADMIN') {
      setUsername('a.rostami');
      setPassword('admin1403');
    } else {
      setUsername('s.sadeghi');
      setPassword('viewer1403');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-right selection:bg-teal-700 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Official Company Logo */}
        <div className="flex justify-center mb-5">
          <BrandLogo size="xl" animate />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">
          راستا
        </h1>
        <p className="mt-2.5 text-xs sm:text-sm font-medium text-teal-300/90 max-w-sm mx-auto leading-relaxed">
          راهکار ارزیابی سوابق، تخصص و استعدادها
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-2xl border border-slate-200 sm:px-8">
          {/* Demo mode selector */}
          <div className="mb-6 p-3 bg-teal-50 border border-teal-200 rounded-xl">
            <div className="text-xs font-semibold text-teal-900 mb-2">
              انتخاب نقش شبیه‌سازی ورود (دمو):
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickRoleSelect('ADMIN')}
                className={`py-2 px-3 text-xs font-medium rounded-lg text-center transition-all border ${
                  selectedRole === 'ADMIN'
                    ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                    : 'bg-white text-slate-700 border-teal-200 hover:bg-teal-100/50'
                }`}
              >
                مدیر سامانه (کامل)
              </button>
              <button
                type="button"
                onClick={() => handleQuickRoleSelect('VIEWER')}
                className={`py-2 px-3 text-xs font-medium rounded-lg text-center transition-all border ${
                  selectedRole === 'VIEWER'
                    ? 'bg-teal-700 text-white border-teal-800 shadow-xs'
                    : 'bg-white text-slate-700 border-teal-200 hover:bg-teal-100/50'
                }`}
              >
                مشاهده‌گر منابع انسانی
              </button>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {errorMessage && (
              <div className="p-3 text-xs bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
                {errorMessage}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                نام کاربری / شناسه سازمانی
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-3 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white text-slate-800 transition-all text-left dir-ltr"
                  placeholder="username"
                  required
                />
                <UserIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                کلمه عبور
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600 focus:bg-white text-slate-800 transition-all text-left dir-ltr"
                  placeholder="••••••••"
                  required
                />
                <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <span>در حال تأیید ورود...</span>
              ) : (
                <>
                  <span>ورود به سامانه</span>
                  <ArrowRight className="w-4 h-4 rotate-180" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <p className="text-[11px] text-slate-400 leading-relaxed">
              توجه: این صفحه جهت ارزیابی ظاهری و آزمایشی فرانت‌اند طراحی شده است.
              احراز هویت سرور و امنیت توکن در مرحله اتصال به بک‌اند توسط مهندس Claude پیاده‌سازی خواهد شد.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
