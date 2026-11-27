/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  AssignedExercise,
  Exercise,
  Patient,
  Therapist,
  UserRole,
  WorkoutLog,
  ConnectionRequest,
  SupportInquiry,
  AuthUser,
  UserAccount,
  PatientTherapistConnection,
  PatientVideoSubmission,
  ClinicalFeedback,
  FeedbackReadState
} from '../types/rehab';
import {
  EXERCISE_LIBRARY,
  INITIAL_PATIENTS,
  INITIAL_THERAPIST,
  INITIAL_WORKOUT_LOGS
} from '../data/initialData';
import { FirebaseService } from './firebaseService';
import { waitForFirebaseAuthUid } from './firebase';
import { isLegacyDemoIdentifier } from './authService';
import { isFirebaseConfigured, getFirebaseEnvironmentMode } from '../config/firebaseConfig';

const PATIENTS_KEY = 'rehab_patients_v1';
const WORKOUT_LOGS_KEY = 'rehab_workout_logs_v1';
const ACTIVE_ROLE_KEY = 'rehab_active_role_v1';
const ACTIVE_PATIENT_ID_KEY = 'rehab_active_patient_id_v1';
const CONNECTION_REQUESTS_KEY = 'rehab_connection_requests_v1';
const CONNECTIONS_KEY = 'rehab_connections_v1';
const INQUIRIES_KEY = 'rehab_inquiries_v1';
const EXERCISES_KEY = 'rehab_exercises_v1';
const VIDEO_SUBMISSIONS_KEY = 'rehab_video_submissions_v1';
const ONBOARDING_GUIDE_KEY = 'rehab_onboarding_guide_v1';

// 시연용 초기 배열 제거: 빈 배열로 초기화하여 실제 Firebase 데이터만 사용
const INITIAL_VIDEO_SUBMISSIONS: PatientVideoSubmission[] = [];
const INITIAL_CONNECTIONS: PatientTherapistConnection[] = [];
const INITIAL_INQUIRIES: SupportInquiry[] = [];
const INITIAL_CONNECTION_REQUESTS: ConnectionRequest[] = [];

const DEMO_PATIENT_IDS = new Set([
  'patient-1',
  'patient-2',
  'patient-3',
  'acc-patient-01',
  'acc-patient-02',
  'acc-patient-03'
]);

const DEMO_CONNECTION_IDS = new Set([
  'conn-demo-1',
  'conn-demo-2',
  'conn-demo-3'
]);

const DEMO_REQUEST_IDS = new Set(['req-demo-1']);
const DEMO_LOG_IDS = new Set(['log-1', 'log-2', 'log-3', 'log-4', 'log-5', 'log-6']);
const DEMO_SUBMISSION_IDS = new Set(['sub-demo-1']);
const DEMO_INQUIRY_IDS = new Set(['inq-1', 'inq-2']);

function isDemoPatientId(id?: string | null): boolean {
  if (!id) return false;
  const trimmed = id.trim();
  return DEMO_PATIENT_IDS.has(trimmed) || trimmed.startsWith('patient-demo-');
}

// Custom event for cross-component reactive updates in the same tab
const REHAB_STORAGE_EVENT = 'rehab_storage_changed';

function emitChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(REHAB_STORAGE_EVENT));
  }
}

