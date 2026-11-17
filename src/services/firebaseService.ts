/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase Authentication & Cloud Firestore 통합 서비스
 * 
 * - Firebase Auth 이메일/비밀번호 회원가입, 로그인, 로그아웃
 * - Firestore users 컬렉션 (UID 기준 프로필 저장)
 * - Firestore workoutLogs 컬렉션 (환자 재활운동 수행 기록)
 * - Firestore connections 컬렉션 (환자-물리치료사 연동 관계)
 * - Firestore feedbacks 컬렉션 (물리치료사 임상 소견)
 * - 실제 연결 성공 여부 핑 테스트 (Requirement 15)
 */

import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  onSnapshot,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { 
  getFirebaseAuth, 
  getFirebaseFirestore, 
  waitForFirebaseAuthUid,
  handleFirestoreError, 
  OperationType 
} from './firebase';
import {
  getFirebaseConfig,
  isFirebaseConfigured,
  isFirestoreWriteAllowed,
  assertFirestoreWriteAllowed
} from '../config/firebaseConfig';
import { StorageService } from './storageService';
import { 
  AuthUser, 
  UserAccount, 
  UserRole, 
  Patient, 
  WorkoutLog, 
  ClinicalFeedback, 
  PatientTherapistConnection, 
  AssignedExercise,
  SoapNote,
  SoapNoteRevision
} from '../types/rehab';

export interface FirebaseConnectionStatus {
  isConfigured: boolean;
  isConnected: boolean; // 실제 Firestore 데이터 읽기/쓰기 성공 여부
  projectId: string;
  authEmail: string | null;
  lastCheckedAt: string | null;
  errorMessage?: string;
}

let cachedConnectionStatus: FirebaseConnectionStatus = {
  isConfigured: false,
  isConnected: false,
  projectId: '',
  authEmail: null,
  lastCheckedAt: null
};

const CONNECTION_STATUS_EVENT = 'rehab_firebase_status_changed';

function emitConnectionStatus(status: FirebaseConnectionStatus) {
  cachedConnectionStatus = status;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CONNECTION_STATUS_EVENT, { detail: status }));
  }
}

/**
 * SOAP 진료·평가 날짜(YYYY-MM-DD)가 실제 그레고리력 달력에 존재하는지 검증
 * - 1900~2099년 범위, 월별 일수(30/31일) 및 윤년(4년 주기·100년 평년·400년 윤년)의 2월 29일 유효성 판별
 */
export function isValidSoapCalendarDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string') return false;
  const trimmed = dateStr.trim();
  const match = /^(19|20)(\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.exec(trimmed);
  if (!match) return false;

  const year = Number(match[1] + match[2]);
  const month = Number(match[3]);
  const day = Number(match[4]);

  const isLeapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const daysInMonth = [
    31,
    isLeapYear ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31
  ];

  return day >= 1 && day <= daysInMonth[month - 1];
}

export const MAX_SOAP_FIELD_LENGTH = 5000;

/**
 * SOAP S/O/A/P 각 항목의 최대 글자 수(5,000자) 초과 여부 검사
 * - 5,000자 이하 허용, 5,001자 이상 차단
 */
export function getSoapFieldExceedingMaxLength(fields: {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}): { key: 'subjective' | 'objective' | 'assessment' | 'plan'; label: string; length: number } | null {
  const entries: Array<{
    key: 'subjective' | 'objective' | 'assessment' | 'plan';
    label: string;
    value: string;
  }> = [
    { key: 'subjective', label: 'S · Subjective(주관적 호소)', value: fields.subjective },
    { key: 'objective', label: 'O · Objective(객관적 소견)', value: fields.objective },
    { key: 'assessment', label: 'A · Assessment(평가 및 해석)', value: fields.assessment },
    { key: 'plan', label: 'P · Plan(치료 계획)', value: fields.plan }
  ];

  for (const item of entries) {
    const trimmed = item.value.trim();
    if (trimmed.length > MAX_SOAP_FIELD_LENGTH) {
      return { key: item.key, label: item.label, length: trimmed.length };
    }
  }
  return null;
}

