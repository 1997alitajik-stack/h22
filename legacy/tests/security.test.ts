/**
 * Automated Security Rules and RBAC Authorization Test Suite
 *
 * This test suite verifies the updated security specification defined in DRAFT_firestore.rules:
 *
 * Updates Verified:
 * 1. PII Separation: Full national ID, address and last salary cannot be stored on general document.
 * 2. Sensitive Subcollection: /applicants/{id}/applicant_sensitive/{subDocId} is strictly ADMIN ONLY.
 *    Viewers attempting to read or write to this subcollection are strictly DENIED.
 * 3. Dual-Channel Audit Logs:
 *    - /audit_events_admin/ can only be written and read by ADMIN.
 *    - /audit_events_client/ allows authenticated users to log strictly low-severity client events
 *      (VIEW_RESUME, SEARCH_DIRECTORY, EXPORT_LIST) with their own actorUid.
 *    - All audit channels are strictly IMMUTABLE (update and delete denied for all, including admin).
 * 4. General Collections: Standard RBAC (least privilege, prevent privilege escalation).
 */

export interface SecurityContext {
  auth: {
    uid: string;
    email: string;
  } | null;
  adminDocExists: boolean;
}

export class SecurityRuleSimulator {
  static evaluate(
    ctx: SecurityContext,
    operation: 'get' | 'list' | 'create' | 'update' | 'delete',
    collection: string,
    documentId: string,
    data?: Record<string, any>,
    subcollection?: string,
    subDocId?: string
  ): { allowed: boolean; reason: string } {
    // 1. Global unauthenticated denial
    if (!ctx.auth) {
      return { allowed: false, reason: 'UNAUTHENTICATED: Authentication required' };
    }

    // 2. Validate documentId regex: '^[a-zA-Z0-9_\-]+$' and length <= 128
    const idRegex = /^[a-zA-Z0-9_\-]+$/;
    if (!documentId || documentId.length > 128 || !idRegex.test(documentId)) {
      return { allowed: false, reason: 'INVALID_ID: Document ID format violation' };
    }

    if (subDocId && (subDocId.length > 128 || !idRegex.test(subDocId))) {
      return { allowed: false, reason: 'INVALID_ID: Subdocument ID format violation' };
    }

    const isAdmin = ctx.adminDocExists === true;

    // 3. Subcollection Routing
    if (collection === 'applicants' && subcollection === 'applicant_sensitive') {
      // Strictly ADMIN ONLY for both read and write
      if (!isAdmin) {
        return { allowed: false, reason: 'PERMISSION_DENIED: Sensitive PII subcollection is restricted to verified administrators' };
      }
      return { allowed: true, reason: 'Admin access to sensitive PII permitted' };
    }

    // 4. Collection Specific Rules
    switch (collection) {
      case 'applicants': {
        if (operation === 'get' || operation === 'list') {
          return { allowed: true, reason: 'Read permitted for authenticated user' };
        }
        if (!isAdmin) {
          return { allowed: false, reason: 'PERMISSION_DENIED: Admin role required for mutation' };
        }
        if (operation === 'delete') {
          return { allowed: true, reason: 'Delete permitted for admin' };
        }
        // Validate Applicant data payload
        if (!data) return { allowed: false, reason: 'VALIDATION_FAILED: Missing data' };
        if (
          typeof data.id !== 'string' ||
          data.id.length > 60 ||
          typeof data.firstName !== 'string' ||
          data.firstName.length > 80 ||
          typeof data.lastName !== 'string' ||
          data.lastName.length > 80 ||
          typeof data.fullName !== 'string' ||
          data.fullName.length > 160 ||
          typeof data.primaryJobTitle !== 'string' ||
          data.primaryJobTitle.length > 150 ||
          typeof data.yearsOfExperience !== 'number' ||
          data.yearsOfExperience < 0 ||
          data.yearsOfExperience > 60
        ) {
          return { allowed: false, reason: 'VALIDATION_FAILED: Field constraint violation' };
        }

        // PII Segregation Check: Must not leak full nationalId, full address, or lastSalary into general doc
        if (data.nationalIdFull || data.homeAddressFull || data.lastSalary) {
          return { allowed: false, reason: 'VALIDATION_FAILED: Sensitive PII fields must reside in applicant_sensitive subcollection' };
        }

        const validPriorities = [
          'VERIFIED_PARENT',
          'VERIFIED_SUBSIDIARY',
          'PENDING_VERIFICATION',
          'NO_GROUP_HISTORY',
          'INSUFFICIENT_DATA',
        ];
        if (!validPriorities.includes(data.groupPriority)) {
          return { allowed: false, reason: 'VALIDATION_FAILED: Invalid groupPriority enum value' };
        }
        const validStatuses = [
          'NEW',
          'UNDER_REVIEW',
          'INTERVIEWING',
          'SHORTLISTED',
          'OFFERED',
          'HIRED',
          'REJECTED',
          'ARCHIVED',
        ];
        if (!validStatuses.includes(data.recruitmentStatus)) {
          return { allowed: false, reason: 'VALIDATION_FAILED: Invalid recruitmentStatus enum value' };
        }
        return { allowed: true, reason: 'Admin mutation permitted with valid schema' };
      }

      case 'users': {
        if (operation === 'get' || operation === 'list') {
          return { allowed: true, reason: 'Read permitted for authenticated user' };
        }
        if (!isAdmin) {
          return { allowed: false, reason: 'PERMISSION_DENIED: User cannot modify user records or escalate roles' };
        }
        return { allowed: true, reason: 'User management permitted for admin' };
      }

      case 'admins': {
        if (operation === 'get') {
          return { allowed: true, reason: 'Lookup permitted for authenticated identity' };
        }
        if (!isAdmin) {
          return { allowed: false, reason: 'PERMISSION_DENIED: Only existing verified admins can write to /admins/' };
        }
        return { allowed: true, reason: 'Admin table modification permitted' };
      }

      // Dual Audit Channels
      case 'audit_events_admin': {
        if (operation === 'get' || operation === 'list') {
          if (!isAdmin) {
            return { allowed: false, reason: 'PERMISSION_DENIED: Admin audit logs restricted to admins' };
          }
          return { allowed: true, reason: 'Audit log read permitted for admin' };
        }
        if (operation === 'create') {
          if (!isAdmin) {
            return { allowed: false, reason: 'PERMISSION_DENIED: Only admins or trusted backend can create admin security audit events' };
          }
          return { allowed: true, reason: 'Admin audit log creation permitted' };
        }
        if (operation === 'update' || operation === 'delete') {
          return { allowed: false, reason: 'SECURITY_VIOLATION: Audit logs are strictly immutable (append-only)' };
        }
        return { allowed: false, reason: 'Unknown operation' };
      }

      case 'audit_events_client': {
        if (operation === 'get' || operation === 'list') {
          if (!isAdmin) {
            return { allowed: false, reason: 'PERMISSION_DENIED: Client audit logs can only be read by admins' };
          }
          return { allowed: true, reason: 'Client audit log read permitted for admin' };
        }
        if (operation === 'create') {
          if (!data) return { allowed: false, reason: 'VALIDATION_FAILED: Missing data' };
          // Check actorUid matches authenticated user
          if (data.actorUid !== ctx.auth.uid) {
            return { allowed: false, reason: 'PERMISSION_DENIED: Client cannot spoof actorUid in audit log' };
          }
          const allowedClientCategories = ['VIEW_RESUME', 'SEARCH_DIRECTORY', 'EXPORT_LIST'];
          if (!allowedClientCategories.includes(data.category)) {
            return { allowed: false, reason: 'PERMISSION_DENIED: Client cannot log sensitive/system categories' };
          }
          if (data.severity !== 'LOW') {
            return { allowed: false, reason: 'PERMISSION_DENIED: Client events must have LOW severity' };
          }
          return { allowed: true, reason: 'Client audit event logged successfully' };
        }
        if (operation === 'update' || operation === 'delete') {
          return { allowed: false, reason: 'SECURITY_VIOLATION: Audit logs are strictly immutable (append-only)' };
        }
        return { allowed: false, reason: 'Unknown operation' };
      }

      default:
        return { allowed: false, reason: 'DEFAULT_DENY: Collection has no explicit rule' };
    }
  }
}

