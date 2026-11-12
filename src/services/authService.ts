/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * [안내] 본 인증 서비스는 물리치료학과 수업 발표 및 시연용 로컬 데모 인증 모듈입니다.
 * 환자, 물리치료사, 시스템 관리자(super_admin) 3개 역할을 지원하며,
 * 가입 승인 대기 없이 즉시 서비스를 이용할 수 있도록 지원합니다.
 */

import { AuthUser, UserAccount, Patient, UserRole, AccountStatus, TherapistVerificationStatus } from '../types/rehab';
import { StorageService } from './storageService';
import { FirebaseService } from './firebaseService';
import { isFirebaseConfigured } from '../config/firebaseConfig';

import { getFirebaseAuth } from './firebase';

const ACCOUNTS_STORAGE_KEY = 'rehab_accounts_v1';
const SESSION_KEY = 'rehab_session_user_v1';
const AUTH_EVENT_NAME = 'rehab_auth_state_changed';

// Initial pre-configured demo accounts
export const INITIAL_DEMO_ACCOUNTS: UserAccount[] = [
  {
    id: 'acc-admin-01',
    username: 'admin01',
    passwordHash: 'demo1234',
    name: '최고 관리자 (운영팀)',
    role: 'super_admin',
    accountStatus: 'active',
    approvalStatus: 'approved',
    registeredAt: '2026-10-15T09:00:00.000Z',
    authProvider: 'demo',
    isDemoAccount: true
  },
  {
    id: 'acc-therapist-01',
    username: 'therapist01',
    passwordHash: 'demo1234',
    name: '박건우 (물리치료사)',
    role: 'therapist',
    therapistId: 'therapist-1',
    accountStatus: 'active',
    therapistVerification: 'verified',
    connectionCode: 'PT-GW-821',
    licenseCode: 'PT-2026-34821',
    clinic: '바른재활의학과의원',
    approvalStatus: 'approved',
    registeredAt: '2026-10-20T09:00:00.000Z',
    authProvider: 'demo',
    isDemoAccount: true
  },
  {
    id: 'acc-patient-01',
    username: 'patient01',
    passwordHash: 'demo1234',
    name: '김민수',
    role: 'patient',
    patientId: 'patient-1',
    accountStatus: 'active',
    connectedTherapistId: 'acc-therapist-01',
    connectedTherapistName: '박건우 PT',
    approvalStatus: 'approved',
    registeredAt: '2026-10-25T10:00:00.000Z',
    authProvider: 'demo',
    isDemoAccount: true
  },
  {
    id: 'acc-patient-02',
    username: 'patient02',
    passwordHash: 'demo1234',
    name: '이지훈',
    role: 'patient',
    patientId: 'patient-2',
    accountStatus: 'active',
    connectedTherapistId: 'acc-therapist-01',
    connectedTherapistName: '박건우 PT',
    approvalStatus: 'approved',
    registeredAt: '2026-10-28T14:30:00.000Z',
    authProvider: 'demo',
    isDemoAccount: true
  },
  {
    id: 'acc-patient-03',
    username: 'patient03',
    passwordHash: 'demo1234',
    name: '박서연',
    role: 'patient',
    patientId: 'patient-3',
    accountStatus: 'active',
    connectedTherapistId: 'acc-therapist-01',
    connectedTherapistName: '박건우 PT',
    approvalStatus: 'approved',
    registeredAt: '2026-10-29T11:20:00.000Z',
    authProvider: 'demo',
    isDemoAccount: true
  }
];

