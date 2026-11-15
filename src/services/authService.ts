/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Firebase Authentication 및 Cloud Firestore 기반 통합 인증 서비스
 * - 모든 환자 및 물리치료사 계정은 Firebase Authentication(signInWithEmailAndPassword / createUserWithEmailAndPassword)을 통해 인증됩니다.
 * - 비밀번호는 localStorage 또는 sessionStorage에 절대 저장하지 않습니다.
 */

import { AuthUser, UserAccount, Patient, AccountStatus, TherapistVerificationStatus } from '../types/rehab';
import { StorageService } from './storageService';
import { FirebaseService } from './firebaseService';
import { isFirebaseConfigured } from '../config/firebaseConfig';
import { getFirebaseAuth } from './firebase';

const ACCOUNTS_STORAGE_KEY = 'rehab_accounts_v1';
const SESSION_KEY = 'rehab_session_user_v1';
const AUTH_EVENT_NAME = 'rehab_auth_state_changed';

// 제거 대상 레거시 시연용 계정 식별자 목록 (실제 Firebase UID 데이터 보존을 위해 명시적 매칭만 수행)
const LEGACY_DEMO_ACCOUNT_IDS = new Set([
  'acc-admin-01',
  'acc-therapist-01',
  'acc-patient-01',
  'acc-patient-02',
  'acc-patient-03',
  'therapist-1',
  'patient-1',
  'patient-2',
  'patient-3'
]);

const LEGACY_DEMO_USERNAMES = new Set([
  'admin01',
  'therapist01',
  'patient01',
  'patient02',
  'patient03'
]);

const LEGACY_DEMO_CODES = new Set(['PT-GW-821']);

export function isLegacyDemoIdentifier(idOrUsername?: string | null): boolean {
  if (!idOrUsername) return false;
  const trimmed = idOrUsername.trim();
  return (
    LEGACY_DEMO_ACCOUNT_IDS.has(trimmed) ||
    LEGACY_DEMO_USERNAMES.has(trimmed.toLowerCase()) ||
    LEGACY_DEMO_CODES.has(trimmed.toUpperCase())
  );
}

function isLegacyDemoRecord(item?: {
  id?: string;
  username?: string;
  patientId?: string;
  therapistId?: string;
  connectionCode?: string;
  authProvider?: string;
  isDemoAccount?: boolean;
} | null): boolean {
  if (!item) return false;
  if (item.authProvider === 'demo' || item.isDemoAccount === true) return true;
  if (item.id && LEGACY_DEMO_ACCOUNT_IDS.has(item.id)) return true;
  if (item.username && LEGACY_DEMO_USERNAMES.has(item.username.trim().toLowerCase())) return true;
  if (item.patientId && LEGACY_DEMO_ACCOUNT_IDS.has(item.patientId)) return true;
  if (item.therapistId && LEGACY_DEMO_ACCOUNT_IDS.has(item.therapistId)) return true;
  if (item.connectionCode && LEGACY_DEMO_CODES.has(item.connectionCode.trim().toUpperCase())) return true;
  return false;
}

function emitAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT_NAME));
  }
}

export function subscribeToAuth(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(AUTH_EVENT_NAME, handler);
  return () => {
    window.removeEventListener(AUTH_EVENT_NAME, handler);
  };
}

