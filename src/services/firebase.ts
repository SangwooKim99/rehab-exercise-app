/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Firebase SDK 초기화 및 Firestore/Auth 서비스 모듈
 */

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
  getFirestore, 
  Firestore, 
  doc, 
  getDocFromServer 
} from 'firebase/firestore';
import { getFirebaseConfig, isFirebaseConfigured } from '../config/firebaseConfig';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

export function resetFirebaseInstances(): void {
  appInstance = null;
  authInstance = null;
  dbInstance = null;
}

if (typeof window !== 'undefined') {
  window.addEventListener('rehab_firebase_config_updated', () => {
    resetFirebaseInstances();
  });
}

export function getFirebaseApp(): FirebaseApp | null {
  if (appInstance) return appInstance;
  if (!isFirebaseConfigured()) return null;

  try {
    const config = getFirebaseConfig();
    const existingApps = getApps();
    if (existingApps.length > 0) {
      appInstance = existingApps[0];
    } else {
      appInstance = initializeApp(config);
    }
    return appInstance;
  } catch (error) {
    console.error('Firebase initializeApp error:', error);
    return null;
  }
}

export function getFirebaseAuth(): Auth | null {
  if (authInstance) return authInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    authInstance = getAuth(app);
    return authInstance;
  } catch (error) {
    console.error('Firebase getAuth error:', error);
    return null;
  }
}

/**
 * Firebase Auth 초기화 완료 후 현재 인증된 사용자의 UID를 반환합니다.
 * - Firebase SDK v10.1.0+ / v13.x의 auth.authStateReady()를 사용하여
 *   IndexedDB 세션 복원이 완료된 이후의 정확한 currentUser.uid를 보장합니다.
 */
export async function waitForFirebaseAuthUid(): Promise<string | null> {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    if (typeof auth.authStateReady === 'function') {
      await auth.authStateReady();
    }
    return auth.currentUser?.uid || null;
  } catch (error) {
    console.warn('waitForFirebaseAuthUid warning:', error);
    return auth.currentUser?.uid || null;
  }
}

export function getFirebaseFirestore(): Firestore | null {
  if (dbInstance) return dbInstance;
  const app = getFirebaseApp();
  if (!app) return null;
  try {
    const config = getFirebaseConfig();
    dbInstance = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
      ? getFirestore(app, config.firestoreDatabaseId)
      : getFirestore(app);
    return dbInstance;
  } catch (error) {
    console.error('Firebase getFirestore error:', error);
    return null;
  }
}

/**
 * Firestore 에러 로깅 및 표준 에러 포맷팅 핸들러
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const auth = getFirebaseAuth();
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
    }
  };
  console.error('[Firestore Error]', JSON.stringify(errInfo, null, 2));
  throw new Error(JSON.stringify(errInfo));
}

/**
 * Firestore 실제 연결 상태 테스트
 */
export async function testFirebaseConnection(): Promise<{ success: boolean; message: string }> {
  if (!isFirebaseConfigured()) {
    return { success: false, message: 'Firebase 설정값이 아직 등록되지 않았습니다.' };
  }

  const db = getFirebaseFirestore();
  if (!db) {
    return { success: false, message: 'Firestore 인스턴스를 생성할 수 없습니다.' };
  }

  try {
    // getDocFromServer 호출을 통해 실제 Firestore 백엔드 도달 가능 여부 검증
    await getDocFromServer(doc(db, 'system_health', 'connection_test'));
    return { success: true, message: 'Firebase Firestore 백엔드와 정상 연결되었습니다.' };
  } catch (error: any) {
    // 권한 오류(PERMISSION_DENIED)는 서버와 성공적으로 통신했음을 의미하므로 연결 자체는 성공
    if (error?.code === 'permission-denied' || error?.message?.includes('permission-denied')) {
      return { success: true, message: 'Firestore 서버 통신 확인됨 (보안 규칙 활성화됨)' };
    }
    if (error?.message?.includes('the client is offline') || error?.code === 'unavailable') {
      return { success: false, message: 'Firestore 서버에 연결할 수 없습니다. 네트워크 및 Firebase 설정을 확인해주세요.' };
    }
    return { success: false, message: `연결 테스트 중 오류 발생: ${error?.message || String(error)}` };
  }
}
