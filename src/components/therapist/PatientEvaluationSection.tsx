/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';

export interface EvaluationRecordSummary {
  id: string;
  evaluatedAt: string;
  type: string;
  summary?: string;
}

interface PatientEvaluationSectionProps {
  patientId: string;
  evaluations?: EvaluationRecordSummary[];
}

/**
 * 환자 차트 - 평가 기록 탭 (1단계: 빈 상태 및 추후 연동용 컴포넌트 구조)
 */
export const PatientEvaluationSection: React.FC<PatientEvaluationSectionProps> = ({
  evaluations = []
}) => {
  if (evaluations.length === 0) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm font-medium text-gray-500">
          아직 등록된 평가 기록이 없습니다.
        </p>
      </div>
    );
  }

  return null;
};