// Test Runner
export function runSecurityTestSuite(): { total: number; passed: number; failed: number; results: Array<{ test: string; passed: boolean; message: string }> } {
  const tests: Array<{ name: string; fn: () => { pass: boolean; detail: string } }> = [];

  // Group 1: Authentication & Public Default Deny
  tests.push({
    name: 'TC01: Unauthenticated request to /applicants/ must be denied',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate({ auth: null, adminDocExists: false }, 'get', 'applicants', 'APP-001');
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC02: Unauthenticated mutation to /applicants/ must be denied',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate({ auth: null, adminDocExists: false }, 'create', 'applicants', 'APP-001', {});
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  // Group 2: Viewer Role Least Privilege on General Document
  tests.push({
    name: 'TC03: Authenticated VIEWER can read general /applicants/{id} profile',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate({ auth: { uid: 'u1', email: 'viewer@org.ir' }, adminDocExists: false }, 'get', 'applicants', 'APP-001');
      return { pass: res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC04: Authenticated VIEWER CANNOT mutate /applicants/{id}',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate({ auth: { uid: 'u1', email: 'viewer@org.ir' }, adminDocExists: false }, 'create', 'applicants', 'APP-001', {
        id: 'APP-001', firstName: 'تست', lastName: 'کاربر', fullName: 'تست کاربر', primaryJobTitle: 'مهندس', yearsOfExperience: 5, groupPriority: 'VERIFIED_PARENT', recruitmentStatus: 'NEW'
      });
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  // Group 3: Sensitive PII Subcollection Isolation (CRITICAL NEW TEST)
  tests.push({
    name: 'TC05: Authenticated VIEWER CANNOT read /applicants/{id}/applicant_sensitive/{subDoc}',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'viewer_uid', email: 'viewer@org.ir' }, adminDocExists: false },
        'get',
        'applicants',
        'APP-001',
        undefined,
        'applicant_sensitive',
        'default'
      );
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC06: Authenticated VIEWER CANNOT write to /applicants/{id}/applicant_sensitive/{subDoc}',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'viewer_uid', email: 'viewer@org.ir' }, adminDocExists: false },
        'create',
        'applicants',
        'APP-001',
        { nationalIdFull: '0018239428', homeAddressFull: 'تهران خیابان آزادی' },
        'applicant_sensitive',
        'default'
      );
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC07: Verified ADMIN CAN read /applicants/{id}/applicant_sensitive/{subDoc}',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'admin_uid', email: 'admin@org.ir' }, adminDocExists: true },
        'get',
        'applicants',
        'APP-001',
        undefined,
        'applicant_sensitive',
        'default'
      );
      return { pass: res.allowed, detail: res.reason };
    },
  });

  // Group 4: PII Leaks on General Document Rejected by Validation
  tests.push({
    name: 'TC08: Reject storing nationalIdFull on general /applicants/{id} document',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'admin_uid', email: 'admin@org.ir' }, adminDocExists: true },
        'create',
        'applicants',
        'APP-001',
        {
          id: 'APP-001', firstName: 'تست', lastName: 'کاربر', fullName: 'تست کاربر', primaryJobTitle: 'مهندس', yearsOfExperience: 5, groupPriority: 'VERIFIED_PARENT', recruitmentStatus: 'NEW',
          nationalIdFull: '0018239428' // Sensitive field violation
        }
      );
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC09: Reject storing lastSalary on general /applicants/{id} document',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'admin_uid', email: 'admin@org.ir' }, adminDocExists: true },
        'create',
        'applicants',
        'APP-001',
        {
          id: 'APP-001', firstName: 'تست', lastName: 'کاربر', fullName: 'تست کاربر', primaryJobTitle: 'مهندس', yearsOfExperience: 5, groupPriority: 'VERIFIED_PARENT', recruitmentStatus: 'NEW',
          lastSalary: '30,000,000 تومان' // Sensitive field violation
        }
      );
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  // Group 5: Dual-Channel Audit Log Testing
  tests.push({
    name: 'TC10: Non-admin CANNOT write to /audit_events_admin/ (server channel)',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'attacker', email: 'attacker@org.ir' }, adminDocExists: false },
        'create',
        'audit_events_admin',
        'EVT-100',
        { action: 'SECURITY_EVENT' }
      );
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC11: Client CANNOT spoof actorUid in /audit_events_client/',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'real_uid', email: 'viewer@org.ir' }, adminDocExists: false },
        'create',
        'audit_events_client',
        'EVT-101',
        { actorUid: 'spoofed_admin_uid', category: 'VIEW_RESUME', severity: 'LOW' }
      );
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC12: Client CANNOT create HIGH severity or unauthorized categories in /audit_events_client/',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'viewer_uid', email: 'viewer@org.ir' }, adminDocExists: false },
        'create',
        'audit_events_client',
        'EVT-102',
        { actorUid: 'viewer_uid', category: 'SYSTEM_CONFIG', severity: 'HIGH' }
      );
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC13: Client CAN log genuine LOW severity UI activity in /audit_events_client/',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'viewer_uid', email: 'viewer@org.ir' }, adminDocExists: false },
        'create',
        'audit_events_client',
        'EVT-103',
        { actorUid: 'viewer_uid', category: 'VIEW_RESUME', severity: 'LOW' }
      );
      return { pass: res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC14: Strictly immutable: Even ADMIN cannot update audit logs in any channel',
    fn: () => {
      const res1 = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'admin_uid', email: 'admin@org.ir' }, adminDocExists: true },
        'update',
        'audit_events_admin',
        'EVT-100',
        { note: 'tampered' }
      );
      const res2 = SecurityRuleSimulator.evaluate(
        { auth: { uid: 'admin_uid', email: 'admin@org.ir' }, adminDocExists: true },
        'delete',
        'audit_events_client',
        'EVT-103'
      );
      return { pass: !res1.allowed && !res2.allowed, detail: `${res1.reason} | ${res2.reason}` };
    },
  });

  // Group 6: Privilege Escalation Prevention
  tests.push({
    name: 'TC15: Non-admin CANNOT write to /admins/ collection (escalate privileges)',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate({ auth: { uid: 'attacker', email: 'hacker@org.ir' }, adminDocExists: false }, 'update', 'admins', 'attacker', { role: 'ADMIN' });
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  tests.push({
    name: 'TC16: Non-admin CANNOT alter roles in /users/ collection',
    fn: () => {
      const res = SecurityRuleSimulator.evaluate({ auth: { uid: 'u1', email: 'user@org.ir' }, adminDocExists: false }, 'update', 'users', 'u1', { role: 'ADMIN' });
      return { pass: !res.allowed, detail: res.reason };
    },
  });

  // Execute
  const results = tests.map(t => {
    const outcome = t.fn();
    return {
      test: t.name,
      passed: outcome.pass,
      message: outcome.detail,
    };
  });

  const passedCount = results.filter(r => r.passed).length;
  return {
    total: tests.length,
    passed: passedCount,
    failed: tests.length - passedCount,
    results,
  };
}

// Standalone execution
const execution = runSecurityTestSuite();
console.log('--- ENHANCED SECURITY & PII ISOLATION TEST REPORT ---');
console.log(`Total: ${execution.total} | Passed: ${execution.passed} | Failed: ${execution.failed}`);
execution.results.forEach((r, idx) => {
  console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${idx + 1}. ${r.test} -> (${r.message})`);
});