export function subscribeToRehabStore(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const handler = () => callback();
  window.addEventListener(REHAB_STORAGE_EVENT, handler);
  window.addEventListener('storage', handler);
  return () => {
    window.removeEventListener(REHAB_STORAGE_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}

export const StorageService = {
  initStorage() {
    if (typeof window === 'undefined') return;
    if (!localStorage.getItem(PATIENTS_KEY)) {
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(INITIAL_PATIENTS));
    }
    if (!localStorage.getItem(WORKOUT_LOGS_KEY)) {
      localStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(INITIAL_WORKOUT_LOGS));
    }
    if (!localStorage.getItem(ACTIVE_ROLE_KEY)) {
      localStorage.setItem(ACTIVE_ROLE_KEY, 'patient');
    }
    if (!localStorage.getItem(ACTIVE_PATIENT_ID_KEY)) {
      localStorage.setItem(ACTIVE_PATIENT_ID_KEY, '');
    }
    if (!localStorage.getItem(CONNECTION_REQUESTS_KEY)) {
      localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(INITIAL_CONNECTION_REQUESTS));
    }
    if (!localStorage.getItem(CONNECTIONS_KEY)) {
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(INITIAL_CONNECTIONS));
    }
    if (!localStorage.getItem(INQUIRIES_KEY)) {
      localStorage.setItem(INQUIRIES_KEY, JSON.stringify(INITIAL_INQUIRIES));
    }
    if (!localStorage.getItem(EXERCISES_KEY)) {
      localStorage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISE_LIBRARY));
    } else {
      try {
        const stored: Exercise[] = JSON.parse(localStorage.getItem(EXERCISES_KEY) || '[]');
        const builtInMap = new Map(EXERCISE_LIBRARY.map((ex) => [ex.id, ex]));
        const synced = EXERCISE_LIBRARY.map((latestEx) => {
          const prev = Array.isArray(stored) ? stored.find((s) => s && s.id === latestEx.id) : undefined;
          return latestEx.videoUrl
            ? latestEx
            : prev?.videoUrl
              ? { ...latestEx, videoUrl: prev.videoUrl }
              : latestEx;
        });
        const customExercises = Array.isArray(stored)
          ? stored.filter((s) => s && s.id && !builtInMap.has(s.id))
          : [];
        localStorage.setItem(EXERCISES_KEY, JSON.stringify([...synced, ...customExercises]));
      } catch {
        localStorage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISE_LIBRARY));
      }
    }
    if (!localStorage.getItem(VIDEO_SUBMISSIONS_KEY)) {
      localStorage.setItem(VIDEO_SUBMISSIONS_KEY, JSON.stringify(INITIAL_VIDEO_SUBMISSIONS));
    }

    // 기존 브라우저 localStorage에 남아 있을 수 있는 시연용 데이터만 안전하게 선별 정리 (실제 Firebase UID 데이터 보존)
    this.cleanupLegacyDemoStorage();
  },

  /**
   * localStorage 내 명시적으로 식별된 시연용 데이터만 선별 정리합니다.
   * - localStorage.clear() / sessionStorage.clear()는 절대 사용하지 않습니다.
   * - 실제 Firebase UID를 가진 환자/치료사 레코드는 100% 보존하며, 시연용 치료사 참조 필드만 안전하게 초기화합니다.
   */
  cleanupLegacyDemoStorage() {
    if (typeof window === 'undefined') return;

    // 1. rehab_active_patient_id_v1에 데모 환자 ID가 남아 있으면 빈 문자열로 정리
    const activePid = localStorage.getItem(ACTIVE_PATIENT_ID_KEY);
    if (activePid && isDemoPatientId(activePid)) {
      localStorage.setItem(ACTIVE_PATIENT_ID_KEY, '');
    }

    // 2. rehab_patients_v1: 데모 환자(patient-1~3 등) 제거, 실제 환자에 남은 시연용 치료사 참조만 초기화
    try {
      const rawPatients = localStorage.getItem(PATIENTS_KEY);
      if (rawPatients) {
        const parsed = JSON.parse(rawPatients);
        if (Array.isArray(parsed)) {
          let modified = false;
          const cleanedPatients: Patient[] = [];
          for (const p of parsed as Patient[]) {
            if (!p || isDemoPatientId(p.id)) {
              modified = true;
              continue;
            }
            const nextP: Patient = { ...p };
            if (nextP.therapistId && isLegacyDemoIdentifier(nextP.therapistId)) {
              nextP.therapistId = undefined;
              nextP.therapistName = undefined;
              if (nextP.connectionStatus === 'connected') {
                nextP.connectionStatus = 'not_connected';
              }
              modified = true;
            }
            if (nextP.requestedTherapistId && isLegacyDemoIdentifier(nextP.requestedTherapistId)) {
              nextP.requestedTherapistId = undefined;
              nextP.requestedTherapistName = undefined;
              if (nextP.connectionStatus === 'pending' || nextP.connectionStatus === 'requested') {
                nextP.connectionStatus = 'not_connected';
              }
              modified = true;
            }
            cleanedPatients.push(nextP);
          }
          if (modified) {
            localStorage.setItem(PATIENTS_KEY, JSON.stringify(cleanedPatients));
          }
        }
      }
    } catch {
      // ignore parse errors
    }

    // 3. rehab_workout_logs_v1: 시연용 로그(log-1~6 또는 데모 환자 ID)만 제거
    try {
      const rawLogs = localStorage.getItem(WORKOUT_LOGS_KEY);
      if (rawLogs) {
        const parsed = JSON.parse(rawLogs);
        if (Array.isArray(parsed)) {
          const filtered = (parsed as WorkoutLog[]).filter(
            (l) => l && !DEMO_LOG_IDS.has(l.id) && !isDemoPatientId(l.patientId)
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(filtered));
          }
        }
      }
    } catch {
      // ignore
    }

    // 4. rehab_connections_v1: 시연용 연결(conn-demo-1~3, 데모 환자/치료사 참조)만 제거
    try {
      const rawConns = localStorage.getItem(CONNECTIONS_KEY);
      if (rawConns) {
        const parsed = JSON.parse(rawConns);
        if (Array.isArray(parsed)) {
          const filtered = (parsed as PatientTherapistConnection[]).filter(
            (c) =>
              c &&
              !DEMO_CONNECTION_IDS.has(c.connectionId) &&
              !isDemoPatientId(c.patientId) &&
              !isLegacyDemoIdentifier(c.therapistId) &&
              !isLegacyDemoIdentifier(c.inviteCode)
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(filtered));
          }
        }
      }
    } catch {
      // ignore
    }

    // 5. rehab_connection_requests_v1: 시연용 연결 요청(req-demo-1, 데모 환자/치료사 참조)만 제거
    try {
      const rawReqs = localStorage.getItem(CONNECTION_REQUESTS_KEY);
      if (rawReqs) {
        const parsed = JSON.parse(rawReqs);
        if (Array.isArray(parsed)) {
          const filtered = (parsed as ConnectionRequest[]).filter(
            (r) =>
              r &&
              !DEMO_REQUEST_IDS.has(r.id) &&
              !isDemoPatientId(r.patientId) &&
              !isLegacyDemoIdentifier(r.therapistId)
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(filtered));
          }
        }
      }
    } catch {
      // ignore
    }

    // 6. rehab_video_submissions_v1: 시연용 영상 제출(sub-demo-1, 데모 환자)만 제거
    try {
      const rawSubs = localStorage.getItem(VIDEO_SUBMISSIONS_KEY);
      if (rawSubs) {
        const parsed = JSON.parse(rawSubs);
        if (Array.isArray(parsed)) {
          const filtered = (parsed as PatientVideoSubmission[]).filter(
            (s) => s && !DEMO_SUBMISSION_IDS.has(s.id) && !isDemoPatientId(s.patientId)
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(VIDEO_SUBMISSIONS_KEY, JSON.stringify(filtered));
          }
        }
      }
    } catch {
      // ignore
    }

    // 7. rehab_inquiries_v1: 시연용 문의(inq-1~2, 데모 작성자)만 제거
    try {
      const rawInq = localStorage.getItem(INQUIRIES_KEY);
      if (rawInq) {
        const parsed = JSON.parse(rawInq);
        if (Array.isArray(parsed)) {
          const filtered = (parsed as SupportInquiry[]).filter(
            (i) => i && !DEMO_INQUIRY_IDS.has(i.id) && !isLegacyDemoIdentifier(i.authorUsername)
          );
          if (filtered.length !== parsed.length) {
            localStorage.setItem(INQUIRIES_KEY, JSON.stringify(filtered));
          }
        }
      }
    } catch {
      // ignore
    }
  },

  // Active Role & Patient
  getActiveRole(): UserRole {
    if (typeof window === 'undefined') return 'patient';
    const role = localStorage.getItem(ACTIVE_ROLE_KEY) as UserRole;
    return role || 'patient';
  },

  setActiveRole(role: UserRole) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_ROLE_KEY, role);
    emitChange();
  },

  getActivePatientId(): string {
    if (typeof window === 'undefined') return '';
    const stored = localStorage.getItem(ACTIVE_PATIENT_ID_KEY) || '';
    if (isDemoPatientId(stored)) return '';
    return stored;
  },

  setActivePatientId(patientId: string) {
    if (typeof window === 'undefined') return;
    if (isDemoPatientId(patientId)) {
      localStorage.setItem(ACTIVE_PATIENT_ID_KEY, '');
    } else {
      localStorage.setItem(ACTIVE_PATIENT_ID_KEY, patientId);
    }
    emitChange();
  },

  // Therapist Info
  getTherapist(): Therapist {
    return INITIAL_THERAPIST;
  },

  // Exercise Library
  getExerciseLibrary(): Exercise[] {
    if (typeof window === 'undefined') return EXERCISE_LIBRARY;
    try {
      const data = localStorage.getItem(EXERCISES_KEY);
      if (!data) return EXERCISE_LIBRARY;
      const parsed: Exercise[] = JSON.parse(data);
      if (!Array.isArray(parsed) || parsed.length < EXERCISE_LIBRARY.length) {
        localStorage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISE_LIBRARY));
        return EXERCISE_LIBRARY;
      }
      const builtInMap = new Map(EXERCISE_LIBRARY.map((ex) => [ex.id, ex]));
      const synced = EXERCISE_LIBRARY.map((latestEx) => {
        const prev = parsed.find((s) => s && s.id === latestEx.id);
        return latestEx.videoUrl
          ? latestEx
          : prev?.videoUrl
            ? { ...latestEx, videoUrl: prev.videoUrl }
            : latestEx;
      });
      const customExercises = parsed.filter((s) => s && s.id && !builtInMap.has(s.id));
      return [...synced, ...customExercises];
    } catch {
      return EXERCISE_LIBRARY;
    }
  },

  /** 신규 처방 및 운동 라이브러리 탭 노출용 (허리·몸통 중심 활성 운동만 반환) */
  getPrescribableExerciseLibrary(): Exercise[] {
    return this.getExerciseLibrary().filter((ex) => ex.isPrescribable !== false);
  },

  getExerciseById(exerciseId: string): Exercise | undefined {
    const list = this.getExerciseLibrary();
    return list.find((e) => e.id === exerciseId);
  },

  // Patients
  getPatients(): Patient[] {
    if (typeof window === 'undefined') return INITIAL_PATIENTS;
    try {
      const data = localStorage.getItem(PATIENTS_KEY);
      const list: Patient[] = data ? JSON.parse(data) : INITIAL_PATIENTS;
      return list.filter((p) => p && !isDemoPatientId(p.id));
    } catch {
      return INITIAL_PATIENTS;
    }
  },

  getPatientById(patientId: string): Patient | undefined {
    if (!patientId || isDemoPatientId(patientId)) return undefined;
    const patients = this.getPatients();
    return patients.find((p) => p.id === patientId);
  },

  /**
   * 물리치료사별 담당 환자 목록 조회
   * - 오직 현재 치료사(therapistUser.id)와 실제 승인('connected')된 환자만 반환합니다.
   */
  getPatientsForTherapist(therapistUser?: AuthUser): Patient[] {
    const allPatients = this.getPatients();
    if (!therapistUser) return [];

    const therapistUid = therapistUser.therapistId || therapistUser.id;
    const therapistConns = this.getConnectionsForTherapist(therapistUser);
    const connectedPatientIds = new Set(
      therapistConns
        .filter((c) => c.status === 'connected')
        .map((c) => c.patientId)
    );

    const explicitlyDisconnectedPatientIds = new Set(
      therapistConns
        .filter((c) => c.status === 'disconnected' && !connectedPatientIds.has(c.patientId))
        .map((c) => c.patientId)
    );

    return allPatients.filter((patient) => {
      if (isDemoPatientId(patient.id)) return false;
      if (patient.connectionStatus === 'disconnected' || explicitlyDisconnectedPatientIds.has(patient.id)) {
        return false;
      }
      if (patient.connectionStatus !== 'connected') {
        return false;
      }
      if (connectedPatientIds.has(patient.id)) {
        return true;
      }
      if (patient.therapistId && (patient.therapistId === therapistUid || patient.therapistId === therapistUser.id)) {
        return true;
      }
      return false;
    });
  },

  addPatient(newPatient: Patient): boolean {
    if (!newPatient || isDemoPatientId(newPatient.id)) return false;
    const patients = this.getPatients();
    if (patients.some((p) => p.id === newPatient.id)) {
      return false;
    }
    const updated = [...patients, newPatient];
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(updated));
    emitChange();
    return true;
  },

  // ==========================================
  // 환자-물리치료사 연결 시스템 (Firestore 기반)
  // ==========================================

  getConnections(): PatientTherapistConnection[] {
    if (typeof window === 'undefined') return INITIAL_CONNECTIONS;
    try {
      const data = localStorage.getItem(CONNECTIONS_KEY);
      const conns: PatientTherapistConnection[] = data ? JSON.parse(data) : INITIAL_CONNECTIONS;
      return conns.filter(
        (c) =>
          c &&
          !DEMO_CONNECTION_IDS.has(c.connectionId) &&
          !isDemoPatientId(c.patientId) &&
          !isLegacyDemoIdentifier(c.therapistId)
      );
    } catch {
      return INITIAL_CONNECTIONS;
    }
  },

  getConnectionsForTherapist(therapistUser?: AuthUser): PatientTherapistConnection[] {
    const conns = this.getConnections();
    if (!therapistUser) return [];
    const therapistUid = therapistUser.therapistId || therapistUser.id;
    return conns.filter(
      (c) => c.therapistId === therapistUser.id || (therapistUid && c.therapistId === therapistUid)
    );
  },

  getConnectionForPatient(patientId: string): PatientTherapistConnection | undefined {
    if (!patientId || isDemoPatientId(patientId)) return undefined;
    const conns = this.getConnections();
    return conns.find((c) => c.patientId === patientId && (c.status === 'connected' || c.status === 'pending'));
  },

  getActiveConnection(patientId: string, therapistIdOrUser?: string | AuthUser): PatientTherapistConnection | undefined {
    if (!patientId || isDemoPatientId(patientId)) return undefined;
    const conns = this.getConnections();
    const therapistId = typeof therapistIdOrUser === 'object'
      ? (therapistIdOrUser.therapistId || therapistIdOrUser.id)
      : therapistIdOrUser;

    return conns.find((c) => {
      if (c.patientId !== patientId) return false;
      if (c.status !== 'connected') return false;
      if (!therapistId) return true;
      return c.therapistId === therapistId;
    });
  },

  getConnectionById(connectionId: string): PatientTherapistConnection | undefined {
    const conns = this.getConnections();
    return conns.find((c) => c.connectionId === connectionId);
  },

  /**
   * Firestore에서 가져온 원격 connections 목록을 로컬 상태와 병합
   */
  syncRemoteConnections(remoteConns: PatientTherapistConnection[]): void {
    if (typeof window === 'undefined' || !remoteConns || remoteConns.length === 0) return;
    const localConns = this.getConnections();
    const map = new Map<string, PatientTherapistConnection>();
    localConns.forEach((c) => map.set(c.connectionId, c));
    remoteConns.forEach((c) => {
      if (!isDemoPatientId(c.patientId) && !isLegacyDemoIdentifier(c.therapistId)) {
        map.set(c.connectionId, c);
      }
    });
    const merged = Array.from(map.values());
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(merged));

    const requests = this.getConnectionRequests();
    let requestsChanged = false;
    remoteConns.forEach((rc) => {
      if (rc.status === 'connected') {
        requests.forEach((req) => {
          if (req.patientId === rc.patientId && (req.therapistId === rc.therapistId || req.status === 'pending')) {
            if (req.status !== 'accepted') {
              req.status = 'accepted';
              req.respondedAt = rc.connectedAt || new Date().toISOString();
              requestsChanged = true;
            }
          }
        });
      } else if (rc.status === 'rejected') {
        requests.forEach((req) => {
          if (req.patientId === rc.patientId && req.therapistId === rc.therapistId && req.status === 'pending') {
            req.status = 'rejected';
            req.respondedAt = rc.rejectedAt || new Date().toISOString();
            requestsChanged = true;
          }
        });
      }
    });
    if (requestsChanged) {
      localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(requests));
    }

    emitChange();
  },

  /**
   * 원격 connections 중 'pending' 상태인 요청을 치료사의 대기 목록에 동기화
   * - 이미 승인되어 연결된 환자는 대기 목록에 추가되지 않도록 사전 차단
   */
  syncPendingRequestsFromConnections(pendingConns: PatientTherapistConnection[]): void {
    if (typeof window === 'undefined' || !pendingConns || pendingConns.length === 0) return;
    const requests = this.getConnectionRequests();
    let changed = false;

    const connections = this.getConnections();
    const connectedPatientIds = new Set(
      connections.filter((c) => c.status === 'connected').map((c) => c.patientId)
    );
    const patients = this.getPatients();
    patients.filter((p) => p.connectionStatus === 'connected').forEach((p) => connectedPatientIds.add(p.id));

    pendingConns.forEach((c) => {
      if (
        connectedPatientIds.has(c.patientId) ||
        isDemoPatientId(c.patientId) ||
        isLegacyDemoIdentifier(c.therapistId)
      ) {
        return;
      }
      const canonicalDocId = (c.connectionId ? c.connectionId.replace(/^req-/, '') : '') || `${c.patientId}_${c.therapistId}`;
      const expectedReqId = `req-${canonicalDocId}`;
      const existingReq = requests.find(
        (r) => r.patientId === c.patientId && r.therapistId === c.therapistId && r.status === 'pending'
      );
      if (existingReq) {
        if (existingReq.id !== expectedReqId || existingReq.therapistId !== c.therapistId) {
          existingReq.id = expectedReqId;
          existingReq.therapistId = c.therapistId;
          changed = true;
        }
      } else {
        requests.unshift({
          id: expectedReqId,
          patientId: c.patientId,
          patientName: c.patientName,
          therapistId: c.therapistId,
          therapistName: c.therapistName,
          status: 'pending',
          requestedAt: c.createdAt || new Date().toISOString()
        });
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(requests));
      emitChange();
    }
  },

  getConnectionRequests(): ConnectionRequest[] {
    if (typeof window === 'undefined') return INITIAL_CONNECTION_REQUESTS;
    try {
      const data = localStorage.getItem(CONNECTION_REQUESTS_KEY);
      const reqs: ConnectionRequest[] = data ? JSON.parse(data) : INITIAL_CONNECTION_REQUESTS;
      return reqs.filter(
        (r) =>
          r &&
          !DEMO_REQUEST_IDS.has(r.id) &&
          !isDemoPatientId(r.patientId) &&
          !isLegacyDemoIdentifier(r.therapistId)
      );
    } catch {
      return INITIAL_CONNECTION_REQUESTS;
    }
  },

  getRequestsForTherapist(therapistUser?: AuthUser): ConnectionRequest[] {
    const requests = this.getConnectionRequests();
    if (!therapistUser) return [];

    const therapistIds = new Set<string>([therapistUser.id]);
    if (therapistUser.therapistId) therapistIds.add(therapistUser.therapistId);
    if (therapistUser.connectionCode) therapistIds.add(therapistUser.connectionCode);

    // 1. 이미 승인/연결된 환자 ID 집합 식별
    const connections = this.getConnections();
    const connectedPatientIds = new Set(
      connections
        .filter((c) => therapistIds.has(c.therapistId) && c.status === 'connected')
        .map((c) => c.patientId)
    );
    const patients = this.getPatients();
    patients
      .filter((p) => p.connectionStatus === 'connected' && p.therapistId && therapistIds.has(p.therapistId))
      .forEach((p) => connectedPatientIds.add(p.id));

    // 2. 해당 치료사 대상 요청 필터링
    const therapistRequests = requests.filter((r) => therapistIds.has(r.therapistId));

    // 3. 이미 연결된 환자 제외 및 중복 환자 요청 단일화 (가장 최신 요청만 유지)
    const seenPatients = new Set<string>();
    const sanitizedRequests: ConnectionRequest[] = [];
    let requestsModified = false;

    for (const req of therapistRequests) {
      if (connectedPatientIds.has(req.patientId)) {
        if (req.status === 'pending') {
          req.status = 'accepted';
          requestsModified = true;
        }
        continue;
      }
      if (req.status === 'pending') {
        if (seenPatients.has(req.patientId)) {
          continue;
        }
        seenPatients.add(req.patientId);
      }
      sanitizedRequests.push(req);
    }

    if (requestsModified) {
      localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(requests));
    }

    return sanitizedRequests;
  },

  /**
   * 환자가 치료사 고유 연결 코드 또는 초대 링크로 연결 요청 전송
   * - 실제 Firebase UID를 가진 물리치료사에게만 전송 가능하며, Firestore connections 컬렉션 저장 성공 시에만 완료 처리
   */
  async sendConnectionRequest(
    patientId: string,
    patientName: string,
    therapistAccount: UserAccount,
    requestType: 'code' | 'invite' = 'code'
  ): Promise<{ success: boolean; message: string; connection?: PatientTherapistConnection }> {
    const targetTherapistUid = therapistAccount?.therapistId || therapistAccount?.id;
    if (
      !targetTherapistUid ||
      isLegacyDemoIdentifier(targetTherapistUid) ||
      isLegacyDemoIdentifier(therapistAccount?.connectionCode)
    ) {
      return {
        success: false,
        message: '유효한 실제 물리치료사 계정을 찾을 수 없습니다. 담당 치료사의 실제 연결 코드를 확인해주세요.'
      };
    }

    const patients = this.getPatients();
    const patientIndex = patients.findIndex((p) => p.id === patientId);
    if (patientIndex === -1) {
      return { success: false, message: '환자 정보를 찾을 수 없습니다.' };
    }

    const currentPatient = patients[patientIndex];
    if (currentPatient.connectionStatus === 'connected') {
      return { success: false, message: '이미 물리치료사와 연결되어 있습니다. 새 연결을 원하시면 먼저 연결을 해제해주세요.' };
    }

    const requests = this.getConnectionRequests();
    const hasPending = requests.some(
      (r) => r.patientId === patientId && r.therapistId === targetTherapistUid && r.status === 'pending'
    );
    if (hasPending) {
      return { success: false, message: '이미 해당 물리치료사에게 보낸 연결 요청이 대기 중입니다.' };
    }

    const nowStr = new Date().toISOString();
    const canonicalConnectionId = `${patientId}_${targetTherapistUid}`;
    const newConnection: PatientTherapistConnection = {
      connectionId: canonicalConnectionId,
      patientId,
      patientName,
      therapistId: targetTherapistUid,
      therapistName: therapistAccount.name,
      status: 'pending',
      requestedBy: 'patient',
      createdAt: nowStr,
      requestType,
      inviteCode: therapistAccount.connectionCode
    };

    if (isFirebaseConfigured()) {
      try {
        const saved = await FirebaseService.saveConnection(newConnection);
        if (!saved) {
          return {
            success: false,
            message: 'Firestore connections 컬렉션 저장에 실패했습니다. 권한 또는 네트워크를 확인해주세요.'
          };
        }
      } catch (err: any) {
        console.error('Firestore saveConnection error:', err);
        return {
          success: false,
          message: `Firestore 연결 요청 저장 실패: ${err?.message || '보안 규칙 또는 권한 오류'}`
        };
      }
    }

    const newRequest: ConnectionRequest = {
      id: `req-${canonicalConnectionId}`,
      patientId,
      patientName,
      therapistId: targetTherapistUid,
      therapistName: therapistAccount.name,
      status: 'pending',
      requestedAt: nowStr
    };

    localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify([newRequest, ...requests]));

    patients[patientIndex] = {
      ...currentPatient,
      connectionStatus: 'pending',
      requestedTherapistId: targetTherapistUid,
      requestedTherapistName: therapistAccount.name
    };
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));

    const connections = this.getConnections();
    const filteredConns = connections.filter((c) => !(c.patientId === patientId && c.therapistId === targetTherapistUid));
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify([newConnection, ...filteredConns]));

    emitChange();

    return {
      success: true,
      message: `${therapistAccount.name} 님에게 연결 요청을 전송했습니다. 치료사의 승인 후 운동 처방이 활성화됩니다.`,
      connection: newConnection
    };
  },

  /**
   * 물리치료사가 연결 요청 수락 또는 거절
   * - Firestore 실제 connections 문서 조회를 기반으로 권한(therapistId == auth.uid) 및 상태 검증
   * - Firestore 업데이트 성공 이후에만 로컬 캐시와 UI 상태 갱신
   */
  async respondConnectionRequest(
    requestId: string,
    accept: boolean,
    therapistUser?: AuthUser
  ): Promise<{ success: boolean; message: string }> {
    const requests = this.getConnectionRequests();
    let reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1 && requestId.startsWith('req-')) {
      const strippedId = requestId.replace(/^req-/, '');
      reqIndex = requests.findIndex((r) => r.id === strippedId || (r as any).connectionId === strippedId);
    }
    const targetReq = reqIndex !== -1 ? requests[reqIndex] : null;

    const nowStr = new Date().toISOString();
    const authUid = await waitForFirebaseAuthUid();
    const currentTherapistName = therapistUser?.name || '담당 물리치료사';
    const effectiveTherapistId = therapistUser?.therapistId || therapistUser?.id || authUid;

    if (!authUid) {
      return {
        success: false,
        message: '인증된 물리치료사 계정 정보를 확인할 수 없습니다. 다시 로그인해 주세요.'
      };
    }

    if (effectiveTherapistId && authUid !== effectiveTherapistId) {
      return {
        success: false,
        message: `인증 세션 불일치가 감지되었습니다. (Firebase 인증 UID: ${authUid.substring(0, 8)}..., 현재 로그인 치료사 UID: ${effectiveTherapistId.substring(0, 8)}...). 로그아웃 후 다시 로그인해 주세요.`
      };
    }

    let targetDocId = '';
    let firestoreConn: PatientTherapistConnection | null = null;
    let permissionErrorCaught = false;

    const cleanReqId = requestId.startsWith('req-') ? requestId.replace(/^req-/, '') : requestId;
    if (cleanReqId.includes('_')) {
      try {
        firestoreConn = await FirebaseService.getConnectionDoc(cleanReqId);
        if (firestoreConn) {
          targetDocId = cleanReqId;
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          permissionErrorCaught = true;
        }
        console.warn('getConnectionDoc direct lookup error:', err);
      }
    }

    if (!firestoreConn) {
      const localConnections = this.getConnections();
      const matchedLocalConn = localConnections.find(
        (c) =>
          c.connectionId === cleanReqId ||
          (targetReq?.patientId && c.patientId === targetReq.patientId && (c.therapistId === authUid || c.therapistId === effectiveTherapistId))
      );
      if (matchedLocalConn?.connectionId && matchedLocalConn.connectionId !== cleanReqId) {
        try {
          firestoreConn = await FirebaseService.getConnectionDoc(matchedLocalConn.connectionId);
          if (firestoreConn) {
            targetDocId = matchedLocalConn.connectionId;
          }
        } catch (err: any) {
          if (err?.code === 'permission-denied') {
            permissionErrorCaught = true;
          }
        }
      }
    }

    const patientIdForQuery = targetReq?.patientId || (cleanReqId.includes('_') ? cleanReqId.split('_')[0] : '');
    const therapistIdForQuery = authUid;

    if (!firestoreConn && patientIdForQuery && therapistIdForQuery) {
      try {
        const found = await FirebaseService.findConnectionDocByTherapistAndPatient(
          therapistIdForQuery,
          patientIdForQuery
        );
        if (found) {
          targetDocId = found.docId;
          firestoreConn = found.connection;
        }
      } catch (err: any) {
        if (err?.code === 'permission-denied') {
          permissionErrorCaught = true;
        }
        console.warn('findConnectionDocByTherapistAndPatient error:', err);
      }
    }

    if (permissionErrorCaught && !firestoreConn) {
      return {
        success: false,
        message: `Firestore 접근 권한이 없습니다 (permission-denied). 로그인된 치료사 계정(UID: ${authUid.substring(0, 8)}...)이 해당 연결의 담당 치료사인지 확인해 주세요.`
      };
    }

    if (!firestoreConn) {
      return {
        success: false,
        message: 'Firestore에서 해당 연결 요청 문서를 찾을 수 없습니다 (not_found). 환자가 보낸 연결 요청이 취소되었거나 삭제되었을 수 있습니다.'
      };
    }

    if (firestoreConn.therapistId !== authUid) {
      return {
        success: false,
        message: '자신에게 요청된 연결만 수락하거나 거절할 수 있습니다.'
      };
    }

    if (firestoreConn.status !== 'pending') {
      if (firestoreConn.status === 'connected') {
        if (targetReq && reqIndex !== -1) {
          requests[reqIndex] = { ...targetReq, status: 'accepted', respondedAt: nowStr };
          localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(requests));
          emitChange();
        }
        return {
          success: true,
          message: `${firestoreConn.patientName || targetReq?.patientName || '환자'} 환자는 이미 연결되어 있습니다. 담당 환자 목록에서 확인하실 수 있습니다.`
        };
      }
      return {
        success: false,
        message: firestoreConn.status === 'rejected'
          ? '이미 거절된 연결 요청입니다.'
          : firestoreConn.status === 'disconnected'
            ? '이미 해제된 연결입니다.'
            : '이미 처리된 연결 요청입니다.'
      };
    }

    const connToUpdate: PatientTherapistConnection = {
      ...firestoreConn,
      connectionId: targetDocId,
      status: accept ? 'connected' : 'rejected',
      connectedAt: accept ? nowStr : undefined,
      rejectedAt: accept ? undefined : nowStr,
      respondedAt: nowStr
    };

    try {
      const saved = await FirebaseService.saveConnection(connToUpdate);
      if (!saved) {
        return {
          success: false,
          message: 'Firestore 연결 상태 업데이트에 실패했습니다. 권한 또는 네트워크를 확인해주세요.'
        };
      }
    } catch (saveErr: any) {
      console.error('Firestore saveConnection error in respondConnectionRequest:', saveErr);
      let userFriendlyMsg = 'Firestore 연결 처리 중 오류가 발생했습니다.';
      if (saveErr?.message?.includes('Missing or insufficient permissions') || saveErr?.message?.includes('permission-denied')) {
        userFriendlyMsg = '해당 연결 요청을 처리할 수 있는 권한이 없습니다. 대상 물리치료사 계정으로 로그인되어 있는지 확인해주세요.';
      }
      return {
        success: false,
        message: userFriendlyMsg
      };
    }

    const patientId = firestoreConn.patientId;
    const patientName = firestoreConn.patientName || targetReq?.patientName || '환자';

    const connections = this.getConnections();
    const existingConnIdx = connections.findIndex(
      (c) => c.patientId === patientId && c.therapistId === authUid
    );
    if (existingConnIdx !== -1) {
      connections[existingConnIdx] = {
        ...connections[existingConnIdx],
        status: accept ? 'connected' : 'rejected',
        connectedAt: accept ? nowStr : undefined,
        rejectedAt: accept ? undefined : nowStr,
        respondedAt: nowStr
      };
    } else {
      connections.unshift(connToUpdate);
    }
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));

    requests.forEach((r) => {
      if (r.patientId === patientId && (r.therapistId === authUid || r.id === requestId || (r as any).connectionId === targetDocId)) {
        r.status = accept ? 'accepted' : 'rejected';
        r.respondedAt = nowStr;
      }
    });
    localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(requests));

    const patients = this.getPatients();
    const patientIndex = patients.findIndex((p) => p.id === patientId);
    if (patientIndex !== -1) {
      if (accept) {
        patients[patientIndex] = {
          ...patients[patientIndex],
          connectionStatus: 'connected',
          therapistId: authUid,
          therapistName: currentTherapistName,
          requestedTherapistId: undefined,
          requestedTherapistName: undefined
        };
      } else {
        patients[patientIndex] = {
          ...patients[patientIndex],
          connectionStatus: 'not_connected',
          requestedTherapistId: undefined,
          requestedTherapistName: undefined
        };
      }
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    } else if (accept) {
      let remoteProfile: Record<string, any> | null = null;
      try {
        remoteProfile = await FirebaseService.getUserProfile(patientId);
      } catch (e) {
        console.warn('getUserProfile on accept deferred:', e);
      }
      const newPatient: Patient = {
        id: patientId,
        name: remoteProfile?.name || patientName,
        age: remoteProfile?.age || (firestoreConn as any).age || 30,
        gender: remoteProfile?.gender || (firestoreConn as any).gender || '남성',
        diagnosis: remoteProfile?.diagnosis || (firestoreConn as any).diagnosis || '',
        targetGoal: remoteProfile?.targetGoal || (firestoreConn as any).targetGoal || '재활 목표',
        therapistNotes: remoteProfile?.therapistNotes || (firestoreConn as any).therapistNotes || '',
        assignedProgram: remoteProfile?.assignedProgram || [],
        connectionStatus: 'connected',
        therapistId: authUid,
        therapistName: currentTherapistName,
        feedbacks: remoteProfile?.feedbacks || []
      };
      patients.unshift(newPatient);
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    }

    if (accept) {
      try {
        const accountsData = localStorage.getItem('rehab_accounts_v1');
        if (accountsData) {
          const accounts = JSON.parse(accountsData);
          let accUpdated = false;
          accounts.forEach((acc: any) => {
            if (acc.patientId === patientId) {
              acc.connectedTherapistId = authUid;
              acc.connectedTherapistName = currentTherapistName;
              accUpdated = true;
            }
          });
          if (accUpdated) {
            localStorage.setItem('rehab_accounts_v1', JSON.stringify(accounts));
          }
        }
        if (typeof window !== 'undefined') {
          const sessionData = sessionStorage.getItem('rehab_session_user_v1');
          if (sessionData) {
            const sessionUser = JSON.parse(sessionData);
            if (sessionUser.patientId === patientId) {
              sessionUser.connectedTherapistId = authUid;
              sessionUser.connectedTherapistName = currentTherapistName;
              sessionStorage.setItem('rehab_session_user_v1', JSON.stringify(sessionUser));
            }
          }
          window.dispatchEvent(new CustomEvent('rehab_auth_state_changed'));
        }
      } catch (err) {
        console.error('Account sync error on connection accept:', err);
      }
    }

    emitChange();

    return {
      success: true,
      message: accept
        ? `${patientName} 환자의 연결 요청을 승인했습니다. 담당 환자 목록에 추가되었습니다.`
        : `${patientName} 환자의 연결 요청을 거절했습니다.`
    };
  },

  /**
   * 환자 또는 물리치료사가 연결 해제
   * - 기존 운동 수행 기록 및 운동 처방 이력은 100% 안전하게 보존됨
   */
  async disconnectPatient(
    patientId: string,
    therapistIdOrUser?: string | AuthUser,
    explicitConnectionId?: string
  ): Promise<{ success: boolean; message: string; connectionId?: string }> {
    try {
      const therapistId = typeof therapistIdOrUser === 'object'
        ? (therapistIdOrUser.therapistId || therapistIdOrUser.id)
        : therapistIdOrUser;

      const patients = this.getPatients();
      const patientIndex = patients.findIndex((p) => p.id === patientId);
      if (patientIndex === -1) {
        return { success: false, message: '해당 환자 정보를 찾을 수 없습니다.' };
      }
      const patient = patients[patientIndex];

      const connections = this.getConnections();
      let targetConnIndex = -1;

      if (explicitConnectionId) {
        targetConnIndex = connections.findIndex((c) => c.connectionId === explicitConnectionId);
      }
      if (targetConnIndex === -1 && therapistId) {
        targetConnIndex = connections.findIndex(
          (c) =>
            c.patientId === patientId &&
            (c.status === 'connected' || c.status === 'pending') &&
            c.therapistId === therapistId
        );
      }
      if (targetConnIndex === -1) {
        targetConnIndex = connections.findIndex((c) => c.patientId === patientId && c.status === 'connected');
      }

      const nowStr = new Date().toISOString();
      let connectionId = explicitConnectionId;

      if (targetConnIndex !== -1) {
        const targetConn = connections[targetConnIndex];
        connectionId = targetConn.connectionId;
        connections[targetConnIndex] = {
          ...targetConn,
          status: 'disconnected',
          disconnectedAt: nowStr
        };
      } else {
        const resolvedTherapistId = therapistId || patient.therapistId;
        if (!resolvedTherapistId) {
          return { success: false, message: '해제할 물리치료사 연결 정보를 확인할 수 없습니다.' };
        }
        connectionId = `${patientId}_${resolvedTherapistId}`;
        connections.unshift({
          connectionId,
          patientId,
          patientName: patient.name,
          therapistId: resolvedTherapistId,
          therapistName: patient.therapistName || '담당 물리치료사',
          status: 'disconnected',
          createdAt: nowStr,
          disconnectedAt: nowStr,
          requestType: 'code'
        });
      }
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));

      const targetConnRecord = connections[targetConnIndex !== -1 ? targetConnIndex : 0];
      if (targetConnRecord && isFirebaseConfigured()) {
        try {
          await FirebaseService.saveConnection(targetConnRecord);
        } catch (err) {
          console.warn('Firestore disconnect sync deferred:', err);
        }
      }

      patients[patientIndex] = {
        ...patient,
        connectionStatus: 'disconnected',
        therapistId: undefined,
        therapistName: undefined,
        requestedTherapistId: undefined,
        requestedTherapistName: undefined
      };
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));

      try {
        const accountsData = localStorage.getItem('rehab_accounts_v1');
        if (accountsData) {
          const accounts = JSON.parse(accountsData);
          let accUpdated = false;
          accounts.forEach((acc: any) => {
            if (acc.patientId === patientId) {
              acc.connectedTherapistId = undefined;
              acc.connectedTherapistName = undefined;
              accUpdated = true;
            }
          });
          if (accUpdated) {
            localStorage.setItem('rehab_accounts_v1', JSON.stringify(accounts));
          }
        }
      } catch (err) {
        console.error('Account sync error on disconnect:', err);
      }

      if (typeof window !== 'undefined') {
        try {
          const sessionData = sessionStorage.getItem('rehab_session_user_v1');
          if (sessionData) {
            const sessionUser = JSON.parse(sessionData);
            if (sessionUser.patientId === patientId) {
              sessionUser.connectedTherapistId = undefined;
              sessionUser.connectedTherapistName = undefined;
              sessionStorage.setItem('rehab_session_user_v1', JSON.stringify(sessionUser));
            }
          }
        } catch {
          // ignore
        }
      }

      emitChange();
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('rehab_auth_state_changed'));
      }

      return {
        success: true,
        message: `'${patient.name}' 환자와의 연결이 안전하게 해제되었습니다. 기존 운동 기록 및 처방 이력은 보존됩니다.`,
        connectionId
      };
    } catch (e: any) {
      return {
        success: false,
        message: `연결 해제 처리 중 오류가 발생했습니다: ${e?.message || '알 수 없는 오류'}`
      };
    }
  },

  /**
   * 환자 연결 상태 업데이트
   */
  updatePatientConnection(
    patientId: string,
    status: 'not_connected' | 'pending' | 'requested' | 'connected' | 'rejected' | 'disconnected',
    therapistName: string = '담당 물리치료사'
  ): boolean {
    const patients = this.getPatients();
    const patientIndex = patients.findIndex((p) => p.id === patientId);
    if (patientIndex === -1) return false;

    patients[patientIndex] = {
      ...patients[patientIndex],
      connectionStatus: status,
      therapistId: status === 'connected' ? patients[patientIndex].therapistId : undefined,
      therapistName: status === 'connected' ? therapistName : undefined,
      requestedTherapistId: undefined,
      requestedTherapistName: undefined
    };

    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    emitChange();
    return true;
  },

  // ==========================================
  // 임상 피드백
  // ==========================================

  async addClinicalFeedback(
    patientId: string,
    feedback: { content: string; recommendation?: string; workoutLogId?: string },
    therapistName: string = '담당 물리치료사',
    therapistId?: string
  ): Promise<boolean> {
    const trimmedContent = typeof feedback?.content === 'string' ? feedback.content.trim() : '';
    if (!trimmedContent) {
      throw new Error('피드백 내용을 입력해 주세요.');
    }

    const patients = this.getPatients();
    const index = patients.findIndex((p) => p.id === patientId);
    const useFirebasePersistence =
      isFirebaseConfigured() || getFirebaseEnvironmentMode() === 'test';

    if (!useFirebasePersistence && index === -1) {
      throw new Error('대상 환자 정보를 찾을 수 없습니다.');
    }

    const patient = index !== -1 ? patients[index] : undefined;
    const now = new Date();
    const normalizedWorkoutLogId =
      typeof feedback.workoutLogId === 'string' && feedback.workoutLogId.trim()
        ? feedback.workoutLogId.trim()
        : undefined;
    const trimmedRecommendation = feedback.recommendation?.trim();

    const newFeedback: ClinicalFeedback = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      date: now.toISOString().split('T')[0],
      createdAt: now.toISOString(),
      notificationEligible: true,
      therapistId: therapistId || patient?.therapistId || undefined,
      therapistName,
      content: trimmedContent,
      ...(trimmedRecommendation ? { recommendation: trimmedRecommendation } : {}),
      ...(normalizedWorkoutLogId ? { workoutLogId: normalizedWorkoutLogId } : {})
    };

    if (useFirebasePersistence) {
      // 1. Firebase 인증 완료 확인 후 Firestore 트랜잭션 선행 커밋 (실패 시 localStorage 미변경 & 예외 전파)
      const authUid = await waitForFirebaseAuthUid();
      if (!authUid) {
        const authErr: any = new Error(
          'Firebase 인증이 완료되지 않아 피드백을 저장할 수 없습니다. 다시 로그인한 후 시도해 주세요.'
        );
        authErr.code = 'unauthenticated';
        throw authErr;
      }

      const verifiedFeedback: ClinicalFeedback = {
        ...newFeedback,
        therapistId: authUid
      };

      const saved = await FirebaseService.saveFeedback(patientId, verifiedFeedback, authUid);
      if (!saved) {
        throw new Error('임상 피드백을 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      }

      // 2. 서버 트랜잭션 커밋 성공 이후에만 최신 로컬 캐시에 반영
      const latestPatients = this.getPatients();
      const latestIndex = latestPatients.findIndex((p) => p.id === patientId);
      if (latestIndex !== -1) {
        const latestPatient = latestPatients[latestIndex];
        const existingFeedbacks = Array.isArray(latestPatient.feedbacks)
          ? latestPatient.feedbacks
          : [];
        const dedupedExisting = existingFeedbacks.filter(
          (item) => item?.id !== verifiedFeedback.id
        );
        latestPatients[latestIndex] = {
          ...latestPatient,
          feedbacks: [verifiedFeedback, ...dedupedExisting]
        };
        localStorage.setItem(PATIENTS_KEY, JSON.stringify(latestPatients));
        emitChange();
      }

      return true;
    }

    // 비-Firebase 로컬 폴백 모드
    const existingFeedbacks = Array.isArray(patient?.feedbacks) ? patient!.feedbacks! : [];
    const dedupedExisting = existingFeedbacks.filter((item) => item?.id !== newFeedback.id);
    patients[index] = {
      ...patients[index],
      feedbacks: [newFeedback, ...dedupedExisting]
    };

    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    emitChange();
    return true;
  },

  /**
   * 환자별 피드백 읽음 상태 목록 조회 (Firestore 영구 저장소 직접 위임, 로컬 임시 성공 위장 없음)
   */
  async getFeedbackReadStates(patientId: string): Promise<FeedbackReadState[]> {
    return FirebaseService.getFeedbackReadStates(patientId);
  },

  /**
   * 특정 피드백 읽음 상태 저장 (Firestore 영구 저장소 직접 위임, 실패 시 예외 전파)
   */
  async markFeedbackAsRead(
    patientId: string,
    feedbackId: string
  ): Promise<{ readState: FeedbackReadState; alreadyRead: boolean }> {
    return FirebaseService.markFeedbackAsRead(patientId, feedbackId);
  },

  updatePatientInfo(patientId: string, updates: Partial<Patient>): boolean {
    const patients = this.getPatients();
    const index = patients.findIndex((p) => p.id === patientId);
    if (index === -1) return false;

    patients[index] = {
      ...patients[index],
      ...updates
    };

    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    emitChange();
    return true;
  },

  updatePatientProgram(patientId: string, assignedProgram: AssignedExercise[]): boolean {
    const patients = this.getPatients();
    const index = patients.findIndex((p) => p.id === patientId);
    if (index === -1) return false;

    const patient = patients[index];
    patients[index] = {
      ...patient,
      assignedProgram
    };

    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    emitChange();

    FirebaseService.savePrescribedProgram(patientId, assignedProgram, patient.therapistId || 'therapist').catch((err) => {
      console.warn('Firestore prescription sync deferred:', err);
    });

    return true;
  },

  addExerciseToPatient(
    patientId: string,
    exerciseData: {
      exerciseId: string;
      reps: number;
      sets: number;
      frequency: string;
      customNotes: string;
    }
  ): boolean {
    const patient = this.getPatientById(patientId);
    if (!patient) return false;

    const newAssignment: AssignedExercise = {
      assignmentId: `assign-${Date.now()}`,
      exerciseId: exerciseData.exerciseId,
      reps: exerciseData.reps,
      sets: exerciseData.sets,
      frequency: exerciseData.frequency,
      customNotes: exerciseData.customNotes || '',
      assignedDate: new Date().toISOString().split('T')[0]
    };

    const updatedProgram = [...patient.assignedProgram, newAssignment];
    return this.updatePatientProgram(patientId, updatedProgram);
  },

  removeExerciseFromPatient(patientId: string, assignmentId: string): boolean {
    const patient = this.getPatientById(patientId);
    if (!patient) return false;

    const updatedProgram = patient.assignedProgram.filter((item) => item.assignmentId !== assignmentId);
    return this.updatePatientProgram(patientId, updatedProgram);
  },

  // ==========================================
  // Workout Logs
  // ==========================================

  getWorkoutLogs(patientId?: string, date?: string): WorkoutLog[] {
    if (typeof window === 'undefined') return INITIAL_WORKOUT_LOGS;
    try {
      const data = localStorage.getItem(WORKOUT_LOGS_KEY);
      let logs: WorkoutLog[] = data ? JSON.parse(data) : INITIAL_WORKOUT_LOGS;
      logs = logs.filter((log) => log && !DEMO_LOG_IDS.has(log.id) && !isDemoPatientId(log.patientId));

      if (patientId) {
        logs = logs.filter((log) => log.patientId === patientId);
      }
      if (date) {
        logs = logs.filter((log) => log.date === date);
      }
      return logs.sort((a, b) => new Date(b.loggedAt).getTime() - new Date(a.loggedAt).getTime());
    } catch {
      return INITIAL_WORKOUT_LOGS;
    }
  },

  addWorkoutLog(logInput: Omit<WorkoutLog, 'id' | 'loggedAt'>): WorkoutLog {
    const logs = this.getWorkoutLogs();
    const newLog: WorkoutLog = {
      ...logInput,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      loggedAt: new Date().toISOString()
    };

    const existingIndex = logs.findIndex(
      (l) => l.patientId === newLog.patientId && l.exerciseId === newLog.exerciseId && l.date === newLog.date
    );

    let updatedLogs: WorkoutLog[];
    if (existingIndex >= 0) {
      updatedLogs = [...logs];
      updatedLogs[existingIndex] = newLog;
    } else {
      updatedLogs = [newLog, ...logs];
    }

    localStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(updatedLogs));
    emitChange();

    FirebaseService.saveWorkoutLog(newLog).catch((err) => {
      console.warn('Firestore workout log sync deferred:', err);
    });

    return newLog;
  },

  // Today Date helper
  getTodayDateString(): string {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  // Patient Today Completion Stats
  getPatientTodayStats(patientId: string) {
    const patient = this.getPatientById(patientId);
    const today = this.getTodayDateString();
    if (!patient) {
      return { totalAssigned: 0, completedCount: 0, completionRate: 0, completedExerciseIds: new Set<string>() };
    }

    const assigned = patient.assignedProgram;
    const todayLogs = this.getWorkoutLogs(patientId, today);
    const completedExerciseIds = new Set(todayLogs.filter((l) => l.completed).map((l) => l.exerciseId));

    const totalAssigned = assigned.length;
    let completedCount = 0;
    assigned.forEach((item) => {
      if (completedExerciseIds.has(item.exerciseId)) {
        completedCount++;
      }
    });

    const completionRate = totalAssigned > 0 ? Math.round((completedCount / totalAssigned) * 100) : 0;

    return {
      totalAssigned,
      completedCount,
      completionRate,
      completedExerciseIds
    };
  },

  // Therapist Overall Stats (Filtered to this therapist's patients)
  getTherapistOverviewStats(therapistUser?: AuthUser) {
    const patients = this.getPatientsForTherapist(therapistUser);

    let totalScheduledExercises = 0;
    let totalCompletedExercises = 0;

    const patientSummaries = patients.map((patient) => {
      const stats = this.getPatientTodayStats(patient.id);
      totalScheduledExercises += stats.totalAssigned;
      totalCompletedExercises += stats.completedCount;

      const patientLogs = this.getWorkoutLogs(patient.id);
      const recentLog = patientLogs.length > 0 ? patientLogs[0] : undefined;
      const lastWorkoutDate = recentLog ? recentLog.date : '수행 기록 없음';

      let todayStatusText = '미처방';
      if (stats.totalAssigned > 0) {
        if (stats.completedCount === stats.totalAssigned) {
          todayStatusText = '오늘 완료';
        } else if (stats.completedCount > 0) {
          todayStatusText = '부분 수행';
        } else {
          todayStatusText = '오늘 미수행';
        }
      }

      let needsFeedback = false;
      if (recentLog) {
        const latestFeedback = patient.feedbacks && patient.feedbacks.length > 0 ? patient.feedbacks[0] : undefined;
        const feedbackDate = latestFeedback ? new Date(latestFeedback.date).getTime() : 0;
        const logDate = new Date(recentLog.loggedAt).getTime();
        if (!latestFeedback || logDate > feedbackDate || recentLog.painLevel >= 3 || (recentLog.patientNotes && recentLog.patientNotes.trim())) {
          needsFeedback = true;
        }
      }

      return {
        patient,
        ...stats,
        prescriptionStatus: patient.assignedProgram.length > 0 ? `처방 완료 (${patient.assignedProgram.length}개)` : '처방 필요',
        lastWorkoutDate,
        isTodayCompleted: stats.totalAssigned > 0 && stats.completedCount === stats.totalAssigned,
        todayStatusText,
        needsFeedback,
        recentLog
      };
    });

    const overallRate =
      totalScheduledExercises > 0
        ? Math.round((totalCompletedExercises / totalScheduledExercises) * 100)
        : 0;

    const patientIds = new Set(patients.map((p) => p.id));
    const allLogs = this.getWorkoutLogs();
    const recentLogs = allLogs.filter((l) => patientIds.has(l.patientId)).slice(0, 8);

    return {
      totalPatients: patients.length,
      scheduledPatientsCount: patients.filter((p) => p.assignedProgram.length > 0).length,
      totalScheduledExercises,
      totalCompletedExercises,
      overallRate,
      patientSummaries,
      recentLogs
    };
  },

  // ==========================================
  // 시스템 관리자(super_admin) 전용 문의 및 현황
  // ==========================================

  getSupportInquiries(): SupportInquiry[] {
    if (typeof window === 'undefined') return INITIAL_INQUIRIES;
    try {
      const data = localStorage.getItem(INQUIRIES_KEY);
      const list: SupportInquiry[] = data ? JSON.parse(data) : INITIAL_INQUIRIES;
      return list.filter((i) => i && !DEMO_INQUIRY_IDS.has(i.id) && !isLegacyDemoIdentifier(i.authorUsername));
    } catch {
      return INITIAL_INQUIRIES;
    }
  },

  addSupportInquiry(inquiry: Omit<SupportInquiry, 'id' | 'createdAt' | 'status'>): SupportInquiry {
    const list = this.getSupportInquiries();
    const newInquiry: SupportInquiry = {
      ...inquiry,
      id: `inq-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify([newInquiry, ...list]));
    emitChange();
    return newInquiry;
  },

  resolveSupportInquiry(inquiryId: string, reply?: string): boolean {
    const list = this.getSupportInquiries();
    const index = list.findIndex((i) => i.id === inquiryId);
    if (index === -1) return false;

    list[index] = {
      ...list[index],
      status: 'resolved',
      adminReply: reply || '관리자 검토 및 조치가 완료되었습니다.'
    };
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify(list));
    emitChange();
    return true;
  },

  // ==========================================
  // 환자 실제 운동 수행 영상 제출 및 치료사 피드백
  // ==========================================

  getVideoSubmissions(patientId?: string): PatientVideoSubmission[] {
    if (typeof window === 'undefined') return INITIAL_VIDEO_SUBMISSIONS;
    try {
      const data = localStorage.getItem(VIDEO_SUBMISSIONS_KEY);
      let submissions: PatientVideoSubmission[] = data ? JSON.parse(data) : INITIAL_VIDEO_SUBMISSIONS;
      submissions = submissions.filter((s) => s && !DEMO_SUBMISSION_IDS.has(s.id) && !isDemoPatientId(s.patientId));
      if (patientId) {
        submissions = submissions.filter((s) => s.patientId === patientId);
      }
      return submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    } catch {
      return INITIAL_VIDEO_SUBMISSIONS;
    }
  },

  getVideoSubmissionById(submissionId: string): PatientVideoSubmission | undefined {
    const all = this.getVideoSubmissions();
    return all.find((s) => s.id === submissionId);
  },

  submitPatientVideo(input: Omit<PatientVideoSubmission, 'id' | 'submittedAt' | 'status'>): PatientVideoSubmission {
    const all = this.getVideoSubmissions();
    const newSubmission: PatientVideoSubmission = {
      ...input,
      id: `vsub-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      submittedAt: new Date().toISOString(),
      status: 'pending_review'
    };

    const updated = [newSubmission, ...all];
    localStorage.setItem(VIDEO_SUBMISSIONS_KEY, JSON.stringify(updated));
    emitChange();
    return newSubmission;
  },

  addVideoFeedback(submissionId: string, feedback: string, therapistName: string = '담당 물리치료사'): boolean {
    const all = this.getVideoSubmissions();
    const index = all.findIndex((s) => s.id === submissionId);
    if (index === -1) return false;

    all[index] = {
      ...all[index],
      therapistFeedback: feedback.trim(),
      feedbackAt: new Date().toISOString(),
      status: 'feedback_completed',
      therapistName
    };

    localStorage.setItem(VIDEO_SUBMISSIONS_KEY, JSON.stringify(all));
    emitChange();
    return true;
  },

  deleteVideoSubmission(submissionId: string, patientId?: string): boolean {
    const all = this.getVideoSubmissions();
    const target = all.find((s) => s.id === submissionId);
    if (!target) return false;
    if (patientId && target.patientId !== patientId) return false;

    const filtered = all.filter((s) => s.id !== submissionId);
    localStorage.setItem(VIDEO_SUBMISSIONS_KEY, JSON.stringify(filtered));
    emitChange();
    return true;
  },

  // ==========================================
  // 신규 사용자 시작 가이드 (온보딩) 완료 상태
  // ==========================================

  getOnboardingGuideDismissed(arg1: string, arg2?: string): boolean {
    if (typeof window === 'undefined' || !arg1) return false;
    try {
      const uid = arg2 ? arg2 : arg1;
      const primaryKey = `${ONBOARDING_GUIDE_KEY}_${uid}`;
      const primaryVal = localStorage.getItem(primaryKey);
      if (primaryVal !== null) {
        return primaryVal === 'true';
      }

      if (arg2) {
        const legacyKey1 = `${ONBOARDING_GUIDE_KEY}_${arg1}_${arg2}`;
        if (localStorage.getItem(legacyKey1) === 'true') return true;
      }
      if (localStorage.getItem(`${ONBOARDING_GUIDE_KEY}_patient_${uid}`) === 'true') return true;
      if (localStorage.getItem(`${ONBOARDING_GUIDE_KEY}_therapist_${uid}`) === 'true') return true;

      return false;
    } catch {
      return false;
    }
  },

  setOnboardingGuideDismissed(arg1: string, arg2: any, arg3?: boolean): void {
    if (typeof window === 'undefined' || !arg1) return;
    try {
      let uid = arg1;
      let isDismissed = false;

      if (typeof arg2 === 'boolean') {
        uid = arg1;
        isDismissed = arg2;
      } else if (typeof arg2 === 'string') {
        uid = arg2;
        isDismissed = typeof arg3 === 'boolean' ? arg3 : true;
      }

      const primaryKey = `${ONBOARDING_GUIDE_KEY}_${uid}`;
      localStorage.setItem(primaryKey, isDismissed ? 'true' : 'false');
      emitChange();
    } catch {
      // ignore
    }
  }
};
