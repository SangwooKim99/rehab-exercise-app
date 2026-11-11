/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, WorkoutLog } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { 
  Calendar, 
  CheckCircle2, 
  Clock, 
  HeartPulse, 
  Filter, 
  Dumbbell,
  ArrowRight
} from 'lucide-react';

interface PatientHistoryProps {
  patient: Patient;
}

export const PatientHistory: React.FC<PatientHistoryProps> = ({ patient }) => {
  const [selectedDate, setSelectedDate] = useState<string>('all');
  const allLogs = StorageService.getWorkoutLogs(patient.id);

  // Unique dates from logs
  const availableDates = Array.from(new Set(allLogs.map((l) => l.date))).sort().reverse();

  const filteredLogs = selectedDate === 'all'
    ? allLogs
    : allLogs.filter((l) => l.date === selectedDate);

  // Calculate summary metrics
  const totalCompleted = allLogs.filter((l) => l.completed).length;
  const avgPain = allLogs.length > 0
    ? (allLogs.reduce((acc, curr) => acc + curr.painLevel, 0) / allLogs.length).toFixed(1)
    : '0';

  const getPainBadge = (val: number) => {
    if (val === 0) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: `VAS ${val} (무통)` };
    if (val <= 3) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', text: `VAS ${val} (경미)` };
    if (val <= 6) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', text: `VAS ${val} (보통)` };
    return { bg: 'bg-rose-50 text-rose-700 border-rose-200', text: `VAS ${val} (심함)` };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & KPI Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
              {patient.name} 님의 재활 운동 기록
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              날짜별 운동 수행 내역 및 통증 변화 추이를 확인합니다.
            </p>
          </div>
          <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 self-start sm:self-auto font-mono tabular-nums">
            누적 기록 {allLogs.length}건
          </span>
        </div>

        {/* 3 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block">총 완료한 운동</span>
            <span className="text-2xl font-extrabold text-gray-900 font-mono tabular-nums">
              {totalCompleted}
              <span className="text-xs font-normal text-gray-500 ml-1">건</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block">운동 수행 일수</span>
            <span className="text-2xl font-extrabold text-blue-600 font-mono tabular-nums">
              {availableDates.length}
              <span className="text-xs font-normal text-blue-400 ml-1">일간</span>
            </span>
          </div>

          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <span className="text-xs text-gray-500 block">평균 통증 점수 (VAS)</span>
            <span className="text-2xl font-extrabold text-amber-600 font-mono tabular-nums">
              {avgPain}
              <span className="text-xs font-normal text-amber-400 ml-1">/ 10</span>
            </span>
          </div>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-2 pt-4 mt-4 border-t border-gray-100 overflow-x-auto no-scrollbar">
          <span className="text-xs font-semibold text-gray-500 shrink-0 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> 날짜 필터:
          </span>
          <button
            onClick={() => setSelectedDate('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
              selectedDate === 'all'
                ? 'bg-blue-600 text-white font-semibold'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            전체 보기 ({allLogs.length})
          </button>
          {availableDates.map((date) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap font-mono tabular-nums transition-colors ${
                selectedDate === date
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {date}
            </button>
          ))}
        </div>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700">해당 날짜의 운동 기록이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">
            홈 또는 내 운동 프로그램 탭에서 오늘의 운동을 기록해보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const painBadge = getPainBadge(log.painLevel);
            const timeStr = log.loggedAt ? new Date(log.loggedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div
                key={log.id}
                className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                    <span className="font-mono tabular-nums font-semibold text-gray-700">{log.date}</span>
                    {timeStr && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{timeStr}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> 완료
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-gray-900">
                    {log.exerciseName}
                  </h3>

                  {/* Prescribed vs Actual */}
                  <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap pt-1 font-mono tabular-nums">
                    <span>
                      처방 목표: <strong className="text-gray-900">{log.prescribedSets}세트 × {log.prescribedReps}회</strong>
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                    <span>
                      실제 수행: <strong className="text-blue-600">{log.actualSets}세트 × {log.actualReps}회</strong>
                    </span>
                  </div>

                  {log.patientNotes && (
                    <p className="text-xs text-gray-600 bg-gray-50 p-2.5 rounded-lg border border-gray-100 mt-2">
                      <span className="font-semibold text-gray-700 mr-1">수행 메모:</span>
                      {log.patientNotes}
                    </p>
                  )}
                </div>

                {/* Right: Pain Badge */}
                <div className="shrink-0 self-start sm:self-center">
                  <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold font-mono ${painBadge.bg}`}>
                    <HeartPulse className="w-3.5 h-3.5" />
                    {painBadge.text}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
