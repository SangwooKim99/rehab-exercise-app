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
  ClinicalFeedback
} from '../types/rehab';
import {
  EXERCISE_LIBRARY,
  INITIAL_PATIENTS,
  INITIAL_THERAPIST,
  INITIAL_WORKOUT_LOGS
} from '../data/initialData';
import { FirebaseService } from './firebaseService';
import { isFirebaseConfigured } from '../config/firebaseConfig';

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

// Initial demo video submission for immediate usability testing
const INITIAL_VIDEO_SUBMISSIONS: PatientVideoSubmission[] = [
  {
    id: 'sub-demo-1',
    patientId: 'patient-1',
    patientName: '김민수',
    exerciseId: 'ex-7',
    exerciseName: '브리지',
    videoUrl: '',
    fileName: 'minsu_bridge_exercise.mp4',
    fileSizeBytes: 12450000,
    submittedAt: '2026-11-02T16:30:00.000Z',
    patientNotes: '골반을 들어 올릴 때 오른쪽 둔근에 힘이 덜 들어가는 느낌이 듭니다. 자세가 맞는지 확인 부탁드립니다.',
    status: 'feedback_completed',
    therapistFeedback: '엉덩이를 들어 올릴 때 오른쪽 골반이 약 2cm 정도 낮게 유지됩니다. 오른쪽 뒤꿈치로 바닥을 더 강하게 누르면서 수축을 유도해 보세요.',
    feedbackAt: '2026-11-02T18:15:00.000Z',
    therapistName: '박건우 PT'
  }
];

// Initial demo patient-therapist independent connection records (Firebase-ready schema)
const INITIAL_CONNECTIONS: PatientTherapistConnection[] = [
  {
    connectionId: 'conn-demo-1',
    patientId: 'patient-1',
    patientName: '김민수',
    therapistId: 'acc-therapist-01',
    therapistName: '박건우 PT',
    status: 'connected',
    createdAt: '2026-10-25T10:00:00.000Z',
    connectedAt: '2026-10-25T10:05:00.000Z',
    requestType: 'code',
    inviteCode: 'PT-GW-821'
  },
  {
    connectionId: 'conn-demo-2',
    patientId: 'patient-2',
    patientName: '이지훈',
    therapistId: 'acc-therapist-01',
    therapistName: '박건우 PT',
    status: 'connected',
    createdAt: '2026-10-28T14:30:00.000Z',
    connectedAt: '2026-10-28T14:32:00.000Z',
    requestType: 'invite',
    inviteCode: 'PT-GW-821'
  },
  {
    connectionId: 'conn-demo-3',
    patientId: 'patient-3',
    patientName: '박서연',
    therapistId: 'acc-therapist-01',
    therapistName: '박건우 PT',
    status: 'connected',
    createdAt: '2026-10-29T11:25:00.000Z',
    connectedAt: '2026-10-29T11:30:00.000Z',
    requestType: 'code',
    inviteCode: 'PT-GW-821'
  }
];

// Initial demo support inquiries
const INITIAL_INQUIRIES: SupportInquiry[] = [
  {
    id: 'inq-1',
    authorName: '이지훈',
    authorRole: 'patient',
    authorUsername: 'patient02',
    type: '문의',
    title: '의자에서 일어서기 운동 시 무릎 부담 문의',
    content: '의자에서 일어설 때 오른쪽 무릎에 가벼운 압박감이 느껴집니다. 의자 높이를 조금 높여서 진행해도 괜찮을까요?',
    status: 'pending',
    createdAt: '2026-11-01T14:20:00.000Z'
  },
  {
    id: 'inq-2',
    authorName: '박건우 (물리치료사)',
    authorRole: 'therapist',
    authorUsername: 'therapist01',
    type: '기능제안',
    title: '신규 고관절 회전 재활운동 종목 추가 제안',
    content: '고관절 충돌증후군 대상자를 위한 내회전/외회전 등척성 운동 가이드 영상을 추가 요청드립니다.',
    status: 'resolved',
    createdAt: '2026-10-30T10:00:00.000Z',
    adminReply: '임상 라이브러리 검토 후 차기 업데이트에 반영 예정입니다. 소중한 의견 감사합니다.'
  }
];

