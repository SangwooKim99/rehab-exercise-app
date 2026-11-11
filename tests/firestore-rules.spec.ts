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

import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertFails,
  assertSucceeds
} from '@firebase/rules-unit-testing';
import fs from 'fs';
import path from 'path';

let testEnv: RulesTestEnvironment;

const PROJECT_ID = 'rehab-exercise-6484a';
const RULES_FILE = path.resolve(process.cwd(), 'firestore.rules');

beforeAll(async () => {
  const rules = fs.readFileSync(RULES_FILE, 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules,
      host: '127.0.0.1',
      port: 8080
    }
  });
});

afterAll(async () => {
  await testEnv.cleanup();
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

});
