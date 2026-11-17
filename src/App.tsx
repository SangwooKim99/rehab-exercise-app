/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthUser, Patient, Exercise, AssignedExercise } from './types/rehab';
import { StorageService, subscribeToRehabStore } from './services/storageService';
import { AuthService, subscribeToAuth } from './services/authService';
import { FirebaseService } from './services/firebaseService';
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

  useEffect(() => {
    if (!detailedPatientId) {
      setHasUnsavedChartChanges(false);
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

  // Listen to auth changes and storage changes
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const unsubAuth = subscribeToAuth(() => {
      const user = AuthService.getSessionUser();
      setCurrentUser(user);
      setTherapistNavHistory([]);
      setDetailedPatientId(null);
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
    setCurrentUser(null);
    setIsLogoutModalOpen(false);
    setActiveExerciseDetail(null);
    setDetailedPatientId(null);
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
        selectedPatientId: selectedPatientForTherapist
      };
      const last = prev[prev.length - 1];
      if (
        last &&
        last.tab === currentSnapshot.tab &&
        last.detailedPatientId === currentSnapshot.detailedPatientId &&
        last.selectedPatientId === currentSnapshot.selectedPatientId
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

  const handleOpenTherapistPatientDetail = (patientId: string) => {
    if (!patientId) return;
    if (detailedPatientId !== patientId) {
      pushTherapistHistory();
    }
    setSelectedPatientForTherapist(patientId);
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
        selectedPatientId: candidate.selectedPatientId
      };
      break;
    }

    setTherapistNavHistory(nextHistory);
    setHasUnsavedChartChanges(false);

    if (targetState) {
      setTherapistTab(targetState.tab);
      setDetailedPatientId(targetState.detailedPatientId);
      if (targetState.selectedPatientId && validPatientIds.has(targetState.selectedPatientId)) {
        setSelectedPatientForTherapist(targetState.selectedPatientId);
      }
      return;
    }

    // Fallback when no previous history entry exists
    if (detailedPatientId !== null) {
      setDetailedPatientId(null);
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
                    <PatientHistory patient={currentPatient} />
                  ) : (
                    <PatientProfile
                      patient={currentPatient}
                      onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
                      onConnectionUpdated={() => setTick((t) => t + 1)}
                    />
                  )}
                </div>

                {/* Bottom Navigation for Mobile Preview */}
                <PatientBottomNav
                  currentTab={patientTab}
                  onTabChange={(tab) => {
                    setActiveExerciseDetail(null);
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
                  <PatientHistory patient={currentPatient} />
                ) : (
                  <PatientProfile
                    patient={currentPatient}
                    onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
                    onConnectionUpdated={() => setTick((t) => t + 1)}
                    onOpenGuide={() => setIsOnboardingGuideOpen(true)}
                  />
                )}

                {/* Mobile Bottom Navigation Bar */}
                <PatientBottomNav
                  currentTab={patientTab}
                  onTabChange={(tab) => {
                    setActiveExerciseDetail(null);
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
              {detailedPatientId ? (
                <TherapistPatientDetailView
                  currentUser={currentUser}
                  patient={
                    allPatients.find((p) => p.id === detailedPatientId) ||
                    therapistPatients[0] ||
                    allPatients[0]
                  }
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
                          ? { ...entry, detailedPatientId: null }
                          : entry
                      )
                    );
                    setDetailedPatientId(null);
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
              ) : (
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
