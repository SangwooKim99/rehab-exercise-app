/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Patient, WorkoutLog } from '../../types/rehab';
import { StorageService } from '../../services/storageService';
import { 
  Calendar, 
  Search, 
  HeartPulse, 
  CheckCircle2, 
  ArrowRight, 
  Filter,
  Users,
  FileSpreadsheet
} from 'lucide-react';

interface TherapistLogsViewProps {
  patients: Patient[];
  initialPatientId?: string;
}

export const TherapistLogsView: React.FC<TherapistLogsViewProps> = ({
  patients,
  initialPatientId
}) => {
  const [selectedPatientFilter, setSelectedPatientFilter] = useState<string>(
    initialPatientId || 'all'
  );
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('all');
  const [searchExercise, setSearchExercise] = useState<string>('');

  const allLogs = StorageService.getWorkoutLogs();

  // Filter logs
  const filteredLogs = allLogs.filter((log) => {
    if (selectedPatientFilter !== 'all' && log.patientId !== selectedPatientFilter) {
      return false;
    }
    if (selectedDateFilter !== 'all' && log.date !== selectedDateFilter) {
      return false;
    }
    if (searchExercise.trim()) {
      return log.exerciseName.toLowerCase().includes(searchExercise.trim().toLowerCase());
    }
    return true;
  });

  const availableDates = Array.from(new Set(allLogs.map((l) => l.date))).sort().reverse();

  // Statistics for current filter
  const totalCompleted = filteredLogs.filter((l) => l.completed).length;
  const avgPain = filteredLogs.length > 0
    ? (filteredLogs.reduce((acc, curr) => acc + curr.painLevel, 0) / filteredLogs.length).toFixed(1)
    : '0';

  const getPainBadge = (val: number) => {
    if (val === 0) return { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: `VAS ${val} (무통)` };
    if (val <= 3) return { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: `VAS ${val} (경미)` };
    if (val <= 6) return { bg: 'bg-amber-50 text-amber-700 border-amber-200', label: `VAS ${val} (보통)` };
    return { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: `VAS ${val} (심함)` };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Filter Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">대상자 수행 기록 확인</h1>
            <p className="text-xs text-gray-500 mt-1">
              각 대상자가 입력한 실제 운동 세트, 횟수 및 통증 척도(VAS)를 점검합니다.
            </p>
          </div>
          <div className="text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 font-mono tabular-nums self-start sm:self-auto">
            조회된 기록: <strong>{filteredLogs.length}</strong>건 (전체 {allLogs.length}건)
          </div>
        </div>

        {/* Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-xs">
          {/* Patient Selector */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">
              대상자 필터
            </label>
            <select
              value={selectedPatientFilter}
              onChange={(e) => setSelectedPatientFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 대상자 ({patients.length}명)</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.gender}·{p.age}세)
                </option>
              ))}
            </select>
          </div>

          {/* Date Selector */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">
              수행 날짜
            </label>
            <select
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs font-mono tabular-nums text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">전체 날짜</option>
              {availableDates.map((date) => (
                <option key={date} value={date}>
                  {date}
                </option>
              ))}
            </select>
          </div>

          {/* Exercise Search */}
          <div>
            <label className="text-[11px] font-semibold text-gray-600 block mb-1">
              운동명 검색
            </label>
            <input
              type="text"
              placeholder="예: 브리지, 버드독..."
              value={searchExercise}
              onChange={(e) => setSearchExercise(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Quick KPI stats strip */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t border-gray-100 text-center text-xs">
          <div className="p-2.5 rounded-lg bg-blue-50/60">
            <span className="text-gray-500 block text-[11px]">완료 건수</span>
            <span className="text-lg font-bold text-blue-700 font-mono tabular-nums">{totalCompleted}건</span>
          </div>
          <div className="p-2.5 rounded-lg bg-gray-50">
            <span className="text-gray-500 block text-[11px]">기록 날짜 수</span>
            <span className="text-lg font-bold text-gray-800 font-mono tabular-nums">{availableDates.length}일</span>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-50/60">
            <span className="text-gray-500 block text-[11px]">평균 통증 (VAS)</span>
            <span className="text-lg font-bold text-amber-700 font-mono tabular-nums">{avgPain} / 10</span>
          </div>
        </div>
      </div>

      {/* Logs Table / Cards */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <p className="text-sm font-bold text-gray-700">조건에 부합하는 수행 기록이 없습니다.</p>
          <p className="text-xs text-gray-400 mt-1">상단의 필터를 변경해보세요.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 border-b border-gray-100 text-gray-500 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">수행 일시</th>
                  <th className="px-5 py-3.5">대상자</th>
                  <th className="px-5 py-3.5">완료한 운동</th>
                  <th className="px-5 py-3.5">처방 대비 실제 수행</th>
                  <th className="px-5 py-3.5">통증 척도 (VAS)</th>
                  <th className="px-5 py-3.5">환자 코멘트</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.map((log) => {
                  const patient = patients.find((p) => p.id === log.patientId);
                  const pain = getPainBadge(log.painLevel);
                  const time = log.loggedAt
                    ? new Date(log.loggedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                    : '';

                  return (
                    <tr key={log.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-3.5 whitespace-nowrap font-mono tabular-nums text-gray-600">
                        <span className="font-semibold text-gray-900 block">{log.date}</span>
                        <span className="text-[11px] text-gray-400">{time}</span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className="font-bold text-gray-900 block">
                          {patient?.name || log.patientId}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {patient ? `${patient.gender} · ${patient.age}세` : ''}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <span className="font-bold text-blue-700 block text-sm">
                          {log.exerciseName}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-3 h-3" /> 정상 완료
                        </span>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap font-mono tabular-nums">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <span className="text-gray-400 text-[11px]">처방: {log.prescribedSets}×{log.prescribedReps}</span>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <strong className="text-blue-600 text-sm">실제: {log.actualSets}세트 {log.actualReps}회</strong>
                        </div>
                      </td>

                      <td className="px-5 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold font-mono ${pain.bg}`}>
                          <HeartPulse className="w-3 h-3" />
                          {pain.label}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 max-w-xs">
                        {log.patientNotes ? (
                          <p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 line-clamp-2">
                            {log.patientNotes}
                          </p>
                        ) : (
                          <span className="text-gray-400 text-[11px]">특이사항 없음</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
