/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { StorageService } from '../../services/storageService';
import { Exercise, BodyPartCategory } from '../../types/rehab';
import { ExerciseSvgGuide } from '../common/ExerciseSvgGuide';
import { BookOpen, Search, Sparkles, AlertTriangle, Info, Plus } from 'lucide-react';
import { ALL_BODY_PARTS, BodyPartBadge } from '../common/BodyPartIcons';

interface TherapistExerciseLibraryProps {
  onPrescribeExercise: (exerciseId: string) => void;
}

export const TherapistExerciseLibrary: React.FC<TherapistExerciseLibraryProps> = ({
  onPrescribeExercise
}) => {
  const library = StorageService.getExerciseLibrary();
  const [selectedBodyPart, setSelectedBodyPart] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeExercise, setActiveExercise] = useState<Exercise>(library[0]);

  const categories = [
    { id: 'all', label: '전체 운동군' },
    { id: '코어 안정화', label: '코어 안정화' },
    { id: '근력 강화', label: '근력 강화' },
    { id: '관절 가동성', label: '관절 가동성' },
    { id: '유연성/스트레칭', label: '유연성/스트레칭' },
    { id: '기능적 움직임', label: '기능적 움직임' }
  ];

  const filteredExercises = library.filter((ex) => {
    if (selectedBodyPart !== 'all' && (!ex.bodyParts || !ex.bodyParts.includes(selectedBodyPart as BodyPartCategory))) {
      return false;
    }
    if (selectedCategory !== 'all' && ex.category !== selectedCategory) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchName = ex.name.toLowerCase().includes(q);
      const matchTarget = ex.targetArea.toLowerCase().includes(q);
      const matchPurpose = ex.purpose.toLowerCase().includes(q);
      if (!matchName && !matchTarget && !matchPurpose) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">임상 재활운동 라이브러리</h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              근거 기반 총 {library.length}종의 표준 재활운동 프로토콜과 7개 신체 부위별 해부학적 운동 가이드를 제공합니다.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="운동명, 부위, 질환 검색..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* 7 Body Parts Filter Bar */}
        <div>
          <span className="text-[11px] font-semibold text-gray-500 mb-1.5 block">신체 부위별 분류 (7개 부위):</span>
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setSelectedBodyPart('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
                selectedBodyPart === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체 부위 ({library.length})
            </button>
            {ALL_BODY_PARTS.map((bp) => {
              const count = library.filter((e) => e.bodyParts?.includes(bp)).length;
              return (
                <button
                  key={bp}
                  onClick={() => setSelectedBodyPart(bp)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    selectedBodyPart === bp
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{bp}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedBodyPart === bp ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-3 border-t border-gray-100 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-slate-700 text-white'
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main 2-Column Explorer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Exercise List */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between px-2 py-1">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              운동 목록
            </h2>
            <span className="text-xs font-bold text-blue-600">{filteredExercises.length}개 검색됨</span>
          </div>

          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {filteredExercises.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                선택한 조건의 운동이 없습니다.
              </div>
            ) : (
              filteredExercises.map((ex) => {
                const isSelected = activeExercise.id === ex.id;
                return (
                  <button
                    key={ex.id}
                    onClick={() => setActiveExercise(ex)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500'
                        : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-gray-900 text-xs sm:text-sm truncate">{ex.name}</span>
                      <span className="shrink-0 text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded">
                        {ex.category}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 block mt-1 line-clamp-1">
                      {ex.targetArea}
                    </span>
                    {ex.bodyParts && ex.bodyParts.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
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
        </div>

        {/* Right Exercise Inspection Card */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-bold text-blue-600">{activeExercise.category}</span>
                <span>·</span>
                <span>{activeExercise.targetArea}</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mt-1">{activeExercise.name}</h2>
            </div>

            <button
              onClick={() => onPrescribeExercise(activeExercise.id)}
              className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>이 운동 대상자에게 처방하기</span>
            </button>
          </div>

          {/* SVG Movement Guide Diagram */}
          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-gray-50 p-4 flex justify-center">
            <ExerciseSvgGuide
              type={activeExercise.videoPlaceholder.illustrationType}
              className="w-full max-w-md h-56 sm:h-64 object-contain"
            />
          </div>

          {/* Detailed clinical cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> 운동 목적
              </span>
              <p className="text-gray-600 leading-relaxed">{activeExercise.purpose}</p>
            </div>

            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" /> 시작 자세
              </span>
              <p className="text-gray-600 leading-relaxed">{activeExercise.startPosition}</p>
            </div>
          </div>

          {/* Execution steps */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-gray-900">단계별 수행 절차</h3>
            <div className="space-y-2">
              {activeExercise.executionSteps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-mono font-bold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 leading-relaxed">{step}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Precautions */}
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600" /> 임상 주의사항
            </span>
            <ul className="list-disc list-inside space-y-1 text-gray-700 text-[11px]">
              {activeExercise.precautions.map((p, idx) => (
                <li key={idx}>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