export const AuthService = {
  /**
   * 계정 메타데이터 저장소 초기화 및 레거시 시연용 계정 정리
   * - 시연용 계정(acc-admin-01, acc-therapist-01, acc-patient-01~03 등)은 자동 주입하지 않으며 기존 저장소에서도 제거합니다.
   * - 실제 Firebase 사용자 계정 메타데이터는 보존하되, 비밀번호(passwordHash)는 저장하지 않고 시연용 치료사 참조만 안전하게 정리합니다.
   */
  initAccounts(): UserAccount[] {
    if (typeof window === 'undefined') return [];

    // 세션 스토리지에 남아 있는 레거시 시연용 세션 정리 (실제 Firebase 사용자 세션은 유지)
    this.cleanupLegacySession();

    const existing = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }

    try {
      const parsed = JSON.parse(existing);
      if (!Array.isArray(parsed)) {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
        return [];
      }

      let updated = false;
      const cleanedAccounts: UserAccount[] = [];

      for (const acc of parsed as UserAccount[]) {
        if (!acc || isLegacyDemoRecord(acc)) {
          updated = true;
          continue;
        }

        const sanitized: UserAccount = {
          ...acc,
          passwordHash: '', // 비밀번호는 브라우저 저장소에 절대 보관하지 않음
          accountStatus: acc.accountStatus || 'active',
          approvalStatus: 'approved',
          authProvider: 'firebase',
          isDemoAccount: false
        };

        if (
          sanitized.passwordHash !== acc.passwordHash ||
          sanitized.accountStatus !== acc.accountStatus ||
          sanitized.approvalStatus !== acc.approvalStatus ||
          sanitized.authProvider !== acc.authProvider ||
          sanitized.isDemoAccount !== acc.isDemoAccount
        ) {
          updated = true;
        }

        // 실제 환자 계정에 남아 있을 수 있는 시연용 치료사 참조만 제거
        if (sanitized.connectedTherapistId && isLegacyDemoIdentifier(sanitized.connectedTherapistId)) {
          sanitized.connectedTherapistId = undefined;
          sanitized.connectedTherapistName = undefined;
          updated = true;
        }

        cleanedAccounts.push(sanitized);
      }

      if (updated) {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(cleanedAccounts));
      }

      return cleanedAccounts;
    } catch {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify([]));
      return [];
    }
  },

  /**
   * 세션 스토리지에 남아 있는 레거시 시연용 계정 세션을 정리합니다.
   * 실제 Firebase 로그인 세션은 절대 로그아웃하거나 삭제하지 않습니다.
   */
  cleanupLegacySession(): void {
    if (typeof window === 'undefined') return;
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (!raw) return;
      const sessionUser = JSON.parse(raw) as AuthUser;
      if (isLegacyDemoRecord(sessionUser)) {
        sessionStorage.removeItem(SESSION_KEY);
        return;
      }
      if (sessionUser.connectedTherapistId && isLegacyDemoIdentifier(sessionUser.connectedTherapistId)) {
        sessionUser.connectedTherapistId = undefined;
        sessionUser.connectedTherapistName = undefined;
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
      }
    } catch {
      // ignore parse errors
    }
  },

  /**
   * 등록된 실제 Firebase 계정 메타데이터 목록 조회
   */
  getAccounts(): UserAccount[] {
    return this.initAccounts();
  },

  /**
   * 아이디 중복 확인 (로컬 캐시 기준 보조 확인)
   */
  isUsernameTaken(username: string): boolean {
    const trimmed = username.trim().toLowerCase();
    const accounts = this.getAccounts();
    return accounts.some((acc) => acc.username.toLowerCase() === trimmed);
  },

  /**
   * Firestore publicTherapists 컬렉션 기준으로 실제 물리치료사 연결 코드 조회
   */
  async findTherapistByConnectionCodeAsync(code: string): Promise<UserAccount | null> {
    if (!code || !code.trim()) return null;
    const cleanCode = code.trim().toUpperCase();
    if (LEGACY_DEMO_CODES.has(cleanCode)) return null;

    if (isFirebaseConfigured()) {
      const remoteTherapist = await FirebaseService.findTherapistByConnectionCode(cleanCode);
      if (remoteTherapist && remoteTherapist.therapistId && !isLegacyDemoIdentifier(remoteTherapist.therapistId)) {
        return {
          id: remoteTherapist.therapistId,
          username: remoteTherapist.therapistId,
          passwordHash: '',
          name: remoteTherapist.name || '담당 물리치료사',
          role: 'therapist',
          therapistId: remoteTherapist.therapistId,
          accountStatus: 'active',
          approvalStatus: 'approved',
          therapistVerification: remoteTherapist.isVerified ? 'verified' : 'unverified',
          connectionCode: remoteTherapist.connectionCode || cleanCode,
          clinic: remoteTherapist.clinic || '재활치료센터',
          licenseCode: remoteTherapist.licenseCode,
          registeredAt: remoteTherapist.createdAt || new Date().toISOString(),
          authProvider: 'firebase',
          isDemoAccount: false
        };
      }
    }

    return null;
  },

  /**
   * Firebase Authentication 및 Cloud Firestore 기반 비동기 회원가입
   */
  async registerAsync(input: {
    name: string;
    username: string;
    email?: string;
    password: string;
    role: 'patient' | 'therapist';
    licenseCode?: string;
    clinic?: string;
    connectionCode?: string;
  }): Promise<{ success: boolean; user?: AuthUser; errorMessage?: string }> {
    const name = input.name.trim();
    const username = input.username.trim();
    const password = input.password.trim();

    if (!name) {
      return { success: false, errorMessage: '이름을 입력해주세요.' };
    }
    if (!username) {
      return { success: false, errorMessage: '이메일 또는 아이디를 입력해주세요.' };
    }
    if (!password || password.length < 6) {
      return { success: false, errorMessage: '비밀번호는 최소 6자 이상이어야 합니다.' };
    }
    if (!isFirebaseConfigured()) {
      return { success: false, errorMessage: 'Firebase 인증 설정이 되어 있지 않습니다.' };
    }

    const rawEmail = input.email?.trim() || username;
    const email = rawEmail.includes('@') ? rawEmail : `${rawEmail}@rehab.local`;

    const fbResult = await FirebaseService.register({
      email,
      password,
      name,
      role: input.role,
      clinic: input.clinic,
      licenseCode: input.licenseCode,
      connectionCode: input.connectionCode
    });

    if (fbResult.success && fbResult.user) {
      const currentAuthUid = getFirebaseAuth()?.currentUser?.uid;
      if (!currentAuthUid || currentAuthUid !== fbResult.user.id) {
        return {
          success: false,
          errorMessage: 'Firebase 인증 세션 UID와 가입된 사용자 ID가 일치하지 않습니다. 다시 시도해 주세요.'
        };
      }

      const accounts = this.getAccounts();
      const existingIdx = accounts.findIndex(
        (a) => a.id === fbResult.user!.id || a.username.toLowerCase() === fbResult.user!.username.toLowerCase()
      );
      const newAcc: UserAccount = {
        id: fbResult.user.id,
        username: fbResult.user.username,
        passwordHash: '',
        name: fbResult.user.name,
        role: input.role,
        patientId: fbResult.user.patientId,
        therapistId: fbResult.user.therapistId,
        accountStatus: 'active',
        approvalStatus: 'approved',
        connectionCode: fbResult.user.connectionCode,
        clinic: fbResult.user.clinic,
        licenseCode: fbResult.user.licenseCode,
        registeredAt: fbResult.user.registeredAt || new Date().toISOString(),
        authProvider: 'firebase',
        isDemoAccount: false
      };

      if (existingIdx >= 0) {
        accounts[existingIdx] = newAcc;
      } else {
        accounts.push(newAcc);
      }
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

      if (input.role === 'patient') {
        const newPatient: Patient = {
          id: fbResult.user.patientId || fbResult.user.id,
          name: fbResult.user.name,
          age: 32,
          gender: '남성',
          diagnosis: '',
          targetGoal: '담당 물리치료사 연결 후 맞춤형 재활운동 프로그램 배정',
          therapistNotes: '',
          assignedProgram: [],
          connectionStatus: 'not_connected',
          feedbacks: []
        };
        StorageService.addPatient(newPatient);
      }

      emitAuthChange();
      return fbResult;
    }

    return fbResult;
  },

  /**
   * Firebase Authentication 및 Cloud Firestore 기반 비동기 로그인
   * - 모든 로그인은 Firebase Authentication을 통해서만 처리됩니다.
   */
  async loginAsync(
    usernameOrEmail: string,
    password: string
  ): Promise<{ success: boolean; user?: AuthUser; errorMessage?: string }> {
    const trimmedInput = usernameOrEmail.trim();
    const trimmedPassword = password.trim();

    if (!trimmedInput || !trimmedPassword) {
      return {
        success: false,
        errorMessage: '이메일(아이디)과 비밀번호를 모두 입력해주세요.'
      };
    }

    if (!isFirebaseConfigured()) {
      return {
        success: false,
        errorMessage: 'Firebase 인증 설정이 되어 있지 않습니다.'
      };
    }

    const email = trimmedInput.includes('@') ? trimmedInput : `${trimmedInput}@rehab.local`;
    const fbResult = await FirebaseService.login(email, trimmedPassword);

    if (fbResult.success && fbResult.user) {
      // 로그인 직후 실제 Firebase Authentication UID와 앱 사용자 ID 일치 여부 검증
      const currentAuthUid = getFirebaseAuth()?.currentUser?.uid;
      if (!currentAuthUid || currentAuthUid !== fbResult.user.id) {
        return {
          success: false,
          errorMessage: 'Firebase 인증 세션 UID와 사용자 ID가 일치하지 않습니다. 다시 로그인해 주세요.'
        };
      }

      const accounts = this.getAccounts();
      const syncedAccount: UserAccount = {
        id: fbResult.user.id,
        username: fbResult.user.username,
        passwordHash: '',
        name: fbResult.user.name,
        role: fbResult.user.role,
        patientId: fbResult.user.patientId,
        therapistId: fbResult.user.therapistId,
        accountStatus: 'active',
        approvalStatus: 'approved',
        connectionCode: fbResult.user.connectionCode,
        clinic: fbResult.user.clinic,
        licenseCode: fbResult.user.licenseCode,
        registeredAt: fbResult.user.registeredAt || new Date().toISOString(),
        authProvider: 'firebase',
        isDemoAccount: false
      };

      const existingIdx = accounts.findIndex(
        (a) => a.id === fbResult.user!.id || a.username.toLowerCase() === fbResult.user!.username.toLowerCase()
      );
      if (existingIdx >= 0) {
        accounts[existingIdx] = syncedAccount;
      } else {
        accounts.push(syncedAccount);
      }
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

      // 환자인 경우 로컬 환자 차트 동기화
      if (fbResult.user.role === 'patient') {
        const patientId = fbResult.user.patientId || fbResult.user.id;
        if (!StorageService.getPatientById(patientId)) {
          StorageService.addPatient({
            id: patientId,
            name: fbResult.user.name,
            age: 32,
            gender: '남성',
            diagnosis: '',
            targetGoal: '맞춤형 재활운동 프로그램',
            therapistNotes: '',
            assignedProgram: [],
            connectionStatus: 'not_connected',
            feedbacks: []
          });
        }
      }

      emitAuthChange();
      return fbResult;
    }

    return fbResult;
  },

  /**
   * [시스템 관리자 전용] 계정 상태 변경 (활성화 / 일시 정지)
   */
  toggleAccountStatus(accountId: string, adminUser: AuthUser): { success: boolean; errorMessage?: string } {
    if (adminUser.role !== 'super_admin') {
      return { success: false, errorMessage: '시스템 관리자 권한이 필요합니다.' };
    }

    const accounts = this.getAccounts();
    const targetIndex = accounts.findIndex((a) => a.id === accountId);
    if (targetIndex === -1) {
      return { success: false, errorMessage: '해당 계정을 찾을 수 없습니다.' };
    }

    const target = accounts[targetIndex];
    if (target.role === 'super_admin' && target.id === adminUser.id) {
      return { success: false, errorMessage: '현재 로그인 중인 최고 관리자 본인 계정은 정지할 수 없습니다.' };
    }

    const newStatus: AccountStatus = target.accountStatus === 'suspended' ? 'active' : 'suspended';
    accounts[targetIndex] = {
      ...target,
      accountStatus: newStatus
    };

    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

    const currentSession = this.getSessionUser();
    if (currentSession && currentSession.id === accountId && newStatus === 'suspended') {
      this.logout();
    } else {
      emitAuthChange();
    }

    return { success: true };
  },

  /**
   * [시스템 관리자 전용] 물리치료사 전문가 면허 인증 상태 변경
   */
  setTherapistVerification(
    accountId: string,
    verificationStatus: TherapistVerificationStatus,
    adminUser: AuthUser
  ): { success: boolean; errorMessage?: string } {
    if (adminUser.role !== 'super_admin') {
      return { success: false, errorMessage: '시스템 관리자 권한이 필요합니다.' };
    }

    const accounts = this.getAccounts();
    const targetIndex = accounts.findIndex((a) => a.id === accountId);
    if (targetIndex === -1) {
      return { success: false, errorMessage: '해당 계정을 찾을 수 없습니다.' };
    }

    const target = accounts[targetIndex];
    if (target.role !== 'therapist') {
      return { success: false, errorMessage: '물리치료사 계정만 자격을 인증할 수 있습니다.' };
    }

    accounts[targetIndex] = {
      ...target,
      therapistVerification: verificationStatus
    };

    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));

    const currentSession = this.getSessionUser();
    if (currentSession && currentSession.id === accountId) {
      currentSession.therapistVerification = verificationStatus;
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(currentSession));
    }

    emitAuthChange();
    return { success: true };
  },

  /**
   * 로그아웃 처리
   */
  logout() {
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem(SESSION_KEY);
    }
    if (isFirebaseConfigured()) {
      FirebaseService.logout().catch((err) => {
        console.warn('Firebase logout warning on AuthService.logout:', err);
      });
    }
    emitAuthChange();
  },

  /**
   * 세션 사용자 조회 (레거시 시연용 세션은 자동 배제)
   */
  getSessionUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = sessionStorage.getItem(SESSION_KEY);
      if (!data) return null;
      const parsed = JSON.parse(data) as AuthUser;
      if (isLegacyDemoRecord(parsed)) {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  },

  isAuthenticated(): boolean {
    return this.getSessionUser() !== null;
  }
};

