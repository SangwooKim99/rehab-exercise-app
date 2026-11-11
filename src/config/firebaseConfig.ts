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

// User-provided Firebase Project Configuration with environment variable support
export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: resolveApiKey(import.meta.env.VITE_FIREBASE_API_KEY),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rehab-exercise-6484a.firebaseapp.com").trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || "rehab-exercise-6484a").trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rehab-exercise-6484a.firebasestorage.app").trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "871994961313").trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || "1:871994961313:web:f2c29725a0fc4df5692fe0").trim()
};

const LOCAL_STORAGE_FIREBASE_KEY = 'rehab_user_firebase_config_v1';

/**
 * 브라우저 로컬 저장소 또는 기본값에서 Firebase 설정을 가져옵니다.
 */
export function getFirebaseConfig(): FirebaseClientConfig {
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
 * 유효한 Firebase 설정이 입력되어 있는지 확인합니다.
 */
export function isFirebaseConfigured(): boolean {
  const config = getFirebaseConfig();
  return Boolean(
    config.apiKey && 
    config.apiKey.length > 5 &&
    config.projectId && 
    config.projectId === 'rehab-exercise-6484a' &&
    config.appId
  );
}
