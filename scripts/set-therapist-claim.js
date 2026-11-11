/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * [Firebase Admin SDK - 물리치료사 자격 검증 및 Custom Claims 부여 도구]
 * 
 * 신규 물리치료사가 회원가입할 때 임의로 therapist 역할을 탈취(Role Escalation)하는 것을
 * 방지하기 위해, 서버 관리자 권한으로 검증된 물리치료사에게만 Custom Claims 및
 * verifiedTherapists 화이트리스트 문서를 생성합니다.
 * 
 * 사용법:
 * 1. 서비스 계정 키 파일(serviceAccountKey.json)을 프로젝트 루트에 배치하거나
 *    GOOGLE_APPLICATION_CREDENTIALS 환경 변수를 지정합니다.
 * 2. 실행:
 *    node scripts/set-therapist-claim.js <THERAPIST_UID> [LICENSE_NUMBER] [CLINIC_NAME]
 * 
 * 예시:
 *    node scripts/set-therapist-claim.js k3m9P1x... PT-2026-34821 "바른재활의학과의원"
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

const uid = process.argv[2];
const licenseNumber = process.argv[3] || 'PT-2026-VERIFIED';
const clinic = process.argv[4] || '재활의학센터';

if (!uid) {
  console.error('\n❌ 사용법: node scripts/set-therapist-claim.js <THERAPIST_UID> [LICENSE_NUMBER] [CLINIC_NAME]');
  console.error('예시: node scripts/set-therapist-claim.js abc123uid PT-2026-001 "서울재활병원"\n');
  process.exit(1);
}

// 서비스 계정 키 탐색
const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
let app;

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  app = initializeApp({
    credential: cert(serviceAccount),
    projectId: serviceAccount.project_id || 'rehab-exercise-6484a'
  });
} else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  app = initializeApp({
    projectId: 'rehab-exercise-6484a'
  });
} else {
  console.log('⚠️ serviceAccountKey.json이 감지되지 않았습니다. 기본 프로젝트 ID(rehab-exercise-6484a)로 초기화를 시도합니다.');
  app = initializeApp({
    projectId: 'rehab-exercise-6484a'
  });
}

const auth = getAuth(app);
const db = getFirestore(app);

async function verifyAndGrantTherapistRole() {
  console.log(`\n======================================================`);
  console.log(`🩺 물리치료사 전문 자격 검증 및 Custom Claim 부여 시작`);
  console.log(`- 대상 UID: ${uid}`);
  console.log(`- 면허 번호: ${licenseNumber}`);
  console.log(`- 소속 기관: ${clinic}`);
  console.log(`======================================================\n`);

  try {
    // 1. Firebase Auth 사용자 존재 확인
    const user = await auth.getUser(uid);
    console.log(`✅ [1/3] 사용자 확인 완료: ${user.email || user.uid}`);

    // 2. Firebase Auth Custom Claims 부여 (request.auth.token.role == 'therapist')
    await auth.setCustomUserClaims(uid, {
      role: 'therapist',
      therapist: true,
      verifiedAt: new Date().toISOString()
    });
    console.log(`✅ [2/3] Firebase Auth Custom Claims 부여 성공: { role: 'therapist', therapist: true }`);

    // 3. Firestore verifiedTherapists/{uid} 화이트리스트 등록
    // (클라이언트는 수정 불가, 오직 Admin SDK만 등록 가능)
    const verifiedRef = db.collection('verifiedTherapists').doc(uid);
    await verifiedRef.set({
      uid,
      name: user.displayName || '물리치료사',
      email: user.email || '',
      licenseNumber,
      clinic,
      verifiedAt: new Date().toISOString()
    });

    // 4. users/{uid} 문서의 상태를 'verified'로 승격
    const userRef = db.collection('users').doc(uid);
    const userDoc = await userRef.get();
    if (userDoc.exists) {
      await userRef.update({
        isVerified: true,
        therapistVerification: 'verified',
        licenseCode: licenseNumber,
        clinic,
        updatedAt: new Date().toISOString()
      });
      console.log(`✅ [3/3] users/${uid} 프로필 isVerified: true 및 verifiedTherapists 등록 완료`);
    } else {
      console.log(`ℹ️ [3/3] verifiedTherapists 등록 완료 (users 프로필은 로그인 시 생성됩니다)`);
    }

    console.log(`\n🎉 물리치료사 자격 검증 완료!`);
    console.log(`해당 사용자는 이제 Firestore Security Rules에서 'isTrustedTherapist()'를 통과하며,`);
    console.log(`환자 운동 처방 및 피드백 작성, 연결 요청 승인 권한이 활성화되었습니다.\n`);
  } catch (error) {
    console.error('❌ 처리 실패:', error.message);
    process.exit(1);
  }
}

verifyAndGrantTherapistRole();
