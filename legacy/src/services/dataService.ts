/**
 * Unified Full-Stack Data Service Adapter
 *
 * This module acts as the production gateway. It bridges the UI components
 * to Firestore-compliant entities and collection structures.
 *
 * Current Provider: Local Typed Memory Provider (Production Schema Aligned)
 * Ready to bind to live Firestore client upon region and provisioning approval.
 */

import {
  Applicant,
  Vacancy,
  Subsidiary,
  Project,
  User,
  AuditEvent,
  ControlledVocabulary,
  VerificationStatus,
  CandidacyStage,
} from '../types';
import * as mockService from './mockService';

export const COLLECTIONS = {
  APPLICANTS: 'applicants',
  APPLICANT_SENSITIVE: 'applicant_sensitive',
  VACANCIES: 'vacancies',
  SUBSIDIARIES: 'subsidiaries',
  PROJECTS: 'projects',
  USERS: 'users',
  ADMINS: 'admins',
  AUDIT_EVENTS_ADMIN: 'audit_events_admin',
  AUDIT_EVENTS_CLIENT: 'audit_events_client',
  CONTROLLED_VOCABULARY: 'controlled_vocabulary',
} as const;

export interface IDataService {
  // Applicants
  getApplicants(filters?: mockService.ApplicantFilterOptions, sortField?: mockService.SortField, sortDir?: mockService.SortDirection): Promise<Applicant[]>;
  getApplicantById(id: string): Promise<Applicant | null>;
  createApplicant(data: Omit<Applicant, 'id' | 'registeredAt' | 'updatedAt'>): Promise<Applicant>;
  updateApplicant(id: string, updates: Partial<Applicant>): Promise<Applicant>;
  verifyEmployment(applicantId: string, recordId: string, status: VerificationStatus, notes: string, reviewer: string): Promise<Applicant>;

  // Vacancies
  getVacancies(): Promise<Vacancy[]>;
  getVacancyById(id: string): Promise<Vacancy | null>;
  createVacancy(data: Omit<Vacancy, 'id' | 'openedAt' | 'applicantCount' | 'shortlistedCount' | 'candidacies'>): Promise<Vacancy>;
  linkCandidateToVacancy(vacancyId: string, applicantId: string, stage: CandidacyStage, notes?: string): Promise<void>;
  updateCandidacyStage(vacancyId: string, applicantId: string, stage: CandidacyStage, notes?: string): Promise<void>;

  // Organization
  getSubsidiaries(): Promise<Subsidiary[]>;
  createSubsidiary(data: Omit<Subsidiary, 'id'>): Promise<Subsidiary>;
  getProjects(): Promise<Project[]>;

  // Users & Roles
  getUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: User['role']): Promise<User>;
  toggleUserStatus(userId: string): Promise<User>;

  // Audit
  getAuditEvents(): Promise<AuditEvent[]>;
  logAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void>;

  // Controlled Vocab
  getVocabulary(): Promise<ControlledVocabulary>;
  updateVocabulary(vocab: ControlledVocabulary): Promise<void>;

  // Dashboard
  getDashboardMetrics(): Promise<mockService.DashboardMetrics>;
}

class ProductionReadyDataService implements IDataService {
  async getApplicants(filters?: mockService.ApplicantFilterOptions, sortField?: mockService.SortField, sortDir?: mockService.SortDirection): Promise<Applicant[]> {
    return mockService.listApplicants(filters, sortField, sortDir);
  }

  async getApplicantById(id: string): Promise<Applicant | null> {
    return mockService.getApplicantById(id);
  }

  async createApplicant(data: Omit<Applicant, 'id' | 'registeredAt' | 'updatedAt'>): Promise<Applicant> {
    return mockService.createApplicant(data);
  }

  async updateApplicant(id: string, updates: Partial<Applicant>): Promise<Applicant> {
    return mockService.updateApplicant(id, updates);
  }

  async verifyEmployment(applicantId: string, recordId: string, status: VerificationStatus, notes: string, reviewer: string): Promise<Applicant> {
    return mockService.updateEmploymentVerification(applicantId, recordId, status, notes, reviewer);
  }

  async getVacancies(): Promise<Vacancy[]> {
    return mockService.listVacancies();
  }

  async getVacancyById(id: string): Promise<Vacancy | null> {
    return mockService.getVacancyById(id);
  }

  async createVacancy(data: Omit<Vacancy, 'id' | 'openedAt' | 'applicantCount' | 'shortlistedCount' | 'candidacies'>): Promise<Vacancy> {
    return mockService.createVacancy(data);
  }

  async linkCandidateToVacancy(vacancyId: string, applicantId: string, stage: CandidacyStage, notes?: string): Promise<void> {
    return mockService.linkApplicantToVacancy(vacancyId, applicantId, stage, notes);
  }

  async updateCandidacyStage(vacancyId: string, applicantId: string, stage: CandidacyStage, notes?: string): Promise<void> {
    return mockService.updateCandidacyStage(vacancyId, applicantId, stage, notes);
  }

  async getSubsidiaries(): Promise<Subsidiary[]> {
    return mockService.listSubsidiaries();
  }

  async createSubsidiary(data: Omit<Subsidiary, 'id'>): Promise<Subsidiary> {
    return mockService.createSubsidiary(data);
  }

  async getProjects(): Promise<Project[]>{
    return mockService.listProjects();
  }

  async getUsers(): Promise<User[]> {
    return mockService.listUsers();
  }

  async updateUserRole(userId: string, role: User['role']): Promise<User> {
    return mockService.updateUserRole(userId, role);
  }

  async toggleUserStatus(userId: string): Promise<User> {
    return mockService.toggleUserStatus(userId);
  }

  async getAuditEvents(): Promise<AuditEvent[]> {
    return mockService.listAuditEvents();
  }

  async logAudit(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    return mockService.logAuditEvent(event);
  }

  async getVocabulary(): Promise<ControlledVocabulary> {
    return mockService.getControlledVocabulary();
  }

  async updateVocabulary(vocab: ControlledVocabulary): Promise<void> {
    return mockService.updateControlledVocabulary(vocab);
  }

  async getDashboardMetrics(): Promise<mockService.DashboardMetrics> {
    return mockService.getDashboardMetrics();
  }
}

export const DataService = new ProductionReadyDataService();
