/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  AuthUser,
  Patient,
  Exercise,
  AssignedExercise,
  WorkoutLog,
  ClinicalFeedback,
  FeedbackReadState,
  FeedbackReadErrorCode
} from './types/rehab';
import { StorageService, subscribeToRehabStore } from './services/storageService';
import { AuthService, subscribeToAuth } from './services/authService';
import {
  FirebaseService,
  getUnreadNotificationFeedbacks,
  buildFeedbackReadStateMap,
  classifyFeedbackReadError
} from './services/firebaseService';
import { getFirebaseAuth, waitForFirebaseAuthUid } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Common Components
import { Navbar } from './components/common/Navbar';
import { LoginView } from './components/common/LoginView';
import { SignUpView } from './components/common/SignUpView';
import { LogoutConfirmModal } from './components/common/LogoutConfirmModal';
import { OnboardingGuideModal } from './components/common/OnboardingGuideModal';
import { ToastContainer, ToastMessage } from './components/common/Toast';

// Patient Components
import { PatientHome } from './components/patient/PatientHome';
import { PatientExerciseList } from './components/patient/PatientExerciseList';
import { PatientExerciseDetail } from './components/patient/PatientExerciseDetail';
import { PatientHistory } from './components/patient/PatientHistory';
import { PatientProfile } from './components/patient/PatientProfile';
import { PatientBottomNav } from './components/patient/PatientBottomNav';
import { GuidedWorkoutSession } from './components/patient/GuidedWorkoutSession';
import { PatientFeedbackNotificationModal } from './components/patient/PatientFeedbackNotificationModal';

// Therapist Components
import { TherapistSidebar } from './components/therapist/TherapistSidebar';
import { TherapistDashboard } from './components/therapist/TherapistDashboard';
import { TherapistPatientManager } from './components/therapist/TherapistPatientManager';
import { TherapistPatientDetailView } from './components/therapist/TherapistPatientDetailView';
import { TherapistProgramEditor } from './components/therapist/TherapistProgramEditor';
import { TherapistSettings } from './components/therapist/TherapistSettings';