/**
 * 물리치료사 표시 이름 포맷터
 */
export function formatTherapistDisplayName(name?: string | null): string {
  if (!name) return '담당 물리치료사';
  const trimmed = name.trim();
  if (trimmed.endsWith('물리치료사') || trimmed.endsWith('PT') || trimmed.endsWith('치료사')) {
    return trimmed;
  }
  return `${trimmed} 물리치료사`;
}

/**
 * 임상 피드백 작성자 표시 이름 확인 함수
 */
export function getFeedbackAuthorDisplayName(
  fb?: { therapistId?: string; therapistName?: string } | null,
  patient?: { therapistId?: string; therapistName?: string; connectionStatus?: string } | null
): string {
  if (!fb) return '담당 물리치료사';

  if (fb.therapistId && patient?.therapistId && fb.therapistId === patient.therapistId && patient.therapistName) {
    return formatTherapistDisplayName(patient.therapistName);
  }

  if (fb.therapistName && fb.therapistName !== '담당 물리치료사') {
    return formatTherapistDisplayName(fb.therapistName);
  }

  if (patient?.connectionStatus === 'connected' && patient?.therapistName) {
    return formatTherapistDisplayName(patient.therapistName);
  }

  return fb.therapistName ? formatTherapistDisplayName(fb.therapistName) : '담당 물리치료사';
}
