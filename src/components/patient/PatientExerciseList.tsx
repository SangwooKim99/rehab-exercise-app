/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, Exercise, BodyPartCategory } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { CheckCircle2, Circle, Eye, Play, Filter, AlertCircle, Search } from 'lucide-react';
import { ALL_BODY_PARTS, BodyPartBadge } from '../common/BodyPartIcons';

interface PatientExerciseListProps {
  patient: Patient;
  onOpenExerciseDetail: (exercise: Exercise, assignmentId: string) => void;
}

export const PatientExerciseList: React.FC<PatientExerciseListProps> = ({
  patient,
  onOpenExerciseDetail
}) => {
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const library = StorageService.getExerciseLibrary();
  const todayStats = StorageService.getPatientTodayStats(patient.id);

  const categories: { id: string; label: string }[] = [
    { id: 'all', label: '전체' },
    { id: '코어 안정화', label: '코어 안정화' },
    { id: '근력 강화', label: '근력 강화' },
    { id: '관절 가동성', label: '관절 가동성' },
    { id: '유연성/스트레칭', label: '유연성/스트레칭' },
    { id: '기능적 움직임', label: '기능적 움직임' }
  ];

  const assignedWithDetails = patient.assignedProgram
    .map((assignment) => {
      const exercise = library.find((e) => e.id === assignment.exerciseId);
      return {
        assignment,
        exercise,
        isCompleted: exercise ? todayStats.completedExerciseIds.has(exercise.id) : false
      };
    })
    .filter((item): item is { assignment: typeof item.assignment; exercise: Exercise; isCompleted: boolean } => 
      item.exercise !== undefined
    );

  const filteredExercises = assignedWithDetails.filter(({ exercise }) => {
    if (selectedBodyPart !== 'all' && (!exercise.bodyParts || !exercise.bodyParts.includes(selectedBodyPart as BodyPartCategory))) {
      return false;
    }
    if (selectedCategory !== 'all' && exercise.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = exercise.name.toLowerCase().includes(q);
      const matchTarget = exercise.targetArea.toLowerCase().includes(q);
      if (!matchName && !matchTarget) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Info */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {patient.name} 님의 맞춤 재활 프로그램
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              물리치료사가 처방한 재활 운동 목록 및 진행 상태입니다.
            </p>
          </div>
          <div className="text-xs text-blue-700 bg-blue-50 px-3.5 py-2 rounded-xl border border-blue-100 self-start sm:self-auto font-mono tabular-nums font-semibold">
            총 {assignedWithDetails.length}개 처방 · 오늘 {todayStats.completedCount}개 완료
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="처방된 운동 검색..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 7 Body Part Filter Chips */}
        <div>
          <span className="text-[11px] font-semibold text-gray-500 mb-1.5 block">신체 부위별 필터:</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedBodyPart('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                selectedBodyPart === 'all'
                  ? 'bg-blue-600 text-white font-semibold shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체 부위
            </button>
            {ALL_BODY_PARTS.map((bp) => (
              <button
                key={bp}
                onClick={() => setSelectedBodyPart(bp)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedBodyPart === bp
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {bp}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-gray-100 no-scrollbar">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-slate-700 text-white font-semibold shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Exercise Cards Grid */}
      {assignedWithDetails.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center space-y-2">
          <p className="text-base font-bold text-gray-800">아직 배정된 운동이 없습니다</p>
          <p className="text-xs text-gray-500 max-w-sm mx-auto leading-relaxed">
            담당 물리치료사가 대상자의 상태를 진단하고 맞춤형 재활 운동을 배정하면 이곳에 목록이 나타납니다.
          </p>
        </div>
      ) : filteredExercises.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-bold text-gray-700">해당 조건에 맞는 처방 운동이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">부위나 카테고리 필터를 변경해 보세요.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExercises.map(({ assignment, exercise, isCompleted }) => {
            return (
              <div
                key={assignment.assignmentId}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all"
              >
                <div>
                  {/* Top metadata row */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-blue-600">{exercise.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{exercise.targetArea}</span>
                    </div>
                    {/* Completion Status */}
                    {isCompleted ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> 오늘 완료됨
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 bg-gray-50 px-2 py-0.5 rounded-md">
                        <Circle className="w-3.5 h-3.5" /> 미완료
                      </span>
                    )}
                  </div>

                  {/* Body Part Badges */}
                  {exercise.bodyParts && exercise.bodyParts.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {exercise.bodyParts.map((bp) => (
                        <BodyPartBadge key={bp} bodyPart={bp} size="sm" />
                      ))}
                    </div>
                  )}

                  {/* Exercise Title */}
                  <h3 className="text-base font-bold text-gray-900 leading-snug">
                    {exercise.name}
                  </h3>

                  <p className="text-xs text-gray-600 mt-2 line-clamp-2 leading-relaxed">
                    {exercise.purpose}
                  </p>

                  {/* Prescription Parameters */}
                  <div className="mt-4 p-3 rounded-xl bg-gray-50 border border-gray-100 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[11px]">반복 및 세트</span>
                      <span className="font-bold text-gray-900 font-mono tabular-nums">
                        {assignment.sets}세트 × {assignment.reps}회
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[11px]">권장 빈도</span>
                      <span className="font-bold text-gray-900 font-mono tabular-nums">
                        {assignment.frequency}
                      </span>
                    </div>
                  </div>

                  {/* Therapist Custom Precautions */}
                  {assignment.customNotes && (
                    <div className="mt-3 flex items-start gap-1.5 text-xs text-amber-800 bg-amber-50/70 p-2.5 rounded-lg border border-amber-100">
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-tight">
                        <strong>치료사 지시사항:</strong> {assignment.customNotes}
                      </span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Button */}
                <div className="mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-400 font-mono tabular-nums">
                    처방일자: {assignment.assignedDate}
                  </span>
                  <button
                    onClick={() => onOpenExerciseDetail(exercise, assignment.assignmentId)}
                    className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors ${
                      isCompleted
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>{isCompleted ? '상세보기 및 재기록' : '운동 시작 및 기록'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
