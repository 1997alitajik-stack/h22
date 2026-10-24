import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  getApplicantById,
  updateEmploymentVerification,
} from '../../services/mockService';
import {
  Applicant,
  VerificationStatus,
  GroupEmploymentPriority,
} from '../../types';
import { toPersianDigits } from '../../lib/persianUtils';
import { PriorityBadge } from '../../components/ui/PriorityBadge';
import { StatusBadge, VerificationStatusBadge } from '../../components/ui/StatusBadge';
import { AttachmentCenter } from '../attachments/AttachmentCenter';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Briefcase,
  GraduationCap,
  Award,
  Wrench,
  HeartHandshake,
  Building2,
  FileText,
  Layers,
  FileCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Edit,
  Eye,
  EyeOff,
  Check,
  X,
  MessageSquare,
  ShieldCheck,
  ChevronLeft,
} from 'lucide-react';

interface ApplicantProfileProps {
  applicantId: string;
}

type TabType =
  | 'identity'
  | 'employment'
  | 'education'
  | 'skills_certs'
  | 'preferences'
  | 'group_priority'
  | 'attachments'
  | 'vacancies'
  | 'notes';

export const ApplicantProfile: React.FC<ApplicantProfileProps> = ({ applicantId }) => {
  const { navigateTo, userRole, showToast } = useApp();
  const [applicant, setApplicant] = useState<Applicant | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('identity');
  const [unmaskSensitive, setUnmaskSensitive] = useState(false);

  // Verification modal state for admin
  const [verifyingRecordId, setVerifyingRecordId] = useState<string | null>(null);
  const [targetStatus, setTargetStatus] = useState<VerificationStatus>('VERIFIED');
  const [reviewerNotes, setReviewerNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // New admin note
  const [newNoteContent, setNewNoteContent] = useState('');

  const loadData = () => {
    setLoading(true);
    getApplicantById(applicantId).then((data) => {
      setApplicant(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [applicantId]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 animate-pulse space-y-4">
        <div className="h-28 bg-slate-200 rounded-xl max-w-4xl mx-auto" />
        <div className="h-64 bg-slate-200 rounded-xl max-w-4xl mx-auto" />
      </div>
    );
  }

  if (!applicant) {
    return (
      <div className="p-12 text-center text-slate-600 space-y-4">
        <h3 className="text-base font-semibold">متقاضی با این شناسه یافت نشد</h3>
        <button
          onClick={() => navigateTo('applicants')}
          className="px-4 py-2 text-xs bg-teal-700 text-white rounded-lg"
        >
          بازگشت به بانک متقاضیان
        </button>
      </div>
    );
  }

  const handleVerificationSubmit = async () => {
    if (!verifyingRecordId) return;
    setIsVerifying(true);
    try {
      await updateEmploymentVerification(
        applicant.id,
        verifyingRecordId,
        targetStatus,
        reviewerNotes.trim() || 'وضعیت توسط مدیر سامانه در محیط آزمایشی بررسی شد.',
        'علی رستمی (مدیر سامانه)'
      );
      showToast('وضعیت استعلام سابقه و اولویت استخدامی متقاضی با موفقیت به‌روزرسانی شد.', 'success');
      setVerifyingRecordId(null);
      setReviewerNotes('');
      loadData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت استعلام', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteContent.trim()) return;

    const note = {
      id: `NOT-${Date.now().toString().slice(-4)}`,
      authorName: userRole === 'ADMIN' ? 'علی رستمی' : 'کاربر مشاهده‌گر منابع انسانی',
      authorRole: userRole === 'ADMIN' ? 'مدیر سامانه' : 'کارشناس منابع انسانی',
      createdAt: '۱۴۰۳/۰۸/۱۲',
      content: newNoteContent.trim(),
      isConfidential: false,
    };

    setApplicant((prev) => (prev ? { ...prev, internalNotes: [note, ...prev.internalNotes] } : null));
    setNewNoteContent('');
    showToast('یادداشت اداری با موفقیت ثبت شد.', 'success');
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'identity', label: 'اطلاعات هویتی و تماس' },
    { id: 'employment', label: 'سوابق شغلی', count: applicant.employmentHistory.length },
    { id: 'education', label: 'سوابق تحصیلی', count: applicant.educationHistory.length },
    { id: 'skills_certs', label: 'مهارت‌ها و مدارک' },
    { id: 'preferences', label: 'ترجیحات شغلی' },
    { id: 'group_priority', label: 'سابقه در سازمان مادر و زیرمجموعه' },
    { id: 'attachments', label: 'رزومه و پیوست‌ها', count: applicant.attachments.length },
    { id: 'vacancies', label: 'فرصت‌های مرتبط', count: applicant.candidacies.length },
    { id: 'notes', label: 'یادداشت‌های اداری', count: applicant.internalNotes.length },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto text-right">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigateTo('applicants')}
          className="text-xs text-slate-500 hover:text-teal-800 transition-colors flex items-center gap-1.5"
        >
          <ArrowRight className="w-4 h-4" />
          <span>بازگشت به فهرست متقاضیان</span>
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-5 text-center sm:text-right">
            {/* Initials Placeholder */}
            <div className="w-20 h-20 rounded-2xl bg-teal-900 text-white flex items-center justify-center font-bold text-2xl shadow-md border-2 border-teal-700 shrink-0">
              {applicant.avatarInitials}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">{applicant.fullName}</h2>
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 tabular-nums">
                  {applicant.id}
                </span>
                <StatusBadge status={applicant.recruitmentStatus} size="sm" />
              </div>

              <div className="text-xs font-medium text-slate-600">
                {applicant.primaryJobTitle}
                <span className="text-slate-400 mx-1.5">·</span>
                <span className="text-slate-500">{applicant.primaryJobCategory}</span>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{applicant.residentialCity}</span>
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>تاریخ ثبت: {applicant.registeredAt}</span>
                </span>
                <span>·</span>
                <span>سابقه کار: {toPersianDigits(applicant.yearsOfExperience)} سال</span>
              </div>

              {/* Priority badge on header */}
              <div className="pt-2">
                <PriorityBadge priority={applicant.groupPriority} size="md" />
              </div>
            </div>
          </div>

          {/* Header Actions & Profile completeness */}
          <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
            {userRole === 'ADMIN' && (
              <button
                onClick={() =>
                  navigateTo('applicant-form', { applicantId: applicant.id, isEditing: true })
                }
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-1.5"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>ویرایش اطلاعات پرونده</span>
              </button>
            )}

            <div className="w-full sm:w-48 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-center sm:text-right">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-500">تکمیل پرونده:</span>
                <span className="font-mono font-bold text-slate-900 tabular-nums">
                  {toPersianDigits(applicant.profileCompleteness)}٪
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    applicant.profileCompleteness >= 85
                      ? 'bg-emerald-600'
                      : applicant.profileCompleteness >= 60
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${applicant.profileCompleteness}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Priority Reason Explanation Box */}
        <div className="mt-5 p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Building2 className="w-4 h-4 text-teal-700 shrink-0" />
            <span className="font-semibold text-slate-900">وضعیت سابقه در مجموعه:</span>
            <span>{applicant.groupPriorityReason}</span>
          </div>

          {userRole === 'ADMIN' && applicant.employmentHistory.some((e) => e.isGroupEntity) && (
            <button
              onClick={() => setActiveTab('group_priority')}
              className="text-teal-800 font-semibold hover:underline shrink-0"
            >
              مدیریت و استعلام سابقه ←
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex items-center gap-1 overflow-x-auto no-scrollbar pb-px text-xs font-medium">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-3.5 whitespace-nowrap transition-colors border-b-2 flex items-center gap-1.5 ${
                isActive
                  ? 'border-teal-700 text-teal-900 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono tabular-nums ${
                    isActive ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {toPersianDigits(tab.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 sm:p-6 min-h-[380px]">
        {/* A. Identity & Contact */}
        {activeTab === 'identity' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">مشخصات هویتی و ارتباطی</h4>
              {userRole === 'ADMIN' && (
                <button
                  type="button"
                  onClick={() => setUnmaskSensitive(!unmaskSensitive)}
                  className="px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors flex items-center gap-1.5"
                >
                  {unmaskSensitive ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{unmaskSensitive ? 'ماسک کردن کد ملی و تلفن' : 'نمایش کامل اطلاعات حساس'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-medium">نام و نام خانوادگی:</span>
                <div className="font-semibold text-slate-900">{applicant.fullName}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">نام پدر:</span>
                <div className="font-semibold text-slate-900">{applicant.fatherName}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">کد ملی:</span>
                <div className="font-mono font-semibold text-slate-900 tabular-nums">
                  {unmaskSensitive ? applicant.nationalIdFull : applicant.nationalIdMasked}
                  {!unmaskSensitive && (
                    <span className="text-[10px] text-slate-400 mr-2">(جهت حفظ حریم خصوصی ماسک شده)</span>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">تاریخ تولد:</span>
                <div className="font-semibold text-slate-900">{applicant.birthDate}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">محل صدور / تولد:</span>
                <div className="font-semibold text-slate-900">{applicant.birthPlace}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">شهر محل سکونت:</span>
                <div className="font-semibold text-slate-900">{applicant.residentialCity}</div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">شماره تماس اصلی:</span>
                <div className="font-mono font-semibold text-slate-900 dir-ltr text-right">
                  {unmaskSensitive ? applicant.phoneNumberFull : applicant.phoneNumberMasked}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">تلفن جایگزین / ثابت:</span>
                <div className="font-mono font-semibold text-slate-900 dir-ltr text-right">
                  {applicant.alternativePhone || 'ثبت نشده'}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-slate-400 font-medium">پست الکترونیک (ایمیل):</span>
                <div className="font-mono text-slate-900 dir-ltr text-right">{applicant.email}</div>
              </div>

              <div className="sm:col-span-2 lg:col-span-3 space-y-1 pt-2 border-t border-slate-100">
                <span className="text-slate-400 font-medium">نشانی محل سکونت:</span>
                <div className="text-slate-800">
                  {userRole === 'ADMIN' && unmaskSensitive ? (
                    applicant.addressSummary
                  ) : (
                    <span className="text-slate-500 italic">
                      استان و شهر: {applicant.residentialCity} (جزییات دقیق آدرس به دلیل طبقه‌بندی محرمانگی مخفی است)
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* B. Employment Records */}
        {activeTab === 'employment' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                سوابق کاری و تجربیات شغلی ({toPersianDigits(applicant.employmentHistory.length)} سابقه)
              </h4>
              <span className="text-xs text-slate-400">به ترتیب زمانی از جدیدترین</span>
            </div>

            {applicant.employmentHistory.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
                هیچ سابقه کاری ثبت نشده است.
              </div>
            ) : (
              <div className="space-y-4">
                {applicant.employmentHistory.map((emp) => (
                  <div
                    key={emp.id}
                    className={`p-4 rounded-xl border transition-all ${
                      emp.isGroupEntity
                        ? 'bg-teal-50/20 border-teal-200'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="font-bold text-slate-900 text-sm">{emp.jobTitle}</h5>
                          {emp.isCurrent && (
                            <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">
                              شاغل در حال حاضر
                            </span>
                          )}
                          {emp.isGroupEntity && (
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                              {emp.groupEntityType === 'PARENT' ? 'ستاد سازمان مادر' : 'شرکت زیرمجموعه'}
                            </span>
                          )}
                        </div>
                        <div className="text-xs font-semibold text-slate-700 mt-0.5">
                          {emp.employerName} {emp.projectName ? `· پروژه ${emp.projectName}` : ''}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <VerificationStatusBadge status={emp.verificationStatus} size="sm" />
                        {userRole === 'ADMIN' && emp.isGroupEntity && (
                          <button
                            onClick={() => {
                              setVerifyingRecordId(emp.id);
                              setTargetStatus(emp.verificationStatus);
                              setReviewerNotes(emp.verificationNotes || '');
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 rounded border border-teal-200"
                          >
                            بررسی و تایید سابقه
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-xs text-slate-500 mb-2 flex items-center gap-3">
                      <span>دوره همکاری: {emp.startDate} تا {emp.isCurrent ? 'اکنون' : emp.endDate}</span>
                      <span>·</span>
                      <span>شهر: {emp.city}</span>
                      {emp.lastSalary && userRole === 'ADMIN' && unmaskSensitive && (
                        <>
                          <span>·</span>
                          <span className="text-rose-700 font-medium">آخرین حقوق دریافتی: {emp.lastSalary}</span>
                        </>
                      )}
                    </div>

                    <div className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-100">
                      <span className="font-medium text-slate-900 block mb-1">شرح وظایف و دستاوردها:</span>
                      {emp.responsibilities}
                    </div>

                    {emp.verificationNotes && (
                      <div className="mt-2 text-xs text-teal-900 bg-teal-50 p-2.5 rounded-lg border border-teal-200">
                        <span className="font-semibold">یادداشت تأیید کارگزینی: </span>
                        <span>{emp.verificationNotes}</span>
                        {emp.verifiedBy && (
                          <span className="text-teal-700 font-mono text-[11px] block mt-0.5">
                            (تأییدکننده: {emp.verifiedBy} در تاریخ {emp.verifiedAt})
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* C. Education Records */}
        {activeTab === 'education' && (
          <div className="space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                سوابق تحصیلی و دانشگاهی ({toPersianDigits(applicant.educationHistory.length)} مقطع)
              </h4>
            </div>

            <div className="space-y-4">
              {applicant.educationHistory.map((edu) => (
                <div key={edu.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <h5 className="font-bold text-slate-900 text-sm">
                      {edu.degreeTitle} - {edu.fieldOfStudy}
                    </h5>
                    {edu.gpa && (
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-semibold tabular-nums">
                        معدل: {toPersianDigits(edu.gpa)}
                      </span>
                    )}
                  </div>
                  <div className="text-slate-600 font-medium">
                    {edu.institutionName} · شهر {edu.city}
                  </div>
                  <div className="text-slate-400">
                    دوره تحصیل: {edu.startDate} تا {edu.endDate || 'در حال تحصیل'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* D. Skills & Certifications */}
        {activeTab === 'skills_certs' && (
          <div className="space-y-6">
            <div>
              <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
                مهارت‌ها و توانمندی‌های تخصصی
              </h4>
              <div className="flex flex-wrap gap-2">
                {applicant.skills.map((skill) => (
                  <span
                    key={skill.id}
                    className="px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-800 text-xs font-medium flex items-center gap-1.5"
                  >
                    <span>{skill.name}</span>
                    <span className="text-[10px] text-teal-800 font-mono">
                      ({skill.level === 'EXPERT' ? 'تسلط عالی' : skill.level === 'ADVANCED' ? 'پیشرفته' : 'متوسط'})
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3 mb-4">
                گواهینامه‌ها و دوره‌های آموزشی
              </h4>
              {applicant.certificates.length === 0 ? (
                <div className="p-4 text-xs text-slate-400 bg-slate-50 rounded-lg">
                  گواهینامه‌ای ثبت نشده است.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {applicant.certificates.map((crt) => (
                    <div
                      key={crt.id}
                      className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-semibold text-slate-900">{crt.title}</div>
                        <div className="text-slate-500 text-[11px] mt-0.5">
                          مرجع صدور: {crt.issuingOrganization} · تاریخ صدور: {crt.issueDate}
                        </div>
                      </div>
                      <VerificationStatusBadge status={crt.verificationStatus} size="sm" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* E. Job Preferences */}
        {activeTab === 'preferences' && (
          <div className="space-y-4 text-xs">
            <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              علایق و ترجیحات کاری
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-medium">عناوین شغلی مورد علاقه:</span>
                <div className="font-semibold text-slate-900">
                  {applicant.preferences.preferredTitles.join(' · ') || 'ثبت نشده'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-medium">شهرهای مورد نظر برای فعالیت:</span>
                <div className="font-semibold text-slate-900">
                  {applicant.preferences.preferredCities.join(' · ') || 'تهران'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-medium">آمادگی اعزام به کارگاه / مأموریت:</span>
                <div className="font-semibold text-slate-900">
                  {applicant.preferences.willingToTravelSites ? 'بله، آماده مأموریت پروژه‌ای' : 'خیر، فقط دفتر مرکزی'}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-medium">حداقل حقوق پیشنهادی:</span>
                <div className="font-semibold text-slate-900">
                  {applicant.preferences.expectedSalaryMin || 'طبق ضوابط طرح طبقه‌بندی مشاغل'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* F. Group Priority Detailed Section (Section 13) */}
        {activeTab === 'group_priority' && (
          <div className="space-y-6 text-xs">
            <div className="border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                سوابق خدمت و اولویت استخدام در سازمان مادر و شرکت‌های تابعه
              </h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                متقاضیان دارای سابقه تاییدشده در مجموعه، بر اساس آیین‌نامه اداری اولویت دارند.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-800">طبقه‌بندی اولویت کنونی:</span>
                <PriorityBadge priority={applicant.groupPriority} size="md" />
              </div>
              <p className="text-slate-600 leading-relaxed">{applicant.groupPriorityReason}</p>
            </div>

            <div className="space-y-3">
              <h5 className="font-semibold text-slate-900">
                سوابق احراز شده مرتبط با خانواده سازمان:
              </h5>
              {applicant.employmentHistory.filter((e) => e.isGroupEntity).length === 0 ? (
                <div className="p-6 text-center text-slate-400 bg-slate-50 rounded-lg">
                  هیچ سابقه‌ای مرتبط با سازمان یا شرکت‌های تابعه برای این کارجو ثبت نشده است.
                </div>
              ) : (
                applicant.employmentHistory
                  .filter((e) => e.isGroupEntity)
                  .map((e) => (
                    <div
                      key={e.id}
                      className="p-4 rounded-xl border border-teal-200 bg-teal-50/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="font-bold text-slate-900 text-sm">
                          {e.employerName} - {e.jobTitle}
                        </div>
                        <div className="text-slate-600">
                          {e.projectName ? `پروژه: ${e.projectName} · ` : ''}شهر: {e.city} · دوره: {e.startDate} تا {e.endDate || 'اکنون'}
                        </div>
                        {e.verificationNotes && (
                          <div className="text-teal-900 font-medium">
                            توضیح کارگزینی: {e.verificationNotes}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <VerificationStatusBadge status={e.verificationStatus} size="md" />
                        {userRole === 'ADMIN' && (
                          <button
                            onClick={() => {
                              setVerifyingRecordId(e.id);
                              setTargetStatus(e.verificationStatus);
                              setReviewerNotes(e.verificationNotes || '');
                            }}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white transition-colors"
                          >
                            تغییر وضعیت استعلام
                          </button>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        )}

        {/* G. Attachments Center (Section 12) */}
        {activeTab === 'attachments' && (
          <AttachmentCenter
            applicantId={applicant.id}
            applicantName={applicant.fullName}
            attachments={applicant.attachments}
            onAttachmentChanged={loadData}
          />
        )}

        {/* H. Associated Vacancies / Candidacies */}
        {activeTab === 'vacancies' && (
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">
                موقعیت‌های شغلی متصل به این متقاضی ({toPersianDigits(applicant.candidacies.length)})
              </h4>
            </div>

            {applicant.candidacies.length === 0 ? (
              <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl">
                این متقاضی هنوز به ردیف شغلی خاصی متصل نشده است.
              </div>
            ) : (
              <div className="space-y-3">
                {applicant.candidacies.map((c) => (
                  <div
                    key={c.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <h5 className="font-bold text-slate-900 text-sm">{c.vacancyTitle}</h5>
                      <div className="text-slate-500 mt-1">
                        تاریخ اتصال: {c.appliedDate} {c.matchScorePercent ? `· تطابق تقریبی: ${toPersianDigits(c.matchScorePercent)}٪` : ''}
                      </div>
                      {c.notes && <div className="text-slate-600 mt-1 font-medium">{c.notes}</div>}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-3 py-1 rounded bg-teal-50 text-teal-800 font-semibold border border-teal-200">
                        {c.stageLabel}
                      </span>
                      <button
                        onClick={() => navigateTo('vacancy-detail', { vacancyId: c.vacancyId })}
                        className="text-teal-700 hover:underline"
                      >
                        مشاهده ردیف ←
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* I. Administrative Notes & Audit */}
        {activeTab === 'notes' && (
          <div className="space-y-6 text-xs">
            <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              یادداشت‌های اداری کارشناسان جذب و کارگزینی
            </h4>

            {/* Note creation for Admin */}
            {userRole === 'ADMIN' ? (
              <form onSubmit={handleAddNote} className="space-y-2">
                <textarea
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="ثبت یادداشت محرمانه یا نظر مصاحبه‌کننده در مورد این کارجو..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-teal-700 text-xs"
                />
                <button
                  type="submit"
                  disabled={!newNoteContent.trim()}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white disabled:opacity-50 transition-colors"
                >
                  ثبت یادداشت در پرونده
                </button>
              </form>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg text-slate-500 text-center">
                در حالت کاربر مشاهده‌گر، امکان ثبت یادداشت جدید وجود ندارد.
              </div>
            )}

            <div className="space-y-3 pt-3">
              {applicant.internalNotes.length === 0 ? (
                <div className="p-4 text-center text-slate-400">یادداشتی ثبت نشده است.</div>
              ) : (
                applicant.internalNotes.map((note) => (
                  <div key={note.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-800">{note.authorName} ({note.authorRole})</span>
                      <span>{note.createdAt}</span>
                    </div>
                    <p className="text-slate-800 leading-relaxed">{note.content}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Admin Employment Verification Modal */}
      {verifyingRecordId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs text-right"
          role="dialog"
        >
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 text-xs">
            <h4 className="font-bold text-slate-900 text-sm">
              بررسی و استعلام سوابق همکاری در سازمان
            </h4>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                نتیجه بررسی استعلام کارگزینی:
              </label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as VerificationStatus)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="VERIFIED">تأیید رسمی سابقه همکاری در گروه (اعطای اولویت)</option>
                <option value="PENDING">در حال استعلام از شعبه / کارگزینی</option>
                <option value="REJECTED">رد سابقه (احراز نشد / مستندات ناکافی)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                توضیحات و مستند استعلام (شماره نامه کارگزینی، سوابق بیمه):
              </label>
              <textarea
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                rows={3}
                placeholder="توضیح دلایل تأیید یا رد..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setVerifyingRecordId(null)}
                className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100"
              >
                انصراف
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerificationSubmit}
                className="px-4 py-2 rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800"
              >
                {isVerifying ? 'در حال ثبت...' : 'ثبت نتیجه استعلام'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
