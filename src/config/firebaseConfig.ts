/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase Configuration File
 */

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
  firestoreDatabaseId?: string;
}

export const PRODUCTION_FIREBASE_PROJECT_ID = "rehab-exercise-6484a";

// Official verified Firebase Client Configuration for project rehab-exercise-6484a
const OFFICIAL_FIREBASE_API_KEY = "AIzaSyC_D9IOq2qcXeWqhn2hutCqZ6_ul5QLVrA";

/**
 * 환경 변수에 대문자 'I' 오타(_uI5)가 주입되었거나 잘못된 값이 들어온 경우
 * 검증된 공식 apiKey(_ul5)로 자동 보정하여 auth/api-key-not-valid 오류를 방지합니다.
 */
function resolveApiKey(envKey?: string): string {
  if (!envKey) return OFFICIAL_FIREBASE_API_KEY;
  const trimmed = envKey.trim();
  // 대문자 I와 소문자 l 혼동으로 인한 오타(_uI5 -> _ul5) 자동 정제
  if (trimmed.includes('_uI5')) {
    return trimmed.replace('_uI5', '_ul5');
  }
  return trimmed || OFFICIAL_FIREBASE_API_KEY;
}

// Production Firebase Project Configuration (preserved intact)
export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: resolveApiKey(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rehab-exercise-6484a.firebaseapp.com").trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || PRODUCTION_FIREBASE_PROJECT_ID).trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rehab-exercise-6484a.firebasestorage.app").trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "871994961313").trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || "1:871994961313:web:f2c29725a0fc4df5692fe0").trim()
};

const LOCAL_STORAGE_FIREBASE_KEY = 'rehab_user_firebase_config_v1';

/**
 * 현재 선택된 Firebase 환경 모드 확인
 * - VITE_FIREBASE_ENV="test"를 명시적으로 설정한 경우에만 'test' 모드로 동작
 */
export function getFirebaseEnvironmentMode(): 'production' | 'test' {
  const rawMode = (import.meta.env.VITE_FIREBASE_ENV || '').trim().toLowerCase();
  return rawMode === 'test' ? 'test' : 'production';
}

/**
 * 테스트 모드(VITE_FIREBASE_ENV="test")에서 사용할 분리된 테스트 Firebase 프로젝트 설정 조회
 * - 운영 프로젝트(rehab-exercise-6484a)의 기본값으로 절대 폴백하지 않음
 */
export function getTestFirebaseConfigFromEnv(): FirebaseClientConfig {
  const testProjectId = (
    import.meta.env.VITE_FIREBASE_TEST_PROJECT_ID ||
    (import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID.trim() !== PRODUCTION_FIREBASE_PROJECT_ID
      ? import.meta.env.VITE_FIREBASE_PROJECT_ID
      : '')
  ).trim();

  const useFallbackEnvVars =
    !import.meta.env.VITE_FIREBASE_TEST_PROJECT_ID &&
    Boolean(testProjectId) &&
    testProjectId !== PRODUCTION_FIREBASE_PROJECT_ID;

  const apiKey = (
    import.meta.env.VITE_FIREBASE_TEST_API_KEY ||
    (useFallbackEnvVars ? import.meta.env.VITE_FIREBASE_API_KEY : '') ||
    ''
  ).trim();

  const authDomain = (
    import.meta.env.VITE_FIREBASE_TEST_AUTH_DOMAIN ||
    (useFallbackEnvVars ? import.meta.env.VITE_FIREBASE_AUTH_DOMAIN : '') ||
    (testProjectId ? `${testProjectId}.firebaseapp.com` : '')
  ).trim();

  const storageBucket = (
    import.meta.env.VITE_FIREBASE_TEST_STORAGE_BUCKET ||
    (useFallbackEnvVars ? import.meta.env.VITE_FIREBASE_STORAGE_BUCKET : '') ||
    (testProjectId ? `${testProjectId}.firebasestorage.app` : '')
  ).trim();

  const messagingSenderId = (
    import.meta.env.VITE_FIREBASE_TEST_MESSAGING_SENDER_ID ||
    (useFallbackEnvVars ? import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID : '') ||
    ''
  ).trim();

  const appId = (
    import.meta.env.VITE_FIREBASE_TEST_APP_ID ||
    (useFallbackEnvVars ? import.meta.env.VITE_FIREBASE_APP_ID : '') ||
    ''
  ).trim();

  const firestoreDatabaseId = (
    import.meta.env.VITE_FIREBASE_TEST_DATABASE_ID || '(default)'
  ).trim();

  return {
    apiKey,
    authDomain,
    projectId: testProjectId,
    storageBucket,
    messagingSenderId,
    appId,
    firestoreDatabaseId
  };
}

/**
 * 현재 활성화된 Firebase 설정을 가져옵니다.
 * - VITE_FIREBASE_ENV="test"인 경우: 오직 분리된 테스트 프로젝트 환경변수만 사용
 * - 그 외(production): 기존 로컬 저장소 또는 DEFAULT_FIREBASE_CONFIG(rehab-exercise-6484a) 유지
 */
