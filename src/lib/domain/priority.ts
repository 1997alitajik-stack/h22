/**
 * Group employment priority — deterministic, explainable (mission §4.3).
 * The database trigger `employment_priority_refresh` is authoritative for
 * persisted values; this module mirrors it for display and unit tests only.
 */
import type { GroupPriority, VerificationStatus } from '@/types';
import { PRIORITY_LABELS } from './labels';

export interface PriorityInputRecord {
  isGroupEntity: boolean;
  groupEntityType: 'PARENT' | 'SUBSIDIARY' | 'EXTERNAL';
  verificationStatus: VerificationStatus;
}

export function computePriority(
  records: PriorityInputRecord[],
): { priority: GroupPriority; reason: string } {
  const verifiedParent = records.some(
    (r) => r.isGroupEntity && r.groupEntityType === 'PARENT' && r.verificationStatus === 'VERIFIED',
  );
  const verifiedSub = records.some(
    (r) => r.isGroupEntity && r.groupEntityType === 'SUBSIDIARY' && r.verificationStatus === 'VERIFIED',
  );
  const pending = records.some((r) => r.isGroupEntity && r.verificationStatus === 'PENDING');
  const rejectedGroup = records.some((r) => r.isGroupEntity && r.verificationStatus === 'REJECTED');

  if (verifiedParent) {
    return {
      priority: 'VERIFIED_PARENT',
      reason: 'دارای سابقه همکاری تأییدشده در ستاد سازمان مادر',
    };
  }
  if (verifiedSub) {
    return {
      priority: 'VERIFIED_SUBSIDIARY',
      reason: 'دارای سابقه همکاری تأییدشده در شرکت‌های زیرمجموعه سازمان',
    };
  }
  if (pending) {
    return {
      priority: 'PENDING_VERIFICATION',
      reason: 'سوابق سازمانی در انتظار بررسی و استعلام کارگزینی است',
    };
  }
  if (records.length > 0) {
    return {
      priority: 'NO_GROUP_HISTORY',
      reason: rejectedGroup
        ? 'سوابق سازمانی اعلام‌شده تأیید نشده است؛ فاقد سابقه تأییدشده در مجموعه'
        : 'فاقد سابقه همکاری تأییدشده در مجموعه سازمان',
    };
  }
  return {
    priority: 'INSUFFICIENT_DATA',
    reason: 'اطلاعات سوابق کاری برای تعیین وضعیت اولویت ناقص است',
  };
}

/** Sort weight used by the applicant directory (contract: 4/3/2/1/0). */
export const PRIORITY_WEIGHT: Record<GroupPriority, number> = {
  VERIFIED_PARENT: 4,
  VERIFIED_SUBSIDIARY: 3,
  PENDING_VERIFICATION: 2,
  NO_GROUP_HISTORY: 1,
  INSUFFICIENT_DATA: 0,
};

export function priorityLabel(priority: GroupPriority): string {
  return PRIORITY_LABELS[priority];
}