export default function App() {
  // Authentication session state (managed via sessionStorage)
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    return AuthService.getSessionUser();
  });

  // Unauthenticated screen: 'login' | 'signup' (Default to 'login' for clean 2-column first screen)
  const [authScreen, setAuthScreen] = useState<'login' | 'signup'>('login');
  const [signupInitialRole, setSignupInitialRole] = useState<'patient' | 'therapist'>('patient');

  // Therapist invite link / code state
  const [pendingInviteCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite') || params.get('code') || '';
    }
    return '';
  });

  const [pendingInviteTherapist, setPendingInviteTherapist] = useState<{
    name: string;
    clinic?: string;
    connectionCode: string;
  } | null>(null);

  useEffect(() => {
    if (!pendingInviteCode) {
      setPendingInviteTherapist(null);
      return;
    }
    let isCancelled = false;
    AuthService.findTherapistByConnectionCodeAsync(pendingInviteCode)
      .then((therapist) => {
        if (isCancelled) return;
        if (therapist && therapist.connectionCode) {
          setPendingInviteTherapist({
            name: therapist.name,
            clinic: therapist.clinic,
            connectionCode: therapist.connectionCode
          });
        } else {
          setPendingInviteTherapist(null);
        }
      })
      .catch(() => {
        if (!isCancelled) setPendingInviteTherapist(null);
      });
    return () => {
      isCancelled = true;
    };
  }, [pendingInviteCode]);

  // Navigation tab states
  // Patient tabs: 'home' | 'program' | 'history' | 'profile'
  const [patientTab, setPatientTab] = useState<string>('home');
  // Therapist tabs: 'dashboard' | 'patients' | 'prescriptions' | 'settings'
  const [therapistTab, setTherapistTab] = useState<string>('dashboard');

  // Guided Workout Flow State (Patient)
  const [isGuidedWorkoutOpen, setIsGuidedWorkoutOpen] = useState<boolean>(false);

  // Dedicated Patient Detail View State (Therapist)
  const [detailedPatientId, setDetailedPatientId] = useState<string | null>(null);
  const [patientDetailTarget, setPatientDetailTarget] = useState<{
    initialTab: 'info' | 'soap' | 'activity';
    initialActivitySubTab?: 'logs' | 'videos' | 'feedback';
    targetWorkoutLogId: string | null;
    requestKey: number;
  } | null>(null);

  // Exercise Detail Modal / Fullview State
  const [activeExerciseDetail, setActiveExerciseDetail] = useState<{
    exercise: Exercise;
    assignment?: AssignedExercise;
  } | null>(null);

  // Therapist Selection & Internal Navigation History States
  const [selectedPatientForTherapist, setSelectedPatientForTherapist] = useState<string>('');
  const [therapistNavHistory, setTherapistNavHistory] = useState<
    Array<{
      tab: string;
      detailedPatientId: string | null;
      selectedPatientId: string;
      patientDetailTarget?: {
        initialTab: 'info' | 'soap' | 'activity';
        initialActivitySubTab?: 'logs' | 'videos' | 'feedback';
        targetWorkoutLogId: string | null;
        requestKey: number;
      } | null;
    }>
  >([]);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Modals & Tools
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isOnboardingGuideOpen, setIsOnboardingGuideOpen] = useState<boolean>(false);
  const [isMobilePreview, setIsMobilePreview] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [hasUnsavedChartChanges, setHasUnsavedChartChanges] = useState<boolean>(false);
  const [pendingAppExitAction, setPendingAppExitAction] = useState<
    | { type: 'tab'; tab: string; patientId?: string }
    | { type: 'back' }
    | { type: 'logout' }
    | null
  >(null);

  // Stage 3-B-1: Patient new feedback notification data & state foundation (UI implemented in later steps)
  const [remotePatientFeedbacks, setRemotePatientFeedbacks] = useState<ClinicalFeedback[]>([]);
  const [patientFeedbackReadStates, setPatientFeedbackReadStates] = useState<FeedbackReadState[]>([]);
  const [hasLoadedFeedbackNotifications, setHasLoadedFeedbackNotifications] = useState<boolean>(false);
  const [isLoadingFeedbackNotifications, setIsLoadingFeedbackNotifications] = useState<boolean>(false);
  const [feedbackNotificationError, setFeedbackNotificationError] = useState<{
    code: FeedbackReadErrorCode;
    message: string;
  } | null>(null);
  const [isFeedbackNotificationDismissed, setIsFeedbackNotificationDismissed] = useState<boolean>(false);
  const [patientFeedbackTarget, setPatientFeedbackTarget] = useState<{
    patientId: string;
    feedbackId: string;
    workoutLogId: string | null;
    destination: 'history' | 'profile';
    requestKey: number;
  } | null>(null);
  const [remotePatientWorkoutLogs, setRemotePatientWorkoutLogs] = useState<WorkoutLog[]>([]);
  const [isNavigatingToFeedback, setIsNavigatingToFeedback] = useState<boolean>(false);
  const [navigatingFeedbackId, setNavigatingFeedbackId] = useState<string | null>(null);
  const [markingFeedbackIds, setMarkingFeedbackIds] = useState<Record<string, boolean>>({});
  const [feedbackReadSaveErrors, setFeedbackReadSaveErrors] = useState<
    Record<string, { code: FeedbackReadErrorCode; message: string }>
  >({});
  const feedbackNotificationRequestSeqRef = useRef<number>(0);
  const feedbackNavigationSeqRef = useRef<number>(0);
  const feedbackReadActionSeqRef = useRef<number>(0);
  const isNavigatingToFeedbackRef = useRef<boolean>(false);
  const markingFeedbackIdsRef = useRef<Set<string>>(new Set());

  const resetPatientFeedbackNotificationState = useCallback(() => {
    feedbackNotificationRequestSeqRef.current += 1;
    feedbackNavigationSeqRef.current += 1;
    feedbackReadActionSeqRef.current += 1;
    isNavigatingToFeedbackRef.current = false;
    markingFeedbackIdsRef.current.clear();
    setRemotePatientFeedbacks([]);
    setPatientFeedbackReadStates([]);
    setHasLoadedFeedbackNotifications(false);
    setIsLoadingFeedbackNotifications(false);
    setFeedbackNotificationError(null);
    setIsFeedbackNotificationDismissed(false);
    setPatientFeedbackTarget(null);
    setRemotePatientWorkoutLogs([]);
    setIsNavigatingToFeedback(false);
    setNavigatingFeedbackId(null);
    setMarkingFeedbackIds({});
    setFeedbackReadSaveErrors({});
  }, []);

  const handleCloseFeedbackNotificationModal = useCallback(() => {
    feedbackNavigationSeqRef.current += 1;
    isNavigatingToFeedbackRef.current = false;
    setIsNavigatingToFeedback(false);
    setNavigatingFeedbackId(null);
    setIsFeedbackNotificationDismissed(true);
  }, []);

  const feedbackReadStateMap = useMemo<Record<string, FeedbackReadState>>(
    () => buildFeedbackReadStateMap(patientFeedbackReadStates),
    [patientFeedbackReadStates]
  );

  const unreadNotificationFeedbacks = useMemo<ClinicalFeedback[]>(() => {
    if (!hasLoadedFeedbackNotifications || feedbackNotificationError) {
      return [];
    }
    return getUnreadNotificationFeedbacks(remotePatientFeedbacks, patientFeedbackReadStates);
  }, [
    hasLoadedFeedbackNotifications,
    feedbackNotificationError,
    remotePatientFeedbacks,
    patientFeedbackReadStates
  ]);

  const shouldShowFeedbackNotificationModal = Boolean(
    currentUser &&
      currentUser.role === 'patient' &&
      hasLoadedFeedbackNotifications &&
      feedbackNotificationError === null &&
      unreadNotificationFeedbacks.length > 0 &&
      !isFeedbackNotificationDismissed &&
      !isOnboardingGuideOpen &&
      !isLogoutModalOpen &&
      !isGuidedWorkoutOpen &&
      !activeExerciseDetail &&
      !pendingAppExitAction
  );

  useEffect(() => {
    if (!detailedPatientId) {
      setHasUnsavedChartChanges(false);
      setPatientDetailTarget(null);
    }
  }, [detailedPatientId]);

  // Automatically show 3-step onboarding guide on first login/session if not dismissed
  useEffect(() => {
    if (currentUser?.id) {
      const isDismissed = StorageService.getOnboardingGuideDismissed(currentUser.id);
      setIsOnboardingGuideOpen(!isDismissed);
    } else {
      setIsOnboardingGuideOpen(false);
    }
    // Reset internal navigation history and mobile drawer when user session changes
    setTherapistNavHistory([]);
    setIsMobileSidebarOpen(false);
    setHasUnsavedChartChanges(false);
    setPendingAppExitAction(null);
  }, [currentUser?.id]);

  // Initialize storage and verify Firebase backend connection once
  useEffect(() => {
    StorageService.initStorage();
    AuthService.initAccounts();
    FirebaseService.verifyLiveConnection().catch((err) => {
      console.warn('Firebase live verification deferred:', err);
    });
  }, []);

  // Synchronize Firebase Auth changes with session user
  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;

    const unsubscribe = onAuthStateChanged(auth, (fbUser) => {
      const sessionUser = AuthService.getSessionUser();
      if (fbUser) {
        // If session user mismatched with Firebase Auth UID, resync profile
        if (sessionUser && sessionUser.id !== fbUser.uid) {
          console.warn('Firebase Auth user changed, resyncing session:', fbUser.uid);
          FirebaseService.getUserProfile(fbUser.uid).then((profile) => {
            if (profile) {
              const updatedSession: AuthUser = {
                ...sessionUser,
                id: fbUser.uid,
                name: profile.name || sessionUser.name,
                role: profile.role || sessionUser.role,
                patientId: profile.role === 'patient' ? fbUser.uid : undefined,
                therapistId: profile.role === 'therapist' ? fbUser.uid : undefined,
                authProvider: 'firebase',
                isDemoAccount: false
              };
              sessionStorage.setItem('rehab_session_user_v1', JSON.stringify(updatedSession));
              setCurrentUser(updatedSession);
            }
          }).catch((err) => console.warn('Resync profile error:', err));
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync patient & therapist remote data from Firestore
  useEffect(() => {
    if (!currentUser) return;

    let isCancelled = false;
    let unsubProfile: (() => void) | null = null;
    let unsubConnections: (() => void) | null = null;
    let unsubTherapistConns: (() => void) | null = null;

    waitForFirebaseAuthUid().then((authUid) => {
      if (isCancelled) return;
      if (!authUid || authUid !== currentUser.id) {
        console.warn('Firestore sync skipped: authenticated Firebase UID does not match session user ID.', {
          authUid,
          sessionUserId: currentUser.id
        });
        return;
      }

      // 1. Patient Sync
      if (currentUser.role === 'patient') {
        const patientId = authUid;

        // 운동 기록 동기화
        FirebaseService.getWorkoutLogs(patientId).then((remoteLogs) => {
          if (isCancelled) return;
          if (remoteLogs && remoteLogs.length > 0) {
            const localLogs = StorageService.getWorkoutLogs();
            const existingIds = new Set(localLogs.map((l) => l.id));
            const newRemote = remoteLogs.filter((l) => !existingIds.has(l.id));
            if (newRemote.length > 0) {
              localStorage.setItem('rehab_workout_logs_v1', JSON.stringify([...newRemote, ...localLogs]));
              setTick((t) => t + 1);
            }
          }
        }).catch((e) => console.warn('Sync remote logs deferred:', e));

        // 처방 프로그램 직접 동기화 (prescriptions/{patientId})
        FirebaseService.getPrescribedProgram(patientId).then((assignedProgram) => {
          if (isCancelled) return;
          if (assignedProgram && assignedProgram.length > 0) {
            const localPatient = StorageService.getPatientById(patientId);
            if (localPatient) {
              StorageService.updatePatientInfo(patientId, { assignedProgram });
              setTick((t) => t + 1);
            }
          }
        }).catch((e) => console.warn('Sync prescription deferred:', e));

        // 환자 연결 관계 초기 1회 로드 및 로컬 반영
        FirebaseService.getConnectionsForPatient(patientId).then((remoteConns) => {
          if (isCancelled || !remoteConns) return;
          if (remoteConns.length > 0) {
            StorageService.syncRemoteConnections(remoteConns);
            const activeOrPending = remoteConns.find((c) => c.status === 'connected' || c.status === 'pending');
            if (activeOrPending) {
              StorageService.updatePatientInfo(patientId, {
                connectionStatus: activeOrPending.status,
                therapistId: activeOrPending.status === 'connected' ? activeOrPending.therapistId : undefined,
                therapistName: activeOrPending.status === 'connected' ? activeOrPending.therapistName : undefined,
                requestedTherapistId: activeOrPending.status === 'pending' ? activeOrPending.therapistId : undefined,
                requestedTherapistName: activeOrPending.status === 'pending' ? activeOrPending.therapistName : undefined
              });
            }
            setTick((t) => t + 1);
          }
        }).catch((e) => console.warn('Sync patient connections error:', e));

        // 실시간 환자 프로필 리스너
        unsubProfile = FirebaseService.subscribeToPatientProfile(patientId, (remotePatient) => {
          if (remotePatient) {
            const localPatient = StorageService.getPatientById(patientId);
            if (localPatient) {
              StorageService.updatePatientInfo(patientId, remotePatient);
            }
          }
        });

        // 실시간 환자 연결 상태 리스너 (치료사의 수락/거절/해제 즉시 반응)
        unsubConnections = FirebaseService.subscribeToPatientConnections(patientId, (remoteConns) => {
          if (!remoteConns) return;
          StorageService.syncRemoteConnections(remoteConns);
          const activeOrPending = remoteConns.find((c) => c.status === 'connected' || c.status === 'pending');
          if (activeOrPending) {
            StorageService.updatePatientInfo(patientId, {
              connectionStatus: activeOrPending.status,
              therapistId: activeOrPending.status === 'connected' ? activeOrPending.therapistId : undefined,
              therapistName: activeOrPending.status === 'connected' ? activeOrPending.therapistName : undefined,
              requestedTherapistId: activeOrPending.status === 'pending' ? activeOrPending.therapistId : undefined,
              requestedTherapistName: activeOrPending.status === 'pending' ? activeOrPending.therapistName : undefined
            });
          } else {
            const disconnectedConn = remoteConns.find((c) => c.status === 'disconnected' || c.status === 'rejected');
            if (disconnectedConn) {
              StorageService.updatePatientInfo(patientId, {
                connectionStatus: disconnectedConn.status as any,
                therapistId: undefined,
                therapistName: undefined
              });
            }
          }
          setTick((t) => t + 1);
        });
      }

      // 2. Therapist Sync: Query connections collection + individual users getDoc
      if (currentUser.role === 'therapist') {
        const therapistId = authUid;

        // 연결된 담당 환자 초기 조회
        FirebaseService.getConnectedPatientsForTherapist(therapistId).then((patients) => {
          if (isCancelled || !patients) return;
          if (patients.length > 0) {
            patients.forEach((p) => {
              const existing = StorageService.getPatientById(p.id);
              if (!existing) {
                StorageService.addPatient(p);
              } else {
                StorageService.updatePatientInfo(p.id, p);
              }
            });
            setTick((t) => t + 1);
          }
        }).catch((e) => console.warn('Sync therapist patients error:', e));

        // 대기 중인 연결 요청 및 전체 연결 초기 조회
        FirebaseService.getConnectionsForTherapist(therapistId).then((conns) => {
          if (isCancelled || !conns) return;
          if (conns.length > 0) {
            StorageService.syncRemoteConnections(conns);
            const pendingConns = conns.filter((c) => c.status === 'pending');
            StorageService.syncPendingRequestsFromConnections(pendingConns);
            setTick((t) => t + 1);
          }
        }).catch((e) => console.warn('Sync therapist connections error:', e));

        // 실시간 치료사 연결 리스너 (환자의 신규 요청, 연결 해제 즉시 감지)
        unsubTherapistConns = FirebaseService.subscribeToTherapistConnections(therapistId, (conns) => {
          if (!conns) return;
          StorageService.syncRemoteConnections(conns);
          const pendingConns = conns.filter((c) => c.status === 'pending');
          StorageService.syncPendingRequestsFromConnections(pendingConns);

          // 승인된 연결이 있는 경우 환자 상세 프로필 동기화
          FirebaseService.getConnectedPatientsForTherapist(therapistId).then((patients) => {
            if (isCancelled || !patients) return;
            if (patients.length > 0) {
              patients.forEach((p) => {
                const existing = StorageService.getPatientById(p.id);
                if (!existing) {
                  StorageService.addPatient(p);
                } else {
                  StorageService.updatePatientInfo(p.id, p);
                }
              });
              setTick((t) => t + 1);
            }
          }).catch((e) => console.warn('Sync therapist patients realtime error:', e));

          setTick((t) => t + 1);
        });
      }
    });

    return () => {
      isCancelled = true;
      if (unsubProfile) unsubProfile();
      if (unsubConnections) unsubConnections();
      if (unsubTherapistConns) unsubTherapistConns();
    };
  }, [currentUser?.id, currentUser?.patientId, currentUser?.role]);

  // Stage 3-B-1: Fetch patient feedbacks & read states after Firebase Auth restoration (patient role only)
  useEffect(() => {
    if (!currentUser || currentUser.role !== 'patient') {
      resetPatientFeedbackNotificationState();
      return;
    }

    let isCancelled = false;
    const expectedUserId = currentUser.id;
    const requestSeq = ++feedbackNotificationRequestSeqRef.current;

    // Immediately clear any previous account notification state before querying
    feedbackNavigationSeqRef.current += 1;
    feedbackReadActionSeqRef.current += 1;
    isNavigatingToFeedbackRef.current = false;
    markingFeedbackIdsRef.current.clear();
    setRemotePatientFeedbacks([]);
    setPatientFeedbackReadStates([]);
    setHasLoadedFeedbackNotifications(false);
    setFeedbackNotificationError(null);
    setIsFeedbackNotificationDismissed(false);
    setPatientFeedbackTarget(null);
    setRemotePatientWorkoutLogs([]);
    setIsNavigatingToFeedback(false);
    setNavigatingFeedbackId(null);
    setMarkingFeedbackIds({});
    setFeedbackReadSaveErrors({});
    setIsLoadingFeedbackNotifications(true);

    const isStale = () =>
      isCancelled || feedbackNotificationRequestSeqRef.current !== requestSeq;

    (async () => {
      try {
        const authUid = await waitForFirebaseAuthUid();
        if (isStale()) return;

        if (!authUid || authUid !== expectedUserId) {
          console.warn(
            'Patient feedback notification fetch skipped: authenticated Firebase UID does not match session user ID.',
            { authUid, sessionUserId: expectedUserId }
          );
          setIsLoadingFeedbackNotifications(false);
          return;
        }

        const patientId = authUid;
        const [feedbacks, readStates] = await Promise.all([
          FirebaseService.getFeedbacks(patientId),
          FirebaseService.getFeedbackReadStates(patientId)
        ]);
        if (isStale()) return;

        // Re-verify active Firebase Auth UID before committing async results
        const activeAuthUid = getFirebaseAuth()?.currentUser?.uid || null;
        if (activeAuthUid !== patientId) {
          setIsLoadingFeedbackNotifications(false);
          return;
        }

        setRemotePatientFeedbacks(feedbacks);
        setPatientFeedbackReadStates(readStates);
        setHasLoadedFeedbackNotifications(true);
        setFeedbackNotificationError(null);
      } catch (error) {
        if (isStale()) return;
        const classified = classifyFeedbackReadError(error);
        console.warn('Patient feedback notification fetch failed:', classified);
        // Never treat a failed query as empty read states to prevent false unread notifications
        setRemotePatientFeedbacks([]);
        setPatientFeedbackReadStates([]);
        setHasLoadedFeedbackNotifications(false);
        setFeedbackNotificationError(classified);
      } finally {
        if (!isStale()) {
          setIsLoadingFeedbackNotifications(false);
        }
      }
    })();

    return () => {
      isCancelled = true;
      feedbackNotificationRequestSeqRef.current += 1;
    };
  }, [currentUser?.id, currentUser?.role, resetPatientFeedbackNotificationState]);

  // Listen to auth changes and storage changes
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const unsubAuth = subscribeToAuth(() => {
      const user = AuthService.getSessionUser();
      setCurrentUser(user);
      setTherapistNavHistory([]);
      setDetailedPatientId(null);
      setPatientDetailTarget(null);
      setIsMobileSidebarOpen(false);
      if (user) {
        if (user.role === 'therapist') {
          setTherapistTab('dashboard');
        } else {
          setPatientTab('home');
        }
      }
    });

    const unsubStorage = subscribeToRehabStore(() => {
      setTick((t) => t + 1);
    });

    return () => {
      unsubAuth();
      unsubStorage();
    };
  }, []);

  // Toast Helpers
  const addToast = (type: 'success' | 'info' | 'error', title: string, description?: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, title, description }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sign up success handler (즉시 자동 로그인 및 해당 대시보드로 이동)
  const handleSignUpSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveExerciseDetail(null);
    setTherapistNavHistory([]);
    setDetailedPatientId(null);
    setPatientDetailTarget(null);
    setIsMobileSidebarOpen(false);

    if (user.role === 'patient') {
      setPatientTab('home');
      addToast(
        'success',
        `회원가입 완료: ${user.name} 님 환영합니다!`,
        '승인 대기 없이 즉시 환자 대시보드로 접속했습니다.'
      );
    } else {
      setTherapistTab('dashboard');
      addToast(
        'success',
        `물리치료사 등록 완료: ${user.name} 님 환영합니다!`,
        `치료실 대시보드로 접속했습니다. 고유 연결 코드: ${user.connectionCode || ''}`
      );
    }
  };

  // Login handler
  const handleLoginSuccess = (user: AuthUser) => {
    setCurrentUser(user);
    setActiveExerciseDetail(null);
    setTherapistNavHistory([]);
    setDetailedPatientId(null);
    setPatientDetailTarget(null);
    setIsMobileSidebarOpen(false);

    if (user.role === 'therapist') {
      setTherapistTab('dashboard');
      addToast(
        'success',
        `물리치료사 로그인: ${user.name} 님`,
        '치료실 관리 대시보드로 이동했습니다.'
      );
    } else {
      setPatientTab('home');
      addToast(
        'success',
        `환자 로그인: ${user.name} 님 환영합니다.`,
        '오늘의 맞춤 재활운동 프로그램을 확인해보세요.'
      );
    }
  };

  // Logout handler
  const handleConfirmLogout = () => {
    const userName = currentUser?.name || '사용자';
    AuthService.logout();
    resetPatientFeedbackNotificationState();
    setCurrentUser(null);
    setIsLogoutModalOpen(false);
    setActiveExerciseDetail(null);
    setDetailedPatientId(null);
    setPatientDetailTarget(null);
    setHasUnsavedChartChanges(false);
    setPendingAppExitAction(null);
    setTherapistNavHistory([]);
    setIsMobileSidebarOpen(false);
    setAuthScreen('login');
    addToast('info', '로그아웃되었습니다.', `${userName} 님의 세션이 안전하게 종료되었습니다.`);
  };

  const handleRequestOpenLogoutModal = () => {
    if (currentUser?.role === 'therapist' && detailedPatientId && hasUnsavedChartChanges) {
      setPendingAppExitAction({ type: 'logout' });
      return;
    }
    setIsLogoutModalOpen(true);
  };

  // Stage 3-B-3-1: 알림 팝업 '피드백 바로보기' 이동 처리 (실제 표시 확인 전 선제적 읽음 처리 금지)
  const handleSelectNotificationFeedback = useCallback(
    async (feedback: ClinicalFeedback) => {
      if (!currentUser || currentUser.role !== 'patient') return;
      if (!feedback || !feedback.id) return;
      if (isNavigatingToFeedbackRef.current) return;

      const expectedUserId = currentUser.id;
      const navSeq = ++feedbackNavigationSeqRef.current;
      const isNavStale = () => feedbackNavigationSeqRef.current !== navSeq;

      isNavigatingToFeedbackRef.current = true;
      setIsNavigatingToFeedback(true);
      setNavigatingFeedbackId(feedback.id);

      const normalizedWorkoutLogId =
        typeof feedback.workoutLogId === 'string' && feedback.workoutLogId.trim()
          ? feedback.workoutLogId.trim()
          : null;

      try {
        // 1. 일반 피드백 (workoutLogId 없음) -> 마이페이지 피드백 섹션으로 직접 이동
        if (!normalizedWorkoutLogId) {
          if (isNavStale()) return;
          setActiveExerciseDetail(null);
          setIsGuidedWorkoutOpen(false);
          setIsFeedbackNotificationDismissed(true);
          setPatientFeedbackTarget({
            patientId: expectedUserId,
            feedbackId: feedback.id,
            workoutLogId: null,
            destination: 'profile',
            requestKey: Date.now()
          });
          setPatientTab('profile');
          return;
        }

        // 2. 운동 기록과 연결된 피드백 -> 로컬 기록 확인 후 없으면 원격 조회
        const localLogs = StorageService.getWorkoutLogs(expectedUserId);
        let matchedLog: WorkoutLog | null =
          localLogs.find((log) => log.id === normalizedWorkoutLogId) ||
          remotePatientWorkoutLogs.find((log) => log.id === normalizedWorkoutLogId) ||
          null;

        if (!matchedLog) {
          const authUid = await waitForFirebaseAuthUid();
          if (isNavStale()) return;

          if (authUid && authUid === expectedUserId) {
            const fetchedLogs = await FirebaseService.getWorkoutLogs(authUid);
            if (isNavStale()) return;

            const activeAuthUid = getFirebaseAuth()?.currentUser?.uid || null;
            if (activeAuthUid !== expectedUserId) {
              return;
            }

            if (fetchedLogs.length > 0) {
              setRemotePatientWorkoutLogs(fetchedLogs);
            }
            matchedLog = fetchedLogs.find((log) => log.id === normalizedWorkoutLogId) || null;
          }
        }

        if (isNavStale()) return;

        setActiveExerciseDetail(null);
        setIsGuidedWorkoutOpen(false);
        setIsFeedbackNotificationDismissed(true);

        if (matchedLog) {
          setPatientFeedbackTarget({
            patientId: expectedUserId,
            feedbackId: feedback.id,
            workoutLogId: matchedLog.id,
            destination: 'history',
            requestKey: Date.now()
          });
          setPatientTab('history');
        } else {
          // 연결된 운동 기록을 찾지 못한 경우 마이페이지 피드백 섹션으로 안전 폴백
          setPatientFeedbackTarget({
            patientId: expectedUserId,
            feedbackId: feedback.id,
            workoutLogId: null,
            destination: 'profile',
            requestKey: Date.now()
          });
          setPatientTab('profile');
          addToast(
            'info',
            '연결된 운동 기록을 찾을 수 없어 마이페이지로 이동했습니다.',
            '물리치료사 소견 및 피드백 목록에서 해당 내용을 확인하실 수 있습니다.'
          );
        }
      } catch (error) {
        if (isNavStale()) return;
        console.warn('Notification feedback navigation fallback:', error);
        setActiveExerciseDetail(null);
        setIsGuidedWorkoutOpen(false);
        setIsFeedbackNotificationDismissed(true);
        setPatientFeedbackTarget({
          patientId: expectedUserId,
          feedbackId: feedback.id,
          workoutLogId: null,
          destination: 'profile',
          requestKey: Date.now()
        });
        setPatientTab('profile');
        addToast(
          'error',
          '연결된 운동 기록을 불러오지 못해 마이페이지로 이동했습니다.',
          '물리치료사 소견 및 피드백 목록에서 내용을 확인해 주세요.'
        );
      } finally {
        if (!isNavStale()) {
          isNavigatingToFeedbackRef.current = false;
          setIsNavigatingToFeedback(false);
          setNavigatingFeedbackId(null);
        }
      }
    },
    [currentUser, remotePatientWorkoutLogs]
  );

  // Stage 3-B-3-2: 실제 피드백 화면 표시 확인 후 Firebase 읽음 상태 영구 저장 (낙관적 갱신 금지)
  const persistConfirmedFeedbackRead = useCallback(
    async (feedback: ClinicalFeedback, isRetry: boolean) => {
      if (!currentUser || currentUser.role !== 'patient') return;
      if (!feedback || !feedback.id) return;

      const expectedUserId = currentUser.id;
      const target = patientFeedbackTarget;

      // 1. 충돌 오버레이 활성화 시 자동/재시도 모두 차단
      if (activeExerciseDetail || isGuidedWorkoutOpen) {
        return;
      }

      // 2. 다른 계정의 피드백 여부 및 본인 원격 피드백 존재·소유권 검증
      const ownerId = (feedback as ClinicalFeedback & { patientId?: string }).patientId;
      if (ownerId && ownerId !== expectedUserId) {
        return;
      }
      const matchedRemoteFeedback = remotePatientFeedbacks.find((item) => item.id === feedback.id);
      if (!matchedRemoteFeedback) {
        return;
      }
      const remoteOwnerId = (matchedRemoteFeedback as ClinicalFeedback & { patientId?: string }).patientId;
      if (remoteOwnerId && remoteOwnerId !== expectedUserId) {
        return;
      }

      // 3. 경로별 대상 및 현재 표시 화면 검증
      if (!isRetry) {
        // 자동 읽음 처리 경로: 이동 대상·계정·현재 표시 탭 일치 조건 기존 그대로 엄격 유지
        if (!target || target.feedbackId !== feedback.id || target.patientId !== expectedUserId) {
          return;
        }
        if (patientTab !== target.destination) {
          return;
        }
      } else {
        // 명시적 '다시 시도' 경로:
        // onRetryMarkRead 콜백은 PatientHistory / PatientProfile의 실제 렌더링된 피드백 카드 내부 버튼에서만 호출됨
        if (target && target.patientId !== expectedUserId) {
          return;
        }
        if (!feedbackReadSaveErrors[feedback.id]) {
          return;
        }
        if (!matchedRemoteFeedback.content || !matchedRemoteFeedback.content.trim()) {
          return;
        }

        const normalizedWorkoutLogId =
          typeof matchedRemoteFeedback.workoutLogId === 'string' &&
          matchedRemoteFeedback.workoutLogId.trim()
            ? matchedRemoteFeedback.workoutLogId.trim()
            : null;
        const hasRenderableHistoryLog =
          Boolean(normalizedWorkoutLogId) &&
          (StorageService.getWorkoutLogs(expectedUserId).some(
            (log) => log.id === normalizedWorkoutLogId
          ) ||
            remotePatientWorkoutLogs.some(
              (log) =>
                log.id === normalizedWorkoutLogId &&
                (!log.patientId || log.patientId === expectedUserId)
            ));
        const canDisplayFeedbackOnCurrentTab =
          patientTab === 'profile' ||
          (patientTab === 'history' && hasRenderableHistoryLog);

        if (!canDisplayFeedbackOnCurrentTab) {
          return;
        }
      }

      // 4. 이미 읽음 처리된 피드백이면 중복 저장 생략
      if (feedbackReadStateMap[feedback.id]) {
        setFeedbackReadSaveErrors((prev) => {
          if (!prev[feedback.id]) return prev;
          const next = { ...prev };
          delete next[feedback.id];
          return next;
        });
        return;
      }

      // 자동 표시 콜백에서 직전 실패 상태가 이미 있으면 사용자의 명시적 재시도 전까지 반복 호출 방지
      if (!isRetry && feedbackReadSaveErrors[feedback.id]) {
        return;
      }

      // 5. 동일 피드백에 대한 동시 중복 저장 요청 차단 (in-flight Set)
      if (markingFeedbackIdsRef.current.has(feedback.id)) {
        return;
      }

      const readSessionSeq = feedbackReadActionSeqRef.current;
      const isReadSessionStale = () => feedbackReadActionSeqRef.current !== readSessionSeq;

      markingFeedbackIdsRef.current.add(feedback.id);
      setMarkingFeedbackIds((prev) => ({ ...prev, [feedback.id]: true }));

      try {
        // 6. Firebase Auth UID 복원 및 환자 ID 일치 확인
        const authUid = await waitForFirebaseAuthUid();
        if (isReadSessionStale()) return;

        if (!authUid || authUid !== expectedUserId) {
          setFeedbackReadSaveErrors((prev) => ({
            ...prev,
            [feedback.id]: {
              code: 'unauthenticated',
              message: '로그인 인증 정보를 확인할 수 없어 읽음 상태를 저장하지 못했습니다.'
            }
          }));
          return;
        }

        const currentAuthUid = getFirebaseAuth()?.currentUser?.uid || null;
        if (currentAuthUid !== expectedUserId) {
          return;
        }

        // 7. 기존 FirebaseService.markFeedbackAsRead(patientId, feedbackId) 재사용
        const result = await FirebaseService.markFeedbackAsRead(authUid, feedback.id);
        if (isReadSessionStale()) return;

        // 응답 커밋 직전 활성 Auth UID 재검증 (계정 전환 경합 방어)
        const activeAuthUidAfterSave = getFirebaseAuth()?.currentUser?.uid || null;
        if (activeAuthUidAfterSave !== expectedUserId) {
          return;
        }

        // 8. 서버 저장 성공 응답을 받은 경우에만 읽음 상태 반영 (unreadNotificationFeedbacks는 useMemo로 자동 갱신)
        setPatientFeedbackReadStates((prev) => {
          if (prev.some((item) => item.feedbackId === result.readState.feedbackId)) {
            return prev;
          }
          return [...prev, result.readState];
        });

        setFeedbackReadSaveErrors((prev) => {
          if (!prev[feedback.id]) return prev;
          const next = { ...prev };
          delete next[feedback.id];
          return next;
        });
      } catch (error) {
        if (isReadSessionStale()) return;
        const classified = classifyFeedbackReadError(error);
        console.warn('Failed to save feedback read state:', {
          feedbackId: feedback.id,
          ...classified
        });
        // 실패 시 읽음 상태 및 미읽음 목록을 절대 변경하지 않고 해당 피드백 카드에 오류·재시도 표시
        setFeedbackReadSaveErrors((prev) => ({
          ...prev,
          [feedback.id]: classified
        }));
      } finally {
        if (!isReadSessionStale()) {
          markingFeedbackIdsRef.current.delete(feedback.id);
          setMarkingFeedbackIds((prev) => {
            if (!prev[feedback.id]) return prev;
            const next = { ...prev };
            delete next[feedback.id];
            return next;
          });
        }
      }
    },
    [
      currentUser,
      patientFeedbackTarget,
      patientTab,
      activeExerciseDetail,
      isGuidedWorkoutOpen,
      remotePatientFeedbacks,
      remotePatientWorkoutLogs,
      feedbackReadStateMap,
      feedbackReadSaveErrors
    ]
  );

  const handleConfirmFeedbackViewed = useCallback(
    (feedback: ClinicalFeedback) => {
      void persistConfirmedFeedbackRead(feedback, false);
    },
    [persistConfirmedFeedbackRead]
  );

  const handleRetryMarkFeedbackAsRead = useCallback(
    (feedback: ClinicalFeedback) => {
      void persistConfirmedFeedbackRead(feedback, true);
    },
    [persistConfirmedFeedbackRead]
  );

  // Patient detail & completion handlers
  const handleOpenExerciseDetail = (exercise: Exercise, assignmentId: string) => {
    if (!currentUser || currentUser.role !== 'patient') return;
    const patId = currentUser.patientId || currentUser.id;
    const patient = StorageService.getPatientById(patId);
    const assignment = patient?.assignedProgram.find((a) => a.assignmentId === assignmentId);
    setActiveExerciseDetail({ exercise, assignment });
  };

  const handleExerciseLogSuccess = (exerciseName: string) => {
    addToast(
      'success',
      `[${exerciseName}] 운동 완료가 기록되었습니다.`,
      '물리치료사 대시보드와 수행 기록에 실시간으로 반영되었습니다.'
    );
    setActiveExerciseDetail(null);
    setPatientTab('home');
  };

  const handleProgramSaveSuccess = (patientName: string) => {
    addToast(
      'success',
      `${patientName} 님의 재활 운동 프로그램이 저장되었습니다.`,
      '해당 환자의 모바일 화면에 처방 내용이 즉시 반영되었습니다.'
    );
  };

  // Therapist internal navigation helpers
  const VALID_THERAPIST_TABS = new Set(['dashboard', 'patients', 'prescriptions', 'settings']);

  const pushTherapistHistory = () => {
    setTherapistNavHistory((prev) => {
      const currentSnapshot = {
        tab: VALID_THERAPIST_TABS.has(therapistTab) ? therapistTab : 'dashboard',
        detailedPatientId,
        selectedPatientId: selectedPatientForTherapist,
        patientDetailTarget
      };
      const last = prev[prev.length - 1];
      if (
        last &&
        last.tab === currentSnapshot.tab &&
        last.detailedPatientId === currentSnapshot.detailedPatientId &&
        last.selectedPatientId === currentSnapshot.selectedPatientId &&
        last.patientDetailTarget?.targetWorkoutLogId === currentSnapshot.patientDetailTarget?.targetWorkoutLogId &&
        last.patientDetailTarget?.initialTab === currentSnapshot.patientDetailTarget?.initialTab
      ) {
        return prev;
      }
      return [...prev.slice(-29), currentSnapshot];
    });
  };

  const performTherapistNavigateTab = (tab: string, patientId?: string) => {
    const targetTab = VALID_THERAPIST_TABS.has(tab) ? tab : 'dashboard';
    const nextSelectedPatientId = patientId !== undefined ? patientId : selectedPatientForTherapist;

    if (
      targetTab !== therapistTab ||
      detailedPatientId !== null ||
      (patientId !== undefined && patientId !== selectedPatientForTherapist)
    ) {
      pushTherapistHistory();
    }

    setDetailedPatientId(null);
    setPatientDetailTarget(null);
    setHasUnsavedChartChanges(false);
    setTherapistTab(targetTab);
    if (patientId !== undefined) {
      setSelectedPatientForTherapist(nextSelectedPatientId);
    }
  };

  const handleTherapistNavigateTab = (tab: string, patientId?: string) => {
    if (detailedPatientId && hasUnsavedChartChanges) {
      setPendingAppExitAction({ type: 'tab', tab, patientId });
      return;
    }
    performTherapistNavigateTab(tab, patientId);
  };

  const handleOpenTherapistPatientDetail = (
    patientId: string,
    options?: {
      initialTab?: 'info' | 'soap' | 'activity';
      initialActivitySubTab?: 'logs' | 'videos' | 'feedback';
      targetWorkoutLogId?: string | null;
    }
  ) => {
    if (!patientId) return;
    const nextTab = options?.initialTab || 'info';
    const nextActivitySubTab = options?.initialActivitySubTab || 'logs';
    const nextTargetLogId = options?.targetWorkoutLogId || null;

    if (
      detailedPatientId !== patientId ||
      patientDetailTarget?.initialTab !== nextTab ||
      patientDetailTarget?.targetWorkoutLogId !== nextTargetLogId
    ) {
      pushTherapistHistory();
    }

    setSelectedPatientForTherapist(patientId);
    setPatientDetailTarget({
      initialTab: nextTab,
      initialActivitySubTab: nextActivitySubTab,
      targetWorkoutLogId: nextTargetLogId,
      requestKey: Date.now()
    });
    setDetailedPatientId(patientId);
  };

  const performTherapistBack = () => {
    if (!currentUser || currentUser.role !== 'therapist') return;

    const currentPatients = StorageService.getPatientsForTherapist(currentUser);
    const validPatientIds = new Set(currentPatients.map((p) => p.id));

    const nextHistory = [...therapistNavHistory];
    let targetState: {
      tab: string;
      detailedPatientId: string | null;
      selectedPatientId: string;
      patientDetailTarget?: {
        initialTab: 'info' | 'soap' | 'activity';
        initialActivitySubTab?: 'logs' | 'videos' | 'feedback';
        targetWorkoutLogId: string | null;
        requestKey: number;
      } | null;
    } | null = null;

    while (nextHistory.length > 0) {
      const candidate = nextHistory.pop()!;
      const validTab = VALID_THERAPIST_TABS.has(candidate.tab) ? candidate.tab : 'dashboard';
      const validDetailId =
        candidate.detailedPatientId && validPatientIds.has(candidate.detailedPatientId)
          ? candidate.detailedPatientId
          : null;

      if (validTab === therapistTab && validDetailId === detailedPatientId) {
        continue;
      }

      targetState = {
        tab: validTab,
        detailedPatientId: validDetailId,
        selectedPatientId: candidate.selectedPatientId,
        patientDetailTarget: validDetailId ? candidate.patientDetailTarget || null : null
      };
      break;
    }

    setTherapistNavHistory(nextHistory);
    setHasUnsavedChartChanges(false);

    if (targetState) {
      setTherapistTab(targetState.tab);
      setDetailedPatientId(targetState.detailedPatientId);
      setPatientDetailTarget(targetState.patientDetailTarget || null);
      if (targetState.selectedPatientId && validPatientIds.has(targetState.selectedPatientId)) {
        setSelectedPatientForTherapist(targetState.selectedPatientId);
      }
      return;
    }

    // Fallback when no previous history entry exists
    if (detailedPatientId !== null) {
      setDetailedPatientId(null);
      setPatientDetailTarget(null);
      if (!VALID_THERAPIST_TABS.has(therapistTab)) {
        setTherapistTab('dashboard');
      }
      return;
    }

    if (therapistTab !== 'dashboard') {
      setTherapistTab('dashboard');
    }
  };

  const handleTherapistBack = () => {
    if (!currentUser || currentUser.role !== 'therapist') return;
    if (detailedPatientId && hasUnsavedChartChanges) {
      setPendingAppExitAction({ type: 'back' });
      return;
    }
    performTherapistBack();
  };

  const hasValidPreviousTherapistHistory = therapistNavHistory.some(
    (entry) => entry.tab !== therapistTab || entry.detailedPatientId !== detailedPatientId
  );

  const canTherapistGoBack =
    currentUser?.role === 'therapist' &&
    (hasValidPreviousTherapistHistory || detailedPatientId !== null || therapistTab !== 'dashboard');

  // 1. Unauthenticated View (Clean 2-Column Login & Sign Up)
  if (!currentUser) {
    return (
      <>
        {authScreen === 'signup' ? (
          <SignUpView
            initialRole={signupInitialRole}
            initialInviteCode={pendingInviteCode}
            inviteTherapist={pendingInviteTherapist}
            onSignUpSuccess={handleSignUpSuccess}
            onNavigateToLogin={() => setAuthScreen('login')}
            onNavigateToHome={() => setAuthScreen('login')}
          />
        ) : (
          <LoginView
            onLoginSuccess={handleLoginSuccess}
            inviteTherapist={pendingInviteTherapist}
            onNavigateToSignUp={() => {
              setSignupInitialRole('patient');
              setAuthScreen('signup');
            }}
          />
        )}

        <ToastContainer toasts={toasts} onDismiss={removeToast} />
      </>
    );
  }

  // 2. Authenticated View (Patient or Therapist)
  const allPatients = StorageService.getPatients();
  const therapistPatients = currentUser.role === 'therapist'
    ? StorageService.getPatientsForTherapist(currentUser)
    : allPatients;

  // Strict Patient Isolation: Patient only ever accesses their own patientId
  const effectivePatientId = currentUser.patientId || currentUser.id;
  const currentPatient: Patient = currentUser.role === 'patient'
    ? StorageService.getPatientById(effectivePatientId) || {
        id: effectivePatientId,
        name: currentUser.name,
        age: 30,
        gender: '남성',
        diagnosis: '',
        targetGoal: '처방 대기',
        therapistNotes: '',
        assignedProgram: [],
        connectionStatus: 'not_connected'
      }
    : {
        id: currentUser.id,
        name: currentUser.name,
        age: 30,
        gender: '남성',
        diagnosis: '',
        targetGoal: '처방 대기',
        therapistNotes: '',
        assignedProgram: [],
        connectionStatus: 'not_connected'
      };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-800 antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation */}
      <Navbar
        currentUser={currentUser}
        currentTab={currentUser.role === 'patient' ? patientTab : therapistTab}
        onTabChange={(tab) => {
          setActiveExerciseDetail(null);
          setIsGuidedWorkoutOpen(false);
          if (currentUser.role === 'patient') {
            setDetailedPatientId(null);
            setPatientFeedbackTarget(null);
            setPatientTab(tab);
          } else {
            handleTherapistNavigateTab(tab);
          }
        }}
        onOpenLogoutModal={handleRequestOpenLogoutModal}
        isMobilePreview={isMobilePreview}
        onToggleMobilePreview={() => setIsMobilePreview(!isMobilePreview)}
        canGoBack={canTherapistGoBack}
        onGoBack={handleTherapistBack}
        onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Content Viewport */}
      <main className="flex-1">
        {currentUser.role === 'patient' ? (
          /* Patient View Container (Strictly isolated to this patient's data) */
          <div className="py-6 px-4 sm:px-6 lg:px-8 pb-24">
            {isGuidedWorkoutOpen ? (
              <div className="max-w-2xl mx-auto">
                <GuidedWorkoutSession
                  patient={currentPatient}
                  onClose={() => setIsGuidedWorkoutOpen(false)}
                  onFinishSession={() => {
                    setIsGuidedWorkoutOpen(false);
                    setPatientTab('history');
                    setTick((t) => t + 1);
                    addToast(
                      'success',
                      '오늘의 운동 세션을 완료했습니다!',
                      '수행 세트/횟수 및 통증 수치가 물리치료사 차트에 실시간 기록되었습니다.'
                    );
                  }}
                />
              </div>
            ) : isMobilePreview ? (
              <div className="max-w-[420px] mx-auto bg-white rounded-[36px] border-[10px] border-slate-800 shadow-2xl overflow-hidden min-h-[780px] flex flex-col relative">
                {/* Mobile Phone Mock Status Bar */}
                <div className="bg-slate-800 text-white px-6 py-2 flex items-center justify-between text-[11px] font-mono">
                  <span>09:41</span>
                  <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto" />
                  <span>5G 100%</span>
                </div>
                {/* Mobile Scrollable Viewport */}
                <div className="p-4 flex-1 overflow-y-auto bg-gray-50 pb-20">
                  {activeExerciseDetail ? (
                    <PatientExerciseDetail
                      exercise={activeExerciseDetail.exercise}
                      assignment={activeExerciseDetail.assignment}
                      patient={currentPatient}
                      onBack={() => setActiveExerciseDetail(null)}
                      onLogSuccess={handleExerciseLogSuccess}
                    />
                  ) : patientTab === 'home' ? (
                    <PatientHome
                      patient={currentPatient}
                      onOpenExerciseDetail={handleOpenExerciseDetail}
                      onNavigateTab={setPatientTab}
                      onStartGuidedSession={() => setIsGuidedWorkoutOpen(true)}
                      onConnectionUpdated={() => setTick((t) => t + 1)}
                    />
                  ) : patientTab === 'program' ? (
                    <PatientExerciseList
                      patient={currentPatient}
                      onOpenExerciseDetail={handleOpenExerciseDetail}
                    />
                  ) : patientTab === 'history' ? (
                    <PatientHistory
                      patient={currentPatient}
                      remoteWorkoutLogs={remotePatientWorkoutLogs}
                      remoteFeedbacks={remotePatientFeedbacks}
                      targetWorkoutLogId={
                        patientFeedbackTarget?.destination === 'history'
                          ? patientFeedbackTarget.workoutLogId
                          : null
                      }
                      targetFeedbackId={
                        patientFeedbackTarget?.destination === 'history'
                          ? patientFeedbackTarget.feedbackId
                          : null
                      }
                      feedbackTargetRequestKey={
                        patientFeedbackTarget?.destination === 'history'
                          ? patientFeedbackTarget.requestKey
                          : undefined
                      }
                      onFeedbackDisplayed={handleConfirmFeedbackViewed}
                      markingFeedbackIds={markingFeedbackIds}
                      feedbackReadSaveErrors={feedbackReadSaveErrors}
                      onRetryMarkRead={handleRetryMarkFeedbackAsRead}
                    />
                  ) : (
                    <PatientProfile
                      patient={currentPatient}
                      onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
                      onConnectionUpdated={() => setTick((t) => t + 1)}
                      remoteFeedbacks={remotePatientFeedbacks}
                      targetFeedbackId={
                        patientFeedbackTarget?.destination === 'profile'
                          ? patientFeedbackTarget.feedbackId
                          : null
                      }
                      feedbackTargetRequestKey={
                        patientFeedbackTarget?.destination === 'profile'
                          ? patientFeedbackTarget.requestKey
                          : undefined
                      }
                      onFeedbackDisplayed={handleConfirmFeedbackViewed}
                      markingFeedbackIds={markingFeedbackIds}
                      feedbackReadSaveErrors={feedbackReadSaveErrors}
                      onRetryMarkRead={handleRetryMarkFeedbackAsRead}
                    />
                  )}
                </div>

                {/* Bottom Navigation for Mobile Preview */}
                <PatientBottomNav
                  currentTab={patientTab}
                  onTabChange={(tab) => {
                    setActiveExerciseDetail(null);
                    setPatientFeedbackTarget(null);
                    setPatientTab(tab);
                  }}
                />
              </div>
            ) : (
              <div className="max-w-4xl mx-auto pb-16">
                {activeExerciseDetail ? (
                  <PatientExerciseDetail
                    exercise={activeExerciseDetail.exercise}
                    assignment={activeExerciseDetail.assignment}
                    patient={currentPatient}
                    onBack={() => setActiveExerciseDetail(null)}
                    onLogSuccess={handleExerciseLogSuccess}
                  />
                ) : patientTab === 'home' ? (
                  <PatientHome
                    patient={currentPatient}
                    onOpenExerciseDetail={handleOpenExerciseDetail}
                    onNavigateTab={setPatientTab}
                    onStartGuidedSession={() => setIsGuidedWorkoutOpen(true)}
                    onConnectionUpdated={() => setTick((t) => t + 1)}
                  />
                ) : patientTab === 'program' ? (
                  <PatientExerciseList
                    patient={currentPatient}
                    onOpenExerciseDetail={handleOpenExerciseDetail}
                  />
                ) : patientTab === 'history' ? (
                  <PatientHistory
                    patient={currentPatient}
                    remoteWorkoutLogs={remotePatientWorkoutLogs}
                    remoteFeedbacks={remotePatientFeedbacks}
                    targetWorkoutLogId={
                      patientFeedbackTarget?.destination === 'history'
                        ? patientFeedbackTarget.workoutLogId
                        : null
                    }
                    targetFeedbackId={
                      patientFeedbackTarget?.destination === 'history'
                        ? patientFeedbackTarget.feedbackId
                        : null
                    }
                    feedbackTargetRequestKey={
                      patientFeedbackTarget?.destination === 'history'
                        ? patientFeedbackTarget.requestKey
                        : undefined
                    }
                    onFeedbackDisplayed={handleConfirmFeedbackViewed}
                    markingFeedbackIds={markingFeedbackIds}
                    feedbackReadSaveErrors={feedbackReadSaveErrors}
                    onRetryMarkRead={handleRetryMarkFeedbackAsRead}
                  />
                ) : (
                  <PatientProfile
                    patient={currentPatient}
                    onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
                    onConnectionUpdated={() => setTick((t) => t + 1)}
                    onOpenGuide={() => setIsOnboardingGuideOpen(true)}
                    remoteFeedbacks={remotePatientFeedbacks}
                    targetFeedbackId={
                      patientFeedbackTarget?.destination === 'profile'
                        ? patientFeedbackTarget.feedbackId
                        : null
                    }
                    feedbackTargetRequestKey={
                      patientFeedbackTarget?.destination === 'profile'
                        ? patientFeedbackTarget.requestKey
                        : undefined
                    }
                    onFeedbackDisplayed={handleConfirmFeedbackViewed}
                    markingFeedbackIds={markingFeedbackIds}
                    feedbackReadSaveErrors={feedbackReadSaveErrors}
                    onRetryMarkRead={handleRetryMarkFeedbackAsRead}
                  />
                )}

                {/* Mobile Bottom Navigation Bar */}
                <PatientBottomNav
                  currentTab={patientTab}
                  onTabChange={(tab) => {
                    setActiveExerciseDetail(null);
                    setPatientFeedbackTarget(null);
                    setPatientTab(tab);
                  }}
                />
              </div>
            )}
          </div>
        ) : currentUser.role === 'therapist' ? (
          /* Therapist View Container (PC / Tablet optimized with Unified Left Sidebar) */
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
            {/* Desktop Left Sidebar */}
            <div className="hidden lg:block shrink-0">
              <TherapistSidebar
                currentTab={detailedPatientId ? 'patients' : therapistTab}
                onTabChange={(tab) => handleTherapistNavigateTab(tab)}
                currentUser={currentUser}
                onOpenLogoutModal={handleRequestOpenLogoutModal}
              />
            </div>

            {/* Mobile & Tablet Slide-over Sidebar Drawer */}
            {isMobileSidebarOpen && (
              <div className="lg:hidden fixed inset-0 z-50 flex">
                <div
                  className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
                  onClick={() => setIsMobileSidebarOpen(false)}
                />
                <div className="relative z-10 flex h-full">
                  <TherapistSidebar
                    currentTab={detailedPatientId ? 'patients' : therapistTab}
                    onTabChange={(tab) => handleTherapistNavigateTab(tab)}
                    currentUser={currentUser}
                    onOpenLogoutModal={handleRequestOpenLogoutModal}
                    isMobileDrawer
                    onCloseMobileDrawer={() => setIsMobileSidebarOpen(false)}
                  />
                </div>
              </div>
            )}

            {/* Main Content Area */}
            <div className="flex-1 py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
              {detailedPatientId ? (() => {
                const therapistConnections = StorageService.getConnectionsForTherapist(currentUser);
                const knownPatientIds = new Set([
                  ...therapistPatients.map((p) => p.id),
                  ...therapistConnections
                    .filter((c) => c.status === 'connected' || c.status === 'disconnected')
                    .map((c) => c.patientId)
                ]);
                const matchedPatient =
                  therapistPatients.find((p) => p.id === detailedPatientId) ||
                  (knownPatientIds.has(detailedPatientId)
                    ? allPatients.find((p) => p.id === detailedPatientId)
                    : undefined);

                if (!matchedPatient) {
                  return (
                    <div className="max-w-3xl mx-auto py-8">
                      <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-4 shadow-xs">
                        <h2 className="text-base font-bold text-gray-900">
                          요청한 환자 정보 또는 운동 기록에 접근할 수 없습니다
                        </h2>
                        <p className="text-xs text-gray-600 leading-relaxed max-w-md mx-auto">
                          해당 환자가 담당 환자 목록에 없거나 기록이 삭제되었을 수 있습니다. 다른 환자의 기록을 대신 표시하지 않도록 안전하게 차단했습니다.
                        </p>
                        <button
                          type="button"
                          onClick={handleTherapistBack}
                          className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl cursor-pointer transition-colors"
                        >
                          이전 화면으로 돌아가기
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <TherapistPatientDetailView
                    currentUser={currentUser}
                    patient={matchedPatient}
                    initialTab={patientDetailTarget?.initialTab}
                    initialActivitySubTab={patientDetailTarget?.initialActivitySubTab}
                    targetWorkoutLogId={patientDetailTarget?.targetWorkoutLogId}
                    navigationRequestKey={patientDetailTarget?.requestKey}
                    onBack={handleTherapistBack}
                    onNavigateToProgramEditor={(patientId) => {
                      handleTherapistNavigateTab('prescriptions', patientId);
                    }}
                    onDirtyChange={setHasUnsavedChartChanges}
                    onPatientDisconnected={(patientName) => {
                      const disconnectedId = detailedPatientId;
                      setTherapistNavHistory((prev) =>
                        prev.map((entry) =>
                          entry.detailedPatientId === disconnectedId
                            ? { ...entry, detailedPatientId: null, patientDetailTarget: null }
                            : entry
                        )
                      );
                      setDetailedPatientId(null);
                      setPatientDetailTarget(null);
                      setTherapistTab('patients');
                      setTick((t) => t + 1);
                      addToast(
                        'info',
                        '환자 연결 해제 완료',
                        `'${patientName}' 환자와의 연결이 안전하게 해제되었습니다. 기존 운동 기록과 처방 이력은 보존됩니다.`
                      );
                    }}
                    onFeedbackSaved={() => {
                      setTick((t) => t + 1);
                      addToast(
                        'success',
                        '임상 기록 저장 완료',
                        '환자 화면에 최신 처방 및 피드백이 실시간 반영되었습니다.'
                      );
                    }}
                    onPatientUpdated={() => {
                      setTick((t) => t + 1);
                      addToast(
                        'success',
                        '진단명 저장 완료',
                        '환자 차트 및 임상 프로필에 새로운 진단명이 정상 반영되었습니다.'
                      );
                    }}
                  />
                );
              })() : (
                <>
                  {therapistTab === 'dashboard' && (
                    <TherapistDashboard
                      currentUser={currentUser}
                      onSelectPatientForProgram={(patientId) => {
                        handleTherapistNavigateTab('prescriptions', patientId);
                      }}
                      onNavigateTab={handleTherapistNavigateTab}
                      onOpenPatientDetail={handleOpenTherapistPatientDetail}
                    />
                  )}

                  {therapistTab === 'patients' && (
                    <TherapistPatientManager
                      currentUser={currentUser}
                      patients={therapistPatients}
                      selectedPatientId={selectedPatientForTherapist}
                      onSelectPatient={setSelectedPatientForTherapist}
                      onNavigateToProgramEditor={(patientId) => {
                        handleTherapistNavigateTab('prescriptions', patientId);
                      }}
                      onNavigateToLogs={handleOpenTherapistPatientDetail}
                      onOpenPatientDetail={handleOpenTherapistPatientDetail}
                      onNavigateToSettings={() => handleTherapistNavigateTab('settings')}
                      onPatientListUpdated={() => setTick((t) => t + 1)}
                    />
                  )}

                  {therapistTab === 'prescriptions' && (
                    <TherapistProgramEditor
                      patients={therapistPatients}
                      selectedPatientId={selectedPatientForTherapist}
                      onSelectPatient={setSelectedPatientForTherapist}
                      onSaveSuccess={handleProgramSaveSuccess}
                    />
                  )}

                  {therapistTab === 'settings' && (
                    <TherapistSettings
                      currentUser={currentUser}
                      onRefreshData={() => setTick((t) => t + 1)}
                      onOpenGuide={() => setIsOnboardingGuideOpen(true)}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        ) : null}
      </main>

      {/* Patient New Feedback Notification Modal (Stage 3-B-3-1: navigation wired, read-state write still excluded) */}
      <PatientFeedbackNotificationModal
        isOpen={shouldShowFeedbackNotificationModal}
        feedbacks={unreadNotificationFeedbacks}
        patient={currentPatient}
        onClose={handleCloseFeedbackNotificationModal}
        onSelectFeedback={handleSelectNotificationFeedback}
        isNavigating={isNavigatingToFeedback}
        navigatingFeedbackId={navigatingFeedbackId}
      />

      {/* Onboarding Guide Modal */}
      {currentUser && (
        <OnboardingGuideModal
          isOpen={isOnboardingGuideOpen}
          onClose={() => setIsOnboardingGuideOpen(false)}
          role={currentUser.role === 'therapist' ? 'therapist' : 'patient'}
          userId={currentUser.id}
        />
      )}

      {/* Logout Confirmation Modal */}
      <LogoutConfirmModal
        isOpen={isLogoutModalOpen}
        userName={currentUser?.name || ''}
        onConfirm={handleConfirmLogout}
        onCancel={() => setIsLogoutModalOpen(false)}
      />

      {/* Unsaved SOAP Note Exit Confirmation Modal */}
      {pendingAppExitAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-soap-dirty-title"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h4 id="app-soap-dirty-title" className="text-sm font-bold text-gray-900">
                저장하지 않은 SOAP 내용이 있습니다
              </h4>
            </div>
            <div className="px-5 py-4 text-xs text-gray-600 leading-relaxed">
              작성 또는 수정 중인 SOAP 노트를 저장하지 않고 이동하면 입력한 내용이 사라집니다. 계속 진행하시겠습니까?
            </div>
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingAppExitAction(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                계속 작성
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingAppExitAction;
                  setPendingAppExitAction(null);
                  setHasUnsavedChartChanges(false);
                  if (action.type === 'tab') {
                    performTherapistNavigateTab(action.tab, action.patientId);
                  } else if (action.type === 'back') {
                    performTherapistBack();
                  } else if (action.type === 'logout') {
                    setIsLogoutModalOpen(true);
                  }
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                저장 안 하고 이동
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
