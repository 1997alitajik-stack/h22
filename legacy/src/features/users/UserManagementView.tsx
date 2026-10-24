import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { User, UserRole } from '../../types';
import { listUsers, updateUserRole, toggleUserStatus } from '../../services/mockService';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import {
  UserCog,
  ShieldCheck,
  Eye,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
  User as UserIcon,
} from 'lucide-react';

export const UserManagementView: React.FC = () => {
  const { userRole, showToast } = useApp();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Status toggle confirmation
  const [userToToggle, setUserToToggle] = useState<User | null>(null);

  const loadData = () => {
    setLoading(true);
    listUsers().then((data) => {
      setUsers(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole(userId, newRole);
      showToast('نقش کاربری با موفقیت تغییر یافت.', 'success');
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  const handleToggleConfirm = async () => {
    if (!userToToggle) return;
    try {
      await toggleUserStatus(userToToggle.id);
      showToast(
        `وضعیت حساب کاربر ${userToToggle.name} به ${
          userToToggle.status === 'ACTIVE' ? 'غیرفعال' : 'فعال'
        } تغییر یافت.`,
        'info'
      );
      setUserToToggle(null);
      loadData();
    } catch (err: any) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto text-right">
      <div className="border-b border-slate-200 pb-5">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">
          مدیریت کاربران و سطوح دسترسی سامانه راستا
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          راهکار ارزیابی سوابق، تخصص و استعدادها · تفکیک دسترسی مدیر سامانه و مشاهده‌گر منابع انسانی
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="py-3.5 px-4 font-semibold">کاربر</th>
                <th className="py-3.5 px-3 font-semibold">نام کاربری / ایمیل</th>
                <th className="py-3.5 px-3 font-semibold">بخش سازمانی</th>
                <th className="py-3.5 px-3 font-semibold">نقش دسترسی</th>
                <th className="py-3.5 px-3 font-semibold">وضعیت حساب</th>
                <th className="py-3.5 px-3 font-semibold">آخرین ورود</th>
                {userRole === 'ADMIN' && <th className="py-3.5 px-4 font-semibold text-left">عملیات مدیر</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-teal-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      {u.avatarInitials}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900">{u.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{u.id}</div>
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-mono text-slate-800 dir-ltr text-right">{u.username}</div>
                    <div className="text-[10px] text-slate-400 font-mono dir-ltr text-right">{u.email}</div>
                  </td>

                  <td className="py-3 px-3 text-slate-600">{u.department}</td>

                  {/* Role */}
                  <td className="py-3 px-3">
                    {userRole === 'ADMIN' ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                        className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs font-medium focus:ring-1 focus:ring-teal-700"
                      >
                        <option value="ADMIN">مدیر سامانه (دسترسی کامل)</option>
                        <option value="VIEWER">کاربر مشاهده‌گر منابع انسانی</option>
                      </select>
                    ) : (
                      <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-medium">
                        {u.roleTitle}
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
                        u.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {u.status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] text-slate-500 tabular-nums">
                    {u.lastLoginAt}
                  </td>

                  {/* Actions for admin */}
                  {userRole === 'ADMIN' && (
                    <td className="py-3 px-4 text-left">
                      <button
                        onClick={() => setUserToToggle(u)}
                        className={`text-xs font-medium px-2.5 py-1 rounded transition-colors ${
                          u.status === 'ACTIVE'
                            ? 'text-rose-700 hover:bg-rose-50'
                            : 'text-emerald-700 hover:bg-emerald-50'
                        }`}
                      >
                        {u.status === 'ACTIVE' ? 'غیرفعال‌سازی' : 'فعال‌سازی حساب'}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={userToToggle !== null}
        title="تغییر وضعیت حساب کاربری"
        message={`آیا از تغییر وضعیت حساب کاربری «${userToToggle?.name}» اطمینان دارید؟`}
        confirmLabel="تأیید تغییر وضعیت"
        variant={userToToggle?.status === 'ACTIVE' ? 'danger' : 'primary'}
        onConfirm={handleToggleConfirm}
        onCancel={() => setUserToToggle(null)}
      />
    </div>
  );
};
