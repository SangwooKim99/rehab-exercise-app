/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { Timestamp } from 'firebase/firestore';
import { AuthUser, SoapNote, SoapNoteRevision } from '../../types/rehab';
import {
  FirebaseService,
  isValidSoapCalendarDate,
  MAX_SOAP_FIELD_LENGTH,
  getSoapFieldExceedingMaxLength
} from '../../services/firebaseService';
import { getFirebaseAuth } from '../../services/firebase';
import { formatTherapistDisplayName } from '../../services/authService';
import { AlertTriangle, ChevronDown, ChevronUp, Plus, RefreshCw, X } from 'lucide-react';

export interface SoapNoteSummary {
  id: string;
  noteDate: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
}

interface PatientSoapSectionProps {
  patientId: string;
  currentUser?: AuthUser;
  isConnected: boolean;
  isDisconnected: boolean;
  onDirtyChange?: (dirty: boolean) => void;
}

interface SoapDraft {
  encounterDate: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

type EditorMode = 'view' | 'create' | 'edit';

type PendingInternalAction =
  | { type: 'select'; noteId: string }
  | { type: 'create' }
  | { type: 'cancel' }
  | { type: 'reload-conflict' };

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function createEmptyDraft(dateStr = getTodayDateString()): SoapDraft {
  return {
    encounterDate: dateStr,
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  };
}

function formatTimestampKo(ts: Timestamp | null | undefined): string {
  if (!ts || typeof ts.toDate !== 'function') {
    return '-';
  }
  try {
    return ts.toDate().toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
}

function mapSoapErrorMessage(err: any, action: 'load' | 'save' | 'revisions'): {
  message: string;
  isVersionConflict?: boolean;
} {
  const code = err?.code || '';
  if (code === 'permission-denied') {
    if (typeof err?.message === 'string' && err.message.includes('[안전장치 차단]')) {
      return {
        message: err.message
      };
    }
    if (action === 'save') {
      return {
        message: '권한이 없어 저장할 수 없습니다. 현재 환자와 연결 완료(connected) 상태인 작성자 본인인지 확인해 주세요.'
      };
    }
    return {
      message: 'SOAP 기록에 접근할 권한이 없습니다. 환자와의 연결 상태를 확인해 주세요.'
    };
  }
  if (code === 'unauthenticated') {
    return {
      message: '로그인 세션이 만료되었거나 확인할 수 없습니다. 다시 로그인한 뒤 시도해 주세요.'
    };
  }
  if (code === 'version-conflict') {
    return {
      message:
        err?.message ||
        '다른 화면 또는 기기에서 이미 이 기록이 수정되었습니다. 최신 내용을 다시 불러온 뒤 수정해 주세요.',
      isVersionConflict: true
    };
  }
  if (code === 'no-changes') {
    return {
      message: '변경된 내용이 없습니다. 수정할 항목을 변경한 뒤 저장해 주세요.'
    };
  }
  if (code === 'invalid-argument') {
    return {
      message: err?.message || '입력값을 확인해 주세요.'
    };
  }
  if (code === 'not-found') {
    return {
      message: err?.message || '해당 SOAP 기록을 찾을 수 없습니다. 목록을 새로고침해 주세요.'
    };
  }
  if (code === 'unavailable' || code === 'deadline-exceeded') {
    return {
      message: '네트워크 연결이 불안정하여 요청을 완료하지 못했습니다. 작성 중인 내용은 유지되며, 연결 확인 후 다시 시도해 주세요.'
    };
  }
  return {
    message: err?.message || '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.'
  };
}

/**
 * 환자 차트 - SOAP 노트 탭 (2단계: 작성·수정·조회 및 수정 이력 보존)
 */
export const PatientSoapSection: React.FC<PatientSoapSectionProps> = ({
  patientId,
  currentUser,
  isConnected,
  isDisconnected,
  onDirtyChange
}) => {
  const [authUid, setAuthUid] = useState<string>(() => {
    const auth = getFirebaseAuth();
    return auth?.currentUser?.uid || currentUser?.therapistId || currentUser?.id || '';
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setAuthUid(currentUser?.therapistId || currentUser?.id || '');
      return;
    }
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUid(user?.uid || currentUser?.therapistId || currentUser?.id || '');
    });
    return () => unsub();
  }, [currentUser?.id, currentUser?.therapistId]);

  const [notes, setNotes] = useState<SoapNote[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditorMode>('view');
  const [editingNote, setEditingNote] = useState<SoapNote | null>(null);

  const [draft, setDraft] = useState<SoapDraft>(() => createEmptyDraft());
  const [initialDraft, setInitialDraft] = useState<SoapDraft>(() => createEmptyDraft());

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string>('');
  const [hasVersionConflict, setHasVersionConflict] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // 수정 이력 상태
  const [isRevisionsOpen, setIsRevisionsOpen] = useState<boolean>(false);
  const [revisions, setRevisions] = useState<SoapNoteRevision[]>([]);
  const [revisionsLoadedForId, setRevisionsLoadedForId] = useState<string | null>(null);
  const [isLoadingRevisions, setIsLoadingRevisions] = useState<boolean>(false);
  const [revisionsError, setRevisionsError] = useState<string>('');

  // 내부 미저장 변경 경고 모달 상태
  const [pendingAction, setPendingAction] = useState<PendingInternalAction | null>(null);

  const isDirty = useMemo(() => {
    if (mode !== 'create' && mode !== 'edit') return false;
    return (
      draft.encounterDate !== initialDraft.encounterDate ||
      draft.subjective !== initialDraft.subjective ||
      draft.objective !== initialDraft.objective ||
      draft.assessment !== initialDraft.assessment ||
      draft.plan !== initialDraft.plan
    );
  }, [mode, draft, initialDraft]);

  const onDirtyChangeRef = useRef(onDirtyChange);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  useEffect(() => {
    return () => {
      onDirtyChangeRef.current?.(false);
    };
  }, []);

  // 브라우저 새로고침 / 창 닫기 이탈 경고
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const clearClientSoapState = useCallback(() => {
    setNotes([]);
    setSelectedNoteId(null);
    setMode('view');
    setEditingNote(null);
    const empty = createEmptyDraft();
    setDraft(empty);
    setInitialDraft(empty);
    setLoadError('');
    setSaveError('');
    setHasVersionConflict(false);
    setSuccessMsg('');
    setIsRevisionsOpen(false);
    setRevisions([]);
    setRevisionsLoadedForId(null);
    setRevisionsError('');
    setPendingAction(null);
    onDirtyChangeRef.current?.(false);
  }, []);

  const loadNotes = useCallback(async () => {
    if (!patientId || !isConnected) {
      clearClientSoapState();
      return;
    }

    setIsLoading(true);
    setLoadError('');
    try {
      const fetched = await FirebaseService.getSoapNotes(patientId);
      setNotes(fetched);
      setSelectedNoteId((prev) => {
        if (prev && fetched.some((n) => n.id === prev)) {
          return prev;
        }
        return fetched.length > 0 ? fetched[0].id : null;
      });
    } catch (err: any) {
      const mapped = mapSoapErrorMessage(err, 'load');
      setLoadError(mapped.message);
      setNotes([]);
      setSelectedNoteId(null);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, isConnected, clearClientSoapState]);

  // 연결 해제 또는 비연결 상태 전환 시 즉시 메모리/상태 비우기 (정책 1-2)
  useEffect(() => {
    let cancelled = false;
    if (!isConnected || !patientId) {
      clearClientSoapState();
      return;
    }

    const fetchInitial = async () => {
      setIsLoading(true);
      setLoadError('');
      try {
        const fetched = await FirebaseService.getSoapNotes(patientId);
        if (cancelled) return;
        setNotes(fetched);
        setSelectedNoteId((prev) => {
          if (prev && fetched.some((n) => n.id === prev)) return prev;
          return fetched.length > 0 ? fetched[0].id : null;
        });
      } catch (err: any) {
        if (cancelled) return;
        const mapped = mapSoapErrorMessage(err, 'load');
        setLoadError(mapped.message);
        setNotes([]);
        setSelectedNoteId(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchInitial();

    return () => {
      cancelled = true;
    };
  }, [patientId, isConnected, clearClientSoapState]);

  const selectedNote = useMemo(
    () => notes.find((n) => n.id === selectedNoteId) || null,
    [notes, selectedNoteId]
  );

  // 선택된 노트가 바뀌면 수정 이력 패널 초기화
  useEffect(() => {
    setIsRevisionsOpen(false);
    setRevisions([]);
    setRevisionsLoadedForId(null);
    setRevisionsError('');
  }, [selectedNoteId]);

  const handleToggleRevisions = async () => {
    if (!selectedNote || !isConnected) return;
    if (isRevisionsOpen) {
      setIsRevisionsOpen(false);
      return;
    }

    setIsRevisionsOpen(true);
    if (revisionsLoadedForId === selectedNote.id) {
      return;
    }

    setIsLoadingRevisions(true);
    setRevisionsError('');
    try {
      const list = await FirebaseService.getSoapNoteRevisions(selectedNote.id);
      setRevisions(list);
      setRevisionsLoadedForId(selectedNote.id);
    } catch (err: any) {
      const mapped = mapSoapErrorMessage(err, 'revisions');
      setRevisionsError(mapped.message);
    } finally {
      setIsLoadingRevisions(false);
    }
  };

  const executeInternalAction = (action: PendingInternalAction) => {
    if (action.type === 'reload-conflict') {
      void handleReloadAfterConflict();
      return;
    }

    setSaveError('');
    setHasVersionConflict(false);
    setSuccessMsg('');

    if (action.type === 'select') {
      setMode('view');
      setEditingNote(null);
      const reset = createEmptyDraft();
      setDraft(reset);
      setInitialDraft(reset);
      setSelectedNoteId(action.noteId);
    } else if (action.type === 'create') {
      const empty = createEmptyDraft();
      setDraft(empty);
      setInitialDraft(empty);
      setEditingNote(null);
      setMode('create');
    } else if (action.type === 'cancel') {
      setMode('view');
      setEditingNote(null);
      const reset = createEmptyDraft();
      setDraft(reset);
      setInitialDraft(reset);
    }
  };

  const requestInternalAction = (action: PendingInternalAction) => {
    if (isSaving) return;
    if (isDirty) {
      setPendingAction(action);
      return;
    }
    executeInternalAction(action);
  };

  const handleStartEdit = (note: SoapNote) => {
    if (!isConnected || note.therapistId !== authUid || isSaving) return;
    setSaveError('');
    setHasVersionConflict(false);
    setSuccessMsg('');
    const editDraft: SoapDraft = {
      encounterDate: note.encounterDate || getTodayDateString(),
      subjective: note.subjective || '',
      objective: note.objective || '',
      assessment: note.assessment || '',
      plan: note.plan || ''
    };
    setEditingNote(note);
    setDraft(editDraft);
    setInitialDraft(editDraft);
    setMode('edit');
  };

  const handleReloadAfterConflict = async () => {
    if (!isConnected || !editingNote) return;
    setIsSaving(true);
    setSaveError('');
    setHasVersionConflict(false);
    try {
      const refreshed = await FirebaseService.getSoapNotes(patientId);
      setNotes(refreshed);
      const latest = refreshed.find((n) => n.id === editingNote.id);
      if (latest) {
        setSelectedNoteId(latest.id);
        setEditingNote(latest);
        const latestDraft: SoapDraft = {
          encounterDate: latest.encounterDate,
          subjective: latest.subjective,
          objective: latest.objective,
          assessment: latest.assessment,
          plan: latest.plan
        };
        setDraft(latestDraft);
        setInitialDraft(latestDraft);
        setRevisionsLoadedForId(null);
        setRevisions([]);
        setIsRevisionsOpen(false);
        setSuccessMsg(`최신 SOAP 내용(v${latest.version || 1})을 불러왔습니다. 변경 사항을 확인한 뒤 다시 수정해 주세요.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } else {
        setMode('view');
        setEditingNote(null);
      }
    } catch (err: any) {
      const mapped = mapSoapErrorMessage(err, 'load');
      setSaveError(mapped.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving || !isConnected) return;

    setSaveError('');
    setHasVersionConflict(false);
    setSuccessMsg('');

    const encounterDate = draft.encounterDate.trim();
    const subjective = draft.subjective.trim();
    const objective = draft.objective.trim();
    const assessment = draft.assessment.trim();
    const plan = draft.plan.trim();

    if (!isValidSoapCalendarDate(encounterDate)) {
      setSaveError('치료 또는 평가 날짜가 유효하지 않습니다. 실제 달력에 존재하는 날짜(YYYY-MM-DD, 윤년 2월 29일 및 월별 말일 포함)를 입력해 주세요.');
      return;
    }

    if (!subjective || !objective || !assessment || !plan) {
      setSaveError('Subjective, Objective, Assessment, Plan 항목을 모두 입력해 주세요. (공백만 입력할 수 없습니다)');
      return;
    }

    const exceededField = getSoapFieldExceedingMaxLength({
      subjective,
      objective,
      assessment,
      plan
    });
    if (exceededField) {
      setSaveError(
        `${exceededField.label} 항목이 최대 입력 길이(${MAX_SOAP_FIELD_LENGTH.toLocaleString()}자)를 초과했습니다(현재 ${exceededField.length.toLocaleString()}자). 각 항목은 ${MAX_SOAP_FIELD_LENGTH.toLocaleString()}자 이하로 입력해 주세요.`
      );
      return;
    }

    if (mode === 'edit' && editingNote) {
      const isSameAsOriginal =
        encounterDate === (editingNote.encounterDate || '').trim() &&
        subjective === (editingNote.subjective || '').trim() &&
        objective === (editingNote.objective || '').trim() &&
        assessment === (editingNote.assessment || '').trim() &&
        plan === (editingNote.plan || '').trim();
      if (isSameAsOriginal) {
        setSaveError('변경된 내용이 없습니다. 수정할 항목을 변경한 뒤 저장해 주세요.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const displayName = currentUser?.name
        ? formatTherapistDisplayName(currentUser.name)
        : undefined;

      if (mode === 'create') {
        const created = await FirebaseService.createSoapNote({
          patientId,
          therapistDisplayName: displayName,
          encounterDate,
          subjective,
          objective,
          assessment,
          plan
        });

        setNotes((prev) => {
          const next = [created, ...prev.filter((n) => n.id !== created.id)];
          return next.sort((a, b) => {
            const cmp = (b.encounterDate || '').localeCompare(a.encounterDate || '');
            if (cmp !== 0) return cmp;
            const at = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
            const bt = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
            return bt - at;
          });
        });

        setSelectedNoteId(created.id);
        setMode('view');
        setEditingNote(null);
        const reset = createEmptyDraft();
        setDraft(reset);
        setInitialDraft(reset);
        setSuccessMsg('새 SOAP 노트가 안전하게 저장되었습니다.');
        setTimeout(() => setSuccessMsg(''), 4000);
      } else if (mode === 'edit' && editingNote) {
        const updated = await FirebaseService.updateSoapNote({
          noteId: editingNote.id,
          expectedVersion: editingNote.version || 1,
          therapistDisplayName: displayName,
          encounterDate,
          subjective,
          objective,
          assessment,
          plan
        });

        setNotes((prev) =>
          prev
            .map((n) => (n.id === updated.id ? updated : n))
            .sort((a, b) => {
              const cmp = (b.encounterDate || '').localeCompare(a.encounterDate || '');
              if (cmp !== 0) return cmp;
              const at = a.createdAt && typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : 0;
              const bt = b.createdAt && typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : 0;
              return bt - at;
            })
        );

        setSelectedNoteId(updated.id);
        setMode('view');
        setEditingNote(null);
        const reset = createEmptyDraft();
        setDraft(reset);
        setInitialDraft(reset);
        setRevisionsLoadedForId(null);
        setRevisions([]);
        setIsRevisionsOpen(false);
        setSuccessMsg(`SOAP 노트가 수정되었으며 이전 내용(v${editingNote.version})이 수정 이력에 보존되었습니다.`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      const mapped = mapSoapErrorMessage(err, 'save');
      setSaveError(mapped.message);
      setHasVersionConflict(Boolean(mapped.isVersionConflict));
    } finally {
      setIsSaving(false);
    }
  };

  // 연결 해제 또는 미연결 상태: 기존 캐시/화면을 완전히 비우고 안내만 표시
  if (!isConnected) {
    return (
      <div className="py-16 border-t border-b border-gray-200 text-center space-y-2">
        <p className="text-sm font-medium text-gray-700">
          {isDisconnected
            ? '연결이 해제되어 SOAP 기록을 열람하거나 작성할 수 없습니다.'
            : '담당 환자와 연결 완료된 상태에서만 SOAP 기록을 열람하고 작성할 수 있습니다.'}
        </p>
        <p className="text-xs text-gray-500">
          기존에 저장된 SOAP 기록 및 수정 이력은 삭제되지 않고 안전하게 보존됩니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {successMsg && (
        <div
          role="status"
          className="px-4 py-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-900"
        >
          {successMsg}
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center justify-between gap-3 text-xs text-rose-900"
        >
          <span>{loadError}</span>
          <button
            type="button"
            onClick={loadNotes}
            className="px-2.5 py-1 bg-white border border-rose-200 rounded text-xs font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span>다시 시도</span>
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] lg:grid-cols-[260px_1fr] gap-6 md:gap-8 items-start">
        {/* 좌측: 날짜별 SOAP 기록 목록 */}
        <aside className="border border-gray-200 rounded-lg bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-gray-900">
              SOAP 기록 ({notes.length})
            </h2>
            <button
              type="button"
              onClick={() => requestInternalAction({ type: 'create' })}
              disabled={isSaving}
              className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>새 SOAP 작성</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-12 px-4 text-center text-xs text-gray-500">
              SOAP 기록을 불러오는 중입니다...
            </div>
          ) : notes.length === 0 ? (
            <div className="py-12 px-4 text-center space-y-2">
              <p className="text-xs text-gray-500">작성된 SOAP 기록이 없습니다.</p>
              {mode !== 'create' && (
                <button
                  type="button"
                  onClick={() => requestInternalAction({ type: 'create' })}
                  className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
                >
                  첫 SOAP 노트 작성하기
                </button>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 max-h-[540px] overflow-y-auto" aria-label="SOAP 기록 날짜별 목록">
              {notes.map((note) => {
                const isSelected = mode === 'view' && selectedNoteId === note.id;
                const isAuthor = Boolean(authUid) && note.therapistId === authUid;
                return (
                  <li key={note.id}>
                    <button
                      type="button"
                      onClick={() => requestInternalAction({ type: 'select', noteId: note.id })}
                      className={`w-full text-left px-4 py-3 transition-colors cursor-pointer border-l-2 ${
                        isSelected
                          ? 'bg-blue-50/70 border-blue-600'
                          : 'border-transparent hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`text-xs font-mono tabular-nums font-semibold ${
                            isSelected ? 'text-blue-700' : 'text-gray-900'
                          }`}
                        >
                          {note.encounterDate}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono tabular-nums">
                          v{note.version || 1}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-xs">
                        <span className="text-gray-600 truncate">{note.therapistName}</span>
                        {!isAuthor && (
                          <span className="text-[11px] text-gray-400 shrink-0">읽기 전용</span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 line-clamp-1">
                        {note.subjective}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>

        {/* 우측: 상세 보기 또는 작성/수정 폼 */}
        <section className="min-w-0">
          {mode === 'create' || mode === 'edit' ? (
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              <div className="pb-4 border-b border-gray-200 flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    {mode === 'create' ? '새 SOAP 노트 작성' : `SOAP 노트 수정 (v${editingNote?.version || 1})`}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {mode === 'create'
                      ? '치료 또는 평가 날짜와 S·O·A·P 네 항목을 모두 직접 입력해 주세요.'
                      : '수정 시 기존 버전 내용은 수정 이력(revisions)에 자동 보존됩니다.'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => requestInternalAction({ type: 'cancel' })}
                    disabled={isSaving}
                    className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? '저장 중...' : '저장'}
                  </button>
                </div>
              </div>

              {saveError && (
                <div
                  role="alert"
                  className="px-4 py-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-900 space-y-2"
                >
                  <p className="font-medium">{saveError}</p>
                  {hasVersionConflict && (
                    <button
                      type="button"
                      onClick={() => requestInternalAction({ type: 'reload-conflict' })}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-white border border-rose-300 rounded text-xs font-medium text-rose-700 hover:bg-rose-50 inline-flex items-center gap-1.5 cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>최신 내용 다시 불러오기</span>
                    </button>
                  )}
                </div>
              )}

              {/* 평가/치료 날짜 */}
              <div>
                <label
                  htmlFor="soap-encounter-date"
                  className="block text-xs font-medium text-gray-700 mb-1.5"
                >
                  치료 / 평가 날짜 <span className="text-rose-500">*</span>
                </label>
                <input
                  id="soap-encounter-date"
                  type="date"
                  value={draft.encounterDate}
                  onChange={(e) => setDraft((prev) => ({ ...prev, encounterDate: e.target.value }))}
                  disabled={isSaving}
                  required
                  className="w-full sm:w-56 text-sm px-3 py-2 rounded-lg border border-gray-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-mono tabular-nums disabled:bg-gray-50"
                />
              </div>

              {/* 하나의 정돈된 S / O / A / P 양식 */}
              <div className="border-t border-b border-gray-200 divide-y divide-gray-200">
                <div className="py-4">
                  <label
                    htmlFor="soap-subjective"
                    className="block text-xs font-semibold text-gray-900 mb-1.5"
                  >
                    S · Subjective (주관적 호소) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="soap-subjective"
                    rows={3}
                    value={draft.subjective}
                    onChange={(e) => setDraft((prev) => ({ ...prev, subjective: e.target.value }))}
                    disabled={isSaving}
                    placeholder="환자가 표현한 통증 양상, 불편감, 일상생활 변화 등을 기록하세요."
                    required
                    className="w-full text-sm p-3 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-gray-50"
                  />
                </div>

                <div className="py-4">
                  <label
                    htmlFor="soap-objective"
                    className="block text-xs font-semibold text-gray-900 mb-1.5"
                  >
                    O · Objective (객관적 소견) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="soap-objective"
                    rows={3}
                    value={draft.objective}
                    onChange={(e) => setDraft((prev) => ({ ...prev, objective: e.target.value }))}
                    disabled={isSaving}
                    placeholder="관절가동범위(ROM), 근력 검사(MMT), 자세·보행 관찰 등 객관적 측정 결과를 기록하세요."
                    required
                    className="w-full text-sm p-3 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-gray-50"
                  />
                </div>

                <div className="py-4">
                  <label
                    htmlFor="soap-assessment"
                    className="block text-xs font-semibold text-gray-900 mb-1.5"
                  >
                    A · Assessment (평가 및 해석) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="soap-assessment"
                    rows={3}
                    value={draft.assessment}
                    onChange={(e) => setDraft((prev) => ({ ...prev, assessment: e.target.value }))}
                    disabled={isSaving}
                    placeholder="기능적 문제, 회복 경과 및 임상적 해석을 기록하세요."
                    required
                    className="w-full text-sm p-3 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-gray-50"
                  />
                </div>

                <div className="py-4">
                  <label
                    htmlFor="soap-plan"
                    className="block text-xs font-semibold text-gray-900 mb-1.5"
                  >
                    P · Plan (치료 계획) <span className="text-rose-500">*</span>
                  </label>
                  <textarea
                    id="soap-plan"
                    rows={3}
                    value={draft.plan}
                    onChange={(e) => setDraft((prev) => ({ ...prev, plan: e.target.value }))}
                    disabled={isSaving}
                    placeholder="다음 회기 중재 방향, 홈 프로그램 조정 및 환자 교육 계획을 기록하세요."
                    required
                    className="w-full text-sm p-3 rounded-lg border border-gray-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 disabled:bg-gray-50"
                  />
                </div>
              </div>
            </form>
          ) : selectedNote ? (
            <div className="space-y-6">
              {/* 상세 상단 메타 정보 */}
              <div className="pb-4 border-b border-gray-200 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-baseline gap-2.5 flex-wrap">
                    <h3 className="text-lg font-bold text-gray-900 font-mono tabular-nums">
                      {selectedNote.encounterDate}
                    </h3>
                    <span className="text-sm font-medium text-gray-700">
                      작성자: {selectedNote.therapistName}
                    </span>
                    <span className="text-xs font-mono text-gray-400 tabular-nums">
                      v{selectedNote.version || 1}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 flex-wrap text-xs text-gray-500">
                    <span>작성일 {formatTimestampKo(selectedNote.createdAt)}</span>
                    <span>
                      최종 수정일 {formatTimestampKo(selectedNote.updatedAt)}
                      {selectedNote.updatedByName && selectedNote.version > 1
                        ? ` (${selectedNote.updatedByName})`
                        : ''}
                    </span>
                  </div>
                </div>

                <div className="shrink-0 self-start">
                  {authUid && selectedNote.therapistId === authUid ? (
                    <button
                      type="button"
                      onClick={() => handleStartEdit(selectedNote)}
                      className="px-3.5 py-1.5 text-xs font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50/70 border border-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      수정
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">
                      작성자 본인만 수정 가능 · 읽기 전용
                    </span>
                  )}
                </div>
              </div>

              {/* S / O / A / P 통합 양식 */}
              <dl className="border-t border-b border-gray-200 divide-y divide-gray-100 text-sm">
                <div className="py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5">
                    S · Subjective
                  </dt>
                  <dd className="text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {selectedNote.subjective}
                  </dd>
                </div>

                <div className="py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5">
                    O · Objective
                  </dt>
                  <dd className="text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {selectedNote.objective}
                  </dd>
                </div>

                <div className="py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5">
                    A · Assessment
                  </dt>
                  <dd className="text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {selectedNote.assessment}
                  </dd>
                </div>

                <div className="py-4 grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-2">
                  <dt className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-0.5">
                    P · Plan
                  </dt>
                  <dd className="text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                    {selectedNote.plan}
                  </dd>
                </div>
              </dl>

              {/* 수정 이력(revisions) 조회 영역 */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleToggleRevisions}
                  className="text-xs font-medium text-gray-600 hover:text-gray-900 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>
                    수정 이력 보기
                    {selectedNote.version > 1 ? ` (${selectedNote.version - 1}건)` : ''}
                  </span>
                  {isRevisionsOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {isRevisionsOpen && (
                  <div className="mt-3 border-t border-gray-200 pt-3 space-y-3">
                    {isLoadingRevisions ? (
                      <p className="text-xs text-gray-500 py-4">수정 이력을 불러오는 중입니다...</p>
                    ) : revisionsError ? (
                      <p className="text-xs text-rose-600 py-2">{revisionsError}</p>
                    ) : revisions.length === 0 ? (
                      <p className="text-xs text-gray-500 py-2">
                        아직 수정 이력이 없습니다. (최초 작성 상태 v1)
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-100 border-b border-gray-200">
                        {revisions.map((rev) => (
                          <div key={rev.id} className="py-3.5 space-y-2 text-xs">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className="font-semibold text-gray-800">
                                이전 기록 (v{rev.version}) · 평가일 {rev.previousEncounterDate}
                              </span>
                              <span className="text-gray-500">
                                수정자: {rev.editedByName} · {formatTimestampKo(rev.editedAt)}
                              </span>
                            </div>
                            <div className="grid grid-cols-1 gap-1.5 text-gray-600 bg-gray-50/70 rounded-lg p-3">
                              <p className="whitespace-pre-wrap break-words">
                                <span className="font-semibold text-gray-700">S:</span> {rev.previousSubjective}
                              </p>
                              <p className="whitespace-pre-wrap break-words">
                                <span className="font-semibold text-gray-700">O:</span> {rev.previousObjective}
                              </p>
                              <p className="whitespace-pre-wrap break-words">
                                <span className="font-semibold text-gray-700">A:</span> {rev.previousAssessment}
                              </p>
                              <p className="whitespace-pre-wrap break-words">
                                <span className="font-semibold text-gray-700">P:</span> {rev.previousPlan}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="py-16 border-t border-b border-gray-200 text-center space-y-2">
              <p className="text-sm font-medium text-gray-500">
                아직 작성된 SOAP 기록이 없습니다.
              </p>
              <button
                type="button"
                onClick={() => requestInternalAction({ type: 'create' })}
                className="text-xs font-medium text-blue-600 hover:underline cursor-pointer"
              >
                새 SOAP 작성하기
              </button>
            </div>
          )}
        </section>
      </div>

      {/* 미저장 내용 확인 모달 (window.confirm 대신 앱 내 모달 사용) */}
      {pendingAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="soap-dirty-guard-title"
        >
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <h4 id="soap-dirty-guard-title" className="text-sm font-bold text-gray-900">
                  저장하지 않은 SOAP 내용이 있습니다
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-4 text-xs text-gray-600 leading-relaxed">
              {pendingAction.type === 'reload-conflict'
                ? '최신 내용을 다시 불러오면 현재 수정 중인 입력 내용이 최신 기록으로 덮어써져 사라집니다. 필요한 내용을 먼저 복사해 두었는지 확인해 주세요. 최신 내용을 불러오시겠습니까?'
                : '작성 또는 수정 중인 SOAP 노트를 저장하지 않고 이동하면 입력한 내용이 사라집니다. 계속 이동하시겠습니까?'}
            </div>

            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/60 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                계속 작성
              </button>
              <button
                type="button"
                onClick={() => {
                  const action = pendingAction;
                  setPendingAction(null);
                  executeInternalAction(action);
                }}
                className="px-3.5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg cursor-pointer"
              >
                {pendingAction.type === 'reload-conflict' ? '최신 내용 불러오기' : '저장 안 하고 이동'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
