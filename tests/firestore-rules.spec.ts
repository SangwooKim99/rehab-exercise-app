/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * [Firebase Emulator Suite - Firestore Security Rules 정밀 유닛 테스트 스위트]
 * 
 * 본 테스트는 Cloud Firestore 보안 규칙(firestore.rules)의 8대 핵심 보안 시나리오를 검증합니다.
 * 
 * 검증 항목:
 * 1. [개인정보 보호 & 프로필 분리] users 컬렉션 목록 조회 전면 차단 & 제3자 열람 차단, publicTherapists만 공개
 * 2. [verifiedTherapists 조회 제한] 일반 사용자의 전체 목록 조회 차단, 본인(치료사) 인증 여부 단일 get만 허용
 * 3. [사용자 프로필 필드 잠금] role, uid, therapistId, connectionStatus, isVerified 임의 수정 불가
 * 4. [연결 상태 전이 및 불변성] patientId, therapistId, requestedBy 등 핵심 필드 수정 불가 & 상대방 동의 필수
 * 5. [수행 기록 불변성] workoutLogs 수정 시 patientId 변경 불가
 * 6. [임상 피드백 불변성] feedbacks 수정 시 patientId와 therapistId 변경 불가
 * 7. [처방 프로그램 불변성] prescriptions 수정 시 patientId 및 therapistId 기존 값과 일치 강제
 * 8. [정상 시나리오(Happy Path)] 환자 요청 → 검증된 치료사 승인 → 운동 기록 → 처방 및 피드백 작성 성공
 * 
 * 실행 방법 (로컬 PC 또는 CI 환경):
 * 1. Java 11 이상 설치 (Firestore Emulator 구동 필수 조건)
 * 2. Firebase CLI 설치: npm install -g firebase-tools
 * 3. Firestore 에뮬레이터 시작: firebase emulators:start --only firestore
 * 4. 테스트 실행: npx vitest run tests/firestore-rules.spec.ts
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

let testEnv: RulesTestEnvironment;

const PRODUCTION_PROJECT_ID = 'rehab-exercise-6484a';
const DEFAULT_TEST_PROJECT_ID = 'demo-rehab-exercise';
const PROJECT_ID = (
  process.env.FIREBASE_TEST_PROJECT_ID ||
  process.env.FIREBASE_PROJECT_ID ||
  DEFAULT_TEST_PROJECT_ID
).trim();
const RULES_FILE = path.resolve(process.cwd(), 'firestore.rules');

beforeAll(async () => {
  if (PROJECT_ID === PRODUCTION_PROJECT_ID || !PROJECT_ID.startsWith('demo-')) {
    throw new Error(
      `[보안 차단] 보안 규칙 테스트는 운영 프로젝트(${PRODUCTION_PROJECT_ID})에 연결할 수 없습니다. 'demo-'로 시작하는 격리 테스트 프로젝트 ID(기본값: ${DEFAULT_TEST_PROJECT_ID})만 허용됩니다.`
    );
  }

  const rawEmulatorHost = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080').trim();
  const [hostPart, portPart] = rawEmulatorHost.split(':');
  const emulatorHost = hostPart || '127.0.0.1';
  const emulatorPort = Number(portPart || 8080);

  if (emulatorHost !== '127.0.0.1' && emulatorHost !== 'localhost') {
    throw new Error(
      `[보안 차단] 로컬 Firestore Emulator(127.0.0.1 또는 localhost)만 허용됩니다. 현재 설정: ${rawEmulatorHost}`
    );
  }

  const rules = fs.readFileSync(RULES_FILE, 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: emulatorHost,
      port: emulatorPort
    }
  });
});

