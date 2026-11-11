/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthUser, Patient, Exercise, AssignedExercise } from './types/rehab';
import { StorageService, subscribeToRehabStore } from './services/storageService';
import { AuthService, subscribeToAuth } from './services/authService';
import { FirebaseService } from './services/firebaseService';
import { getFirebaseAuth } from './services/firebase';

// Common Components
import { Navbar } from './components/common/Navbar';
import { WelcomeLandingView } from './components/common/WelcomeLandingView';
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

  // Unauthenticated screen: 'welcome' | 'login' | 'signup' (Default to 'login' for clean 2-column first screen)
  const [authScreen, setAuthScreen] = useState<'welcome' | 'login' | 'signup'>('login');
  const [signupInitialRole, setSignupInitialRole] = useState<'patient' | 'therapist'>('patient');

  // Therapist invite link / code state
  const [pendingInviteCode, setPendingInviteCode] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('invite') || params.get('code') || '';
    }
    return '';
  });

  const pendingInviteTherapist = React.useMemo(() => {
    if (!pendingInviteCode) return null;
    const therapist = AuthService.findTherapistByConnectionCode(pendingInviteCode);
    if (!therapist || !therapist.connectionCode) return null;
    return {
      name: therapist.name,
      clinic: therapist.clinic,
      connectionCode: therapist.connectionCode
    };
  }, [pendingInviteCode]);

  // Handler for simulating patient invite from Therapist modal
  const handleSimulatePatientInvite = (inviteCode: string) => {
    setPendingInviteCode(inviteCode);
    AuthService.logout();
    setCurrentUser(null);
    setSignupInitialRole('patient');
    setAuthScreen('signup');
    addToast(
      'info',
      '환자 초대 시뮬레이션 모드',
      `초대 코드(${inviteCode})가 연동된 신규 환자 회원가입 화면으로 전환되었습니다.`
    );
  };

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

  // Therapist Selection States
  const [selectedPatientForTherapist, setSelectedPatientForTherapist] = useState<string>('patient-1');

  // Modals & Tools
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState<boolean>(false);
  const [isOnboardingGuideOpen, setIsOnboardingGuideOpen] = useState<boolean>(false);
  const [isMobilePreview, setIsMobilePreview] = useState<boolean>(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Automatically show 3-step onboarding guide on first login/session if not dismissed
  useEffect(() => {
    if (currentUser?.id) {
      const isDismissed = StorageService.getOnboardingGuideDismissed(currentUser.id);
      setIsOnboardingGuideOpen(!isDismissed);
    } else {
      setIsOnboardingGuideOpen(false);
    }
  }, [currentUser?.id]);

  // Initialize storage and verify Firebase backend connection once
  useEffect(() => {
    StorageService.initStorage();
    AuthService.initAccounts();
    FirebaseService.verifyLiveConnection().catch((err) => {
      console.warn('Firebase live verification deferred:', err);
    });
  }, []);

  // Sync patient & therapist remote data from Firestore (Requirement 4 & Connection persistence)
  useEffect(() => {
    if (!currentUser) return;

    // 1. Patient Sync
    if (currentUser.role === 'patient') {
      const authUid = getFirebaseAuth()?.currentUser?.uid;
      // In Firebase Auth, a patient's own ID in Firestore is ALWAYS their auth UID
      const patientId = authUid || currentUser.id;
      // If currentUser is a local demo patient and not the currently logged in Firebase user, skip remote sync
      if (authUid && currentUser.id !== authUid) {
        return;
      }

      // 운동 기록 동기화
      FirebaseService.getWorkoutLogs(patientId).then((remoteLogs) => {
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
        if (remoteConns && remoteConns.length > 0) {
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
      }).catch((e) => console.warn('Sync patient connections deferred:', e));

      // 실시간 환자 프로필 리스너
      const unsubProfile = FirebaseService.subscribeToPatientProfile(patientId, (remotePatient) => {
        if (remotePatient) {
          const localPatient = StorageService.getPatientById(patientId);
          if (localPatient) {
            StorageService.updatePatientInfo(patientId, remotePatient);
          }
        }
      });

      // 실시간 환자 연결 상태 리스너 (치료사의 수락/거절/해제 즉시 반응)
      const unsubConnections = FirebaseService.subscribeToPatientConnections(patientId, (remoteConns) => {
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

      return () => {
        unsubProfile();
        unsubConnections();
      };
    }

    // 2. Therapist Sync: Query connections collection + individual users getDoc (Requirement 4)
    if (currentUser.role === 'therapist') {
      const therapistId = currentUser.id;

      // 연결된 담당 환자 초기 조회
      FirebaseService.getConnectedPatientsForTherapist(therapistId).then((patients) => {
        if (patients && patients.length > 0) {
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
      }).catch((e) => console.warn('Sync therapist patients deferred:', e));

      // 대기 중인 연결 요청 및 전체 연결 초기 조회
      FirebaseService.getConnectionsForTherapist(therapistId).then((conns) => {
        if (conns && conns.length > 0) {
          StorageService.syncRemoteConnections(conns);
          const pendingConns = conns.filter((c) => c.status === 'pending');
          StorageService.syncPendingRequestsFromConnections(pendingConns);
          setTick((t) => t + 1);
        }
      }).catch((e) => console.warn('Sync therapist connections deferred:', e));

      // 실시간 치료사 연결 리스너 (환자의 신규 요청, 연결 해제 즉시 감지)
      const unsubTherapistConns = FirebaseService.subscribeToTherapistConnections(therapistId, (conns) => {
        if (!conns) return;
        StorageService.syncRemoteConnections(conns);
        const pendingConns = conns.filter((c) => c.status === 'pending');
        StorageService.syncPendingRequestsFromConnections(pendingConns);

        // 승인된 연결이 있는 경우 환자 상세 프로필 동기화
        FirebaseService.getConnectedPatientsForTherapist(therapistId).then((patients) => {
          if (patients && patients.length > 0) {
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
        }).catch((e) => console.warn('Sync therapist patients realtime deferred:', e));

        setTick((t) => t + 1);
      });

      return () => {
        unsubTherapistConns();
      };
    }
  }, [currentUser?.id, currentUser?.patientId, currentUser?.role]);

  // Listen to auth changes and storage changes
  const [, setTick] = useState<number>(0);
  useEffect(() => {
    const unsubAuth = subscribeToAuth(() => {
      const user = AuthService.getSessionUser();
      setCurrentUser(user);
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

  // One-click demo logins for Usability Evaluation
  const handleDemoPatientLogin = () => {
    const result = AuthService.login('patient01', 'demo1234');
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setPatientTab('home');
      setActiveExerciseDetail(null);
      addToast('success', '김민수 환자 계정으로 접속했습니다.', '오늘의 재활운동 및 통증 기록을 시연할 수 있습니다.');
    }
  };

  const handleDemoTherapistLogin = () => {
    const result = AuthService.login('therapist01', 'demo1234');
    if (result.success && result.user) {
      setCurrentUser(result.user);
      setTherapistTab('dashboard');
      setDetailedPatientId(null);
      addToast('success', '박건우 물리치료사 계정으로 접속했습니다.', '담당 환자 관리, 운동 처방 및 피드백 작성을 시연할 수 있습니다.');
    }
  };

  // Quick switch between patient and therapist demo accounts during evaluation
  const handleQuickSwitchRole = () => {
    if (currentUser?.role === 'therapist') {
      handleDemoPatientLogin();
    } else {
      handleDemoTherapistLogin();
    }
  };

  // Logout handler
  const handleConfirmLogout = () => {
    const userName = currentUser?.name || '사용자';
    AuthService.logout();
    setCurrentUser(null);
    setIsLogoutModalOpen(false);
    setActiveExerciseDetail(null);
    setAuthScreen('welcome');
    addToast('info', '로그아웃되었습니다.', `${userName} 님의 세션이 안전하게 종료되었습니다.`);
  };

  // Reset demo data handler
  const handleResetData = () => {
    if (confirm('모든 데이터를 초기 시연 데모 상태로 복원하시겠습니까? (수정한 처방 및 수행 기록이 리셋됩니다)')) {
      StorageService.resetAllData();
      setActiveExerciseDetail(null);
      setTick((t) => t + 1);
      addToast('success', '데모 데이터가 초기화되었습니다.', '가상 환자들과 기본 10종 운동 데이터로 복원되었습니다.');
    }
  };

  // Patient detail & completion handlers
  const handleOpenExerciseDetail = (exercise: Exercise, assignmentId: string) => {
    if (!currentUser || currentUser.role !== 'patient' || !currentUser.patientId) return;
    const patient = StorageService.getPatientById(currentUser.patientId);
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

  const handleTherapistNavigateTab = (tab: string, patientId?: string) => {
    setDetailedPatientId(null);
    setTherapistTab(tab);
    if (patientId) {
      setSelectedPatientForTherapist(patientId);
    }
  };

  // Switch to specific patient account from therapist view (presentation testing convenience)
  const handleSwitchToPatientAccount = (patientId: string) => {
    const accounts = AuthService.getAccounts();
    const account = accounts.find((acc) => acc.patientId === patientId);
    if (account) {
      const result = AuthService.login(account.username, account.passwordHash);
      if (result.success && result.user) {
        setCurrentUser(result.user);
        setPatientTab('home');
        setActiveExerciseDetail(null);
        addToast(
          'info',
          `${result.user.name} 환자 계정으로 전환되었습니다.`,
          '지정된 운동 프로그램과 수행 기록을 확인하세요.'
        );
      }
    }
  };

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
  const currentPatient: Patient = currentUser.role === 'patient' && currentUser.patientId
    ? StorageService.getPatientById(currentUser.patientId) || {
        id: currentUser.patientId,
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
        id: 'patient-1',
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
          setDetailedPatientId(null);
          if (currentUser.role === 'patient') {
            setPatientTab(tab);
          } else {
            setTherapistTab(tab);
          }
        }}
        onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
        onResetData={handleResetData}
        isMobilePreview={isMobilePreview}
        onToggleMobilePreview={() => setIsMobilePreview(!isMobilePreview)}
        onQuickSwitchRole={handleQuickSwitchRole}
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
          /* Therapist View Container (PC / Tablet optimized with Sidebar) */
          <div className="flex flex-col lg:flex-row min-h-[calc(100vh-65px)]">
            {/* PC Sidebar */}
            <div className="hidden lg:block shrink-0">
              <TherapistSidebar
                currentTab={therapistTab}
                onTabChange={(tab) => {
                  setDetailedPatientId(null);
                  setTherapistTab(tab);
                }}
                currentUser={currentUser}
                onOpenLogoutModal={() => setIsLogoutModalOpen(true)}
                onSwitchToPatientDemo={() => handleSwitchToPatientAccount('patient-1')}
              />
            </div>

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
                  onBack={() => setDetailedPatientId(null)}
                  onNavigateToProgramEditor={(patientId) => {
                    setSelectedPatientForTherapist(patientId);
                    setDetailedPatientId(null);
                    setTherapistTab('prescriptions');
                  }}
                  onSwitchToPatientView={handleSwitchToPatientAccount}
                  onPatientDisconnected={(patientName) => {
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
                        setSelectedPatientForTherapist(patientId);
                        setDetailedPatientId(null);
                        setTherapistTab('prescriptions');
                      }}
                      onNavigateTab={handleTherapistNavigateTab}
                      onOpenPatientDetail={(patientId) => setDetailedPatientId(patientId)}
                      onSimulatePatientInvite={handleSimulatePatientInvite}
                    />
                  )}

                  {therapistTab === 'patients' && (
                    <TherapistPatientManager
                      currentUser={currentUser}
                      patients={therapistPatients}
                      selectedPatientId={selectedPatientForTherapist}
                      onSelectPatient={setSelectedPatientForTherapist}
                      onNavigateToProgramEditor={(patientId) => {
                        setSelectedPatientForTherapist(patientId);
                        setDetailedPatientId(null);
                        setTherapistTab('prescriptions');
                      }}
                      onNavigateToLogs={(patientId) => {
                        setDetailedPatientId(patientId);
                      }}
                      onSwitchToPatientView={handleSwitchToPatientAccount}
                      onOpenPatientDetail={(patientId) => setDetailedPatientId(patientId)}
                      onNavigateToSettings={() => setTherapistTab('settings')}
                      onSimulatePatientInvite={handleSimulatePatientInvite}
                      onPatientListUpdated={() => setTick((t) => t + 1)}
                    />
                  )}

                  {therapistTab === 'prescriptions' && (
                    <TherapistProgramEditor
                      patients={therapistPatients}
                      selectedPatientId={selectedPatientForTherapist}
                      onSelectPatient={setSelectedPatientForTherapist}
                      onSaveSuccess={handleProgramSaveSuccess}
                      onSwitchToPatientView={handleSwitchToPatientAccount}
                    />
                  )}

                  {therapistTab === 'settings' && (
                    <TherapistSettings
                      currentUser={currentUser}
                      onResetData={handleResetData}
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

      {/* Toast Feedback Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
