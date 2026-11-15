/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExerciseCategory = 
  | '유연성/스트레칭' 
  | '코어 안정화' 
  | '근력 강화' 
  | '관절 가동성' 
  | '기능적 움직임';

export type BodyPartCategory =
  | '목'
  | '어깨'
  | '팔·손'
  | '허리·몸통'
  | '골반·엉덩관절'
  | '무릎'
  | '발목·발';

export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  bodyParts?: BodyPartCategory[]; // 7대 신체 부위 분류
  targetArea: string;
  purpose: string;
  startPosition: string;
  executionSteps: string[];
  precautions: string[];
  defaultReps: number;
  defaultSets: number;
  defaultFrequency: string;
  thumbnailUrl?: string;
  videoPlaceholder: {
    durationSeconds: number;
    guidePoints: string[];
    illustrationType: string;
  };
}

export interface PatientVideoSubmission {
  id: string;
  patientId: string;
  patientName: string;
  exerciseId: string;
  exerciseName: string;
  videoUrl: string; // Simulated Local Object URL or Cloud Storage URL
  fileName: string;
  fileSizeBytes: number;
  submittedAt: string; // ISO date format
  patientNotes?: string;
  status: 'pending_review' | 'feedback_completed';
  therapistFeedback?: string;
  feedbackAt?: string;
  therapistName?: string;
}

export interface AssignedExercise {
  assignmentId: string;
  exerciseId: string;
  reps: number;
  sets: number;
  frequency: string;
  customNotes: string;
  assignedDate: string;
}

export type WorkoutExecutionStatus = 'completed' | 'partial' | 'skipped';
export type WorkoutDifficulty = '쉬움' | '보통' | '어려움';
export type ConnectionStatus = 'not_connected' | 'pending' | 'requested' | 'connected' | 'rejected' | 'disconnected';

export interface PatientTherapistConnection {
  connectionId: string; // Canonical format in Firestore: `${patientId}_${therapistId}`
  patientId: string;
  patientName: string;
  therapistId: string;
  therapistName: string;
  status: 'pending' | 'connected' | 'rejected' | 'disconnected';
  requestedBy?: 'patient' | 'therapist';
  createdAt: string;
  connectedAt?: string;
  disconnectedAt?: string;
  rejectedAt?: string;
  respondedAt?: string;
  requestType: 'code' | 'invite';
  inviteCode?: string;
  notes?: string;
}

export interface ClinicalFeedback {
  id: string;
  date: string;
  therapistId?: string;
  therapistName: string;
  content: string;
  recommendation?: string;
}

export interface WorkoutLog {
  id: string;
  patientId: string;
  exerciseId: string;
  exerciseName: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  status?: WorkoutExecutionStatus; // 'completed' (완료) | 'partial' (부분 수행) | 'skipped' (미수행)
  prescribedSets: number;
  prescribedReps: number;
  actualSets: number;
  actualReps: number;
  painLevel: number; // 0 - 10 NRS / VAS scale
  prePainLevel?: number; // 운동 전 통증 (0~10)
  postPainLevel?: number; // 운동 후 통증 (0~10)
  difficulty?: WorkoutDifficulty; // 쉬움 | 보통 | 어려움
  patientNotes?: string;
  loggedAt: string; // ISO timestamp
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: '남성' | '여성';
  diagnosis: string;
  targetGoal: string;
  therapistNotes: string;
  assignedProgram: AssignedExercise[];
  connectionStatus?: ConnectionStatus; // 'not_connected' | 'requested' | 'connected'
  therapistId?: string;
  therapistName?: string;
  requestedTherapistId?: string;
  requestedTherapistName?: string;
  feedbacks?: ClinicalFeedback[];
}

export interface Therapist {
  id: string;
  name: string;
  title: string;
  license: string;
  clinic: string;
  connectionCode?: string;
  verificationStatus?: TherapistVerificationStatus;
}

export type UserRole = 'patient' | 'therapist' | 'super_admin';

export type AccountStatus = 'active' | 'suspended';

export type TherapistVerificationStatus = 'unverified' | 'verified';

export type ApprovalStatus = 'approved' | 'pending';

export interface ConnectionRequest {
  id: string;
  patientId: string;
  patientName: string;
  therapistId: string; // account ID or username of the therapist
  therapistName: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: string;
  respondedAt?: string;
}

export interface SupportInquiry {
  id: string;
  authorName: string;
  authorRole: UserRole;
  authorUsername: string;
  type: '문의' | '신고' | '기능제안';
  title: string;
  content: string;
  status: 'pending' | 'resolved';
  createdAt: string;
  adminReply?: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  patientId?: string; // Firebase Auth UID for patients
  therapistId?: string; // Firebase Auth UID for therapists
  accountStatus: AccountStatus; // 'active' | 'suspended'
  therapistVerification?: TherapistVerificationStatus; // 'unverified' | 'verified'
  connectionCode?: string; // Unique connection code for therapists (e.g. 'PT-1234')
  connectedTherapistId?: string; // for patients
  connectedTherapistName?: string; // for patients
  approvalStatus?: ApprovalStatus; // legacy compatibility
  licenseCode?: string;
  clinic?: string;
  registeredAt?: string;
  authProvider?: 'firebase' | 'demo';
  isDemoAccount?: boolean;
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string; // Kept empty ('') for Firebase Auth accounts
  name: string;
  role: UserRole;
  patientId?: string;
  therapistId?: string;
  accountStatus: AccountStatus; // 'active' | 'suspended'
  therapistVerification?: TherapistVerificationStatus; // 'unverified' | 'verified'
  connectionCode?: string; // Unique connection code for therapists (e.g. 'PT-1234')
  connectedTherapistId?: string; // for patients
  connectedTherapistName?: string; // for patients
  approvalStatus?: ApprovalStatus; // legacy compatibility
  licenseCode?: string;
  clinic?: string;
  registeredAt: string;
  authProvider?: 'firebase' | 'demo';
  isDemoAccount?: boolean;
}

/**
 * 환자의 진단명을 사용자 화면에 적절하게 표시하기 위한 포맷팅 유틸리티
 * 1. 진단명과 환자-물리치료사 연결 상태(connectionStatus)를 독립적으로 취급
 * 2. 진단명이 비어 있거나 없는 경우 '미입력' 반환
 * 3. 과거 생성된 임시 플레이스홀더 문구('신규 등록 대상자 (치료사 연결 대기)', '신규 등록 대상자', 'Firebase 연동 대상자' 등)는
 *    의학적 진단명이 아니므로 '미입력'으로 정규화
 * 4. 실제 유효한 임상 진단명이 입력되어 있는 경우 해당 진단명을 그대로 반환
 */
export function formatPatientDiagnosis(diagnosis?: string | null): string {
  if (!diagnosis) return '미입력';
  const trimmed = diagnosis.trim();
  if (!trimmed) return '미입력';

  const legacyPlaceholders = [
    '신규 등록 대상자 (치료사 연결 대기)',
    '신규 등록 대상자(치료사 연결 대기)',
    '신규 등록 대상자',
    '신규 등록',
    '신규등록대상자',
    'Firebase 연동 대상자',
    '진단명 미입력',
    '미입력'
  ];

  if (legacyPlaceholders.includes(trimmed)) {
    return '미입력';
  }

  return trimmed;
}
