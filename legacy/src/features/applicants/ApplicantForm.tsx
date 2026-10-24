import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Applicant,
  EmploymentRecord,
  EducationRecord,
  DegreeLevel,
  GroupEmploymentPriority,
} from '../../types';
import {
  getApplicantById,
  createApplicant,
  updateApplicant,
  listSubsidiaries,
} from '../../services/mockService';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import {
  User,
  Briefcase,
  GraduationCap,
  Award,
  Sliders,
  Plus,
  Trash2,
  Save,
  X,
  AlertCircle,
  Building2,
  CheckCircle2,
} from 'lucide-react';

interface ApplicantFormProps {
  applicantId?: string;
  isEditing?: boolean;
}

export const ApplicantForm: React.FC<ApplicantFormProps> = ({
  applicantId,
  isEditing = false,
}) => {
  const { navigateTo, showToast } = useApp();

  const [activeStep, setActiveStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Form Fields - Step 1: Identity & Contact
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [fatherName, setFatherName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [birthDate, setBirthDate] = useState('۱۳۷۰/۰۱/۰۱');
  const [birthPlace, setBirthPlace] = useState('تهران');
  const [residentialCity, setResidentialCity] = useState('تهران');
  const [addressSummary, setAddressSummary] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');

  // Primary Profession
  const [primaryJobTitle, setPrimaryJobTitle] = useState('');
  const [primaryJobCategory, setPrimaryJobCategory] = useState('مهندسی عمران و سازه');
  const [yearsOfExperience, setYearsOfExperience] = useState<number>(5);

  // Step 2: Employment History (Repeatable)
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentRecord[]>([
    {
      id: 'EMP-TEMP-1',
      employerName: '',
      isGroupEntity: false,
      groupEntityType: 'EXTERNAL',
      city: 'تهران',
      jobTitle: '',
      startDate: '۱۳۹۸/۰۱/۰۱',
      endDate: '۱۴۰۲/۱۲/۲۹',
      isCurrent: false,
      responsibilities: '',
      lastSalary: '',
      verificationStatus: 'NOT_APPLICABLE',
    },
  ]);

  // Step 3: Education History (Repeatable)
  const [educationHistory, setEducationHistory] = useState<EducationRecord[]>([
    {
      id: 'EDU-TEMP-1',
      degreeLevel: 'BACHELOR',
      degreeTitle: 'کارشناسی مهندسی عمران',
      fieldOfStudy: 'عمران',
      institutionName: '',
      city: 'تهران',
      startDate: '۱۳۸۸/۰۷/۰۱',
      endDate: '۱۳۹۲/۰۴/۱۵',
      isStudying: false,
      gpa: '',
    },
  ]);

  // Step 4: Skills & Preferences
  const [skillsString, setSkillsString] = useState('AutoCAD, نقشه‌خوانی, گزارش‌نویسی فنی');
  const [preferredTitlesString, setPreferredTitlesString] = useState('سرپرست کارگاه, مهندس ناظر');
  const [willingToTravel, setWillingToTravel] = useState(true);
  const [expectedSalary, setExpectedSalary] = useState('۲۵ میلیون تومان');

  // Load existing data if editing
  useEffect(() => {
    if (isEditing && applicantId) {
      getApplicantById(applicantId).then((app) => {
        if (app) {
          setFirstName(app.firstName);
          setLastName(app.lastName);
          setFatherName(app.fatherName);
          setNationalId(app.nationalIdFull);
          setBirthDate(app.birthDate);
          setBirthPlace(app.birthPlace);
          setResidentialCity(app.residentialCity);
          setAddressSummary(app.addressSummary);
          setPhoneNumber(app.phoneNumberFull);
          setEmail(app.email);
          setPrimaryJobTitle(app.primaryJobTitle);
          setPrimaryJobCategory(app.primaryJobCategory);
          setYearsOfExperience(app.yearsOfExperience);
          setEmploymentHistory(app.employmentHistory);
          setEducationHistory(app.educationHistory);
          setSkillsString(app.skills.map((s) => s.name).join(', '));
          setPreferredTitlesString(app.preferences.preferredTitles.join(', '));
          setWillingToTravel(app.preferences.willingToTravelSites);
          setExpectedSalary(app.preferences.expectedSalaryMin || '');
        }
      });
    }
  }, [isEditing, applicantId]);

  // Handle employment record modification
  const handleAddEmployment = () => {
    setEmploymentHistory((prev) => [
      ...prev,
      {
        id: `EMP-TEMP-${Date.now()}`,
        employerName: '',
        isGroupEntity: false,
        groupEntityType: 'EXTERNAL',
        city: residentialCity,
        jobTitle: '',
        startDate: '۱۴۰۰/۰۱/۰۱',
        isCurrent: true,
        responsibilities: '',
        verificationStatus: 'NOT_APPLICABLE',
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveEmployment = (id: string) => {
    setEmploymentHistory((prev) => prev.filter((e) => e.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateEmploymentItem = (id: string, updates: Partial<EmploymentRecord>) => {
    setEmploymentHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    setHasUnsavedChanges(true);
  };

  // Handle education record modification
  const handleAddEducation = () => {
    setEducationHistory((prev) => [
      ...prev,
      {
        id: `EDU-TEMP-${Date.now()}`,
        degreeLevel: 'BACHELOR',
        degreeTitle: 'کارشناسی',
        fieldOfStudy: '',
        institutionName: '',
        city: residentialCity,
        startDate: '۱۳۹۲/۰۷/۰۱',
        endDate: '۱۳۹۶/۰۴/۰۱',
        isStudying: false,
      },
    ]);
    setHasUnsavedChanges(true);
  };

  const handleRemoveEducation = (id: string) => {
    setEducationHistory((prev) => prev.filter((e) => e.id !== id));
    setHasUnsavedChanges(true);
  };

  const updateEducationItem = (id: string, updates: Partial<EducationRecord>) => {
    setEducationHistory((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
    setHasUnsavedChanges(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!firstName.trim() || !lastName.trim() || !primaryJobTitle.trim()) {
      showToast('لطفاً نام، نام خانوادگی و عنوان شغلی متقاضی را وارد فرمایید.', 'warning');
      return;
    }

    setIsSubmitting(true);

    // Calculate priority based on employment entries
    const hasParent = employmentHistory.some(
      (e) => e.isGroupEntity && e.groupEntityType === 'PARENT'
    );
    const hasSub = employmentHistory.some(
      (e) => e.isGroupEntity && e.groupEntityType === 'SUBSIDIARY'
    );

    let calculatedPriority: GroupEmploymentPriority = 'NO_GROUP_HISTORY';
    let priorityReason = 'فاقد سابقه قبلی در مجموعه سازمان';

    if (hasParent) {
      calculatedPriority = 'VERIFIED_PARENT';
      priorityReason = 'سابقه همکاری ثبت‌شده در ستاد سازمان مادر';
    } else if (hasSub) {
      calculatedPriority = 'VERIFIED_SUBSIDIARY';
      priorityReason = 'سابقه همکاری ثبت‌شده در شرکت‌های زیرمجموعه سازمان';
    }

    const initials = `${firstName.trim().charAt(0)}‌${lastName.trim().charAt(0)}`;
    const parsedSkills = skillsString
      .split(/[,،]/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name, idx) => ({
        id: `SK-NEW-${idx}`,
        name,
        category: 'TECHNICAL' as const,
        level: 'ADVANCED' as const,
      }));

    const cleanNational = nationalId.trim() || '۰۰۱۸۲۳۴۵۶۷';
    const maskedNat = `${cleanNational.slice(0, 3)}-******-${cleanNational.slice(-1)}`;

    try {
      if (isEditing && applicantId) {
        await updateApplicant(applicantId, {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          fatherName: fatherName.trim(),
          nationalIdFull: cleanNational,
          nationalIdMasked: maskedNat,
          birthDate,
          birthPlace,
          residentialCity,
          addressSummary: addressSummary.trim(),
          phoneNumberFull: phoneNumber.trim() || '۰۹۱۲۳۴۵۶۷۸۹',
          phoneNumberMasked: `${(phoneNumber.trim() || '۰۹۱۲۳۴۵۶۷۸۹').slice(0, 4)}-***-${(phoneNumber.trim() || '۰۹۱۲۳۴۵۶۷۸۹').slice(-4)}`,
          email: email.trim(),
          primaryJobTitle: primaryJobTitle.trim(),
          primaryJobCategory,
          yearsOfExperience: Number(yearsOfExperience),
          highestDegree: educationHistory[0]?.degreeLevel || 'BACHELOR',
          highestDegreeTitle: educationHistory[0]?.degreeTitle || 'کارشناسی',
          highestFieldOfStudy: educationHistory[0]?.fieldOfStudy || 'عمران',
          employmentHistory,
          educationHistory,
          skills: parsedSkills,
          preferences: {
            preferredTitles: preferredTitlesString.split(/[,،]/).map((s) => s.trim()),
            preferredCities: [residentialCity],
            willingToRelocate: false,
            willingToTravelSites: willingToTravel,
            employmentTypes: ['FULL_TIME'],
            expectedSalaryMin: expectedSalary,
            availabilityTimeline: 'آماده به کار ظرف ۲ هفته',
          },
        });
        showToast('اطلاعات متقاضی با موفقیت در محیط آزمایشی ذخیره شد.', 'success');
        navigateTo('applicant-detail', { applicantId });
      } else {
        const created = await createApplicant({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          fullName: `${firstName.trim()} ${lastName.trim()}`,
          fatherName: fatherName.trim() || 'محمد',
          nationalIdFull: cleanNational,
          nationalIdMasked: maskedNat,
          birthDate,
          birthPlace,
          residentialCity,
          addressSummary: addressSummary.trim() || `${residentialCity}، خیابان آزادی`,
          phoneNumberFull: phoneNumber.trim() || '۰۹۱۲۱۱۱۱۱۱۱',
          phoneNumberMasked: '۰۹۱۲-***-۱۱۱۱',
          email: email.trim() || 'candidate@example.ir',
          avatarInitials: initials,
          primaryJobTitle: primaryJobTitle.trim(),
          primaryJobCategory,
          yearsOfExperience: Number(yearsOfExperience),
          highestDegree: educationHistory[0]?.degreeLevel || 'BACHELOR',
          highestDegreeTitle: educationHistory[0]?.degreeTitle || 'کارشناسی',
          highestFieldOfStudy: educationHistory[0]?.fieldOfStudy || 'عمران',
          groupPriority: calculatedPriority,
          groupPriorityReason: priorityReason,
          recruitmentStatus: 'NEW',
          profileCompleteness: 85,
          employmentHistory,
          educationHistory,
          certificates: [],
          skills: parsedSkills,
          preferences: {
            preferredTitles: preferredTitlesString.split(/[,،]/).map((s) => s.trim()),
            preferredCities: [residentialCity],
            willingToRelocate: false,
            willingToTravelSites: willingToTravel,
            employmentTypes: ['FULL_TIME'],
            expectedSalaryMin: expectedSalary,
            availabilityTimeline: 'آماده به کار فوری',
          },
          attachments: [],
          candidacies: [],
          internalNotes: [],
        });
        showToast('پرونده متقاضی جدید با موفقیت ایجاد گردید.', 'success');
        navigateTo('applicant-detail', { applicantId: created.id });
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در ثبت اطلاعات', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'مشخصات هویتی و تخصصی' },
    { num: 2, title: 'سوابق کاری و سازمانی' },
    { num: 3, title: 'سوابق تحصیلی' },
    { num: 4, title: 'مهارت‌ها و ترجیحات شغلی' },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto text-right">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            {isEditing ? 'ویرایش پرونده متقاضی' : 'ثبت پرونده متقاضی جدید'}
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            فرم چندبخشی با قابلیت ثبت سوابق نامحدود و تعیین خودکار اولویت سازمانی
          </p>
        </div>

        <button
          onClick={() => {
            if (hasUnsavedChanges) setShowDiscardModal(true);
            else navigateTo('applicants');
          }}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          title="انصراف و خروج"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Stepper Navigation */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
        {steps.map((st) => (
          <button
            key={st.num}
            type="button"
            onClick={() => setActiveStep(st.num)}
            className={`p-3 rounded-xl border text-right transition-all flex items-center gap-2.5 ${
              activeStep === st.num
                ? 'bg-teal-50 border-teal-300 text-teal-900 font-bold shadow-2xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-[11px] shrink-0 ${
                activeStep === st.num ? 'bg-teal-700 text-white' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {st.num}
            </span>
            <span className="truncate">{st.title}</span>
          </button>
        ))}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Step 1: Identity & Profession */}
        {activeStep === 1 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-xs">
            <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              بخش ۱: اطلاعات هویتی، تماس و عنوان شغلی اصلی
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  نام <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  placeholder="مثال: حسین"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  نام خانوادگی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  placeholder="مثال: مرادی"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">نام پدر</label>
                <input
                  type="text"
                  value={fatherName}
                  onChange={(e) => {
                    setFatherName(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  placeholder="نام پدر"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  کد ملی (۱۰ رقم)
                </label>
                <input
                  type="text"
                  value={nationalId}
                  onChange={(e) => {
                    setNationalId(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-left dir-ltr"
                  placeholder="0018239428"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">تاریخ تولد</label>
                <input
                  type="text"
                  value={birthDate}
                  onChange={(e) => {
                    setBirthDate(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  placeholder="۱۳۷۰/۰۵/۱۴"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">شهر محل سکونت</label>
                <input
                  type="text"
                  value={residentialCity}
                  onChange={(e) => {
                    setResidentialCity(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  placeholder="تهران"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">شماره تماس اصلی</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-left dir-ltr"
                  placeholder="09123456789"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">پست الکترونیک (ایمیل)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-left dir-ltr"
                  placeholder="applicant@example.com"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  سابقه کار مفید (سال)
                </label>
                <input
                  type="number"
                  min="0"
                  max="45"
                  value={yearsOfExperience}
                  onChange={(e) => {
                    setYearsOfExperience(Number(e.target.value));
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700 font-mono text-left dir-ltr"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-700 font-medium mb-1">
                  عنوان شغلی اصلی / پست تخصصی <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={primaryJobTitle}
                  onChange={(e) => {
                    setPrimaryJobTitle(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  placeholder="مثال: سرپرست کارگاه سازه بتنی یا کارشناس حسابداری"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  دسته‌بندی شغلی
                </label>
                <select
                  value={primaryJobCategory}
                  onChange={(e) => {
                    setPrimaryJobCategory(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                >
                  <option value="مهندسی عمران و سازه">مهندسی عمران و سازه</option>
                  <option value="معماری و شهرسازی">معماری و شهرسازی</option>
                  <option value="نظارت کارگاهی و کنترل پروژه">نظارت کارگاهی و کنترل پروژه</option>
                  <option value="تأسیسات مکانیکی و برقی">تأسیسات مکانیکی و برقی</option>
                  <option value="تکنسین فنی و تعمیرات">تکنسین فنی و تعمیرات</option>
                  <option value="امور مالی و حسابداری">امور مالی و حسابداری</option>
                  <option value="منابع انسانی و اداری">منابع انسانی و اداری</option>
                  <option value="حمل و نقل و لجستیک">حمل و نقل و لجستیک</option>
                  <option value="خدمات عمومی و پذیرایی">خدمات عمومی و پذیرایی</option>
                  <option value="حفاظت فیزیکی و انتظامات">حفاظت فیزیکی و انتظامات</option>
                </select>
              </div>

              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-slate-700 font-medium mb-1">نشانی سکونت</label>
                <input
                  type="text"
                  value={addressSummary}
                  onChange={(e) => {
                    setAddressSummary(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-700"
                  placeholder="تهران، منطقه ۲، خیابان آزادی، ..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Employment History (Repeatable) */}
        {activeStep === 2 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  بخش ۲: سوابق شغلی (سازمانی و غیرسازمانی)
                </h4>
                <p className="text-slate-500 text-[11px] mt-0.5">
                  علامت زدن «سابقه در ستاد سازمان مادر یا شرکت‌های تابعه» باعث احتساب اولویت جذب برای کارجو می‌شود.
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddEmployment}
                className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن سابقه کاری جدید</span>
              </button>
            </div>

            <div className="space-y-4">
              {employmentHistory.map((emp, index) => (
                <div
                  key={emp.id}
                  className={`p-4 rounded-xl border relative space-y-3 ${
                    emp.isGroupEntity ? 'bg-teal-50/20 border-teal-300' : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">
                      سابقه شماره {index + 1}
                    </span>
                    {employmentHistory.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEmployment(emp.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="حذف این سابقه"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Group Entity Priority Flag */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 flex flex-wrap items-center gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emp.isGroupEntity}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, {
                            isGroupEntity: e.target.checked,
                            groupEntityType: e.target.checked ? 'SUBSIDIARY' : 'EXTERNAL',
                            verificationStatus: e.target.checked ? 'PENDING' : 'NOT_APPLICABLE',
                          })
                        }
                        className="rounded border-slate-300 text-teal-700 focus:ring-teal-700"
                      />
                      <span className="font-bold text-teal-900">
                        همکاری در ستاد سازمان مادر یا شرکت‌های تابعه (اولویت استخدامی)
                      </span>
                    </label>

                    {emp.isGroupEntity && (
                      <select
                        value={emp.groupEntityType}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, {
                            groupEntityType: e.target.value as any,
                          })
                        }
                        className="p-1.5 bg-slate-50 border border-teal-300 rounded text-slate-800 text-xs font-medium"
                      >
                        <option value="PARENT">ستاد سازمان مادر (اولویت عالی)</option>
                        <option value="SUBSIDIARY">شرکت زیرمجموعه (سدید، عمران پارس، افق، کوشا)</option>
                      </select>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">نام کارفرما / شرکت</label>
                      <input
                        type="text"
                        value={emp.employerName}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, { employerName: e.target.value })
                        }
                        placeholder="مثال: شرکت پیمانکاری عمران پارس"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">سمت / عنوان شغلی</label>
                      <input
                        type="text"
                        value={emp.jobTitle}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, { jobTitle: e.target.value })
                        }
                        placeholder="مثال: سرپرست کارگاه"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">پروژه و شهر</label>
                      <input
                        type="text"
                        value={emp.projectName || ''}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, { projectName: e.target.value })
                        }
                        placeholder="مثال: پروژه برج فردوس، تهران"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">تاریخ شروع</label>
                      <input
                        type="text"
                        value={emp.startDate}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, { startDate: e.target.value })
                        }
                        placeholder="۱۳۹۹/۰۱/۰۱"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">تاریخ پایان</label>
                      <input
                        type="text"
                        disabled={emp.isCurrent}
                        value={emp.isCurrent ? 'اکنون' : emp.endDate || ''}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, { endDate: e.target.value })
                        }
                        placeholder="۱۴۰۲/۱۲/۲۹"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 disabled:opacity-50"
                      />
                    </div>

                    <div className="flex items-center pt-5">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={emp.isCurrent}
                          onChange={(e) =>
                            updateEmploymentItem(emp.id, {
                              isCurrent: e.target.checked,
                              endDate: e.target.checked ? undefined : '۱۴۰۳/۰۱/۰۱',
                            })
                          }
                          className="rounded border-slate-300 text-teal-700"
                        />
                        <span className="text-slate-800">شاغل در حال حاضر در این مجموعه</span>
                      </label>
                    </div>

                    <div className="sm:col-span-2 lg:col-span-3">
                      <label className="block text-slate-600 mb-1">شرح وظایف و مسئولیت‌ها</label>
                      <textarea
                        value={emp.responsibilities}
                        onChange={(e) =>
                          updateEmploymentItem(emp.id, { responsibilities: e.target.value })
                        }
                        rows={2}
                        placeholder="شرح کارهای محوله، دستاوردها و حجم مسئولیت..."
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 3: Education History */}
        {activeStep === 3 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-bold text-slate-900 text-sm">بخش ۳: سوابق تحصیلی و دانشگاهی</h4>

              <button
                type="button"
                onClick={handleAddEducation}
                className="px-3 py-1.5 rounded-lg bg-teal-50 text-teal-800 border border-teal-200 hover:bg-teal-100 font-medium flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن مقطع تحصیلی</span>
              </button>
            </div>

            <div className="space-y-4">
              {educationHistory.map((edu, index) => (
                <div key={edu.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-900">مقطع شماره {index + 1}</span>
                    {educationHistory.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveEducation(edu.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-slate-600 mb-1">سطح مدرک</label>
                      <select
                        value={edu.degreeLevel}
                        onChange={(e) =>
                          updateEducationItem(edu.id, { degreeLevel: e.target.value as any })
                        }
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                      >
                        <option value="UNDER_DIPLOMA">زیر دیپلم</option>
                        <option value="DIPLOMA">دیپلم متوسطه</option>
                        <option value="ASSOCIATE">کاردانی (فوق دیپلم)</option>
                        <option value="BACHELOR">کارشناسی (لیسانس)</option>
                        <option value="MASTER">کارشناسی ارشد (فوق لیسانس)</option>
                        <option value="DOCTORATE">دکتری تخصصی</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">رشته تحصیلی</label>
                      <input
                        type="text"
                        value={edu.fieldOfStudy}
                        onChange={(e) =>
                          updateEducationItem(edu.id, { fieldOfStudy: e.target.value })
                        }
                        placeholder="مثال: مهندسی عمران"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">نام دانشگاه یا مرکز آموزشی</label>
                      <input
                        type="text"
                        value={edu.institutionName}
                        onChange={(e) =>
                          updateEducationItem(edu.id, { institutionName: e.target.value })
                        }
                        placeholder="مثال: دانشگاه صنعتی اصفهان"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-600 mb-1">معدل (اختیاری)</label>
                      <input
                        type="text"
                        value={edu.gpa || ''}
                        onChange={(e) => updateEducationItem(edu.id, { gpa: e.target.value })}
                        placeholder="۱۷.۲۵"
                        className="w-full p-2 bg-white border border-slate-200 rounded-lg text-slate-900 font-mono text-left dir-ltr"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4: Skills & Preferences */}
        {activeStep === 4 && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-2xs space-y-5 text-xs">
            <h4 className="font-bold text-slate-900 text-sm border-b border-slate-100 pb-3">
              بخش ۴: مهارت‌ها، ترجیحات و شرایط استخدامی
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  مهارت‌های تخصصی (با ویرگول یا کاما جدا کنید)
                </label>
                <input
                  type="text"
                  value={skillsString}
                  onChange={(e) => {
                    setSkillsString(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  placeholder="AutoCAD, Primavera P6, صورت‌وضعیت, اکسل پیشرفته"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  عناوین شغلی مورد نظر متقاضی (با کاما جدا کنید)
                </label>
                <input
                  type="text"
                  value={preferredTitlesString}
                  onChange={(e) => {
                    setPreferredTitlesString(e.target.value);
                    setHasUnsavedChanges(true);
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                  placeholder="سرپرست کارگاه, مدیر پروژه"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 font-medium mb-1">
                    حداقل حقوق درخواستی / پیشنهادی
                  </label>
                  <input
                    type="text"
                    value={expectedSalary}
                    onChange={(e) => {
                      setExpectedSalary(e.target.value);
                      setHasUnsavedChanges(true);
                    }}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                    placeholder="۲۵ میلیون تومان"
                  />
                </div>

                <div className="flex items-center pt-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={willingToTravel}
                      onChange={(e) => {
                        setWillingToTravel(e.target.checked);
                        setHasUnsavedChanges(true);
                      }}
                      className="rounded border-slate-300 text-teal-700"
                    />
                    <span className="text-slate-800 font-medium">
                      آمادگی اعزام به کارگاه‌های شهرستانی و پروژه‌های اقماری
                    </span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Buttons & Save Bar */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={() => setActiveStep((s) => s - 1)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-100"
              >
                مرحله قبلی
              </button>
            )}
            {activeStep < 4 && (
              <button
                type="button"
                onClick={() => setActiveStep((s) => s + 1)}
                className="px-4 py-2 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100"
              >
                مرحله بعدی
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (hasUnsavedChanges) setShowDiscardModal(true);
                else navigateTo('applicants');
              }}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
            >
              انصراف
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-semibold rounded-lg bg-teal-700 hover:bg-teal-800 text-white shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'در حال ذخیره‌سازی...' : isEditing ? 'ذخیره تغییرات پرونده' : 'ایجاد پرونده متقاضی'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Discard Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDiscardModal}
        title="لغو و خروج از فرم"
        message="تغییرات ذخیره‌نشده‌ای در این فرم وجود دارد. آیا از خروج اطمینان دارید؟"
        confirmLabel="بله، تغییرات نادیده گرفته شود"
        variant="warning"
        onConfirm={() => {
          setShowDiscardModal(false);
          navigateTo('applicants');
        }}
        onCancel={() => setShowDiscardModal(false)}
      />
    </div>
  );
};