export function getFirebaseConfig(): FirebaseClientConfig {
  if (getFirebaseEnvironmentMode() === 'test') {
    return getTestFirebaseConfigFromEnv();
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_FIREBASE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.apiKey && parsed.projectId) {
          return { ...DEFAULT_FIREBASE_CONFIG, ...parsed };
        }
      }
    } catch (e) {
      console.warn("Failed to read user firebase config from localStorage", e);
    }
  }
  return DEFAULT_FIREBASE_CONFIG;
}

/**
 * Firebase 설정 업데이트
 */
export function saveFirebaseConfig(config: Partial<FirebaseClientConfig>): void {
  if (typeof window !== 'undefined') {
    const current = getFirebaseConfig();
    const updated = { ...current, ...config };
    localStorage.setItem(LOCAL_STORAGE_FIREBASE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('rehab_firebase_config_updated'));
  }
}

/**
 * 운영 프로젝트(rehab-exercise-6484a)와 완전히 분리된 별도 테스트 Firebase 프로젝트가
 * 명시적으로 선택 및 설정되었는지 확인합니다.
 */
export function isExplicitTestProjectConfigured(): boolean {
  if (getFirebaseEnvironmentMode() !== 'test') {
    return false;
  }
  const config = getTestFirebaseConfigFromEnv();
  return Boolean(
    config.apiKey &&
    config.apiKey.length > 5 &&
    config.projectId &&
    config.projectId !== PRODUCTION_FIREBASE_PROJECT_ID &&
    config.appId
  );
}

/**
 * 유효한 Firebase 설정이 입력되어 있는지 확인합니다.
 * - 테스트 모드(VITE_FIREBASE_ENV="test"): 운영 프로젝트가 아닌 유효한 테스트 프로젝트가 설정된 경우에만 true
 * - 운영 모드: 기존 운영 프로젝트(rehab-exercise-6484a) 또는 유효한 설정이 있는 경우 true
 */
export function isFirebaseConfigured(): boolean {
  if (getFirebaseEnvironmentMode() === 'test') {
    return isExplicitTestProjectConfigured();
  }

  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey &&
    config.apiKey.length > 5 &&
    config.projectId &&
    config.appId
  );
}

/**
 * 개발·테스트 환경에서 Firestore 쓰기 허용 여부 확인 (안전장치)
 * - 프로덕션 빌드(import.meta.env.PROD === true && VITE_FIREBASE_ENV !== 'test')에서는 기존 운영 동작 유지
 * - 개발 서버(import.meta.env.DEV) 또는 테스트 모드에서는 반드시 VITE_FIREBASE_ENV="test" 및
 *   운영 프로젝트(rehab-exercise-6484a)와 다른 별도 테스트 프로젝트가 설정된 경우에만 쓰기 허용
 */
export function isFirestoreWriteAllowed(): boolean {
  const isDevOrTestRuntime =
    Boolean(import.meta.env.DEV) ||
    import.meta.env.MODE === 'test' ||
    getFirebaseEnvironmentMode() === 'test';

  if (!isDevOrTestRuntime) {
    const config = getFirebaseConfig();
    return Boolean(config.projectId && config.apiKey && config.appId);
  }

  return isExplicitTestProjectConfigured();
}

/**
 * 개발·테스트 환경에서 테스트 프로젝트가 명시적으로 선택되지 않은 경우
 * Firestore 쓰기(생성·수정·삭제)를 즉시 차단하는 가드 함수
 */
export function assertFirestoreWriteAllowed(operationName = 'Firestore 쓰기'): void {
  if (isFirestoreWriteAllowed()) {
    return;
  }

  const config = getFirebaseConfig();
  const currentMode = getFirebaseEnvironmentMode();
  let reason: string;

  if (currentMode !== 'test') {
    reason =
      `[안전장치 차단] 개발·테스트 환경에서는 운영 Firebase(${PRODUCTION_FIREBASE_PROJECT_ID})를 보호하기 위해 ` +
      `별도 테스트 프로젝트(VITE_FIREBASE_ENV=test)를 명시적으로 선택하지 않으면 ${operationName} 작업이 차단됩니다.`;
  } else if (!config.projectId) {
    reason =
      `[안전장치 차단] 테스트 모드(VITE_FIREBASE_ENV=test)가 선택되었으나 테스트 Firebase 프로젝트 환경변수(VITE_FIREBASE_TEST_PROJECT_ID 등)가 아직 설정되지 않아 ${operationName} 작업이 차단되었습니다.`;
  } else if (config.projectId === PRODUCTION_FIREBASE_PROJECT_ID) {
    reason =
      `[안전장치 차단] 테스트 모드(VITE_FIREBASE_ENV=test)에는 운영 프로젝트(${PRODUCTION_FIREBASE_PROJECT_ID})를 사용할 수 없습니다. 별도의 테스트 Firebase 프로젝트 ID를 설정해 주세요.`;
  } else {
    reason =
      `[안전장치 차단] 테스트 Firebase 프로젝트의 필수 설정값(VITE_FIREBASE_TEST_API_KEY, VITE_FIREBASE_TEST_APP_ID)이 누락되어 ${operationName} 작업이 차단되었습니다.`;
  }

  const err: any = new Error(reason);
  err.code = 'permission-denied';
  throw err;
}