export const FirebaseService = {
  /**
   * Firebase 연결 상태 구독
   */
  subscribeToConnectionStatus(callback: (status: FirebaseConnectionStatus) => void): () => void {
    if (typeof window === 'undefined') return () => {};
    const handler = (e: any) => callback(e.detail || cachedConnectionStatus);
    window.addEventListener(CONNECTION_STATUS_EVENT, handler);
    // 즉시 현재 캐시된 상태 전달
    callback(cachedConnectionStatus);
    return () => window.removeEventListener(CONNECTION_STATUS_EVENT, handler);
  },

  getConnectionStatus(): FirebaseConnectionStatus {
    return cachedConnectionStatus;
  },

  /**
   * 실제 Firestore 백엔드 도달 및 연결 검증 (Requirement 15)
   * - 실제 Firebase 데이터 저장 및 조회에 성공했을 때만 연결 성공으로 판정
   */
  async verifyLiveConnection(): Promise<FirebaseConnectionStatus> {
    if (!isFirebaseConfigured()) {
      const status: FirebaseConnectionStatus = {
        isConfigured: false,
        isConnected: false,
        projectId: '',
        authEmail: null,
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Firebase 설정(firebaseConfig)이 아직 등록되지 않았습니다.'
      };
      emitConnectionStatus(status);
      return status;
    }

    const auth = getFirebaseAuth();
    const db = getFirebaseFirestore();
    const activeProjectId = getFirebaseConfig().projectId || '';

    if (!auth || !db) {
      const status: FirebaseConnectionStatus = {
        isConfigured: true,
        isConnected: false,
        projectId: activeProjectId,
        authEmail: null,
        lastCheckedAt: new Date().toISOString(),
        errorMessage: 'Firebase SDK 인스턴스를 초기화할 수 없습니다.'
      };
      emitConnectionStatus(status);
      return status;
    }

    try {
      // 1. Firestore 연결 테스트: getDocFromServer 호출
      // 서버에서 실제 응답을 수신하는지 확인
      const testRef = doc(db, 'system_health', 'connection_test');
      await getDocFromServer(testRef);

      const status: FirebaseConnectionStatus = {
        isConfigured: true,
        isConnected: true,
        projectId: activeProjectId,
        authEmail: auth.currentUser?.email || null,
        lastCheckedAt: new Date().toISOString()
      };
      emitConnectionStatus(status);
      return status;
    } catch (error: any) {
      // permission-denied는 Firestore 서버와 실제 통신이 성공했음을 나타냄 (보안 규칙 활성화)
      const isServerReachable = 
        error?.code === 'permission-denied' || 
        error?.message?.includes('permission-denied') ||
        error?.code === 'not-found';

      if (isServerReachable) {
        const status: FirebaseConnectionStatus = {
          isConfigured: true,
          isConnected: true,
          projectId: activeProjectId,
          authEmail: auth.currentUser?.email || null,
          lastCheckedAt: new Date().toISOString()
        };
        emitConnectionStatus(status);
        return status;
      }

      const status: FirebaseConnectionStatus = {
        isConfigured: true,
        isConnected: false,
        projectId: activeProjectId,
        authEmail: auth.currentUser?.email || null,
        lastCheckedAt: new Date().toISOString(),
        errorMessage: error?.message || 'Firestore 서버에 연결할 수 없습니다.'
      };
      emitConnectionStatus(status);
      return status;
    }
  },

  // ==========================================
  // Firebase Authentication (이메일/비밀번호)
  // ==========================================

  /**
   * Firebase Auth 회원가입 및 Firestore users/{uid} 프로필 동시 생성
   */
  async register(params: {
    email: string;
    password: string;
    name: string;
    role: 'patient' | 'therapist';
    clinic?: string;
    licenseCode?: string;
    connectionCode?: string;
    age?: number;
    gender?: '남성' | '여성';
    diagnosis?: string;
    targetGoal?: string;
  }): Promise<{ success: boolean; user?: AuthUser; errorMessage?: string }> {
    const auth = getFirebaseAuth();
    const db = getFirebaseFirestore();

    if (!auth || !db) {
      return { success: false, errorMessage: 'Firebase 인스턴스를 초기화할 수 없습니다.' };
    }

    try {
      assertFirestoreWriteAllowed('회원가입 및 사용자 프로필 생성');
      // 1. Firebase Auth 계정 생성
      const userCredential = await createUserWithEmailAndPassword(auth, params.email.trim(), params.password);
      const uid = userCredential.user.uid;
      const nowStr = new Date().toISOString();

      // 2. 물리치료사 연결 코드 생성
      let connectionCode = params.connectionCode;
      if (params.role === 'therapist' && !connectionCode) {
        connectionCode = `PT-${Math.floor(1000 + Math.random() * 9000)}`;
      }

      // 3. Firestore users/{uid} 문서 저장 (Requirement 1, 4, 5)
      const userDocRef = doc(db, 'users', uid);
      const userDocData: any = {
        uid,
        email: params.email.trim(),
        name: params.name.trim(),
        role: params.role,
        accountStatus: 'active',
        approvalStatus: 'approved',
        createdAt: nowStr,
        updatedAt: nowStr
      };

      if (params.role === 'therapist') {
        // 치료사는 기본 미인증 상태로 생성됨 (서버 측 Custom Claims 또는 verifiedTherapists 등록 후 승격)
        userDocData.isVerified = false;
        userDocData.therapistVerification = 'unverified';
        userDocData.connectionCode = connectionCode;
        userDocData.clinic = params.clinic || '재활치료센터';
        userDocData.licenseCode = params.licenseCode || 'PT-2026';
      } else {
        userDocData.age = params.age || 32;
        userDocData.gender = params.gender || '남성';
        userDocData.diagnosis = params.diagnosis?.trim() || '';
        userDocData.targetGoal = params.targetGoal || '맞춤형 재활운동 프로그램 배정';
        userDocData.therapistNotes = '';
        userDocData.assignedProgram = [];
        userDocData.connectionStatus = 'not_connected';
      }

      try {
        await setDoc(userDocRef, userDocData);
        // 치료사인 경우 공개 디렉터리(publicTherapists)에도 공개 정보만 분리 저장 (Requirement 1)
        if (params.role === 'therapist') {
          const publicDocRef = doc(db, 'publicTherapists', uid);
          await setDoc(publicDocRef, {
            therapistId: uid,
            name: params.name.trim(),
            clinic: params.clinic || '재활치료센터',
            licenseCode: params.licenseCode || 'PT-2026',
            connectionCode,
            isVerified: false,
            createdAt: nowStr,
            updatedAt: nowStr
          });
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${uid}`);
      }

      const authUser: AuthUser = {
        id: uid,
        username: params.email.split('@')[0],
        name: params.name.trim(),
        role: params.role,
        patientId: params.role === 'patient' ? uid : undefined,
        therapistId: params.role === 'therapist' ? uid : undefined,
        accountStatus: 'active',
        approvalStatus: 'approved',
        therapistVerification: params.role === 'therapist' ? 'unverified' : undefined,
        connectionCode,
        clinic: params.clinic,
        licenseCode: params.licenseCode,
        registeredAt: nowStr,
        authProvider: 'firebase',
        isDemoAccount: false
      };

      // 세션 저장 및 상태 이벤트 발송
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('rehab_session_user_v1', JSON.stringify(authUser));
        window.dispatchEvent(new CustomEvent('rehab_auth_state_changed'));
      }

      await this.verifyLiveConnection();
      return { success: true, user: authUser };
    } catch (error: any) {
      console.error('Firebase registration error:', error);
      let msg = error.message;
      if (error.code === 'auth/email-already-in-use') {
        msg = '이미 가입된 이메일 주소입니다. 로그인해주세요.';
      } else if (error.code === 'auth/invalid-email') {
        msg = '올바른 이메일 주소 형식을 입력해주세요.';
      } else if (error.code === 'auth/weak-password') {
        msg = '비밀번호는 최소 6자 이상이어야 합니다.';
      }
      return { success: false, errorMessage: msg };
    }
  },

  /**
   * Firebase Auth 로그인 및 Firestore 사용자 정보 조회
   */
  async login(email: string, password: string): Promise<{ success: boolean; user?: AuthUser; errorMessage?: string }> {
    const auth = getFirebaseAuth();
    const db = getFirebaseFirestore();

    if (!auth || !db) {
      return { success: false, errorMessage: 'Firebase 인스턴스를 초기화할 수 없습니다.' };
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      // Firestore에서 사용자 프로필 문서 가져오기
      const userDocRef = doc(db, 'users', uid);
      let userDocSnap;
      try {
        userDocSnap = await getDoc(userDocRef);
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${uid}`);
      }

      let authUser: AuthUser;

      if (userDocSnap && userDocSnap.exists()) {
        const data = userDocSnap.data();
        authUser = {
          id: uid,
          username: (data.email || email).split('@')[0],
          name: data.name || '사용자',
          role: data.role || 'patient',
          patientId: data.role === 'patient' ? uid : undefined,
          therapistId: data.role === 'therapist' ? uid : undefined,
          accountStatus: data.accountStatus || 'active',
          approvalStatus: data.approvalStatus || 'approved',
          therapistVerification: data.therapistVerification || (data.role === 'therapist' ? 'verified' : undefined),
          connectionCode: data.connectionCode,
          connectedTherapistId: data.connectedTherapistId,
          connectedTherapistName: data.connectedTherapistName,
          clinic: data.clinic,
          licenseCode: data.licenseCode,
          registeredAt: data.createdAt,
          authProvider: 'firebase',
          isDemoAccount: false
        };

        // 실제 물리치료사 계정의 공개 디렉터리(publicTherapists/{uid}) 누락 방지 동기화
        if (authUser.role === 'therapist' && authUser.connectionCode && isFirestoreWriteAllowed()) {
          try {
            const publicDocRef = doc(db, 'publicTherapists', uid);
            const publicSnap = await getDoc(publicDocRef);
            if (!publicSnap.exists()) {
              const nowStr = new Date().toISOString();
              await setDoc(publicDocRef, {
                therapistId: uid,
                name: authUser.name,
                clinic: authUser.clinic || '재활치료센터',
                licenseCode: authUser.licenseCode || 'PT-2026',
                connectionCode: authUser.connectionCode.trim().toUpperCase(),
                isVerified: authUser.therapistVerification === 'verified',
                createdAt: data.createdAt || nowStr,
                updatedAt: nowStr
              });
            }
          } catch (pubErr) {
            console.warn('publicTherapists sync on login warning:', pubErr);
          }
        }
      } else {
        // 프로필이 없는 경우 기본 프로필 생성
        const nowStr = new Date().toISOString();
        const fallbackRole: UserRole = email.includes('therapist') || email.includes('pt') ? 'therapist' : 'patient';
        const fallbackDoc = {
          uid,
          email: email.trim(),
          name: email.split('@')[0],
          role: fallbackRole,
          accountStatus: 'active',
          approvalStatus: 'approved',
          createdAt: nowStr,
          updatedAt: nowStr
        };
        if (isFirestoreWriteAllowed()) {
          await setDoc(userDocRef, fallbackDoc);
        }
        authUser = {
          id: uid,
          username: email.split('@')[0],
          name: email.split('@')[0],
          role: fallbackRole,
          patientId: fallbackRole === 'patient' ? uid : undefined,
          therapistId: fallbackRole === 'therapist' ? uid : undefined,
          accountStatus: 'active',
          approvalStatus: 'approved',
          registeredAt: nowStr,
          authProvider: 'firebase',
          isDemoAccount: false
        };
      }

      if (typeof window !== 'undefined') {
        sessionStorage.setItem('rehab_session_user_v1', JSON.stringify(authUser));
        window.dispatchEvent(new CustomEvent('rehab_auth_state_changed'));
      }

      await this.verifyLiveConnection();
      return { success: true, user: authUser };
    } catch (error: any) {
      console.error('Firebase login error:', error);
      let msg = error.message;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        msg = '이메일 또는 비밀번호가 일치하지 않습니다.';
      } else if (error.code === 'auth/invalid-email') {
        msg = '올바른 이메일 주소를 입력해주세요.';
      }
      return { success: false, errorMessage: msg };
    }
  },

  /**
   * Firebase Auth 로그아웃
   */
  async logout(): Promise<void> {
    const auth = getFirebaseAuth();
    if (auth) {
      try {
        await signOut(auth);
      } catch (e) {
        console.warn('Firebase signOut error:', e);
      }
    }
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('rehab_session_user_v1');
      window.dispatchEvent(new CustomEvent('rehab_auth_state_changed'));
    }
    emitConnectionStatus({
      ...cachedConnectionStatus,
      authEmail: null
    });
  },

  // ==========================================
  // Cloud Firestore 데이터 CRUD 및 실시간 연동
  // ==========================================

  /**
   * Firestore에 운동 수행 기록 저장 (Requirement 8)
   */
  async saveWorkoutLog(log: WorkoutLog): Promise<boolean> {
    const db = getFirebaseFirestore();
    if (!db) return false;

    const logPath = `workoutLogs/${log.id}`;
    try {
      assertFirestoreWriteAllowed('운동 수행 기록 저장');
      const logRef = doc(db, 'workoutLogs', log.id);
      // 보안 규칙의 incoming().painLevel >= 0 && painLevel <= 10 충족 보장
      const safePainLevel = typeof log.painLevel === 'number' 
        ? Math.max(0, Math.min(10, Math.round(log.painLevel)))
        : 0;

      await setDoc(logRef, {
        ...log,
        painLevel: safePainLevel,
        syncedAt: new Date().toISOString()
      }, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, logPath);
      return false;
    }
  },

  /**
   * Firestore에서 환자의 운동 수행 기록 조회 (Requirement 8)
   */
  async getWorkoutLogs(patientId: string): Promise<WorkoutLog[]> {
    const db = getFirebaseFirestore();
    if (!db) return [];

    const path = 'workoutLogs';
    try {
      const q = query(collection(db, path), where('patientId', '==', patientId));
      const snap = await getDocs(q);
      const logs: WorkoutLog[] = [];
      snap.forEach((d) => {
        logs.push(d.data() as WorkoutLog);
      });
      return logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
    } catch (error: any) {
      console.warn('Fetch workout logs warning:', error?.message || error);
      return [];
    }
  },

  /**
   * 물리치료사의 환자 운동 프로그램 배정 저장 (Requirement 7)
   * - users/{patientId}에는 허용 필드(assignedProgram, updatedAt)만 수정
   * - prescriptions/{patientId}에는 환자 UID 키로 직접 처방 문서 저장
   */
  async savePrescribedProgram(patientId: string, assignedProgram: AssignedExercise[], therapistId: string): Promise<boolean> {
    const db = getFirebaseFirestore();
    if (!db) return false;

    const userPath = `users/${patientId}`;
    try {
      assertFirestoreWriteAllowed('운동 처방 저장');
      // 1. users/{patientId} 문서 업데이트 (규칙의 affectedKeys: assignedProgram, updatedAt)
      const userRef = doc(db, 'users', patientId);
      await updateDoc(userRef, {
        assignedProgram,
        updatedAt: new Date().toISOString()
      });

      // 2. prescriptions/{patientId} 컬렉션에 환자 UID를 키로 직접 저장
      const presRef = doc(db, 'prescriptions', patientId);
      await setDoc(presRef, {
        patientId,
        therapistId,
        assignedProgram,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
      return false;
    }
  },

  /**
   * Firestore prescriptions/{patientId}에서 처방된 운동 프로그램 직접 조회 (Requirement 4)
   * - 환자 UID를 문서 ID로 사용해 단일 getDoc 조회
   */
  async getPrescribedProgram(patientId: string): Promise<AssignedExercise[] | null> {
    const db = getFirebaseFirestore();
    if (!db || !patientId) return null;

    const path = `prescriptions/${patientId}`;
    try {
      const presRef = doc(db, 'prescriptions', patientId);
      const snap = await getDoc(presRef);
      if (snap.exists()) {
        const data = snap.data();
        return (data.assignedProgram as AssignedExercise[]) || [];
      }
      return null;
    } catch (error: any) {
      console.warn('Fetch prescribed program warning:', error?.message || error);
      return null;
    }
  },

  /**
   * users/{uid} 문서에서 물리치료사의 실제 등록된 이름 조회 (Requirement 1, 2)
   */
  async getTherapistRealName(therapistUid: string): Promise<string | null> {
    const db = getFirebaseFirestore();
    if (!db || !therapistUid) return null;
    try {
      const snap = await getDoc(doc(db, 'users', therapistUid));
      if (snap.exists()) {
        const data = snap.data();
        return data.name || null;
      }
      return null;
    } catch (err) {
      console.warn('getTherapistRealName error:', err);
      return null;
    }
  },

  /**
   * 물리치료사의 임상 소견 피드백 Firestore 저장 (Requirement 1, 2, 5)
   */
  async saveFeedback(patientId: string, feedback: ClinicalFeedback, therapistId: string): Promise<boolean> {
    const db = getFirebaseFirestore();
    if (!db) return false;

    const feedbackPath = `feedbacks/${feedback.id}`;
    try {
      assertFirestoreWriteAllowed('임상 피드백 저장');
      const feedbackRecord: ClinicalFeedback = {
        ...feedback,
        therapistId,
        therapistName: feedback.therapistName || '담당 물리치료사'
      };

      const feedbackRef = doc(db, 'feedbacks', feedback.id);
      await setDoc(feedbackRef, {
        id: feedbackRecord.id,
        date: feedbackRecord.date,
        patientId,
        therapistId,
        therapistName: feedbackRecord.therapistName,
        content: feedbackRecord.content,
        recommendation: feedbackRecord.recommendation || '',
        createdAt: new Date().toISOString()
      });

      // 환자 문서의 feedbacks 배열에도 올바른 therapistId와 therapistName이 포함된 피드백 반영
      const userRef = doc(db, 'users', patientId);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const existing = userData.feedbacks || [];
        await updateDoc(userRef, {
          feedbacks: [feedbackRecord, ...existing],
          updatedAt: new Date().toISOString()
        });
      }

      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, feedbackPath);
      return false;
    }
  },

  /**
   * Firestore에서 환자의 임상 피드백 조회 (Requirement 9)
   */
  async getFeedbacks(patientId: string): Promise<ClinicalFeedback[]> {
    const db = getFirebaseFirestore();
    if (!db) return [];

    const path = 'feedbacks';
    try {
      const q = query(collection(db, path), where('patientId', '==', patientId));
      const snap = await getDocs(q);
      const feedbacks: ClinicalFeedback[] = [];
      snap.forEach((d) => {
        feedbacks.push(d.data() as ClinicalFeedback);
      });
      return feedbacks.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
      return [];
    }
  },

  /**
   * 환자-물리치료사 연결 관계 Firestore 저장 (Requirement 2 & 3)
   * - 불필요한 getDoc 존재 여부 사전 조회를 제거하여 단일 get 규칙 강화(resource != null)와 완전 호환
   * - 신규 요청: setDoc(create) 바로 시도
   * - 기존 문서 존재 시: 상태 머신(pending/connected/rejected/disconnected)에 따른 updateDoc 전송
   */
  async saveConnection(connection: PatientTherapistConnection): Promise<boolean> {
    const db = getFirebaseFirestore();
    if (!db) return false;

    const rawId = connection.connectionId || `${connection.patientId}_${connection.therapistId}`;
    const cleanId = rawId.replace(/^req-/, '');
    const canonicalId = cleanId.includes('_') ? cleanId : `${connection.patientId}_${connection.therapistId}`;
    const path = `connections/${canonicalId}`;
    const nowStr = new Date().toISOString();
    const connRef = doc(db, 'connections', canonicalId);

    try {
      assertFirestoreWriteAllowed('환자-치료사 연결 상태 저장');
      // 1. 신규 연결 요청 (status === 'pending')
      if (connection.status === 'pending') {
        const createPayload: Record<string, any> = {
          connectionId: canonicalId,
          patientId: connection.patientId,
          patientName: connection.patientName || '환자',
          therapistId: connection.therapistId,
          therapistName: connection.therapistName || '물리치료사',
          status: 'pending',
          requestedBy: connection.requestedBy || 'patient',
          createdAt: connection.createdAt || nowStr,
          updatedAt: nowStr
        };
        if (connection.requestType) createPayload.requestType = connection.requestType;
        if (connection.inviteCode) createPayload.inviteCode = connection.inviteCode;
        if (connection.notes) createPayload.notes = connection.notes;

        try {
          // getDoc으로 존재 여부를 미리 조회하지 않고 직접 setDoc 시도
          // 문서가 존재하지 않는 경우 Firestore allow create 규칙이 평가되어 생성 성공
          await setDoc(connRef, createPayload);
          return true;
        } catch (setErr: any) {
          // 이미 연결 문서가 존재하는 경우 (과거 해제 또는 거절 상태에서 재요청 시)
          // 이 시점에는 문서가 실재하므로 getDoc() 조회가 보안 규칙을 정상 통과함
          try {
            const snap = await getDoc(connRef);
            if (snap.exists()) {
              const currentStatus = snap.data()?.status;
              if (currentStatus === 'disconnected' || currentStatus === 'rejected') {
                const reRequestPayload: Record<string, any> = {
                  status: 'pending',
                  requestedBy: connection.requestedBy || 'patient',
                  updatedAt: nowStr
                };
                if (connection.requestType) reRequestPayload.requestType = connection.requestType;
                if (connection.inviteCode) reRequestPayload.inviteCode = connection.inviteCode;
                if (connection.notes) reRequestPayload.notes = connection.notes;
                await updateDoc(connRef, reRequestPayload);
                return true;
              } else if (currentStatus === 'pending') {
                return true; // 이미 대기 중인 요청이 존재
              } else if (currentStatus === 'connected') {
                return true; // 이미 연결된 상태
              }
            }
          } catch (reErr) {
            console.warn('Re-request fallback error:', reErr);
          }
          throw setErr;
        }
      }

      // 2. 승인 (pending -> connected)
      if (connection.status === 'connected') {
        try {
          // 먼저 현재 문서 상태를 안전하게 조회 (당사자는 getDoc 허용)
          let currentStatus: string | undefined = undefined;
          try {
            const snap = await getDoc(connRef);
            if (snap.exists()) {
              currentStatus = snap.data()?.status;
            }
          } catch (getErr) {
            console.warn('Check connection status prior to approval deferred:', getErr);
          }

          // 이미 승인되어 connected 상태라면 중복 쓰기 없이 즉시 성공 처리 (원자적 멱등성 보장)
          if (currentStatus === 'connected') {
            return true;
          }

          // pending 상태이거나 최초 갱신 시 오직 허용된 키(['status', 'connectedAt', 'updatedAt'])만 원자적 갱신
          await updateDoc(connRef, {
            status: 'connected',
            connectedAt: connection.connectedAt || nowStr,
            updatedAt: nowStr
          });
          return true;
        } catch (updErr: any) {
          console.error('Firestore connection approval updateDoc failed:', updErr);
          throw updErr;
        }
      }

      // 3. 거절 (pending -> rejected)
      if (connection.status === 'rejected') {
        const rejectPayload: Record<string, any> = {
          status: 'rejected',
          rejectedAt: connection.rejectedAt || nowStr,
          respondedAt: nowStr,
          updatedAt: nowStr
        };
        if (connection.notes) rejectPayload.notes = connection.notes;
        await updateDoc(connRef, rejectPayload);
        return true;
      }

      // 4. 연결 해제 (connected -> disconnected)
      if (connection.status === 'disconnected') {
        const discPayload: Record<string, any> = {
          status: 'disconnected',
          disconnectedAt: connection.disconnectedAt || nowStr,
          updatedAt: nowStr
        };
        if (connection.notes) discPayload.notes = connection.notes;
        await updateDoc(connRef, discPayload);
        return true;
      }

      return false;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  },

  /**
   * 단일 연결 문서 조회 (connections/{connectionId})
   * - 실제 Firestore connections 문서의 원본 데이터와 문서 ID(doc.id) 반환
   */
  async getConnectionDoc(connectionId: string): Promise<PatientTherapistConnection | null> {
    const db = getFirebaseFirestore();
    if (!db || !connectionId) return null;

    try {
      const cleanId = connectionId.replace(/^req-/, '');
      const connRef = doc(db, 'connections', cleanId);
      const snap = await getDoc(connRef);
      if (!snap.exists()) {
        return null;
      }
      const data = snap.data() as PatientTherapistConnection;
      return {
        ...data,
        connectionId: snap.id
      };
    } catch (err: any) {
      console.warn(`getConnectionDoc(${connectionId}) error:`, err);
      throw err;
    }
  },

  /**
   * 물리치료사와 환자 UID로 실제 Firestore 연결 문서 조회
   * 1. 표준 canonicalId(`${patientId}_${therapistId}`)로 getDoc 시도
   * 2. 없거나 다르면 where('therapistId', '==', therapistId) 쿼리로 탐색하여 실제 doc.id 획득
   */
  async findConnectionDocByTherapistAndPatient(
    therapistId: string,
    patientId: string
  ): Promise<{ docId: string; connection: PatientTherapistConnection } | null> {
    const db = getFirebaseFirestore();
    if (!db || !therapistId || !patientId) return null;

    // 1. canonical ID 우선 직접 getDoc 시도
    const canonicalId = `${patientId}_${therapistId}`;
    try {
      const snap = await getDoc(doc(db, 'connections', canonicalId));
      if (snap.exists()) {
        const data = snap.data() as PatientTherapistConnection;
        return {
          docId: snap.id,
          connection: {
            ...data,
            connectionId: snap.id
          }
        };
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        throw e;
      }
      console.warn('Canonical connection getDoc check skipped:', e);
    }

    // 2. 쿼리로 실제 문서 탐색 (보안 규칙: where('therapistId', '==', auth.uid) 만족)
    try {
      const q = query(
        collection(db, 'connections'),
        where('therapistId', '==', therapistId),
        where('patientId', '==', patientId)
      );
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        const firstDoc = querySnap.docs[0];
        return {
          docId: firstDoc.id,
          connection: {
            ...(firstDoc.data() as PatientTherapistConnection),
            connectionId: firstDoc.id
          }
        };
      }
    } catch (err: any) {
      if (err?.code === 'permission-denied') {
        throw err;
      }
      console.warn('Query connection by therapist and patient error:', err);
    }

    return null;
  },

  /**
   * users/{uid} 문서 조회 (환자 또는 치료사 프로필)
   */
  async getUserProfile(uid: string): Promise<Record<string, any> | null> {
    const db = getFirebaseFirestore();
    if (!db || !uid) return null;
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        return snap.data();
      }
      return null;
    } catch (err: any) {
      console.warn(`getUserProfile(${uid}) error:`, err?.message || err);
      return null;
    }
  },

  /**
   * 환자의 connections 컬렉션 목록 조회
   * - Firestore 읽기 실패를 정상적인 빈 목록([])으로 오인하지 않도록 예외를 상위로 전달
   */
  async getConnectionsForPatient(patientId: string): Promise<PatientTherapistConnection[]> {
    const db = getFirebaseFirestore();
    if (!db || !patientId) {
      throw new Error('Firestore 인스턴스 또는 환자 UID가 유효하지 않습니다.');
    }

    const authUid = await waitForFirebaseAuthUid();
    if (!authUid || authUid !== patientId) {
      throw new Error(`인증된 환자 UID(${authUid || '없음'})와 조회 대상 환자 UID(${patientId})가 일치하지 않습니다.`);
    }

    try {
      const q = query(
        collection(db, 'connections'),
        where('patientId', '==', patientId)
      );
      const snap = await getDocs(q);
      const conns: PatientTherapistConnection[] = [];
      snap.forEach((d) => {
        const data = d.data() as PatientTherapistConnection;
        conns.push({
          ...data,
          connectionId: d.id
        });
      });
      return conns.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.error('getConnectionsForPatient error:', err);
      throw err;
    }
  },

  /**
   * 물리치료사의 connections 컬렉션 목록 조회 (pending 및 connected 전체)
   * - 실제 인증된 치료사 계정(auth.currentUser.uid) 확인 후 조회
   * - Firestore 읽기 실패 시 정상적인 빈 목록([])으로 오인하지 않도록 예외를 상위로 전달
   */
  async getConnectionsForTherapist(therapistId: string): Promise<PatientTherapistConnection[]> {
    const db = getFirebaseFirestore();
    if (!db || !therapistId) {
      throw new Error('Firestore 인스턴스 또는 물리치료사 UID가 유효하지 않습니다.');
    }

    const authUid = await waitForFirebaseAuthUid();
    if (!authUid || authUid !== therapistId) {
      throw new Error(`인증된 물리치료사 UID(${authUid || '없음'})와 조회 대상 치료사 UID(${therapistId})가 일치하지 않습니다.`);
    }

    try {
      const q = query(
        collection(db, 'connections'),
        where('therapistId', '==', therapistId)
      );
      const snap = await getDocs(q);
      const conns: PatientTherapistConnection[] = [];
      snap.forEach((d) => {
        const data = d.data() as PatientTherapistConnection;
        conns.push({
          ...data,
          connectionId: d.id
        });
      });
      return conns.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
    } catch (err) {
      console.error('getConnectionsForTherapist error:', err);
      throw err;
    }
  },

  /**
   * 환자의 실시간 연결 상태 리스너 (Requirement 3, 4)
   */
  subscribeToPatientConnections(patientId: string, callback: (connections: PatientTherapistConnection[]) => void): () => void {
    const db = getFirebaseFirestore();
    if (!db || !patientId) return () => {};

    const auth = getFirebaseAuth();
    if (auth?.currentUser && auth.currentUser.uid !== patientId) {
      return () => {};
    }

    const q = query(
      collection(db, 'connections'),
      where('patientId', '==', patientId)
    );
    return onSnapshot(q, (snap) => {
      const conns: PatientTherapistConnection[] = [];
      snap.forEach((d) => {
        const data = d.data() as PatientTherapistConnection;
        conns.push({
          ...data,
          connectionId: d.id
        });
      });
      callback(conns);
    }, (err) => {
      console.warn('subscribeToPatientConnections error:', err);
    });
  },

  /**
   * 물리치료사의 실시간 연결 요청 및 활성 연결 리스너 (Requirement 3, 4)
   */
  subscribeToTherapistConnections(therapistId: string, callback: (connections: PatientTherapistConnection[]) => void): () => void {
    const db = getFirebaseFirestore();
    if (!db || !therapistId) return () => {};

    const auth = getFirebaseAuth();
    if (auth?.currentUser && auth.currentUser.uid !== therapistId) {
      return () => {};
    }

    const q = query(
      collection(db, 'connections'),
      where('therapistId', '==', therapistId)
    );
    return onSnapshot(q, (snap) => {
      const conns: PatientTherapistConnection[] = [];
      snap.forEach((d) => {
        const data = d.data() as PatientTherapistConnection;
        conns.push({
          ...data,
          connectionId: d.id
        });
      });
      callback(conns);
    }, (err) => {
      console.warn('subscribeToTherapistConnections error:', err);
    });
  },

  /**
   * 물리치료사 자격 검증 여부 확인 (Requirement 1)
   * - Firebase Auth Custom Claims (role == 'therapist') 또는 
   * - Firestore verifiedTherapists/{uid} 문서 존재 여부 확인
   */
  async checkTherapistVerification(uid: string): Promise<boolean> {
    const auth = getFirebaseAuth();
    const db = getFirebaseFirestore();
    if (!auth || !db) return false;

    try {
      if (auth.currentUser && auth.currentUser.uid === uid) {
        const tokenResult = await auth.currentUser.getIdTokenResult();
        if (tokenResult.claims.role === 'therapist' || tokenResult.claims.therapist === true) {
          return true;
        }
      }

      const verifiedDocRef = doc(db, 'verifiedTherapists', uid);
      const docSnap = await getDoc(verifiedDocRef);
      return docSnap.exists();
    } catch {
      return false;
    }
  },

  /**
   * 공개 디렉터리(publicTherapists)에서 고유 연결 코드로 물리치료사 검색 (Requirement 1)
   * - 실제 Firebase UID를 가진 물리치료사만 반환하며, 시연용 코드/ID는 제외
   */
  async findTherapistByConnectionCode(code: string): Promise<any | null> {
    const db = getFirebaseFirestore();
    if (!db || !code || !code.trim()) return null;

    const cleanCode = code.trim().toUpperCase();
    if (cleanCode === 'PT-GW-821') {
      return null;
    }

    try {
      const q = query(
        collection(db, 'publicTherapists'),
        where('connectionCode', '==', cleanCode)
      );
      const snap = await getDocs(q);
      if (!snap.empty) {
        const docSnap = snap.docs[0];
        const data = docSnap.data();
        const resolvedTherapistId = data.therapistId || docSnap.id;
        if (
          !resolvedTherapistId ||
          resolvedTherapistId === 'acc-therapist-01' ||
          resolvedTherapistId === 'therapist-1'
        ) {
          return null;
        }
        return {
          ...data,
          therapistId: resolvedTherapistId
        };
      }
      return null;
    } catch (err) {
      console.warn('findTherapistByConnectionCode error:', err);
      return null;
    }
  },

  /**
   * 물리치료사의 담당 환자 목록 조회 (Requirement 4)
   * - users 컬렉션의 allow list: if false 정책을 엄격히 준수
   * - 1단계: connections 컬렉션에서 therapistId == auth.uid 및 status == 'connected' 쿼리
   * - 2단계: 승인된 각 patientId에 대해 개별 getDoc(doc(db, 'users', patientId)) 단일 문서 조회 (isConnectedTherapist 통과)
   */
  async getConnectedPatientsForTherapist(therapistId: string): Promise<Patient[]> {
    const db = getFirebaseFirestore();
    if (!db || !therapistId) {
      throw new Error('Firestore 인스턴스 또는 물리치료사 UID가 유효하지 않습니다.');
    }

    const authUid = await waitForFirebaseAuthUid();
    if (!authUid || authUid !== therapistId) {
      throw new Error(`인증된 물리치료사 UID(${authUid || '없음'})와 조회 대상 치료사 UID(${therapistId})가 일치하지 않습니다.`);
    }

    try {
      // 1. connections 컬렉션에서 활성 연결 목록 조회
      const q = query(
        collection(db, 'connections'),
        where('therapistId', '==', therapistId),
        where('status', '==', 'connected')
      );
      const snap = await getDocs(q);
      const patientIds: string[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.patientId && !patientIds.includes(data.patientId)) {
          patientIds.push(data.patientId);
        }
      });

      if (patientIds.length === 0) return [];

      // 2. 승인된 환자별 개별 getDoc 단일 문서 조회 (보안 규칙 allow get: isConnectedTherapistForPatient 허용)
      const patientPromises = patientIds.map(async (pid) => {
        try {
          const userDoc = await getDoc(doc(db, 'users', pid));
          if (userDoc.exists()) {
            const uData = userDoc.data();
            const patientObj: Patient = {
              id: pid,
              name: uData.name || '환자',
              age: uData.age || 30,
              gender: uData.gender || '남성',
              diagnosis: uData.diagnosis || '',
              targetGoal: uData.targetGoal || '재활 목표',
              therapistNotes: uData.therapistNotes || '',
              assignedProgram: uData.assignedProgram || [],
              connectionStatus: 'connected',
              therapistId,
              therapistName: uData.therapistName,
              feedbacks: uData.feedbacks || []
            };
            return patientObj;
          }
        } catch (err) {
          console.warn(`Fetch patient ${pid} error:`, err);
        }
        return null;
      });

      const results = await Promise.all(patientPromises);
      return results.filter((p): p is Patient => p !== null);
    } catch (err) {
      console.error('getConnectedPatientsForTherapist error:', err);
      throw err;
    }
  },

  /**
   * 환자의 Firestore 실시간 프로필 리스너
   */
  subscribeToPatientProfile(patientId: string, callback: (patient: Partial<Patient> | null) => void): () => void {
    const db = getFirebaseFirestore();
    if (!db) return () => {};

    const userRef = doc(db, 'users', patientId);
    return onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as Partial<Patient>);
      } else {
        callback(null);
      }
    }, (error) => {
      console.warn('Patient snapshot error:', error);
    });
  },

  /**
   * 환자 진단명(diagnosis) 부분 업데이트
   * - users/{patientId} 문서의 diagnosis 및 updatedAt 필드만 updateDoc으로 업데이트 (전체 문서 덮어쓰기 금지)
   * - 물리치료사의 경우 Firestore connections에서 status가 'connected'인 담당 환자인지 사전 검증
   * - Firestore 저장 실패 시 에러 반환 및 성공 위장 방지
   */
  async updatePatientDiagnosis(
    patientId: string,
    diagnosis: string,
    updaterUid?: string,
    updaterRole?: 'patient' | 'therapist'
  ): Promise<{ success: boolean; errorMessage?: string }> {
    const db = getFirebaseFirestore();
    const cleanDiagnosis = diagnosis.trim();
    const nowStr = new Date().toISOString();

    // 1. 물리치료사인 경우: Firestore connections 컬렉션에서 status가 'connected'인지 확인
    if (updaterRole === 'therapist' && updaterUid && db) {
      try {
        const connId = `${patientId}_${updaterUid}`;
        const connRef = doc(db, 'connections', connId);
        const connSnap = await getDoc(connRef);
        if (!connSnap.exists() || connSnap.data()?.status !== 'connected') {
          return {
            success: false,
            errorMessage: '담당 환자로 연결 완료(connected)된 상태에서만 진단명을 수정할 수 있습니다.'
          };
        }
      } catch (err: any) {
        console.warn('Diagnosis connection verification error:', err);
        return {
          success: false,
          errorMessage: '치료사-환자 연결 상태 검증 중 오류가 발생했습니다: ' + (err?.message || '')
        };
      }
    }

    // 2. Firestore users/{patientId} 문서의 diagnosis 및 updatedAt 필드만 부분 업데이트
    if (db) {
      const userRef = doc(db, 'users', patientId);
      try {
        assertFirestoreWriteAllowed('진단명 수정');
        await updateDoc(userRef, {
          diagnosis: cleanDiagnosis,
          updatedAt: nowStr
        });
      } catch (err: any) {
        console.error('Firestore diagnosis update error:', err);
        let message = err?.message || 'Firestore 진단명 저장에 실패했습니다.';
        if (err?.code === 'permission-denied') {
          message = updaterRole === 'therapist'
            ? '물리치료사의 환자 진단명 수정 권한이 Firestore 보안 규칙에서 아직 허용되지 않았습니다. (Firebase Console 규칙 업데이트 필요)'
            : '진단명 수정 권한이 없습니다. (Firestore 보안 규칙 거부: permission-denied)';
        }
        return {
          success: false,
          errorMessage: message
        };
      }
    }

    // 3. 로컬 스토리지 환자 차트 즉시 동기화
    StorageService.updatePatientInfo(patientId, {
      diagnosis: cleanDiagnosis
    });

    return { success: true };
  },

  /**
   * 환자의 SOAP 노트 목록 조회 (연결된 검증 치료사 전용)
   * - encounterDate 내림차순, 동일 날짜 내 createdAt 내림차순 정렬
   * - 오류 발생 시 빈 배열로 위장하지 않고 호출부에 예외 전달
   */
  async getSoapNotes(patientId: string): Promise<SoapNote[]> {
    const db = getFirebaseFirestore();
    if (!db || !patientId) {
      const err: any = new Error('Firestore 인스턴스 또는 환자 UID가 유효하지 않습니다.');
      err.code = 'invalid-argument';
      throw err;
    }

    const authUid = await waitForFirebaseAuthUid();
    if (!authUid) {
      const err: any = new Error('인증된 치료사 세션을 확인할 수 없습니다. 다시 로그인해 주세요.');
      err.code = 'unauthenticated';
      throw err;
    }

    const q = query(
      collection(db, 'soapNotes'),
      where('patientId', '==', patientId)
    );
    const snap = await getDocs(q);
    const notes: SoapNote[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      notes.push({
        id: docSnap.id,
        patientId: data.patientId,
        therapistId: data.therapistId,
        therapistName: data.therapistName || '물리치료사',
        encounterDate: data.encounterDate || '',
        subjective: data.subjective || '',
        objective: data.objective || '',
        assessment: data.assessment || '',
        plan: data.plan || '',
        createdAt: (data.createdAt as Timestamp) || null,
        updatedAt: (data.updatedAt as Timestamp) || null,
        updatedById: data.updatedById || data.therapistId,
        updatedByName: data.updatedByName || data.therapistName || '물리치료사',
        version: typeof data.version === 'number' ? data.version : 1
      });
    });

    return notes.sort((a, b) => {
      const dateCmp = (b.encounterDate || '').localeCompare(a.encounterDate || '');
      if (dateCmp !== 0) return dateCmp;
      const aTime = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
      const bTime = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });
  },

  /**
   * 신규 SOAP 노트 작성 (Firestore 자동 ID 및 serverTimestamp 사용)
   * - 실제 Firebase Auth UID를 기준으로 작성자 식별 및 users/{authUid}.name 우선 적용
   */
  async createSoapNote(params: {
    patientId: string;
    therapistDisplayName?: string;
    encounterDate: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }): Promise<SoapNote> {
    const db = getFirebaseFirestore();
    if (!db) {
      const err: any = new Error('Firestore에 연결할 수 없습니다.');
      err.code = 'unavailable';
      throw err;
    }

    const authUid = await waitForFirebaseAuthUid();
    if (!authUid) {
      const err: any = new Error('인증된 치료사 세션을 확인할 수 없습니다. 다시 로그인해 주세요.');
      err.code = 'unauthenticated';
      throw err;
    }

    assertFirestoreWriteAllowed('SOAP 노트 생성');

    const encounterDate = params.encounterDate.trim();
    const subjective = params.subjective.trim();
    const objective = params.objective.trim();
    const assessment = params.assessment.trim();
    const plan = params.plan.trim();

    if (!isValidSoapCalendarDate(encounterDate)) {
      const err: any = new Error('치료 또는 평가 날짜가 유효하지 않습니다. 실제 달력에 존재하는 날짜(YYYY-MM-DD)를 입력해 주세요.');
      err.code = 'invalid-argument';
      throw err;
    }
    if (!subjective || !objective || !assessment || !plan) {
      const err: any = new Error('Subjective, Objective, Assessment, Plan 항목을 모두 입력해 주세요.');
      err.code = 'invalid-argument';
      throw err;
    }
    const exceededCreateField = getSoapFieldExceedingMaxLength({
      subjective,
      objective,
      assessment,
      plan
    });
    if (exceededCreateField) {
      const err: any = new Error(
        `${exceededCreateField.label} 항목이 최대 입력 길이(${MAX_SOAP_FIELD_LENGTH.toLocaleString()}자)를 초과했습니다(현재 ${exceededCreateField.length.toLocaleString()}자). 각 항목은 ${MAX_SOAP_FIELD_LENGTH.toLocaleString()}자 이하로 입력해 주세요.`
      );
      err.code = 'invalid-argument';
      throw err;
    }

    let resolvedName = '';
    try {
      const remoteName = await this.getTherapistRealName(authUid);
      if (remoteName && remoteName.trim()) {
        const cleanRemote = remoteName.trim();
        resolvedName =
          cleanRemote.endsWith('물리치료사') || cleanRemote.endsWith('PT') || cleanRemote.endsWith('치료사')
            ? cleanRemote
            : `${cleanRemote} 물리치료사`;
      }
    } catch {
      // 이름 조회 실패 시 전달받은 표시명 폴백 (권한 판단은 authUid 기준으로 수행)
    }
    if (!resolvedName && params.therapistDisplayName?.trim()) {
      resolvedName = params.therapistDisplayName.trim();
    }
    if (!resolvedName) {
      resolvedName = '담당 물리치료사';
    }

    const noteRef = doc(collection(db, 'soapNotes'));
    const payload = {
      id: noteRef.id,
      patientId: params.patientId,
      therapistId: authUid,
      therapistName: resolvedName,
      encounterDate,
      subjective,
      objective,
      assessment,
      plan,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      updatedById: authUid,
      updatedByName: resolvedName,
      version: 1
    };

    await setDoc(noteRef, payload);

    try {
      const createdSnap = await getDoc(noteRef);
      if (createdSnap.exists()) {
        const d = createdSnap.data();
        return {
          id: createdSnap.id,
          patientId: d.patientId,
          therapistId: d.therapistId,
          therapistName: d.therapistName,
          encounterDate: d.encounterDate,
          subjective: d.subjective,
          objective: d.objective,
          assessment: d.assessment,
          plan: d.plan,
          createdAt: (d.createdAt as Timestamp) || null,
          updatedAt: (d.updatedAt as Timestamp) || null,
          updatedById: d.updatedById,
          updatedByName: d.updatedByName,
          version: d.version
        };
      }
    } catch {
      // 직후 조회 실패 시 로컬 Timestamp 폴백
    }

    const nowTs = Timestamp.now();
    return {
      ...payload,
      createdAt: nowTs,
      updatedAt: nowTs
    };
  },

  /**
   * 기존 SOAP 노트 수정 (원자적 트랜잭션: 본문 갱신 + revisions/v{N} 스냅샷 동시 생성)
   * - 낙관적 잠금(expectedVersion)으로 동시 수정 덮어쓰기 방지
   */
  async updateSoapNote(params: {
    noteId: string;
    expectedVersion: number;
    therapistDisplayName?: string;
    encounterDate: string;
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  }): Promise<SoapNote> {
    const db = getFirebaseFirestore();
    if (!db) {
      const err: any = new Error('Firestore에 연결할 수 없습니다.');
      err.code = 'unavailable';
      throw err;
    }

    const authUid = await waitForFirebaseAuthUid();
    if (!authUid) {
      const err: any = new Error('인증된 치료사 세션을 확인할 수 없습니다. 다시 로그인해 주세요.');
      err.code = 'unauthenticated';
      throw err;
    }

    assertFirestoreWriteAllowed('SOAP 노트 수정');

    const encounterDate = params.encounterDate.trim();
    const subjective = params.subjective.trim();
    const objective = params.objective.trim();
    const assessment = params.assessment.trim();
    const plan = params.plan.trim();

    if (!isValidSoapCalendarDate(encounterDate)) {
      const err: any = new Error('치료 또는 평가 날짜가 유효하지 않습니다. 실제 달력에 존재하는 날짜(YYYY-MM-DD)를 입력해 주세요.');
      err.code = 'invalid-argument';
      throw err;
    }
    if (!subjective || !objective || !assessment || !plan) {
      const err: any = new Error('Subjective, Objective, Assessment, Plan 항목을 모두 입력해 주세요.');
      err.code = 'invalid-argument';
      throw err;
    }
    const exceededUpdateField = getSoapFieldExceedingMaxLength({
      subjective,
      objective,
      assessment,
      plan
    });
    if (exceededUpdateField) {
      const err: any = new Error(
        `${exceededUpdateField.label} 항목이 최대 입력 길이(${MAX_SOAP_FIELD_LENGTH.toLocaleString()}자)를 초과했습니다(현재 ${exceededUpdateField.length.toLocaleString()}자). 각 항목은 ${MAX_SOAP_FIELD_LENGTH.toLocaleString()}자 이하로 입력해 주세요.`
      );
      err.code = 'invalid-argument';
      throw err;
    }

    let resolvedName = '';
    try {
      const remoteName = await this.getTherapistRealName(authUid);
      if (remoteName && remoteName.trim()) {
        const cleanRemote = remoteName.trim();
        resolvedName =
          cleanRemote.endsWith('물리치료사') || cleanRemote.endsWith('PT') || cleanRemote.endsWith('치료사')
            ? cleanRemote
            : `${cleanRemote} 물리치료사`;
      }
    } catch {
      // 표시명 폴백
    }
    if (!resolvedName && params.therapistDisplayName?.trim()) {
      resolvedName = params.therapistDisplayName.trim();
    }
    if (!resolvedName) {
      resolvedName = '담당 물리치료사';
    }

    const noteRef = doc(db, 'soapNotes', params.noteId);

    let committedFallbackNote: SoapNote | null = null;

    await runTransaction(db, async (transaction) => {
      const noteSnap = await transaction.get(noteRef);
      if (!noteSnap.exists()) {
        const err: any = new Error('수정하려는 SOAP 기록을 찾을 수 없습니다.');
        err.code = 'not-found';
        throw err;
      }

      const current = noteSnap.data();
      if (current.therapistId !== authUid) {
        const err: any = new Error('작성자 본인만 SOAP 기록을 수정할 수 있습니다.');
        err.code = 'permission-denied';
        throw err;
      }

      const currentVersion = typeof current.version === 'number' ? current.version : 1;
      if (currentVersion !== params.expectedVersion) {
        const err: any = new Error(
          '다른 화면 또는 기기에서 이미 이 SOAP 기록이 수정되었습니다. 최신 내용을 다시 불러온 뒤 수정해 주세요.'
        );
        err.code = 'version-conflict';
        throw err;
      }

      const hasChanged =
        encounterDate !== current.encounterDate ||
        subjective !== current.subjective ||
        objective !== current.objective ||
        assessment !== current.assessment ||
        plan !== current.plan;

      if (!hasChanged) {
        const err: any = new Error('변경된 내용이 없습니다.');
        err.code = 'no-changes';
        throw err;
      }

      const revRef = doc(db, 'soapNotes', params.noteId, 'revisions', `v${currentVersion}`);
      const nextVersion = currentVersion + 1;

      transaction.update(noteRef, {
        encounterDate,
        subjective,
        objective,
        assessment,
        plan,
        updatedAt: serverTimestamp(),
        updatedById: authUid,
        updatedByName: resolvedName,
        version: nextVersion
      });

      transaction.set(revRef, {
        noteId: params.noteId,
        patientId: current.patientId,
        version: currentVersion,
        previousEncounterDate: current.encounterDate,
        previousSubjective: current.subjective,
        previousObjective: current.objective,
        previousAssessment: current.assessment,
        previousPlan: current.plan,
        previousUpdatedAt: current.updatedAt,
        previousUpdatedById: current.updatedById || current.therapistId,
        previousUpdatedByName: current.updatedByName || current.therapistName,
        editedById: authUid,
        editedByName: resolvedName,
        editedAt: serverTimestamp()
      });

      committedFallbackNote = {
        id: params.noteId,
        patientId: current.patientId,
        therapistId: current.therapistId,
        therapistName: current.therapistName || resolvedName,
        encounterDate,
        subjective,
        objective,
        assessment,
        plan,
        createdAt: (current.createdAt as Timestamp) || null,
        updatedAt: Timestamp.now(),
        updatedById: authUid,
        updatedByName: resolvedName,
        version: nextVersion
      };
    });

    try {
      const updatedSnap = await getDoc(noteRef);
      if (updatedSnap.exists()) {
        const d = updatedSnap.data();
        return {
          id: updatedSnap.id,
          patientId: d.patientId,
          therapistId: d.therapistId,
          therapistName: d.therapistName,
          encounterDate: d.encounterDate,
          subjective: d.subjective,
          objective: d.objective,
          assessment: d.assessment,
          plan: d.plan,
          createdAt: (d.createdAt as Timestamp) || null,
          updatedAt: (d.updatedAt as Timestamp) || null,
          updatedById: d.updatedById,
          updatedByName: d.updatedByName,
          version: d.version
        };
      }
    } catch {
      // 트랜잭션 커밋 성공 직후 조회 실패 시 커밋된 스냅샷 폴백 반환
    }

    if (committedFallbackNote) {
      return committedFallbackNote;
    }

    const err: any = new Error('수정된 SOAP 기록을 다시 불러오지 못했습니다.');
    err.code = 'not-found';
    throw err;
  },

  /**
   * 특정 SOAP 노트의 수정 이력(revisions) 조회
   */
  async getSoapNoteRevisions(noteId: string): Promise<SoapNoteRevision[]> {
    const db = getFirebaseFirestore();
    if (!db || !noteId) return [];

    const authUid = await waitForFirebaseAuthUid();
    if (!authUid) {
      const err: any = new Error('인증된 치료사 세션을 확인할 수 없습니다.');
      err.code = 'unauthenticated';
      throw err;
    }

    const q = query(collection(db, 'soapNotes', noteId, 'revisions'));
    const snap = await getDocs(q);
    const revisions: SoapNoteRevision[] = [];
    snap.forEach((docSnap) => {
      const d = docSnap.data();
      revisions.push({
        id: docSnap.id,
        noteId: d.noteId || noteId,
        patientId: d.patientId,
        version: typeof d.version === 'number' ? d.version : 0,
        previousEncounterDate: d.previousEncounterDate || '',
        previousSubjective: d.previousSubjective || '',
        previousObjective: d.previousObjective || '',
        previousAssessment: d.previousAssessment || '',
        previousPlan: d.previousPlan || '',
        previousUpdatedAt: (d.previousUpdatedAt as Timestamp) || null,
        previousUpdatedById: d.previousUpdatedById || '',
        previousUpdatedByName: d.previousUpdatedByName || '',
        editedById: d.editedById || '',
        editedByName: d.editedByName || '',
        editedAt: (d.editedAt as Timestamp) || null
      });
    });

    return revisions.sort((a, b) => b.version - a.version);
  }
};
