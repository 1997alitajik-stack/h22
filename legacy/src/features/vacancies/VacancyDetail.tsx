import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Vacancy, Applicant, CandidacyStage } from '../../types';
import {
  getVacancyById,
  listApplicants,
  linkApplicantToVacancy,
  updateCandidacyStage,
  calculateMockMatch,
} from '../../services/mockService';
import { toPersianDigits } from '../../lib/persianUtils';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import {
  Building2,
  MapPin,
  Users,
  Briefcase,
  ArrowRight,
  Plus,
  CheckCircle2,
  Clock,
  UserCheck,
  ChevronLeft,
  X,
  Sparkles,
} from 'lucide-react';

interface VacancyDetailProps {
  vacancyId: string;
}

export const VacancyDetail: React.FC<VacancyDetailProps> = ({ vacancyId }) => {
  const { navigateTo, userRole, showToast } = useApp();

  const [vacancy, setVacancy] = useState<Vacancy | null>(null);
  const [allApplicants, setAllApplicants] = useState<Applicant[]>([]);
  const [loading, setLoading] = useState(true);

  // Link candidate modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState('');
  const [linkNotes, setLinkNotes] = useState('');

  const loadData = () => {
    setLoading(true);
    Promise.all([getVacancyById(vacancyId), listApplicants()]).then(([vac, apps]) => {
      setVacancy(vac);
      setAllApplicants(apps);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [vacancyId]);

  if (loading || !vacancy) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse text-xs">
        در حال بارگذاری جزئیات فرصت شغلی...
      </div>
    );
  }

  // Linked candidates with applicant data
  const linkedCandidates = allApplicants.flatMap((app) => {
    const cand = app.candidacies.find((c) => c.vacancyId === vacancy.id);
    if (!cand) return [];
    return [
      {
        applicant: app,
        candidacy: cand,
      },
    ];
  });

  // Candidates not yet linked
  const unlinkedApplicants = allApplicants.filter(
    (app) => !app.candidacies.some((c) => c.vacancyId === vacancy.id)
  );

  const handleLinkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicantId) {
      showToast('لطفاً یک متقاضی را از استخر انتخاب فرمایید.', 'warning');
      return;
    }

    await linkApplicantToVacancy(vacancy.id, selectedApplicantId, 'NEW', linkNotes);
    showToast('متقاضی با موفقیت به این فرصت شغلی متصل گردید.', 'success');
    setIsLinkModalOpen(false);
    setSelectedApplicantId('');
    setLinkNotes('');
    loadData();
  };

  const handleStageChange = async (applicantId: string, newStage: CandidacyStage) => {
    await updateCandidacyStage(vacancy.id, applicantId, newStage);
    showToast('مرحله بررسی متقاضی به‌روزرسانی شد.', 'success');
    loadData();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto text-right">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigateTo('vacancies')}
          className="text-xs text-slate-500 hover:text-teal-800 transition-colors flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به فهرست فرصت‌های شغلی</span>
        </button>
      </div>

      {/* Vacancy Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                {vacancy.code}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-semibold">
                وضعیت: پذیرش فعال
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900">{vacancy.title}</h2>

            <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 pt-1">
              <span className="font-medium text-slate-800 flex items-center gap-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{vacancy.organizationName}</span>
              </span>
              <span>·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                <span>{vacancy.city}</span>
              </span>
              <span>·</span>
              <span>تعداد سهمیه استخدام: {toPersianDigits(vacancy.openPositionsCount)} ردیف</span>
              {vacancy.salaryRange && (
                <>
                  <span>·</span>
                  <span>حقوق پایه: {vacancy.salaryRange}</span>
                </>
              )}
            </div>
          </div>

          {userRole === 'ADMIN' && (
            <button
              onClick={() => setIsLinkModalOpen(true)}
              className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-2 shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>معرفی متقاضی از استخر</span>
            </button>
          )}
        </div>

        {/* Description & Requirements */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div>
            <h4 className="font-bold text-slate-900 mb-2">شرح شغل و انتظارات:</h4>
            <p className="text-slate-600 leading-relaxed">{vacancy.description}</p>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-2">مهارت‌ها و شرایط احراز:</h4>
            <div className="space-y-2 text-slate-600">
              <div>
                حداقل سابقه کار: <span className="font-bold text-slate-800">{toPersianDigits(vacancy.minimumYearsExperience)} سال</span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {vacancy.requiredSkills.map((sk) => (
                  <span
                    key={sk}
                    className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 text-[11px]"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Linked Candidates Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              متقاضیان در حال بررسی برای این فرصت ({toPersianDigits(linkedCandidates.length)} نفر)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              ترتیب اولویت با کارجویان دارای سابقه خدمت تاییدشده در مجموعه است
            </p>
          </div>
        </div>

        {linkedCandidates.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400">
            هنوز متقاضی‌ای به این موقعیت شغلی متصل نشده است.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="py-3 px-4 font-semibold">متقاضی</th>
                  <th className="py-3 px-3 font-semibold">شهر</th>
                  <th className="py-3 px-3 font-semibold">سابقه</th>
                  <th className="py-3 px-3 font-semibold">اولویت استخدامی</th>
                  <th className="py-3 px-3 font-semibold">شاخص تطابق الزامات</th>
                  <th className="py-3 px-3 font-semibold">مرحله ارزیابی</th>
                  <th className="py-3 px-4 font-semibold text-left">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {linkedCandidates.map(({ applicant, candidacy }) => (
                  <tr key={candidacy.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-medium text-slate-900 flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-semibold text-xs border border-slate-200 shrink-0">
                        {applicant.avatarInitials}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900">{applicant.fullName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{applicant.id}</div>
                      </div>
                    </td>

                    <td className="py-3 px-3">{applicant.residentialCity}</td>
                    <td className="py-3 px-3 font-mono tabular-nums">
                      {toPersianDigits(applicant.yearsOfExperience)} سال
                    </td>

                    <td className="py-3 px-3">
                      <PriorityBadge priority={applicant.groupPriority} size="sm" />
                    </td>

                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-teal-800 tabular-nums">
                          {toPersianDigits(candidacy.matchScorePercent || 85)}٪
                        </span>
                        <span className="text-[10px] text-slate-400">تطابق مهارت و شهر</span>
                      </div>
                    </td>

                    {/* Stage selector (Admin can change, viewer sees label) */}
                    <td className="py-3 px-3">
                      {userRole === 'ADMIN' ? (
                        <select
                          value={candidacy.stage}
                          onChange={(e) =>
                            handleStageChange(applicant.id, e.target.value as CandidacyStage)
                          }
                          className="p-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs font-medium focus:ring-1 focus:ring-teal-700"
                        >
                          <option value="NEW">جدید</option>
                          <option value="SCREENING">در حال بررسی</option>
                          <option value="SHORTLIST">فهرست نهایی</option>
                          <option value="INTERVIEW">مرحله مصاحبه</option>
                          <option value="ACCEPTED">پذیرفته‌شده (استخدام)</option>
                          <option value="REJECTED">عدم پذیرش</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded bg-slate-100 text-slate-800 font-medium">
                          {candidacy.stageLabel}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-left">
                      <button
                        onClick={() =>
                          navigateTo('applicant-detail', { applicantId: applicant.id })
                        }
                        className="text-teal-700 hover:text-teal-900 font-semibold text-xs"
                      >
                        پرونده کامل
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Link Candidate Modal */}
      {isLinkModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-right"
          role="dialog"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-lg p-5 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-sm">
                معرفی و اتصال کارجو به «{vacancy.title}»
              </h3>
              <button
                onClick={() => setIsLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleLinkSubmit} className="space-y-3.5">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  انتخاب متقاضی از استخر رزومه:
                </label>
                <select
                  value={selectedApplicantId}
                  onChange={(e) => setSelectedApplicantId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                  required
                >
                  <option value="">-- یک کارجو را انتخاب کنید --</option>
                  {unlinkedApplicants.map((app) => (
                    <option key={app.id} value={app.id}>
                      {app.fullName} ({app.primaryJobTitle}) - شهر {app.residentialCity} - اولویت: {app.groupPriority === 'VERIFIED_PARENT' ? 'سازمان مادر' : app.groupPriority === 'VERIFIED_SUBSIDIARY' ? 'زیرمجموعه' : 'آزاد'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  توضیحات معرفی / توصیه ارزیاب:
                </label>
                <textarea
                  value={linkNotes}
                  onChange={(e) => setLinkNotes(e.target.value)}
                  rows={2}
                  placeholder="دلیل معرفی یا انطباق برای این ردیف شغلی..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsLinkModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-700 text-white font-semibold rounded-lg hover:bg-teal-800"
                >
                  اتصال به موقعیت شغلی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