const PURE_DEMO_ACCOUNT_IDS = new Set(INITIAL_DEMO_ACCOUNTS.map((a) => a.id));
const PURE_DEMO_USERNAMES = new Set(INITIAL_DEMO_ACCOUNTS.map((a) => a.username.toLowerCase()));

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
   * 계정 저장소 초기화 및 마이그레이션
   * - 기존 pending/rejected 계정을 승인 대기 없이 정상 활성 상태(active)로 안전하게 마이그레이션
   * - 시스템 관리자(admin01) 및 물리치료사 연결 코드 보장
   */
  initAccounts(): UserAccount[] {
    if (typeof window === 'undefined') return INITIAL_DEMO_ACCOUNTS;
    const existing = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (!existing) {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ACCOUNTS));
      return INITIAL_DEMO_ACCOUNTS;
    }
    try {
      const parsed = JSON.parse(existing) as UserAccount[];
      let updated = false;

      // 1. 기존 데모 계정 누락 방지 및 마이그레이션
      INITIAL_DEMO_ACCOUNTS.forEach((demo) => {
        const found = parsed.find((a) => a.username === demo.username);
        if (!found) {
          parsed.push(demo);
          updated = true;
        } else {
          // 속성 보강 (admin01, therapist01 connectionCode 등)
          if (!found.role && demo.role) {
            found.role = demo.role;
            updated = true;
          }
          if (demo.role === 'super_admin' && found.role !== 'super_admin') {
            found.role = 'super_admin';
            updated = true;
          }
          if (demo.role === 'therapist' && !found.connectionCode) {
            found.connectionCode = demo.connectionCode;
            updated = true;
          }
          if (demo.role === 'therapist' && !found.therapistVerification) {
            found.therapistVerification = demo.therapistVerification;
            updated = true;
          }
        }
      });

      // 2. 가입 승인 대기 제거 마이그레이션 및 순수 데모 계정 / Firebase 계정 구분 정규화
      parsed.forEach((acc) => {
        if (!acc.accountStatus) {
          acc.accountStatus = 'active';
          updated = true;
        }
        if (acc.approvalStatus !== 'approved') {
          acc.approvalStatus = 'approved';
          updated = true;
        }
        const isPreconfiguredDemo =
          PURE_DEMO_ACCOUNT_IDS.has(acc.id) &&
          PURE_DEMO_USERNAMES.has((acc.username || '').toLowerCase());

        if (isPreconfiguredDemo) {
          if (acc.authProvider !== 'demo' || acc.isDemoAccount !== true) {
            acc.authProvider = 'demo';
            acc.isDemoAccount = true;
            updated = true;
          }
        } else {
          // INITIAL_DEMO_ACCOUNTS에 정의되지 않은 계정은 데모 계정이 아님을 명시
          if (acc.isDemoAccount !== false) {
            acc.isDemoAccount = false;
            updated = true;
          }
          if (!acc.authProvider && isFirebaseConfigured()) {
            acc.authProvider = 'firebase';
            updated = true;
          }
        }
        // 물리치료사 고유 연결 코드 부여
        if (acc.role === 'therapist' && !acc.connectionCode) {
          const num = Math.floor(1000 + Math.random() * 9000);
          acc.connectionCode = `PT-${num}`;
          if (!acc.therapistVerification) {
            acc.therapistVerification = acc.username === 'therapist01' ? 'verified' : 'unverified';
          }
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(INITIAL_DEMO_ACCOUNTS));
      return INITIAL_DEMO_ACCOUNTS;
    }
  },

  /**
   * 명시적으로 정의된 순수 시연용 데모 계정(INITIAL_DEMO_ACCOUNTS)인지 판별합니다.
   * - 단순 ID 접두사(startsWith)에 의존하지 않고, INITIAL_DEMO_ACCOUNTS 정의 목록 및 authProvider를 함께 검증합니다.
   */
  isPureDemoAccount(accountOrUser?: {
    id?: string;
    username?: string;
    authProvider?: 'firebase' | 'demo';
    isDemoAccount?: boolean;
  } | null): boolean {
    if (!accountOrUser) return false;
    if (accountOrUser.authProvider === 'firebase' || accountOrUser.isDemoAccount === false) {
      return false;
    }
    const idMatch = accountOrUser.id ? PURE_DEMO_ACCOUNT_IDS.has(accountOrUser.id) : false;
    const usernameMatch = accountOrUser.username
      ? PURE_DEMO_USERNAMES.has(accountOrUser.username.trim().toLowerCase())
      : false;
    return idMatch && usernameMatch;
  },

  /**
   * 모든 등록된 계정 목록 조회
   */
  getAccounts(): UserAccount[] {
    return this.initAccounts();
  },

  /**
   * 아이디 중복 확인
   */
  isUsernameTaken(username: string): boolean {
    const trimmed = username.trim().toLowerCase();
    const accounts = this.getAccounts();
    return accounts.some((acc) => acc.username.toLowerCase() === trimmed);
  },

  /**
   * 고유 연결 코드로 물리치료사 검색
   */
  findTherapistByConnectionCode(code: string): UserAccount | undefined {
    if (!code || !code.trim()) return undefined;
    const cleanCode = code.trim().toUpperCase();
    const accounts = this.getAccounts();
    return accounts.find(
      (acc) => acc.role === 'therapist' && acc.connectionCode?.toUpperCase() === cleanCode
    );
  },

  /**
   * Firebase Auth 및 Firestore 연동 비동기 회원가입
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
    const rawEmail = input.email?.trim() || input.username.trim();
    const email = rawEmail.includes('@') ? rawEmail : `${rawEmail}@rehab.local`;

    if (isFirebaseConfigured()) {
      const fbResult = await FirebaseService.register({
        email,
        password: input.password,
        name: input.name,
        role: input.role,
        clinic: input.clinic,
        licenseCode: input.licenseCode,
        connectionCode: input.connectionCode
      });

      if (fbResult.success && fbResult.user) {
        // 로컬 데모 캐시에도 등록하여 컴포넌트 간 원활한 호환성 유지
        const accounts = this.getAccounts();
        const existingIdx = accounts.findIndex((a) => a.id === fbResult.user!.id || a.username === fbResult.user!.username);
        const newAcc: UserAccount = {
          id: fbResult.user.id,
          username: input.username,
          passwordHash: '',
          name: input.name,
          role: input.role,
          patientId: fbResult.user.patientId,
          therapistId: fbResult.user.therapistId,
          accountStatus: 'active',
          approvalStatus: 'approved',
          connectionCode: fbResult.user.connectionCode,
          clinic: fbResult.user.clinic,
          registeredAt: new Date().toISOString(),
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
            name: input.name,
            age: 32,
            gender: '남성',
            diagnosis: '',
            targetGoal: '담당 물리치료사 연결 후 맞춤형 재활운동 프로그램 배정',
            therapistNotes: 'Firebase Auth 및 Firestore 연동으로 생성된 계정입니다.',
            assignedProgram: [],
            connectionStatus: 'not_connected',
            feedbacks: []
          };
          StorageService.addPatient(newPatient);
        }
        return fbResult;
      } else if (!fbResult.success) {
        return fbResult;
      }
    }

    return this.register(input);
  },

  /**
   * 신규 회원가입 처리 (가입 즉시 활성화 및 자동 로그인 가능)
   * 일반 회원가입에서는 'patient' 및 'therapist'만 가입 가능
   */
  register(input: {
    name: string;
    username: string;
    password: string;
    role: 'patient' | 'therapist';
    licenseCode?: string;
    clinic?: string;
  }): { success: boolean; user?: AuthUser; errorMessage?: string } {
    const name = input.name.trim();
    const username = input.username.trim();
    const password = input.password.trim();
    const role = input.role;
    const licenseCode = input.licenseCode?.trim() || '';
    const clinic = input.clinic?.trim() || '재활치료센터';

    // 1. 필수값 유효성 검사
    if (!name) {
      return { success: false, errorMessage: '이름을 입력해주세요.' };
    }
    if (!username) {
      return { success: false, errorMessage: '아이디를 입력해주세요.' };
    }
    if (username.length < 3) {
      return { success: false, errorMessage: '아이디는 최소 3자 이상이어야 합니다.' };
    }
    if (this.isUsernameTaken(username)) {
      return { success: false, errorMessage: '이미 사용 중인 아이디입니다. 다른 아이디를 입력해주세요.' };
    }
    if (!password) {
      return { success: false, errorMessage: '비밀번호를 입력해주세요.' };
    }
    if (password.length < 8) {
      return { success: false, errorMessage: '비밀번호는 최소 8자 이상이어야 합니다.' };
    }

    const accounts = this.getAccounts();
    const registeredAt = new Date().toISOString();

    if (role === 'patient') {
      // 1. 환자 가입 처리: 승인 대기 없이 즉시 active 상태로 생성
      const newPatientId = `patient-${Date.now()}`;
      const newPatient: Patient = {
        id: newPatientId,
        name,
        age: 32,
        gender: '남성',
        diagnosis: '',
        targetGoal: '담당 물리치료사 연결 후 맞춤형 재활운동 프로그램 배정',
        therapistNotes: '신규 가입한 대상자입니다. 환자 프로필에서 담당 치료사 연결 코드를 입력할 수 있습니다.',
        assignedProgram: [],
        connectionStatus: 'not_connected',
        feedbacks: []
      };

      StorageService.addPatient(newPatient);

      const newAccount: UserAccount = {
        id: `acc-${Date.now()}`,
        username,
        passwordHash: password,
        name,
        role: 'patient',
        patientId: newPatientId,
        accountStatus: 'active',
        approvalStatus: 'approved',
        registeredAt
      };

      const updatedAccounts = [...accounts, newAccount];
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

      const authUser: AuthUser = {
        id: newAccount.id,
        username: newAccount.username,
        name: newAccount.name,
        role: 'patient',
        patientId: newPatientId,
        accountStatus: 'active',
        approvalStatus: 'approved',
        registeredAt
      };

      // 즉시 세션 저장 (자동 로그인)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      }
      emitAuthChange();

      return { success: true, user: authUser };
    } else {
      // 2. 물리치료사 가입 처리: 승인 대기 없이 즉시 active 상태로 생성하되,
      // 전문가 안전장치로 면허 검증 상태는 'unverified'로 지정
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const connectionCode = `PT-${randomSuffix}`;

      const newAccount: UserAccount = {
        id: `acc-${Date.now()}`,
        username,
        passwordHash: password,
        name,
        role: 'therapist',
        therapistId: `therapist-${Date.now()}`,
        accountStatus: 'active',
        approvalStatus: 'approved',
        therapistVerification: 'unverified', // 미인증 (수련/데모 모드)
        connectionCode,
        licenseCode: licenseCode || `PT-PENDING-${randomSuffix}`,
        clinic,
        registeredAt
      };

      const updatedAccounts = [...accounts, newAccount];
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updatedAccounts));

      const authUser: AuthUser = {
        id: newAccount.id,
        username: newAccount.username,
        name: newAccount.name,
        role: 'therapist',
        therapistId: newAccount.therapistId,
        accountStatus: 'active',
        approvalStatus: 'approved',
        therapistVerification: 'unverified',
        connectionCode,
        licenseCode: newAccount.licenseCode,
        clinic: newAccount.clinic,
        registeredAt
      };

      // 즉시 세션 저장 (자동 로그인)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(authUser));
      }
      emitAuthChange();

      return { success: true, user: authUser };
    }
  },

  /**
   * Firebase Auth 및 Firestore 연동 비동기 로그인
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

    // 1. 명시적으로 정의된 순수 시연용 데모 계정(INITIAL_DEMO_ACCOUNTS: patient01~03, therapist01, admin01)만 로컬 로그인 허용
    // - localStorage['rehab_accounts_v1']에 캐시된 실제 Firebase 계정은 절대로 로컬 로그인으로 우회하지 않음
    const accounts = this.getAccounts();
    const matchedDemoAccount = accounts.find(
      (acc) =>
        this.isPureDemoAccount(acc) &&
        acc.username.toLowerCase() === trimmedInput.toLowerCase() &&
        acc.passwordHash === trimmedPassword
    );
    if (matchedDemoAccount) {
      if (isFirebaseConfigured()) {
        await FirebaseService.logout().catch(() => {});
      }
      return this.login(trimmedInput, trimmedPassword);
    }

    // 2. Firebase가 설정된 경우 반드시 Firebase Authentication(signInWithEmailAndPassword)으로 로그인 수행
    if (isFirebaseConfigured()) {
      const email = trimmedInput.includes('@') ? trimmedInput : `${trimmedInput}@rehab.local`;
      const fbResult = await FirebaseService.login(email, trimmedPassword);
      if (fbResult.success && fbResult.user) {
        // 로그인 성공 후 실제 Firebase Authentication UID와 앱 사용자 ID 일치 여부 검증
        const currentAuthUid = getFirebaseAuth()?.currentUser?.uid;
        if (!currentAuthUid || currentAuthUid !== fbResult.user.id) {
          return {
            success: false,
            errorMessage: 'Firebase 인증 세션 UID와 사용자 ID가 일치하지 않습니다. 다시 로그인해 주세요.'
          };
        }

        // 로컬 계정 메타데이터 동기화 (authProvider: 'firebase', isDemoAccount: false 명시)
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
          registeredAt: fbResult.user.registeredAt || new Date().toISOString(),
          authProvider: 'firebase',
          isDemoAccount: false
        };
        const existingIdx = accounts.findIndex(
          (a) => a.id === fbResult.user!.id || (!this.isPureDemoAccount(a) && a.username.toLowerCase() === fbResult.user!.username.toLowerCase())
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

        return fbResult;
      } else {
        // 실제 Firebase 계정의 로그인 실패 시 로컬 로그인으로 우회하지 않고 즉시 실패 반환
        return fbResult;
      }
    }

    return this.login(trimmedInput, trimmedPassword);
  },

  /**
   * 로그인 처리 (순수 데모 계정 또는 Firebase 미설정 오프라인 모드 전용)
   */
  login(usernameInput: string, passwordInput: string): { success: boolean; user?: AuthUser; errorMessage?: string } {
    const trimmedUsername = usernameInput.trim();
    const trimmedPassword = passwordInput.trim();

    if (!trimmedUsername || !trimmedPassword) {
      return {
        success: false,
        errorMessage: '아이디와 비밀번호를 모두 입력해주세요.'
      };
    }

    const accounts = this.getAccounts();
    const matchedAccount = accounts.find(
      (acc) =>
        (!isFirebaseConfigured() || this.isPureDemoAccount(acc)) &&
        acc.username.toLowerCase() === trimmedUsername.toLowerCase() &&
        acc.passwordHash === trimmedPassword
    );

    if (!matchedAccount) {
      return {
        success: false,
        errorMessage: '아이디 또는 비밀번호가 일치하지 않습니다. 다시 확인해주세요.'
      };
    }

    // 계정 정지 여부 검사
    if (matchedAccount.accountStatus === 'suspended') {
      return {
        success: false,
        errorMessage: '해당 계정은 시스템 관리자에 의해 일시 정지되었습니다. 관리자에게 문의하세요.'
      };
    }

    const isDemo = this.isPureDemoAccount(matchedAccount);
    const sessionUser: AuthUser = {
      id: matchedAccount.id,
      username: matchedAccount.username,
      name: matchedAccount.name,
      role: matchedAccount.role,
      patientId: matchedAccount.patientId,
      therapistId: matchedAccount.therapistId,
      accountStatus: matchedAccount.accountStatus || 'active',
      therapistVerification: matchedAccount.therapistVerification || (matchedAccount.role === 'therapist' ? 'verified' : undefined),
      connectionCode: matchedAccount.connectionCode,
      connectedTherapistId: matchedAccount.connectedTherapistId,
      connectedTherapistName: matchedAccount.connectedTherapistName,
      licenseCode: matchedAccount.licenseCode,
      clinic: matchedAccount.clinic,
      registeredAt: matchedAccount.registeredAt,
      authProvider: isDemo ? 'demo' : matchedAccount.authProvider,
      isDemoAccount: isDemo
    };

    if (typeof window !== 'undefined') {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    }

    emitAuthChange();
    return {
      success: true,
      user: sessionUser
    };
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

    // 만약 정지된 사용자가 현재 세션 사용자라면 세션 종료
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

    // 현재 로그인된 세션과 일치하면 세션 정보도 업데이트
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
    // Firebase Auth 세션도 즉시 로그아웃하여 계정 전환 시 이전 사용자 UID가 남아있지 않도록 보장
    if (isFirebaseConfigured()) {
      FirebaseService.logout().catch((err) => {
        console.warn('Firebase logout warning on AuthService.logout:', err);
      });
    }
    emitAuthChange();
  },

  /**
   * 세션 사용자 조회
   */
  getSessionUser(): AuthUser | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = sessionStorage.getItem(SESSION_KEY);
      if (!data) return null;
      return JSON.parse(data) as AuthUser;
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
 * 예: "강민성" -> "강민성 물리치료사"
 * 예: "강민성 물리치료사" -> "강민성 물리치료사"
 * 예: "강민성 PT" -> "강민성 PT"
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
 * 임상 피드백 작성자 표시 이름 확인 함수 (Requirement 3)
 * - 피드백에 저장된 therapistId 및 therapistName을 바탕으로 실제 담당 물리치료사 이름을 정확히 반환
 */
export function getFeedbackAuthorDisplayName(
  fb?: { therapistId?: string; therapistName?: string } | null,
  patient?: { therapistId?: string; therapistName?: string; connectionStatus?: string } | null
): string {
  if (!fb) return '담당 물리치료사';

  // 1. 피드백의 therapistId가 환자의 담당 치료사와 일치하는 경우 환자의 치료사명 우선 활용
  if (fb.therapistId && patient?.therapistId && fb.therapistId === patient.therapistId && patient.therapistName) {
    return formatTherapistDisplayName(patient.therapistName);
  }

  // 2. 피드백에 기록된 therapistName이 유효하고 기본 데모 치료사가 아닌 경우
  if (fb.therapistName && fb.therapistName !== '박건우 PT' && fb.therapistName !== '담당 물리치료사') {
    return formatTherapistDisplayName(fb.therapistName);
  }

  // 3. 환자가 특정 치료사와 연결되어 있는 상태라면 연결된 치료사명 반환
  if (patient?.connectionStatus === 'connected' && patient?.therapistName) {
    return formatTherapistDisplayName(patient.therapistName);
  }

  // 4. 기본 포맷
  return fb.therapistName ? formatTherapistDisplayName(fb.therapistName) : '담당 물리치료사';
}


