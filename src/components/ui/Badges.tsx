import type {
  CandidacyStage,
  GroupPriority,
  RecruitmentStatus,
  VacancyStatus,
  VerificationStatus,
} from '@/types';
import { CANDIDACY_STAGE_LABELS, PRIORITY_LABELS, RECRUITMENT_STATUS_LABELS, VACANCY_STATUS_LABELS, VERIFICATION_LABELS } from '@/lib/domain/labels';
import { Building2, Clock, HelpCircle, Layers, MinusCircle } from 'lucide-react';

type Tone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'teal';

const TONE_CLASSES: Record<Tone, string> = {
  success: 'bg-[var(--color-status-success-bg)] text-[var(--color-status-success)] border-emerald-200',
  warning: 'bg-[var(--color-status-warning-bg)] text-[var(--color-status-warning)] border-amber-200',
  danger: 'bg-[var(--color-status-danger-bg)] text-[var(--color-status-danger)] border-rose-200',
  info: 'bg-[var(--color-status-info-bg)] text-[var(--color-status-info)] border-blue-200',
  neutral: 'bg-[var(--color-status-neutral-bg)] text-[var(--color-status-neutral)] border-slate-200',
  teal: 'bg-[var(--color-accent-soft)] text-[var(--color-accent-strong)] border-teal-200',
};

interface BadgeProps {
  tone?: Tone;
  children: React.ReactNode;
  title?: string;
  className?: string;
}

/** Rectangular label chip — anti-pill discipline (UI_SPEC §2). */
export function Badge({ tone = 'neutral', children, title, className = '' }: BadgeProps) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border px-2 py-0.5 text-xs font-medium whitespace-nowrap ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const PRIORITY_TONE: Record<GroupPriority, Tone> = {
  VERIFIED_PARENT: 'success',
  VERIFIED_SUBSIDIARY: 'teal',
  PENDING_VERIFICATION: 'warning',
  NO_GROUP_HISTORY: 'neutral',
  INSUFFICIENT_DATA: 'danger',
};

/** 5-tier employment priority badge with its mandated icon (UI_SPEC §3). */
export function PriorityBadge({ priority, withIcon = true }: { priority: GroupPriority; withIcon?: boolean }) {
  const icons: Record<GroupPriority, React.ReactNode | null> = {
    VERIFIED_PARENT: <Building2 className="h-3.5 w-3.5" aria-hidden />,
    VERIFIED_SUBSIDIARY: <Layers className="h-3.5 w-3.5" aria-hidden />,
    PENDING_VERIFICATION: <Clock className="h-3.5 w-3.5" aria-hidden />,
    NO_GROUP_HISTORY: <MinusCircle className="h-3.5 w-3.5" aria-hidden />,
    INSUFFICIENT_DATA: <HelpCircle className="h-3.5 w-3.5" aria-hidden />,
  };
  return (
    <Badge tone={PRIORITY_TONE[priority]} title={PRIORITY_LABELS[priority]}>
      {withIcon && icons[priority]}
      <span>{PRIORITY_LABELS[priority]}</span>
    </Badge>
  );
}

const RECRUITMENT_TONE: Record<RecruitmentStatus, Tone> = {
  NEW: 'info',
  UNDER_REVIEW: 'warning',
  INTERVIEWING: 'info',
  SHORTLISTED: 'success',
  OFFERED: 'teal',
  HIRED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'neutral',
};

export function RecruitmentStatusBadge({ status }: { status: RecruitmentStatus }) {
  return <Badge tone={RECRUITMENT_TONE[status]}>{RECRUITMENT_STATUS_LABELS[status]}</Badge>;
}

const VERIFICATION_TONE: Record<VerificationStatus, Tone> = {
  VERIFIED: 'success',
  PENDING: 'warning',
  REJECTED: 'danger',
  NOT_APPLICABLE: 'neutral',
};

export function VerificationBadge({ status }: { status: VerificationStatus }) {
  return <Badge tone={VERIFICATION_TONE[status]}>{VERIFICATION_LABELS[status]}</Badge>;
}

const STAGE_TONE: Record<CandidacyStage, Tone> = {
  NEW: 'info',
  SCREENING: 'warning',
  INTERVIEW: 'info',
  SHORTLIST: 'teal',
  ACCEPTED: 'success',
  REJECTED: 'danger',
  WITHDRAWN: 'neutral',
};

export function CandidacyStageBadge({ stage }: { stage: CandidacyStage }) {
  return <Badge tone={STAGE_TONE[stage]}>{CANDIDACY_STAGE_LABELS[stage]}</Badge>;
}

export function VacancyStatusBadge({ status }: { status: VacancyStatus }) {
  return <Badge tone={status === 'OPEN' ? 'success' : status === 'CANCELLED' ? 'danger' : 'neutral'}>{VACANCY_STATUS_LABELS[status]}</Badge>;
}

export function AccountStatusBadge({ status }: { status: 'ACTIVE' | 'INACTIVE' }) {
  return <Badge tone={status === 'ACTIVE' ? 'success' : 'danger'}>{status === 'ACTIVE' ? 'فعال' : 'غیرفعال'}</Badge>;
}