// Initial demo connection requests
const INITIAL_CONNECTION_REQUESTS: ConnectionRequest[] = [
  {
    id: 'req-demo-1',
    patientId: 'patient-3',
    patientName: '박서연',
    therapistId: 'acc-therapist-01',
    therapistName: '박건우 PT',
    status: 'accepted',
    requestedAt: '2026-10-29T11:25:00.000Z',
    respondedAt: '2026-10-29T11:30:00.000Z'
  }
];

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
      localStorage.setItem(ACTIVE_PATIENT_ID_KEY, 'patient-1');
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
      // Auto-migrate if stored exercises do not have bodyParts or new exercises
      try {
        const stored = JSON.parse(localStorage.getItem(EXERCISES_KEY) || '[]');
        if (stored.length < EXERCISE_LIBRARY.length || !stored[0]?.bodyParts) {
          localStorage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISE_LIBRARY));
        }
      } catch {
        localStorage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISE_LIBRARY));
      }
    }
    if (!localStorage.getItem(VIDEO_SUBMISSIONS_KEY)) {
      localStorage.setItem(VIDEO_SUBMISSIONS_KEY, JSON.stringify(INITIAL_VIDEO_SUBMISSIONS));
    }
  },

  resetAllData() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(INITIAL_PATIENTS));
    localStorage.setItem(WORKOUT_LOGS_KEY, JSON.stringify(INITIAL_WORKOUT_LOGS));
    localStorage.setItem(ACTIVE_ROLE_KEY, 'patient');
    localStorage.setItem(ACTIVE_PATIENT_ID_KEY, 'patient-1');
    localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(INITIAL_CONNECTION_REQUESTS));
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(INITIAL_CONNECTIONS));
    localStorage.setItem(INQUIRIES_KEY, JSON.stringify(INITIAL_INQUIRIES));
    localStorage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISE_LIBRARY));
    localStorage.setItem(VIDEO_SUBMISSIONS_KEY, JSON.stringify(INITIAL_VIDEO_SUBMISSIONS));
    emitChange();
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
    if (typeof window === 'undefined') return 'patient-1';
    return localStorage.getItem(ACTIVE_PATIENT_ID_KEY) || 'patient-1';
  },

  setActivePatientId(patientId: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(ACTIVE_PATIENT_ID_KEY, patientId);
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
      if (parsed.length < EXERCISE_LIBRARY.length || !parsed[0]?.bodyParts) {
        localStorage.setItem(EXERCISES_KEY, JSON.stringify(EXERCISE_LIBRARY));
        return EXERCISE_LIBRARY;
      }
      return parsed;
    } catch {
      return EXERCISE_LIBRARY;
    }
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
      return data ? JSON.parse(data) : INITIAL_PATIENTS;
    } catch {
      return INITIAL_PATIENTS;
    }
  },

  getPatientById(patientId: string): Patient | undefined {
    const patients = this.getPatients();
    return patients.find((p) => p.id === patientId);
  },

  /**
   * 물리치료사별 환자 데이터 격리 조회
   * - 연결되지 않은 다른 치료사의 환자 정보는 조회 불가!
   * - 박건우 PT(therapist01)는 가상 데모 환자 + 자신에게 연결된 환자 조회
   * - 신규 치료사는 자신에게 연결된 환자만 조회 (환자가 아직 없으면 안전한 가상 실습용 템플릿만 표시)
   */
  getPatientsForTherapist(therapistUser?: AuthUser): Patient[] {
    const allPatients = this.getPatients();
    if (!therapistUser) return allPatients;

    const isPrimaryDemoTherapist = therapistUser.username === 'therapist01' || therapistUser.id === 'acc-therapist-01';

    // 해당 치료사의 연결 테이블 데이터 조회
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
      // 1. 환자 레코드 또는 연결 테이블에서 명시적으로 연결 해제된 환자는 절대 제외
      if (patient.connectionStatus === 'disconnected' || explicitlyDisconnectedPatientIds.has(patient.id)) {
        return false;
      }
      if (patient.connectionStatus !== 'connected') {
        return false;
      }

      // 2. 연결 테이블에 현재 활성(connected) 상태로 등록된 환자
      if (connectedPatientIds.has(patient.id)) {
        return true;
      }

      // 3. 환자 레코드의 therapistId가 현재 치료사와 일치하는 경우
      if (
        patient.therapistId === therapistUser.id || 
        patient.therapistId === therapistUser.username ||
        (isPrimaryDemoTherapist && (patient.therapistId === 'acc-therapist-01' || patient.therapistId === 'therapist-1'))
      ) {
        return true;
      }

      // 4. 박건우 PT인 경우 초기 데모 환자 3명 (연결 해제되지 않은 상태일 때만)
      if (
        isPrimaryDemoTherapist &&
        (patient.id === 'patient-1' || patient.id === 'patient-2' || patient.id === 'patient-3')
      ) {
        return true;
      }

      return false;
    });
  },

  addPatient(newPatient: Patient): boolean {
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
  // 환자-물리치료사 연결 시스템 (Connection Flow - Firebase Ready)
  // ==========================================

  getConnections(): PatientTherapistConnection[] {
    if (typeof window === 'undefined') return INITIAL_CONNECTIONS;
    try {
      const data = localStorage.getItem(CONNECTIONS_KEY);
      return data ? JSON.parse(data) : INITIAL_CONNECTIONS;
    } catch {
      return INITIAL_CONNECTIONS;
    }
  },

  getConnectionsForTherapist(therapistUser?: AuthUser): PatientTherapistConnection[] {
    const conns = this.getConnections();
    if (!therapistUser) return conns;
    return conns.filter(
      (c) => c.therapistId === therapistUser.id || 
             c.therapistId === therapistUser.username ||
             (therapistUser.username === 'therapist01' && (c.therapistId === 'acc-therapist-01' || c.therapistId === 'therapist-1' || c.inviteCode === 'PT-GW-821'))
    );
  },

  getConnectionForPatient(patientId: string): PatientTherapistConnection | undefined {
    const conns = this.getConnections();
    return conns.find((c) => c.patientId === patientId && (c.status === 'connected' || c.status === 'pending'));
  },

  getActiveConnection(patientId: string, therapistIdOrUser?: string | AuthUser): PatientTherapistConnection | undefined {
    const conns = this.getConnections();
    const therapistId = typeof therapistIdOrUser === 'object' ? therapistIdOrUser.id : therapistIdOrUser;
    const username = typeof therapistIdOrUser === 'object' ? therapistIdOrUser.username : undefined;

    return conns.find((c) => {
      if (c.patientId !== patientId) return false;
      if (c.status !== 'connected') return false;
      if (!therapistId && !username) return true;
      if (c.therapistId === therapistId || (username && c.therapistId === username)) return true;
      if (
        (therapistId === 'acc-therapist-01' || username === 'therapist01') &&
        (c.therapistId === 'acc-therapist-01' || c.therapistId === 'therapist-1' || c.therapistId === 'therapist01')
      ) {
        return true;
      }
      return false;
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
    remoteConns.forEach((c) => map.set(c.connectionId, c));
    const merged = Array.from(map.values());
    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(merged));
    emitChange();
  },

  /**
   * 원격 connections 중 'pending' 상태인 요청을 치료사의 대기 목록에 동기화
   */
  syncPendingRequestsFromConnections(pendingConns: PatientTherapistConnection[]): void {
    if (typeof window === 'undefined' || !pendingConns || pendingConns.length === 0) return;
    const requests = this.getConnectionRequests();
    let changed = false;
    pendingConns.forEach((c) => {
      const exists = requests.some(
        (r) => r.patientId === c.patientId && (r.therapistId === c.therapistId || r.therapistId === c.therapistName) && r.status === 'pending'
      );
      if (!exists) {
        requests.unshift({
          id: `req-${c.connectionId}`,
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
      return data ? JSON.parse(data) : INITIAL_CONNECTION_REQUESTS;
    } catch {
      return INITIAL_CONNECTION_REQUESTS;
    }
  },

  getRequestsForTherapist(therapistUser?: AuthUser): ConnectionRequest[] {
    const requests = this.getConnectionRequests();
    if (!therapistUser) return requests;
    return requests.filter(
      (r) => r.therapistId === therapistUser.id || 
             r.therapistId === therapistUser.username ||
             (therapistUser.username === 'therapist01' && (r.therapistId === 'acc-therapist-01' || r.therapistId === 'PT-GW-821'))
    );
  },

  /**
   * 환자가 치료사 고유 연결 코드 또는 초대 링크로 연결 요청 전송
   * - Firestore connections 컬렉션에 실제 저장 성공 시에만 완료 처리 (Requirement 1, 2)
   */
  async sendConnectionRequest(
    patientId: string,
    patientName: string,
    therapistAccount: UserAccount,
    requestType: 'code' | 'invite' = 'code'
  ): Promise<{ success: boolean; message: string; connection?: PatientTherapistConnection }> {
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
    // 중복 대기 요청 방지
    const hasPending = requests.some(
      (r) => r.patientId === patientId && (r.therapistId === therapistAccount.id || r.therapistId === therapistAccount.username) && r.status === 'pending'
    );
    if (hasPending) {
      return { success: false, message: '이미 해당 물리치료사에게 보낸 연결 요청이 대기 중입니다.' };
    }

    const nowStr = new Date().toISOString();

    const canonicalConnectionId = `${patientId}_${therapistAccount.id}`;
    const newConnection: PatientTherapistConnection = {
      connectionId: canonicalConnectionId,
      patientId,
      patientName,
      therapistId: therapistAccount.id,
      therapistName: therapistAccount.name,
      status: 'pending',
      requestedBy: 'patient',
      createdAt: nowStr,
      requestType,
      inviteCode: therapistAccount.connectionCode
    };

    // Cloud Firestore 연결 관계 실제 저장 (Requirement 1, 2)
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
      id: `req-${Date.now()}`,
      patientId,
      patientName,
      therapistId: therapistAccount.id,
      therapistName: therapistAccount.name,
      status: 'pending',
      requestedAt: nowStr
    };

    localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify([newRequest, ...requests]));

    // 환자 프로필에 'pending' 상태와 요청 대상 치료사 정보 저장
    patients[patientIndex] = {
      ...currentPatient,
      connectionStatus: 'pending',
      requestedTherapistId: therapistAccount.id,
      requestedTherapistName: therapistAccount.name
    };
    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));

    // 독립 연결 데이터베이스(rehab_connections_v1)에도 저장
    const connections = this.getConnections();
    const filteredConns = connections.filter((c) => !(c.patientId === patientId && c.therapistId === therapistAccount.id));
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
   * - Firestore connections 컬렉션에 실제 상태 전이 성공 시에만 완료 처리 (Requirement 1, 2)
   */
  async respondConnectionRequest(
    requestId: string,
    accept: boolean,
    therapistUser?: AuthUser
  ): Promise<{ success: boolean; message: string }> {
    const requests = this.getConnectionRequests();
    const reqIndex = requests.findIndex((r) => r.id === requestId);
    if (reqIndex === -1) {
      return { success: false, message: '연결 요청을 찾을 수 없습니다.' };
    }

    const targetReq = requests[reqIndex];
    const nowStr = new Date().toISOString();
    const therapistId = therapistUser?.id || targetReq.therapistId || 'acc-therapist-01';
    const therapistName = therapistUser?.name || targetReq.therapistName || '담당 물리치료사';

    // 독립 연결 테이블 식별 및 갱신 객체 준비
    const connections = this.getConnections();
    const canonicalId = `${targetReq.patientId}_${therapistId}`;
    let targetConn = connections.find(
      (c) => c.patientId === targetReq.patientId && (c.therapistId === therapistId || c.therapistId === targetReq.therapistId)
    );

    if (targetConn) {
      targetConn.status = accept ? 'connected' : 'rejected';
      targetConn.connectedAt = accept ? nowStr : undefined;
      targetConn.rejectedAt = accept ? undefined : nowStr;
      targetConn.respondedAt = nowStr;
    } else {
      targetConn = {
        connectionId: canonicalId,
        patientId: targetReq.patientId,
        patientName: targetReq.patientName,
        therapistId,
        therapistName,
        status: accept ? 'connected' : 'rejected',
        requestedBy: 'patient',
        createdAt: targetReq.requestedAt,
        connectedAt: accept ? nowStr : undefined,
        rejectedAt: accept ? undefined : nowStr,
        respondedAt: nowStr,
        requestType: 'code'
      };
      connections.unshift(targetConn);
    }

    // Cloud Firestore 연결 상태 실제 저장 (Requirement 1, 2)
    if (isFirebaseConfigured()) {
      try {
        const saved = await FirebaseService.saveConnection(targetConn);
        if (!saved) {
          return {
            success: false,
            message: 'Firestore 연결 상태 업데이트에 실패했습니다. 권한을 확인해주세요.'
          };
        }
      } catch (err: any) {
        console.error('Firestore connection response sync error:', err);
        return {
          success: false,
          message: `Firestore 연결 응답 저장 실패: ${err?.message || '권한 오류'}`
        };
      }
    }

    requests[reqIndex] = {
      ...targetReq,
      status: accept ? 'accepted' : 'rejected',
      respondedAt: nowStr
    };
    localStorage.setItem(CONNECTION_REQUESTS_KEY, JSON.stringify(requests));

    // 환자 정보 업데이트
    const patients = this.getPatients();
    const patientIndex = patients.findIndex((p) => p.id === targetReq.patientId);
    if (patientIndex !== -1) {
      if (accept) {
        patients[patientIndex] = {
          ...patients[patientIndex],
          connectionStatus: 'connected',
          therapistId,
          therapistName,
          requestedTherapistId: undefined,
          requestedTherapistName: undefined
        };
      } else {
        patients[patientIndex] = {
          ...patients[patientIndex],
          connectionStatus: 'rejected',
          requestedTherapistId: undefined,
          requestedTherapistName: undefined
        };
      }
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    }

    localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));

    // 계정 테이블(rehab_accounts_v1) 및 세션 동기화
    if (accept) {
      try {
        const accountsData = localStorage.getItem('rehab_accounts_v1');
        if (accountsData) {
          const accounts = JSON.parse(accountsData);
          let accUpdated = false;
          accounts.forEach((acc: any) => {
            if (acc.patientId === targetReq.patientId) {
              acc.connectedTherapistId = therapistId;
              acc.connectedTherapistName = therapistName;
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
            if (sessionUser.patientId === targetReq.patientId) {
              sessionUser.connectedTherapistId = therapistId;
              sessionUser.connectedTherapistName = therapistName;
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
        ? `${targetReq.patientName} 환자와 연결이 완료되었습니다. 담당 환자 목록에서 운동을 처방할 수 있습니다.`
        : `${targetReq.patientName} 환자의 연결 요청을 거절했습니다.`
    };
  },

  /**
   * 환자 또는 물리치료사가 연결 해제
   * - connectionId 기준 처리 및 치료사 권한 일치 검증
   * - 환자 레코드, 연결 테이블(rehab_connections_v1), 계정 테이블(rehab_accounts_v1) 및 세션 동시 갱신
   * - 기존 운동 수행 기록 및 운동 처방 이력은 100% 안전하게 보존됨
   */
  async disconnectPatient(
    patientId: string, 
    therapistIdOrUser?: string | AuthUser,
    explicitConnectionId?: string
  ): Promise<{ success: boolean; message: string; connectionId?: string }> {
    try {
      const therapistId = typeof therapistIdOrUser === 'object' ? therapistIdOrUser.id : therapistIdOrUser;
      const therapistUsername = typeof therapistIdOrUser === 'object' ? therapistIdOrUser.username : undefined;

      const patients = this.getPatients();
      const patientIndex = patients.findIndex((p) => p.id === patientId);
      if (patientIndex === -1) {
        return { success: false, message: '해당 환자 정보를 찾을 수 없습니다.' };
      }
      const patient = patients[patientIndex];

      // 1. 연결 테이블(rehab_connections_v1)에서 대상 연결 정보 식별
      const connections = this.getConnections();
      let targetConnIndex = -1;

      if (explicitConnectionId) {
        targetConnIndex = connections.findIndex((c) => c.connectionId === explicitConnectionId);
      }
      if (targetConnIndex === -1 && (therapistId || therapistUsername)) {
        targetConnIndex = connections.findIndex((c) => 
          c.patientId === patientId && 
          (c.status === 'connected' || c.status === 'pending') &&
          (c.therapistId === therapistId || c.therapistId === therapistUsername || 
           ((therapistUsername === 'therapist01' || therapistId === 'acc-therapist-01') && 
            (c.therapistId === 'acc-therapist-01' || c.therapistId === 'therapist-1' || c.therapistId === 'therapist01')))
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
        connectionId = `conn-disc-${Date.now()}`;
        connections.unshift({
          connectionId,
          patientId,
          patientName: patient.name,
          therapistId: therapistId || patient.therapistId || 'acc-therapist-01',
          therapistName: patient.therapistName || '담당 물리치료사',
          status: 'disconnected',
          createdAt: nowStr,
          disconnectedAt: nowStr,
          requestType: 'code'
        });
      }
      localStorage.setItem(CONNECTIONS_KEY, JSON.stringify(connections));

      // Cloud Firestore 연결 해제 상태 동기화
      const targetConnRecord = connections[targetConnIndex !== -1 ? targetConnIndex : 0];
      if (targetConnRecord && isFirebaseConfigured()) {
        try {
          await FirebaseService.saveConnection(targetConnRecord);
        } catch (err) {
          console.warn('Firestore disconnect sync deferred:', err);
        }
      }

      // 2. 환자 정보(rehab_patients_v1) 상태 변경
      patients[patientIndex] = {
        ...patient,
        connectionStatus: 'disconnected',
        therapistId: undefined,
        therapistName: undefined,
        requestedTherapistId: undefined,
        requestedTherapistName: undefined
      };
      localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));

      // 3. 계정 테이블(rehab_accounts_v1) 동기화
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

      // 4. 세션 스토리지 환자 계정 동기화
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
      therapistId: status === 'connected' ? (patients[patientIndex].therapistId || 'acc-therapist-01') : undefined,
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
    feedback: { content: string; recommendation?: string }, 
    therapistName: string = '담당 물리치료사',
    therapistId?: string
  ): Promise<boolean> {
    const patients = this.getPatients();
    const index = patients.findIndex((p) => p.id === patientId);
    if (index === -1) return false;

    const patient = patients[index];
    const actualTherapistId = therapistId || patient.therapistId || '';
    const newFeedback: ClinicalFeedback = {
      id: `fb-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      therapistId: actualTherapistId || undefined,
      therapistName,
      content: feedback.content.trim(),
      recommendation: feedback.recommendation?.trim()
    };

    const existingFeedbacks = patient.feedbacks || [];
    patients[index] = {
      ...patient,
      feedbacks: [newFeedback, ...existingFeedbacks]
    };

    localStorage.setItem(PATIENTS_KEY, JSON.stringify(patients));
    emitChange();

    // Cloud Firestore 피드백 저장 (Requirement 1, 2)
    if (isFirebaseConfigured() && actualTherapistId) {
      try {
        await FirebaseService.saveFeedback(patientId, newFeedback, actualTherapistId);
      } catch (err) {
        console.warn('Firestore feedback sync deferred:', err);
      }
    }

    return true;
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

    // Cloud Firestore 운동 프로그램 배정 저장 (Requirement 7)
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

      if (patientId) {
        logs = logs.filter((log) => log.patientId === patientId);
      }
      if (date) {
        logs = logs.filter((log) => log.date === date);
      }
      // Sort newest first
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

    // Cloud Firestore 실시간 영구 저장 (Requirement 8)
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
    const today = this.getTodayDateString();

    let totalScheduledExercises = 0;
    let totalCompletedExercises = 0;

    const patientSummaries = patients.map((patient) => {
      const stats = this.getPatientTodayStats(patient.id);
      totalScheduledExercises += stats.totalAssigned;
      totalCompletedExercises += stats.completedCount;

      // Find most recent log for this patient
      const patientLogs = this.getWorkoutLogs(patient.id);
      const recentLog = patientLogs.length > 0 ? patientLogs[0] : undefined;
      const lastWorkoutDate = recentLog ? recentLog.date : '수행 기록 없음';

      // Status text
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

      // Check if feedback is needed:
      // Needs feedback if patient has recent logs with pain >= 3 or notes, or patient completed workout but no feedback exists
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

    // Filter recent logs to only this therapist's patients
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
      return data ? JSON.parse(data) : INITIAL_INQUIRIES;
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
      // 1. UID 기준 단일 키 확인 (예: rehab_onboarding_guide_v1_{uid})
      const uid = arg2 ? arg2 : arg1;
      const primaryKey = `${ONBOARDING_GUIDE_KEY}_${uid}`;
      const primaryVal = localStorage.getItem(primaryKey);
      if (primaryVal !== null) {
        return primaryVal === 'true';
      }

      // 2. 과거 형식 호환성 검사 (rehab_onboarding_guide_v1_{role}_{uid})
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

      // UID 기준 키에 저장
      const primaryKey = `${ONBOARDING_GUIDE_KEY}_${uid}`;
      localStorage.setItem(primaryKey, isDismissed ? 'true' : 'false');
      emitChange();
    } catch {
      // ignore
    }
  }
};