afterAll(async () => {
  if (testEnv) {
    await testEnv.cleanup();
  }
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Cloud Firestore 보안 규칙 정밀 유닛 테스트', () => {

  // =========================================================================
  // 1. 치료사 프로필 비공개 분리 & publicTherapists 검증 (Requirement 1)
  // =========================================================================
  describe('1. 사용자 비공개 프로필 보호 및 공개 디렉터리 분리', () => {
    it('로그인한 일반 사용자라도 타 치료사의 비공개 users 문서를 직접 조회하거나 전체 목록을 스크래핑할 수 없다', async () => {
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('users').doc('therapist-1').set({
          uid: 'therapist-1',
          name: '박건우',
          email: 'private_doctor@rehab.clinic', // 비공개 개인정보
          role: 'therapist',
          accountStatus: 'active',
          clinic: '바른재활의학과',
          createdAt: new Date().toISOString()
        });
      });

      const patientDb = testEnv.authenticatedContext('unconnected-patient-1').firestore();

      // [공격 1] users 컬렉션 전체 목록 조회(list) 시도 -> 차단 (allow list: if false)
      await assertFails(patientDb.collection('users').get());

      // [공격 2] 연결되지 않은 상태에서 타 치료사의 비공개 users 문서 단일 get 시도 -> 차단
      await assertFails(patientDb.collection('users').doc('therapist-1').get());
    });

    it('로그인한 사용자는 publicTherapists 공개 디렉터리에서 연결 코드로 치료사를 검색할 수 있다', async () => {
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('publicTherapists').doc('therapist-1').set({
          therapistId: 'therapist-1',
          name: '박건우 PT',
          clinic: '바른재활의학과',
          connectionCode: 'PT-GW-821'
        });
      });

      const patientDb = testEnv.authenticatedContext('patient-1').firestore();
      // 공개 디렉터리 조회 및 검색 성공
      await assertSucceeds(patientDb.collection('publicTherapists').doc('therapist-1').get());
      await assertSucceeds(
        patientDb.collection('publicTherapists').where('connectionCode', '==', 'PT-GW-821').get()
      );
    });

    it('신규 가입 치료사는 publicTherapists 문서를 create 할 수 있으나 isVerified: true를 위조할 수 없다', async () => {
      const therapistDb = testEnv.authenticatedContext('therapist-new').firestore();

      // [공격] 가입 시 isVerified: true를 위조하여 등록 시도 -> 차단
      await assertFails(
        therapistDb.collection('publicTherapists').doc('therapist-new').set({
          therapistId: 'therapist-new',
          name: '신규치료사',
          clinic: '신규재활센터',
          connectionCode: 'PT-NEW-1',
          isVerified: true // 위조 시도!
        })
      );

      // [정상 동작] isVerified: false 상태로 정상 등록 -> 성공!
      await assertSucceeds(
        therapistDb.collection('publicTherapists').doc('therapist-new').set({
          therapistId: 'therapist-new',
          name: '신규치료사',
          clinic: '신규재활센터',
          connectionCode: 'PT-NEW-1',
          isVerified: false
        })
      );
    });
  });

  // =========================================================================
  // 2. verifiedTherapists 컬렉션 조회 제한 (Requirement 6)
  // =========================================================================
  describe('2. verifiedTherapists 화이트리스트 접근 제한', () => {
    it('일반 사용자는 verifiedTherapists 전체 목록을 조회할 수 없다', async () => {
      const patientDb = testEnv.authenticatedContext('patient-1').firestore();
      await assertFails(patientDb.collection('verifiedTherapists').get());
    });

    it('치료사 본인은 본인의 인증 상태를 단일 get으로 확인할 수 있으나 타 치료사의 인증 문서는 조회할 수 없다', async () => {
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('verifiedTherapists').doc('therapist-1').set({
          uid: 'therapist-1',
          name: '박건우',
          licenseNumber: 'PT-2026-001',
          verifiedAt: new Date().toISOString()
        });
      });

      const therapistDb = testEnv.authenticatedContext('therapist-1').firestore();
      const otherUserDb = testEnv.authenticatedContext('other-user-2').firestore();

      // 본인 인증 문서 단일 조회 -> 성공
      await assertSucceeds(therapistDb.collection('verifiedTherapists').doc('therapist-1').get());
      // 타인의 인증 문서 단일 조회 -> 차단
      await assertFails(otherUserDb.collection('verifiedTherapists').doc('therapist-1').get());
    });
  });

  // =========================================================================
  // 3. connections 컬렉션 상태 변경 시 핵심 필드 불변성 (Requirement 2)
  // =========================================================================
  describe('3. connections 컬렉션 핵심 필드 불변성 및 상태 전이 검증', () => {
    it('승인 또는 상태 변경 시 patientId, therapistId, requestedBy, createdAt을 변경할 수 없다', async () => {
      const connId = 'patient-1_therapist-1';
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('connections').doc(connId).set({
          connectionId: connId,
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          patientName: '김민수',
          therapistName: '박건우 PT',
          status: 'pending',
          requestedBy: 'patient',
          createdAt: '2026-11-09T00:00:00.000Z'
        });
      });

      // 검증된 치료사 세션 (Custom Claims 부여)
      const therapistDb = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();

      // [공격 1] 승인 시 patientId를 슬쩍 바꿔치기 시도 -> 차단
      await assertFails(
        therapistDb.collection('connections').doc(connId).update({
          status: 'connected',
          patientId: 'victim-patient-99',
          connectedAt: new Date().toISOString()
        })
      );

      // [공격 2] 승인 시 requestedBy를 변조 시도 -> 차단
      await assertFails(
        therapistDb.collection('connections').doc(connId).update({
          status: 'connected',
          requestedBy: 'therapist',
          connectedAt: new Date().toISOString()
        })
      );

      // [정상 동작] 핵심 필드 불변 상태에서 status와 connectedAt, updatedAt만 수정 -> 성공
      await assertSucceeds(
        therapistDb.collection('connections').doc(connId).update({
          status: 'connected',
          connectedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        })
      );
    });
  });

  // =========================================================================
  // 4. workoutLogs 수정 시 patientId 불변성 (Requirement 3)
  // =========================================================================
  describe('4. workoutLogs 수정 시 patientId 변경 제한', () => {
    it('환자는 자신의 운동 기록을 수정할 때 patientId를 타인으로 변경할 수 없다', async () => {
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('workoutLogs').doc('log-1').set({
          id: 'log-1',
          patientId: 'patient-1',
          exerciseId: 'ex-1',
          exerciseName: '스쿼트',
          date: '2026-11-09',
          completed: true,
          painLevel: 3,
          loggedAt: new Date().toISOString()
        });
      });

      const patientDb = testEnv.authenticatedContext('patient-1').firestore();

      // [공격] 운동 기록 수정 시 patientId를 변경 시도 -> 차단
      await assertFails(
        patientDb.collection('workoutLogs').doc('log-1').update({
          patientId: 'patient-victim-99',
          painLevel: 1
        })
      );

      // [정상 동작] 본인 소유 유지 상태에서 통증 등 내용 수정 -> 성공
      await assertSucceeds(
        patientDb.collection('workoutLogs').doc('log-1').update({
          painLevel: 2
        })
      );
    });
  });

  // =========================================================================
  // 5. feedbacks 수정 시 patientId 및 therapistId 불변성 (Requirement 4)
  // =========================================================================
  describe('5. feedbacks 수정 시 patientId 및 therapistId 변경 제한', () => {
    it('치료사는 피드백을 수정할 때 patientId 또는 therapistId를 변경할 수 없다', async () => {
      // 1. 활성 연결 문서 준비
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('connections').doc('patient-1_therapist-1').set({
          connectionId: 'patient-1_therapist-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          status: 'connected'
        });
        await context.firestore().collection('feedbacks').doc('fb-1').set({
          id: 'fb-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '박건우 PT',
          date: '2026-11-09',
          content: '초기 피드백 내용',
          createdAt: new Date().toISOString()
        });
      });

      const therapistDb = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();

      // [공격 1] patientId 변경 시도 -> 차단
      await assertFails(
        therapistDb.collection('feedbacks').doc('fb-1').update({
          patientId: 'other-patient-2',
          content: '수정된 피드백'
        })
      );

      // [공격 2] therapistId 변경 시도 -> 차단
      await assertFails(
        therapistDb.collection('feedbacks').doc('fb-1').update({
          therapistId: 'other-therapist-2',
          content: '수정된 피드백'
        })
      );

      // [정상 동작] ID 불변 상태에서 본문 내용만 수정 -> 성공
      await assertSucceeds(
        therapistDb.collection('feedbacks').doc('fb-1').update({
          content: '골반 안정성이 10% 개선되었습니다. 아주 훌륭합니다.'
        })
      );
    });
  });

  // =========================================================================
  // 6. prescriptions 수정 시 patientId 및 therapistId 일치 검증 (Requirement 5)
  // =========================================================================
  describe('6. prescriptions 수정 시 patientId 및 therapistId 일치 검증', () => {
    it('처방 프로그램 수정 시 patientId 및 therapistId는 기존 값과 일치해야 한다', async () => {
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('connections').doc('patient-1_therapist-1').set({
          connectionId: 'patient-1_therapist-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          status: 'connected'
        });
        await context.firestore().collection('prescriptions').doc('patient-1').set({
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          assignedProgram: [{ exerciseId: 'ex-1', sets: 3, reps: 10 }],
          updatedAt: new Date().toISOString()
        });
      });

      const therapistDb = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();

      // [공격] 처방 수정 시 therapistId를 변조 시도 -> 차단
      await assertFails(
        therapistDb.collection('prescriptions').doc('patient-1').update({
          therapistId: 'imposter-therapist',
          assignedProgram: [{ exerciseId: 'ex-2', sets: 4, reps: 12 }]
        })
      );

      // [정상 동작] 동일한 치료사가 처방 프로그램 내용만 갱신 -> 성공
      await assertSucceeds(
        therapistDb.collection('prescriptions').doc('patient-1').update({
          assignedProgram: [{ exerciseId: 'ex-1', sets: 4, reps: 12 }],
          updatedAt: new Date().toISOString()
        })
      );
    });
  });

  // =========================================================================
  // 7. soapNotes 및 revisions 보안 규칙 정밀 검증 (19개 SOAP 시나리오 + 동시성)
  // =========================================================================
  describe('7. soapNotes 및 수정 이력(revisions) 보안 규칙 검증', () => {
    const setupSoapFixtures = async (options?: {
      withSecondTherapistConnected?: boolean;
      firstTherapistDisconnected?: boolean;
      existingSoapNote?: boolean;
    }) => {
      const serverTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-10T09:00:00.000Z'));
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('patient-1').set({
          uid: 'patient-1',
          name: '홍길동',
          email: 'patient1@test.local',
          role: 'patient',
          accountStatus: 'active',
          createdAt: '2026-11-01T00:00:00.000Z'
        });
        await adminDb.collection('users').doc('patient-2').set({
          uid: 'patient-2',
          name: '김영희',
          email: 'patient2@test.local',
          role: 'patient',
          accountStatus: 'active',
          createdAt: '2026-11-01T00:00:00.000Z'
        });
        await adminDb.collection('users').doc('therapist-1').set({
          uid: 'therapist-1',
          name: '박치료',
          email: 't1@test.local',
          role: 'therapist',
          accountStatus: 'active',
          isVerified: true,
          createdAt: '2026-11-01T00:00:00.000Z'
        });
        await adminDb.collection('users').doc('therapist-2').set({
          uid: 'therapist-2',
          name: '이치료',
          email: 't2@test.local',
          role: 'therapist',
          accountStatus: 'active',
          isVerified: true,
          createdAt: '2026-11-01T00:00:00.000Z'
        });

        await adminDb.collection('connections').doc('patient-1_therapist-1').set({
          connectionId: 'patient-1_therapist-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          status: options?.firstTherapistDisconnected ? 'disconnected' : 'connected'
        });

        if (options?.withSecondTherapistConnected) {
          await adminDb.collection('connections').doc('patient-1_therapist-2').set({
            connectionId: 'patient-1_therapist-2',
            patientId: 'patient-1',
            therapistId: 'therapist-2',
            status: 'connected'
          });
        }

        if (options?.existingSoapNote) {
          await adminDb.collection('soapNotes').doc('soap-1').set({
            id: 'soap-1',
            patientId: 'patient-1',
            therapistId: 'therapist-1',
            therapistName: '박치료 물리치료사',
            encounterDate: '2026-11-10',
            subjective: '기존 주관적 호소',
            objective: '기존 객관적 관찰',
            assessment: '기존 평가',
            plan: '기존 계획',
            createdAt: serverTs,
            updatedAt: serverTs,
            updatedById: 'therapist-1',
            updatedByName: '박치료 물리치료사',
            version: 1
          });
        }
      });
    };

    it('[1~2] 연결된 검증 치료사는 SOAP 노트를 생성하고 조회할 수 있다', async () => {
      await setupSoapFixtures();
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      await assertSucceeds(
        t1Db.collection('soapNotes').doc('soap-new-1').set({
          id: 'soap-new-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '박치료 물리치료사',
          encounterDate: '2026-11-15',
          subjective: '무릎 굴곡 시 통증 감소',
          objective: 'AROM 굴곡 115도',
          assessment: '관절 가동 범위 점진 호전',
          plan: '등척성 사두근 운동 유지',
          createdAt: serverTs,
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료 물리치료사',
          version: 1
        })
      );

      await assertSucceeds(
        t1Db.collection('soapNotes').where('patientId', '==', 'patient-1').get()
      );
      await assertSucceeds(t1Db.collection('soapNotes').doc('soap-new-1').get());
    });

    it('[3~4] 새 담당 치료사는 과거 치료사의 SOAP 기록을 조회할 수 있지만 수정할 수 없다', async () => {
      await setupSoapFixtures({
        firstTherapistDisconnected: true,
        withSecondTherapistConnected: true,
        existingSoapNote: true
      });
      const t2Db = testEnv.authenticatedContext('therapist-2', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      // 새 담당 치료사(therapist-2) 조회 성공
      await assertSucceeds(t2Db.collection('soapNotes').where('patientId', '==', 'patient-1').get());
      await assertSucceeds(t2Db.collection('soapNotes').doc('soap-1').get());

      // 타인 작성 기록 수정 시도(이력 포함해도) -> 차단
      const batch = t2Db.batch();
      batch.update(t2Db.collection('soapNotes').doc('soap-1'), {
        subjective: '타인이 덮어쓰기 시도',
        updatedAt: serverTs,
        updatedById: 'therapist-2',
        updatedByName: '이치료 물리치료사',
        version: 2
      });
      batch.set(t2Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: firebase.firestore.Timestamp.fromDate(new Date('2026-11-10T09:00:00.000Z')),
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-2',
        editedByName: '이치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(batch.commit());
    });

    it('[5~6, 19] 미연결 치료사, 환자 본인, 다른 환자 기록 목록 조회는 모두 차단된다', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const unconnectedTherapistDb = testEnv.authenticatedContext('therapist-2', { role: 'therapist' }).firestore();
      const patientDb = testEnv.authenticatedContext('patient-1').firestore();
      const connectedT1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();

      // 미연결 치료사 조회 실패
      await assertFails(unconnectedTherapistDb.collection('soapNotes').doc('soap-1').get());
      await assertFails(unconnectedTherapistDb.collection('soapNotes').where('patientId', '==', 'patient-1').get());

      // 환자 본인 조회 실패
      await assertFails(patientDb.collection('soapNotes').doc('soap-1').get());
      await assertFails(patientDb.collection('soapNotes').where('patientId', '==', 'patient-1').get());

      // 연결된 치료사라도 다른 환자(patient-2) 목록 조회 실패
      await assertFails(connectedT1Db.collection('soapNotes').where('patientId', '==', 'patient-2').get());
    });

    it('[7~8] 연결 해제 후에는 조회 및 수정이 모두 차단된다', async () => {
      await setupSoapFixtures({ firstTherapistDisconnected: true, existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      await assertFails(t1Db.collection('soapNotes').doc('soap-1').get());
      await assertFails(t1Db.collection('soapNotes').where('patientId', '==', 'patient-1').get());
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-1').update({
          subjective: '해제 후 수정 시도',
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료 물리치료사',
          version: 2
        })
      );
    });

    it('[9~12, 18] 작성자 위조 및 patientId/therapistId/createdAt 변조, 삭제는 차단된다', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const prevUpdatedAt = firebase.firestore.Timestamp.fromDate(new Date('2026-11-10T09:00:00.000Z'));

      // [9] 생성 시 타인 therapistId 위조 실패
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-forged').set({
          id: 'soap-forged',
          patientId: 'patient-1',
          therapistId: 'therapist-2',
          therapistName: '박치료',
          encounterDate: '2026-11-15',
          subjective: 'S',
          objective: 'O',
          assessment: 'A',
          plan: 'P',
          createdAt: serverTs,
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료',
          version: 1
        })
      );

      // [10] 수정 시 patientId 변경 실패
      const batchPatientId = t1Db.batch();
      batchPatientId.update(t1Db.collection('soapNotes').doc('soap-1'), {
        patientId: 'patient-2',
        subjective: '변경',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2
      });
      batchPatientId.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(batchPatientId.commit());

      // [11] 수정 시 therapistId 변경 실패
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-1').update({
          therapistId: 'therapist-2',
          subjective: '변경',
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료 물리치료사',
          version: 2
        })
      );

      // [12] 수정 시 createdAt 변경 실패
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-1').update({
          createdAt: serverTs,
          subjective: '변경',
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료 물리치료사',
          version: 2
        })
      );

      // [18] 삭제 실패
      await assertFails(t1Db.collection('soapNotes').doc('soap-1').delete());
    });

    it('[13~17] 수정 이력 누락/위조/단독수정·삭제·동시수정 충돌은 차단되고 원자적 수정+이력 저장만 성공한다', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const prevUpdatedAt = firebase.firestore.Timestamp.fromDate(new Date('2026-11-10T09:00:00.000Z'));

      // [13-a] 수정 이력 없는 본문 단독 수정 실패
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-1').update({
          subjective: '이력 없이 수정 시도',
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료 물리치료사',
          version: 2
        })
      );

      // [13-b] 본문 수정 없이 독립적으로 허위 수정 이력만 생성 시도 실패
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1').set({
          noteId: 'soap-1',
          patientId: 'patient-1',
          version: 1,
          previousEncounterDate: '2026-11-10',
          previousSubjective: '기존 주관적 호소',
          previousObjective: '기존 객관적 관찰',
          previousAssessment: '기존 평가',
          previousPlan: '기존 계획',
          previousUpdatedAt: prevUpdatedAt,
          previousUpdatedById: 'therapist-1',
          previousUpdatedByName: '박치료 물리치료사',
          editedById: 'therapist-1',
          editedByName: '박치료 물리치료사',
          editedAt: serverTs
        })
      );

      // [15] 수정 이력 내용 위조(실제 원본과 불일치) 실패
      const forgedBatch = t1Db.batch();
      forgedBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '수정된 주관적 호소',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2
      });
      forgedBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '허위 조작된 이전 내용',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(forgedBatch.commit());

      // [14] 정상적인 원자적 수정 + v1 수정 이력 저장 성공
      const validBatch = t1Db.batch();
      validBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '수정된 주관적 호소 v2',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2
      });
      validBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertSucceeds(validBatch.commit());

      // [16] 생성된 수정 이력 직접 수정 및 삭제 실패
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1').update({
          previousSubjective: '사후 변조 시도'
        })
      );
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1').delete()
      );

      // [17] 동시 수정 충돌 (이미 v2가 된 문서를 stale v1 기준으로 재수정 시도 -> 실패)
      const staleConcurrentBatch = t1Db.batch();
      staleConcurrentBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '구버전 기준 동시 덮어쓰기 시도',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2
      });
      staleConcurrentBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(staleConcurrentBatch.commit());
    });

    it('[추가 검증 1~8] 전체/혼합 쿼리, 버전 불일치, 수정자 UID 위조 거부 및 연결·해제 시 수정 이력(revisions) 조회 제어', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const prevUpdatedAt = firebase.firestore.Timestamp.fromDate(new Date('2026-11-10T09:00:00.000Z'));

      // [추가-2] 조건 없는 전체 목록 쿼리 및 다른 환자가 포함될 수 있는 in 쿼리 거부
      await assertFails(t1Db.collection('soapNotes').get());
      await assertFails(
        t1Db.collection('soapNotes').where('patientId', 'in', ['patient-1', 'patient-2']).get()
      );

      // [추가-4] 수정 이력과 원본의 버전 불일치 거부 (v1 문서에 revisions/v2 생성 시도)
      const wrongRevDocIdBatch = t1Db.batch();
      wrongRevDocIdBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '버전 불일치 수정 시도',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2
      });
      wrongRevDocIdBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v2'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 2,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(wrongRevDocIdBatch.commit());

      // [추가-6] 수정 시 updatedById / editedById 작성자 UID 위조 거부
      const spoofedEditorBatch = t1Db.batch();
      spoofedEditorBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '수정자 위조 시도',
        updatedAt: serverTs,
        updatedById: 'therapist-2',
        updatedByName: '이치료 물리치료사',
        version: 2
      });
      spoofedEditorBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-2',
        editedByName: '이치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(spoofedEditorBatch.commit());

      // 정상 수정으로 v1 이력 생성 후, 연결 상태에서 revisions 전체 list 쿼리(getSoapNoteRevisions 패턴) 성공 확인
      const validBatch = t1Db.batch();
      validBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '정상 수정 내용',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2
      });
      validBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertSucceeds(validBatch.commit());

      await assertSucceeds(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').get());
      await assertSucceeds(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1').get());

      // [추가-8] 연결 해제 후 수정 이력(revisions) 단일 조회 및 목록 조회 모두 차단
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context.firestore().collection('connections').doc('patient-1_therapist-1').update({
          status: 'disconnected'
        });
      });

      await assertFails(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1').get());
      await assertFails(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').get());

      // 환자 본인도 수정 이력 조회 불가
      const patientDb = testEnv.authenticatedContext('patient-1').firestore();
      await assertFails(patientDb.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1').get());
      await assertFails(patientDb.collection('soapNotes').doc('soap-1').collection('revisions').get());
    });

    it('[경계값 1~2] 임상 내용과 날짜가 전혀 바뀌지 않은 No-op 업데이트 및 허용되지 않은 임의 필드 추가는 차단된다', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const prevUpdatedAt = firebase.firestore.Timestamp.fromDate(new Date('2026-11-10T09:00:00.000Z'));

      // [경계값 1] S/O/A/P와 encounterDate가 기존 문서와 완전히 동일한 No-op 업데이트 (이력 문서를 함께 생성해도 차단)
      const noopBatch = t1Db.batch();
      noopBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        encounterDate: '2026-11-10',
        subjective: '기존 주관적 호소',
        objective: '기존 객관적 관찰',
        assessment: '기존 평가',
        plan: '기존 계획',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2
      });
      noopBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(noopBatch.commit());

      // [경계값 2-a] 생성 시 허용되지 않은 임의 필드(extraField) 추가 시도 -> 차단
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-extra-create').set({
          id: 'soap-extra-create',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '박치료 물리치료사',
          encounterDate: '2026-11-15',
          subjective: 'S',
          objective: 'O',
          assessment: 'A',
          plan: 'P',
          createdAt: serverTs,
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료 물리치료사',
          version: 1,
          unauthorizedFlag: true
        })
      );

      // [경계값 2-b] 수정 시 허용되지 않은 임의 필드 추가 시도 -> 차단
      const extraFieldUpdateBatch = t1Db.batch();
      extraFieldUpdateBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '수정된 주관적 호소',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '박치료 물리치료사',
        version: 2,
        injectedField: 'malicious'
      });
      extraFieldUpdateBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '박치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(extraFieldUpdateBatch.commit());
    });

    it('[경계값 3~4] pending 및 rejected 연결 상태에서는 SOAP 조회·작성·수정 및 수정 이력 조회가 모두 차단된다', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      for (const nonConnectedStatus of ['pending', 'rejected'] as const) {
        await testEnv.withSecurityRulesDisabled(async (context: any) => {
          await context.firestore().collection('connections').doc('patient-1_therapist-1').set({
            connectionId: 'patient-1_therapist-1',
            patientId: 'patient-1',
            therapistId: 'therapist-1',
            status: nonConnectedStatus
          });
        });

        // 단건 조회 및 목록 조회 차단
        await assertFails(t1Db.collection('soapNotes').doc('soap-1').get());
        await assertFails(t1Db.collection('soapNotes').where('patientId', '==', 'patient-1').get());

        // 신규 생성 차단
        await assertFails(
          t1Db.collection('soapNotes').doc(`soap-${nonConnectedStatus}`).set({
            id: `soap-${nonConnectedStatus}`,
            patientId: 'patient-1',
            therapistId: 'therapist-1',
            therapistName: '박치료 물리치료사',
            encounterDate: '2026-11-15',
            subjective: 'S',
            objective: 'O',
            assessment: 'A',
            plan: 'P',
            createdAt: serverTs,
            updatedAt: serverTs,
            updatedById: 'therapist-1',
            updatedByName: '박치료 물리치료사',
            version: 1
          })
        );

        // 기존 노트 수정 및 수정 이력 조회 차단
        await assertFails(
          t1Db.collection('soapNotes').doc('soap-1').update({
            subjective: `${nonConnectedStatus} 상태 수정 시도`,
            updatedAt: serverTs,
            updatedById: 'therapist-1',
            updatedByName: '박치료 물리치료사',
            version: 2
          })
        );
        await assertFails(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').get());
      }
    });

    it('[경계값 5] 달력에 존재하지 않는 날짜(평년 2월 29일, 2월 30일, 4월 31일 등)는 차단되고 윤년 2월 29일은 허용된다', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      const invalidCalendarDates = [
        '2026-02-29', // 평년 2월 29일
        '1900-02-29', // 100년 주기 평년 2월 29일
        '2026-02-30', // 2월 30일
        '2026-02-31', // 2월 31일
        '2026-04-31', // 4월 31일 (30일까지인 달)
        '2026-06-31', // 6월 31일
        '2026-09-31', // 9월 31일
        '2026-11-31'  // 11월 31일
      ];

      for (let i = 0; i < invalidCalendarDates.length; i++) {
        const badDate = invalidCalendarDates[i];
        await assertFails(
          t1Db.collection('soapNotes').doc(`soap-baddate-${i}`).set({
            id: `soap-baddate-${i}`,
            patientId: 'patient-1',
            therapistId: 'therapist-1',
            therapistName: '박치료 물리치료사',
            encounterDate: badDate,
            subjective: 'S',
            objective: 'O',
            assessment: 'A',
            plan: 'P',
            createdAt: serverTs,
            updatedAt: serverTs,
            updatedById: 'therapist-1',
            updatedByName: '박치료 물리치료사',
            version: 1
          })
        );
      }

      // 윤년(2024년, 2000년) 2월 29일은 정상 허용
      for (const leapDate of ['2024-02-29', '2000-02-29']) {
        const docId = `soap-leap-${leapDate}`;
        await assertSucceeds(
          t1Db.collection('soapNotes').doc(docId).set({
            id: docId,
            patientId: 'patient-1',
            therapistId: 'therapist-1',
            therapistName: '박치료 물리치료사',
            encounterDate: leapDate,
            subjective: '윤년 정상 기록',
            objective: 'O',
            assessment: 'A',
            plan: 'P',
            createdAt: serverTs,
            updatedAt: serverTs,
            updatedById: 'therapist-1',
            updatedByName: '박치료 물리치료사',
            version: 1
          })
        );
      }
    });

    it('[경계값 6] 치료사 표시명(therapistName / updatedByName / editedByName) 위조는 차단되고 프로필에 이름이 없는 계정은 호환된다', async () => {
      await setupSoapFixtures({ existingSoapNote: true });
      const t1Db = testEnv.authenticatedContext('therapist-1', { role: 'therapist' }).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const prevUpdatedAt = firebase.firestore.Timestamp.fromDate(new Date('2026-11-10T09:00:00.000Z'));

      // [6-a] 생성 시 본인 UID('therapist-1', 프로필명 '박치료')로 타 치료사 이름('이치료 물리치료사') 사칭 시도 -> 차단
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-spoof-name-1').set({
          id: 'soap-spoof-name-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '이치료 물리치료사',
          encounterDate: '2026-11-15',
          subjective: 'S',
          objective: 'O',
          assessment: 'A',
          plan: 'P',
          createdAt: serverTs,
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '이치료 물리치료사',
          version: 1
        })
      );

      // [6-b] 생성 시 therapistName과 updatedByName을 서로 다르게 입력 시도 -> 차단
      await assertFails(
        t1Db.collection('soapNotes').doc('soap-spoof-name-2').set({
          id: 'soap-spoof-name-2',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '박치료 물리치료사',
          encounterDate: '2026-11-15',
          subjective: 'S',
          objective: 'O',
          assessment: 'A',
          plan: 'P',
          createdAt: serverTs,
          updatedAt: serverTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료',
          version: 1
        })
      );

      // [6-c] 수정 시 updatedByName / editedByName에 타 치료사 이름 사칭 시도 -> 차단
      const spoofedUpdateNameBatch = t1Db.batch();
      spoofedUpdateNameBatch.update(t1Db.collection('soapNotes').doc('soap-1'), {
        subjective: '이름 사칭 수정 시도',
        updatedAt: serverTs,
        updatedById: 'therapist-1',
        updatedByName: '이치료 물리치료사',
        version: 2
      });
      spoofedUpdateNameBatch.set(t1Db.collection('soapNotes').doc('soap-1').collection('revisions').doc('v1'), {
        noteId: 'soap-1',
        patientId: 'patient-1',
        version: 1,
        previousEncounterDate: '2026-11-10',
        previousSubjective: '기존 주관적 호소',
        previousObjective: '기존 객관적 관찰',
        previousAssessment: '기존 평가',
        previousPlan: '기존 계획',
        previousUpdatedAt: prevUpdatedAt,
        previousUpdatedById: 'therapist-1',
        previousUpdatedByName: '박치료 물리치료사',
        editedById: 'therapist-1',
        editedByName: '이치료 물리치료사',
        editedAt: serverTs
      });
      await assertFails(spoofedUpdateNameBatch.commit());

      // [6-d] 기존 사용자 프로필(users/{uid})에 name 필드가 비어 있는 레거시 치료사 계정도 정상 기능이 손상되지 않고 생성 가능
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('therapist-legacy').set({
          uid: 'therapist-legacy',
          role: 'therapist',
          accountStatus: 'active'
        });
        await adminDb.collection('connections').doc('patient-1_therapist-legacy').set({
          connectionId: 'patient-1_therapist-legacy',
          patientId: 'patient-1',
          therapistId: 'therapist-legacy',
          status: 'connected'
        });
      });

      const legacyTherapistDb = testEnv
        .authenticatedContext('therapist-legacy', { role: 'therapist' })
        .firestore();

      await assertSucceeds(
        legacyTherapistDb.collection('soapNotes').doc('soap-legacy-ok').set({
          id: 'soap-legacy-ok',
          patientId: 'patient-1',
          therapistId: 'therapist-legacy',
          therapistName: '담당 물리치료사',
          encounterDate: '2026-11-15',
          subjective: '레거시 프로필 정상 작성',
          objective: 'O',
          assessment: 'A',
          plan: 'P',
          createdAt: serverTs,
          updatedAt: serverTs,
          updatedById: 'therapist-legacy',
          updatedByName: '담당 물리치료사',
          version: 1
        })
      );
    });

    it('[경계값 7] Custom Claim 없이 verifiedTherapists 문서로 인증된 치료사의 runTransaction 기반 SOAP 수정·이력 동시 생성, 기존 이력 덮어쓰기 차단, 비원작성자 수정 차단이 정상 동작한다', async () => {
      await setupSoapFixtures();
      const initialTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-12T09:00:00.000Z'));

      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        const adminDb = context.firestore();
        // Custom Claim 없이 verifiedTherapists 문서로만 인증된 치료사 2명 설정
        await adminDb.collection('verifiedTherapists').doc('therapist-1').set({
          uid: 'therapist-1',
          name: '박치료',
          licenseNumber: 'PT-2026-101',
          verifiedAt: '2026-11-01T00:00:00.000Z'
        });
        await adminDb.collection('verifiedTherapists').doc('therapist-2').set({
          uid: 'therapist-2',
          name: '이치료',
          licenseNumber: 'PT-2026-102',
          verifiedAt: '2026-11-01T00:00:00.000Z'
        });
        await adminDb.collection('connections').doc('patient-1_therapist-2').set({
          connectionId: 'patient-1_therapist-2',
          patientId: 'patient-1',
          therapistId: 'therapist-2',
          status: 'connected'
        });
        await adminDb.collection('soapNotes').doc('soap-tx-1').set({
          id: 'soap-tx-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '박치료 물리치료사',
          encounterDate: '2026-11-12',
          subjective: '트랜잭션 수정 전 주관적 호소',
          objective: '트랜잭션 수정 전 객관적 소견',
          assessment: '트랜잭션 수정 전 평가',
          plan: '트랜잭션 수정 전 계획',
          createdAt: initialTs,
          updatedAt: initialTs,
          updatedById: 'therapist-1',
          updatedByName: '박치료 물리치료사',
          version: 1
        });
      });

      // Custom Claim 객체({})를 비운 상태로 verifiedTherapists 문서 기반 인증 컨텍스트 생성
      const t1NoClaimDb = testEnv.authenticatedContext('therapist-1', {}).firestore();
      const t2NoClaimDb = testEnv.authenticatedContext('therapist-2', {}).firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      // [7-a] 원작성자가 아닌 다른 치료사(therapist-2, verifiedTherapists 등록 및 환자 연결 상태)의 runTransaction 수정 시도 -> 차단
      await assertFails(
        t2NoClaimDb.runTransaction(async (transaction: any) => {
          const noteRef = t2NoClaimDb.collection('soapNotes').doc('soap-tx-1');
          const snap = await transaction.get(noteRef);
          const current = snap.data();
          const revRef = noteRef.collection('revisions').doc(`v${current.version}`);

          transaction.update(noteRef, {
            subjective: '타 치료사 트랜잭션 수정 시도',
            updatedAt: serverTs,
            updatedById: 'therapist-2',
            updatedByName: '이치료 물리치료사',
            version: current.version + 1
          });
          transaction.set(revRef, {
            noteId: 'soap-tx-1',
            patientId: current.patientId,
            version: current.version,
            previousEncounterDate: current.encounterDate,
            previousSubjective: current.subjective,
            previousObjective: current.objective,
            previousAssessment: current.assessment,
            previousPlan: current.plan,
            previousUpdatedAt: current.updatedAt,
            previousUpdatedById: current.updatedById,
            previousUpdatedByName: current.updatedByName,
            editedById: 'therapist-2',
            editedByName: '이치료 물리치료사',
            editedAt: serverTs
          });
        })
      );

      // [7-b] 원작성자(therapist-1, Custom Claim 없음, verifiedTherapists 문서 인증)의 실제 서비스와 동일한 runTransaction(get(noteRef) -> update + set) 성공
      await assertSucceeds(
        t1NoClaimDb.runTransaction(async (transaction: any) => {
          const noteRef = t1NoClaimDb.collection('soapNotes').doc('soap-tx-1');
          const snap = await transaction.get(noteRef);
          const current = snap.data();
          const revRef = noteRef.collection('revisions').doc(`v${current.version}`);

          transaction.update(noteRef, {
            encounterDate: current.encounterDate,
            subjective: '트랜잭션 수정 후 주관적 호소 v2',
            objective: current.objective,
            assessment: current.assessment,
            plan: current.plan,
            updatedAt: serverTs,
            updatedById: 'therapist-1',
            updatedByName: '박치료 물리치료사',
            version: current.version + 1
          });
          transaction.set(revRef, {
            noteId: 'soap-tx-1',
            patientId: current.patientId,
            version: current.version,
            previousEncounterDate: current.encounterDate,
            previousSubjective: current.subjective,
            previousObjective: current.objective,
            previousAssessment: current.assessment,
            previousPlan: current.plan,
            previousUpdatedAt: current.updatedAt,
            previousUpdatedById: current.updatedById,
            previousUpdatedByName: current.updatedByName,
            editedById: 'therapist-1',
            editedByName: '박치료 물리치료사',
            editedAt: serverTs
          });
        })
      );

      // [7-c] 이미 생성된 기존 수정 이력(revisions/v1)을 덮어쓰려는 트랜잭션 시도 -> 차단
      await assertFails(
        t1NoClaimDb.runTransaction(async (transaction: any) => {
          const noteRef = t1NoClaimDb.collection('soapNotes').doc('soap-tx-1');
          const snap = await transaction.get(noteRef);
          const current = snap.data();
          const existingRevV1Ref = noteRef.collection('revisions').doc('v1');

          transaction.update(noteRef, {
            subjective: 'v1 이력 덮어쓰기 시도',
            updatedAt: serverTs,
            updatedById: 'therapist-1',
            updatedByName: '박치료 물리치료사',
            version: current.version + 1
          });
          transaction.set(existingRevV1Ref, {
            noteId: 'soap-tx-1',
            patientId: current.patientId,
            version: 1,
            previousEncounterDate: current.encounterDate,
            previousSubjective: '변조된 v1 이력',
            previousObjective: current.objective,
            previousAssessment: current.assessment,
            previousPlan: current.plan,
            previousUpdatedAt: current.updatedAt,
            previousUpdatedById: current.updatedById,
            previousUpdatedByName: current.updatedByName,
            editedById: 'therapist-1',
            editedByName: '박치료 물리치료사',
            editedAt: serverTs
          });
        })
      );
    });
  });

  // =========================================================================
  // 8. users/{userId}/feedbackReadStates/{feedbackId} 피드백 읽음 상태 보안 규칙 검증 (Stage 3-A)
  // =========================================================================
  describe('8. users/{userId}/feedbackReadStates/{feedbackId} 피드백 읽음 상태 보안 규칙 검증', () => {
    const setupFeedbackReadStateFixtures = async () => {
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        const adminDb = context.firestore();
        await adminDb.collection('users').doc('patient-1').set({
          uid: 'patient-1',
          name: '김환자',
          role: 'patient',
          accountStatus: 'active'
        });
        await adminDb.collection('users').doc('patient-2').set({
          uid: 'patient-2',
          name: '이환자',
          role: 'patient',
          accountStatus: 'active'
        });
        await adminDb.collection('users').doc('therapist-1').set({
          uid: 'therapist-1',
          name: '박치료',
          role: 'therapist',
          accountStatus: 'active'
        });
        await adminDb.collection('verifiedTherapists').doc('therapist-1').set({
          uid: 'therapist-1',
          name: '박치료',
          licenseNumber: 'PT-2026-301',
          verifiedAt: '2026-11-01T00:00:00.000Z'
        });
        await adminDb.collection('connections').doc('patient-1_therapist-1').set({
          connectionId: 'patient-1_therapist-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          status: 'connected'
        });
        await adminDb.collection('feedbacks').doc('fb-p1-1').set({
          id: 'fb-p1-1',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '박치료 물리치료사',
          date: '2026-11-19',
          content: '브리지 운동 수행이 안정적입니다.',
          recommendation: '현재 강도를 유지하세요.',
          workoutLogId: 'log-p1-1',
          createdAt: '2026-11-19T09:00:00.000Z',
          notificationEligible: true
        });
        await adminDb.collection('feedbacks').doc('fb-p1-2').set({
          id: 'fb-p1-2',
          patientId: 'patient-1',
          therapistId: 'therapist-1',
          therapistName: '박치료 물리치료사',
          date: '2026-11-19',
          content: '호흡 조절에 조금 더 신경 써주세요.',
          recommendation: '',
          createdAt: '2026-11-19T10:00:00.000Z',
          notificationEligible: true
        });
        await adminDb.collection('feedbacks').doc('fb-p2-1').set({
          id: 'fb-p2-1',
          patientId: 'patient-2',
          therapistId: 'therapist-1',
          therapistName: '박치료 물리치료사',
          date: '2026-11-19',
          content: '타 환자 대상 피드백입니다.',
          recommendation: '',
          createdAt: '2026-11-19T11:00:00.000Z',
          notificationEligible: true
        });
      });
    };

    it('[1] 환자 본인은 본인 대상 실존 피드백에 대해 feedbackReadStates 문서를 생성할 수 있다', async () => {
      await setupFeedbackReadStateFixtures();
      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const readRef = patient1Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates')
        .doc('fb-p1-1');

      await assertSucceeds(
        readRef.set({
          feedbackId: 'fb-p1-1',
          readAt: serverTs
        })
      );

      const snap = await assertSucceeds(readRef.get());
      expect(snap.exists).toBe(true);
      expect(snap.data()?.feedbackId).toBe('fb-p1-1');
      expect(typeof snap.data()?.readAt?.toMillis).toBe('function');
    });

    it('[2] 환자 본인은 자신의 feedbackReadStates 단일 조회(get) 및 목록 조회(list)를 수행할 수 있다', async () => {
      await setupFeedbackReadStateFixtures();
      const seededTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-19T09:30:00.000Z'));

      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        const adminDb = context.firestore();
        await adminDb
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .set({ feedbackId: 'fb-p1-1', readAt: seededTs });
        await adminDb
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-2')
          .set({ feedbackId: 'fb-p1-2', readAt: seededTs });
      });

      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const colRef = patient1Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates');

      const singleSnap = await assertSucceeds(colRef.doc('fb-p1-1').get());
      expect(singleSnap.exists).toBe(true);
      expect(singleSnap.data()?.feedbackId).toBe('fb-p1-1');

      const listSnap = await assertSucceeds(colRef.get());
      expect(listSnap.size).toBe(2);
    });

    it('[3] 다른 환자는 타 환자의 feedbackReadStates 조회(get/list) 및 생성(create)을 할 수 없다', async () => {
      await setupFeedbackReadStateFixtures();
      const seededTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-19T09:30:00.000Z'));

      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context
          .firestore()
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .set({ feedbackId: 'fb-p1-1', readAt: seededTs });
      });

      const patient2Db = testEnv.authenticatedContext('patient-2').firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const p1ReadCol = patient2Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates');

      // 다른 환자의 단일 조회 차단
      await assertFails(p1ReadCol.doc('fb-p1-1').get());
      // 다른 환자의 목록 조회 차단
      await assertFails(p1ReadCol.get());
      // 다른 환자 하위 경로에 읽음 문서 생성 차단
      await assertFails(
        p1ReadCol.doc('fb-p1-2').set({
          feedbackId: 'fb-p1-2',
          readAt: serverTs
        })
      );
    });

    it('[4] 연결된 검증 물리치료사라도 환자의 feedbackReadStates를 조회(get/list)하거나 생성(create)할 수 없다', async () => {
      await setupFeedbackReadStateFixtures();
      const seededTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-19T09:30:00.000Z'));

      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context
          .firestore()
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .set({ feedbackId: 'fb-p1-1', readAt: seededTs });
      });

      const therapistWithClaimDb = testEnv
        .authenticatedContext('therapist-1', { role: 'therapist' })
        .firestore();
      const therapistVerifiedDocDb = testEnv
        .authenticatedContext('therapist-1', {})
        .firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      const colWithClaim = therapistWithClaimDb
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates');
      const colWithVerifiedDoc = therapistVerifiedDocDb
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates');

      // Custom Claim 보유 연결 치료사의 조회·생성 차단
      await assertFails(colWithClaim.doc('fb-p1-1').get());
      await assertFails(colWithClaim.get());
      await assertFails(
        colWithClaim.doc('fb-p1-2').set({
          feedbackId: 'fb-p1-2',
          readAt: serverTs
        })
      );

      // verifiedTherapists 문서 인증 연결 치료사의 조회·생성 차단
      await assertFails(colWithVerifiedDoc.doc('fb-p1-1').get());
      await assertFails(colWithVerifiedDoc.get());
      await assertFails(
        colWithVerifiedDoc.doc('fb-p1-2').set({
          feedbackId: 'fb-p1-2',
          readAt: serverTs
        })
      );
    });

    it('[5] 환자 본인이라도 이미 생성된 feedbackReadStates 문서를 수정(update/merge)할 수 없다', async () => {
      await setupFeedbackReadStateFixtures();
      const initialTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-18T10:00:00.000Z'));

      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context
          .firestore()
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .set({ feedbackId: 'fb-p1-1', readAt: initialTs });
      });

      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const readRef = patient1Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates')
        .doc('fb-p1-1');

      await assertFails(readRef.update({ readAt: serverTs }));
      await assertFails(readRef.update({ feedbackId: 'fb-p1-1' }));
      await assertFails(
        readRef.set({ feedbackId: 'fb-p1-1', readAt: serverTs }, { merge: true })
      );

      const snap = await assertSucceeds(readRef.get());
      expect(snap.data()?.readAt?.toMillis()).toBe(initialTs.toMillis());
    });

    it('[6] 환자 본인·연결 치료사·타 환자 모두 feedbackReadStates 문서를 삭제(delete)할 수 없다', async () => {
      await setupFeedbackReadStateFixtures();
      const initialTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-18T10:00:00.000Z'));

      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context
          .firestore()
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .set({ feedbackId: 'fb-p1-1', readAt: initialTs });
      });

      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const patient2Db = testEnv.authenticatedContext('patient-2').firestore();
      const therapist1Db = testEnv
        .authenticatedContext('therapist-1', { role: 'therapist' })
        .firestore();

      await assertFails(
        patient1Db
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .delete()
      );
      await assertFails(
        therapist1Db
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .delete()
      );
      await assertFails(
        patient2Db
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .delete()
      );

      const snap = await assertSucceeds(
        patient1Db
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .get()
      );
      expect(snap.exists).toBe(true);
    });

    it('[7] feedbacks 컬렉션에 존재하지 않는 피드백 ID로는 읽음 상태를 생성할 수 없다', async () => {
      await setupFeedbackReadStateFixtures();
      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      await assertFails(
        patient1Db
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-does-not-exist-999')
          .set({
            feedbackId: 'fb-does-not-exist-999',
            readAt: serverTs
          })
      );
    });

    it('[8] 다른 환자에게 속한 피드백 ID로는 자신의 읽음 상태를 생성할 수 없다', async () => {
      await setupFeedbackReadStateFixtures();
      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      // fb-p2-1은 patient-2 소유의 피드백
      await assertFails(
        patient1Db
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p2-1')
          .set({
            feedbackId: 'fb-p2-1',
            readAt: serverTs
          })
      );
    });

    it('[9] 문서 ID 불일치 및 허용되지 않은 필드(추가·누락·타입 오류) 저장은 차단된다', async () => {
      await setupFeedbackReadStateFixtures();
      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const readCol = patient1Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates');

      // (a) 문서 ID(fb-p1-1)와 payload feedbackId(fb-p1-2) 불일치 -> 차단
      await assertFails(
        readCol.doc('fb-p1-1').set({
          feedbackId: 'fb-p1-2',
          readAt: serverTs
        })
      );

      // (b) 허용되지 않은 추가 필드 포함 -> 차단
      await assertFails(
        readCol.doc('fb-p1-1').set({
          feedbackId: 'fb-p1-1',
          readAt: serverTs,
          extraField: 'not-allowed'
        })
      );

      // (c) 필수 필드 readAt 누락 -> 차단
      await assertFails(
        readCol.doc('fb-p1-1').set({
          feedbackId: 'fb-p1-1'
        })
      );

      // (d) 필수 필드 feedbackId 누락 -> 차단
      await assertFails(
        readCol.doc('fb-p1-1').set({
          readAt: serverTs
        })
      );

      // (e) feedbackId 타입 오류(숫자/빈 문자열) -> 차단
      await assertFails(
        readCol.doc('fb-p1-1').set({
          feedbackId: 12345,
          readAt: serverTs
        })
      );
      await assertFails(
        readCol.doc('fb-p1-1').set({
          feedbackId: '',
          readAt: serverTs
        })
      );
    });

    it('[10] 클라이언트가 임의로 지정한 readAt 타임스탬프(과거·미래·문자열·숫자·null)는 차단된다', async () => {
      await setupFeedbackReadStateFixtures();
      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const readRef = patient1Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates')
        .doc('fb-p1-1');

      const pastTs = firebase.firestore.Timestamp.fromDate(new Date('2020-01-01T00:00:00.000Z'));
      const futureTs = firebase.firestore.Timestamp.fromDate(new Date('2099-01-01T00:00:00.000Z'));

      await assertFails(readRef.set({ feedbackId: 'fb-p1-1', readAt: pastTs }));
      await assertFails(readRef.set({ feedbackId: 'fb-p1-1', readAt: futureTs }));
      await assertFails(
        readRef.set({ feedbackId: 'fb-p1-1', readAt: '2026-11-19T09:00:00.000Z' })
      );
      await assertFails(readRef.set({ feedbackId: 'fb-p1-1', readAt: Date.now() }));
      await assertFails(readRef.set({ feedbackId: 'fb-p1-1', readAt: null }));
    });

    it('[11] 동일 피드백 읽음 문서 재생성 시도는 차단되며 최초 읽음 시각(readAt)이 그대로 보존된다', async () => {
      await setupFeedbackReadStateFixtures();
      const patient1Db = testEnv.authenticatedContext('patient-1').firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();

      // Case A: 실제 최초 생성 직후 동일 문서 재생성(set) 시도 차단 및 최초 readAt 보존
      const createdRef = patient1Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates')
        .doc('fb-p1-1');

      await assertSucceeds(
        createdRef.set({
          feedbackId: 'fb-p1-1',
          readAt: serverTs
        })
      );
      const firstSnap = await assertSucceeds(createdRef.get());
      const firstReadAtMillis = firstSnap.data()?.readAt?.toMillis();
      expect(typeof firstReadAtMillis).toBe('number');

      await assertFails(
        createdRef.set({
          feedbackId: 'fb-p1-1',
          readAt: serverTs
        })
      );
      const afterDuplicateAttemptSnap = await assertSucceeds(createdRef.get());
      expect(afterDuplicateAttemptSnap.data()?.readAt?.toMillis()).toBe(firstReadAtMillis);

      // Case B: 과거 시점에 기록된 읽음 문서에 대한 재-set 시도 차단 및 고정 타임스탬프 불변 확인
      const originalFixedTs = firebase.firestore.Timestamp.fromDate(
        new Date('2026-11-17T08:15:00.000Z')
      );
      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context
          .firestore()
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-2')
          .set({ feedbackId: 'fb-p1-2', readAt: originalFixedTs });
      });

      const existingRef = patient1Db
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates')
        .doc('fb-p1-2');

      await assertFails(
        existingRef.set({
          feedbackId: 'fb-p1-2',
          readAt: serverTs
        })
      );
      const preservedSnap = await assertSucceeds(existingRef.get());
      expect(preservedSnap.data()?.readAt?.toMillis()).toBe(originalFixedTs.toMillis());
    });

    it('[12] 비로그인(unauthenticated) 사용자는 feedbackReadStates의 조회·생성·수정·삭제를 모두 수행할 수 없다', async () => {
      await setupFeedbackReadStateFixtures();
      const seededTs = firebase.firestore.Timestamp.fromDate(new Date('2026-11-19T09:30:00.000Z'));

      await testEnv.withSecurityRulesDisabled(async (context: any) => {
        await context
          .firestore()
          .collection('users')
          .doc('patient-1')
          .collection('feedbackReadStates')
          .doc('fb-p1-1')
          .set({ feedbackId: 'fb-p1-1', readAt: seededTs });
      });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const serverTs = firebase.firestore.FieldValue.serverTimestamp();
      const unauthCol = unauthDb
        .collection('users')
        .doc('patient-1')
        .collection('feedbackReadStates');

      await assertFails(unauthCol.doc('fb-p1-1').get());
      await assertFails(unauthCol.get());
      await assertFails(
        unauthCol.doc('fb-p1-2').set({
          feedbackId: 'fb-p1-2',
          readAt: serverTs
        })
      );
      await assertFails(unauthCol.doc('fb-p1-1').update({ readAt: serverTs }));
      await assertFails(unauthCol.doc('fb-p1-1').delete());
    });
  });

});
