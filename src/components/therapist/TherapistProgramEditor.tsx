/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, Exercise, AssignedExercise, formatPatientDiagnosis } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import {
  Plus,
  Trash2,
  Save,
  Dumbbell,
  X,
  ChevronDown,
  Search
} from 'lucide-react';
import { ALL_BODY_PARTS, BodyPartBadge } from '../common/BodyPartIcons';

interface TherapistProgramEditorProps {
  patients: Patient[];
  selectedPatientId: string;
  onSelectPatient: (patientId: string) => void;
  onSaveSuccess: (patientName: string) => void;
}

export const TherapistProgramEditor: React.FC<TherapistProgramEditorProps> = ({
  patients,
  selectedPatientId,
  onSelectPatient,
  onSaveSuccess
}) => {
  const library = StorageService.getExerciseLibrary();
  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0];

  // Editable working copy of assigned program for the current patient
  const [workingProgram, setWorkingProgram] = useState<AssignedExercise[]>(
    currentPatient ? [...currentPatient.assignedProgram] : []
  );

  // Sync working copy whenever selectedPatientId or currentPatient changes
  React.useEffect(() => {
    if (currentPatient) {
      setWorkingProgram([...currentPatient.assignedProgram]);
    } else {
      setWorkingProgram([]);
    }
  }, [selectedPatientId, currentPatient?.id]);

  // When patient selection changes via dropdown, reset working copy
  const handlePatientChange = (patientId: string) => {
    onSelectPatient(patientId);
    const p = patients.find((pat) => pat.id === patientId);
    if (p) {
      setWorkingProgram([...p.assignedProgram]);
    }
  };

  // Add Exercise Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [modalCategory, setModalCategory] = useState<string>('all');
  const [modalBodyPart, setModalBodyPart] = useState<string>('all');
  const [modalSearch, setModalSearch] = useState<string>('');
  const [selectedLibraryExercise, setSelectedLibraryExercise] = useState<Exercise | null>(null);

  // New exercise prescription form fields
  const [newReps, setNewReps] = useState<number>(10);
  const [newSets, setNewSets] = useState<number>(3);
  const [newFrequency, setNewFrequency] = useState<string>('주 3~4회');
  const [newNotes, setNewNotes] = useState<string>('');

  const handleSelectLibraryExercise = (ex: Exercise) => {
    setSelectedLibraryExercise(ex);
    setNewReps(ex.defaultReps);
    setNewSets(ex.defaultSets);
    setNewFrequency(ex.defaultFrequency);
    setNewNotes('');
  };

  const handleAddExerciseToWorkingProgram = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLibraryExercise) return;

    if (newSets <= 0 || newReps <= 0) {
      alert('세트 수와 반복 횟수는 1 이상이어야 합니다.');
      return;
    }

    const newAssignment: AssignedExercise = {
      assignmentId: `assign-${Date.now()}`,
      exerciseId: selectedLibraryExercise.id,
      reps: newReps,
      sets: newSets,
      frequency: newFrequency.trim() || '주 3회',
      customNotes: newNotes.trim(),
      assignedDate: StorageService.getTodayDateString()
    };

    setWorkingProgram([...workingProgram, newAssignment]);
    setIsAddModalOpen(false);
    setSelectedLibraryExercise(null);
  };

  const handleRemoveExercise = (assignmentId: string) => {
    if (confirm('해당 운동을 대상자의 처방 프로그램에서 삭제하시겠습니까?')) {
      setWorkingProgram(workingProgram.filter((item) => item.assignmentId !== assignmentId));
    }
  };

  const handleUpdateItem = (
    assignmentId: string,
    field: keyof AssignedExercise,
    value: string | number
  ) => {
    setWorkingProgram(
      workingProgram.map((item) => {
        if (item.assignmentId === assignmentId) {
          return { ...item, [field]: value };
        }
        return item;
      })
    );
  };

  const handleSaveProgram = () => {
    if (!currentPatient) return;

    // Validate
    for (const item of workingProgram) {
      if (item.sets <= 0 || item.reps <= 0) {
        alert('모든 운동의 세트 수와 반복 횟수는 1 이상이어야 합니다.');
        return;
      }
    }

    const success = StorageService.updatePatientProgram(currentPatient.id, workingProgram);
    if (success) {
      onSaveSuccess(currentPatient.name);
    }
  };

  const categories = [
    { id: 'all', label: '전체' },
    { id: '코어 안정화', label: '코어 안정화' },
    { id: '근력 강화', label: '근력 강화' },
    { id: '관절 가동성', label: '관절 가동성' },
    { id: '유연성/스트레칭', label: '유연성/스트레칭' },
    { id: '기능적 움직임', label: '기능적 움직임' }
  ];

  const filteredLibrary = library.filter((e) => {
    if (modalCategory !== 'all' && e.category !== modalCategory) return false;
    if (modalBodyPart !== 'all' && (!e.bodyParts || !e.bodyParts.includes(modalBodyPart as any))) return false;
    if (modalSearch.trim()) {
      const q = modalSearch.trim().toLowerCase();
      const matchName = e.name.toLowerCase().includes(q);
      const matchTarget = e.targetArea.toLowerCase().includes(q);
      const matchPurpose = e.purpose.toLowerCase().includes(q);
      if (!matchName && !matchTarget && !matchPurpose) return false;
    }
    return true;
  });

  if (patients.length === 0 || !currentPatient) {
    return (
      <div className="space-y-6 pb-16">
        <div className="bg-white rounded-3xl border border-gray-200 p-8 sm:p-12 text-center space-y-3 shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <Dumbbell className="w-7 h-7" />
          </div>
          <h1 className="text-lg font-black text-gray-900">운동 처방 대상 환자가 없습니다</h1>
          <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
            담당 환자와 연결된 후 운동 프로그램을 처방하고 수정할 수 있습니다. 먼저 홈 또는 담당 환자 탭에서 환자의 연결 요청을 수락해 주세요.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16">
      {/* Top Patient Selector & Action Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">운동 프로그램 설정</h1>
            <p className="text-xs text-gray-500 mt-1">
              대상자에게 처방할 운동을 라이브러리에서 선택하고 세트, 반복 횟수, 주의사항을 설정합니다.
            </p>
          </div>

          {/* Patient Selector Dropdown */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <label className="text-xs font-semibold text-gray-500 whitespace-nowrap">
              처방 대상자:
            </label>
            <div className="relative">
              <select
                value={currentPatient?.id}
                onChange={(e) => handlePatientChange(e.target.value)}
                className="appearance-none bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 pl-3 pr-8 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.gender}·{p.age}세)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Selected Patient Diagnostic Brief */}
        {currentPatient && (
          <div className="mt-4 pt-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-700">진단명:</span>
              <span className="text-gray-800">{formatPatientDiagnosis(currentPatient.diagnosis)}</span>
            </div>
            <div className="text-gray-500 font-mono tabular-nums">
              현재 처방된 운동: <strong>{workingProgram.length}개</strong>
            </div>
          </div>
        )}
      </div>

      {/* Program Configurator Card List */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-5">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {currentPatient?.name} 님의 맞춤 재활 처방 목록
            </h2>
            <p className="text-xs text-gray-500">
              반복 횟수와 세트, 주의사항을 수정한 뒤 [프로그램 저장하기]를 클릭하세요.
            </p>
          </div>

          <button
            onClick={() => {
              setSelectedLibraryExercise(null);
              setIsAddModalOpen(true);
            }}
            className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>운동 라이브러리에서 추가</span>
          </button>
        </div>

        {workingProgram.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-gray-200 rounded-xl">
            <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <Dumbbell className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-gray-700">현재 처방된 운동이 없습니다.</h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
              상단의 [운동 라이브러리에서 추가] 버튼을 눌러 대상자에게 적합한 재활 운동을 지정해주세요.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {workingProgram.map((assignment, index) => {
              const exercise = library.find((e) => e.id === assignment.exerciseId);
              if (!exercise) return null;

              return (
                <div
                  key={assignment.assignmentId}
                  className="p-4 sm:p-5 rounded-xl border border-gray-200 bg-gray-50/40 hover:border-blue-200 transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-bold text-gray-400">#{index + 1}</span>
                      <h3 className="text-base font-bold text-gray-900">{exercise.name}</h3>
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                        {exercise.category}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-500">{exercise.targetArea}</span>
                    </div>

                    <button
                      onClick={() => handleRemoveExercise(assignment.assignmentId)}
                      className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                      title="이 운동 처방 삭제"
                      aria-label="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Settings Inputs: Sets, Reps, Frequency */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        세트 수
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={assignment.sets}
                          onChange={(e) =>
                            handleUpdateItem(assignment.assignmentId, 'sets', parseInt(e.target.value) || 1)
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 font-mono tabular-nums font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500 shrink-0">세트</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        세트당 반복 횟수
                      </label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={50}
                          value={assignment.reps}
                          onChange={(e) =>
                            handleUpdateItem(assignment.assignmentId, 'reps', parseInt(e.target.value) || 1)
                          }
                          className="w-full bg-white border border-gray-200 rounded-lg p-2 font-mono tabular-nums font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-500 shrink-0">회</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        주당 운동 빈도
                      </label>
                      <input
                        type="text"
                        value={assignment.frequency}
                        onChange={(e) =>
                          handleUpdateItem(assignment.assignmentId, 'frequency', e.target.value)
                        }
                        placeholder="예: 주 3회, 매일"
                        className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Precautions & Clinical Notes Input */}
                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      대상자 맞춤 주의사항 및 지도 메모
                    </label>
                    <input
                      type="text"
                      value={assignment.customNotes}
                      onChange={(e) =>
                        handleUpdateItem(assignment.assignmentId, 'customNotes', e.target.value)
                      }
                      placeholder="예: 허리가 바닥에서 뜨지 않도록 복압 유지에 집중할 것, 호흡 참지 말 것 등"
                      className="w-full bg-white border border-gray-200 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Save Button */}
        <div className="mt-8 pt-5 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            💡 저장 시 로컬 스토리지에 즉시 반영되며, 대상자 화면에서 새 프로그램이 동기화됩니다.
          </p>

          <button
            onClick={handleSaveProgram}
            className="px-6 py-3 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors self-end sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>운동 프로그램 저장하기</span>
          </button>
        </div>
      </div>

      {/* Add Exercise from Library Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div
            className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-exercise-modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80 shrink-0">
              <div>
                <h2 id="add-exercise-modal-title" className="text-base font-bold text-gray-900">
                  운동 라이브러리에서 선택 ({currentPatient?.name} 님 처방)
                </h2>
                <p className="text-xs text-gray-500">
                  총 {library.length}종의 임상 재활운동 라이브러리 중 추가할 운동을 선택하세요.
                </p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="운동명, 신체 부위, 목표 검색 (예: 목, 허리, 스쿼트)"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 7 Body Part Filter Chips */}
              <div>
                <span className="text-[11px] font-semibold text-gray-500 mb-1.5 block">신체 부위별 필터:</span>
                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  <button
                    type="button"
                    onClick={() => setModalBodyPart('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      modalBodyPart === 'all'
                        ? 'bg-blue-600 text-white font-semibold shadow-xs'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    전체 부위
                  </button>
                  {ALL_BODY_PARTS.map((bp) => (
                    <button
                      key={bp}
                      type="button"
                      onClick={() => setModalBodyPart(bp)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                        modalBodyPart === bp
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {bp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Segmented Control */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setModalCategory(c.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                      modalCategory === c.id
                        ? 'bg-slate-700 text-white font-semibold'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* Exercise Library Picker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto p-1 border border-gray-100 rounded-xl bg-gray-50/50">
                {filteredLibrary.length === 0 ? (
                  <div className="col-span-2 py-8 text-center text-xs text-gray-400">
                    조건에 맞는 재활운동이 없습니다.
                  </div>
                ) : (
                  filteredLibrary.map((ex) => {
                    const isSelected = selectedLibraryExercise?.id === ex.id;
                    const alreadyAssigned = workingProgram.some((item) => item.exerciseId === ex.id);

                    return (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => handleSelectLibraryExercise(ex)}
                        className={`text-left p-3 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-blue-600 bg-blue-50 shadow-xs ring-1 ring-blue-500'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-xs text-gray-900 truncate">{ex.name}</span>
                          {alreadyAssigned && (
                            <span className="shrink-0 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              이미 처방됨
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1">
                          <span className="text-[10px] px-1.5 py-0.2 text-blue-700 bg-blue-50 rounded font-medium">
                            {ex.category}
                          </span>
                          <span className="text-[11px] text-gray-500 truncate">{ex.targetArea}</span>
                        </div>
                        {ex.bodyParts && ex.bodyParts.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {ex.bodyParts.map((bp) => (
                              <BodyPartBadge key={bp} bodyPart={bp} size="sm" />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>

              {/* Configuration Form if exercise selected */}
              {selectedLibraryExercise ? (
                <form onSubmit={handleAddExerciseToWorkingProgram} className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold text-blue-600">선택된 운동</span>
                      <h4 className="text-sm font-bold text-gray-900">{selectedLibraryExercise.name}</h4>
                    </div>
                    <span className="text-xs text-gray-500">{selectedLibraryExercise.targetArea}</span>
                  </div>

                  <p className="text-xs text-gray-600 bg-white p-2.5 rounded-lg border border-gray-200">
                    <strong>목적:</strong> {selectedLibraryExercise.purpose}
                  </p>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        처방 세트 수
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={newSets}
                        onChange={(e) => setNewSets(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono tabular-nums font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        반복 횟수 (회)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={newReps}
                        onChange={(e) => setNewReps(parseInt(e.target.value) || 1)}
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 font-mono tabular-nums font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                        주당 빈도
                      </label>
                      <input
                        type="text"
                        value={newFrequency}
                        onChange={(e) => setNewFrequency(e.target.value)}
                        className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                      대상자 개별 주의사항
                    </label>
                    <input
                      type="text"
                      value={newNotes}
                      onChange={(e) => setNewNotes(e.target.value)}
                      placeholder="예: 반동 없이 천천히 수행, 통증 발생 시 중단"
                      className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus className="w-4 h-4" />
                    <span>처방 프로그램에 추가하기</span>
                  </button>
                </form>
              ) : (
                <p className="text-xs text-gray-400 text-center py-4">
                  위 목록에서 추가할 재활 운동을 선택해주세요.
                </p>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-end shrink-0">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 rounded-lg hover:bg-gray-200/60 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
