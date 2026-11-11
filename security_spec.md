# Rehab Exercise - Security Specification

## 1. Data Invariants

1. **사용자 역할(RBAC) 변조 방지**:
   - 일반 환자(`patient`)는 최초 회원가입 시 지정된 본인의 역할을 임의로 `therapist`나 `super_admin`으로 승격시킬 수 없습니다.
   - 프로필 갱신(`update`) 시 `role` 필드 및 `uid` 필드는 불변(Immutable)이어야 합니다.

2. **개인 건강 정보(PHI) 및 운동 기록 격리**:
   - 환자 본인만 본인의 `workoutLogs`를 생성할 수 있으며 (`request.auth.uid == incoming().patientId`),
   - 조회(`get`, `list`)는 해당 환자 본인 또는 연결 상태가 유효한(`connected`) 담당 물리치료사만 허용됩니다.
   - 타 환자의 개인 운동 기록이나 진단 정보를 제3자가 무단 열람할 수 없습니다.

3. **물리치료사 임상 피드백 무결성**:
   - `feedbacks` 문서는 인증된 물리치료사(`therapist`)만 작성/수정할 수 있으며, 환자 본인은 읽기 전용입니다.
   - 피드백의 `patientId`는 반드시 유효한 환자 UID를 가리켜야 합니다.

4. **연결 관계(Connection) 위조 방지**:
   - 환자와 치료사의 연결 생성/수정은 관련된 두 당사자(`patientId == auth.uid` 또는 `therapistId == auth.uid`)만 수행할 수 있습니다.

## 2. Dirty Dozen Payloads (위협 시나리오 분석)

1. **Role Escalation Attack**: 환자가 프로필 업데이트 시 `role: 'therapist'`를 주입하여 치료사 권한 탈취 시도 -> **차단 (PERMISSION_DENIED)**
2. **Ghost Patient Log Injection**: 공격자가 임의의 타인 `patientId`로 거짓 운동 완수 기록을 생성 시도 -> **차단 (PERMISSION_DENIED)**
3. **Cross-Tenant Workout Snooping**: 타 환자의 `workoutLogs` 컬렉션을 무단 쿼리 조회 시도 -> **차단 (PERMISSION_DENIED)**
4. **Forged Clinical Feedback**: 환자가 스스로를 칭찬하는 가짜 물리치료사 피드백 생성 시도 -> **차단 (PERMISSION_DENIED)**
5. **Therapist ID Spoofing**: 미인증 사용자가 타 치료사의 UID로 환자 연결 승인 시도 -> **차단 (PERMISSION_DENIED)**
6. **Immortal Field Tampering**: 사용자 문서의 `uid` 또는 `createdAt` 필드를 변조하여 이전 이력 삭제 시도 -> **차단 (PERMISSION_DENIED)**
7. **Denial-of-Wallet Payload**: 1MB 이상의 대형 정크 문자열을 `diagnosis`나 `notes` 필드에 주입 시도 -> **차단 (PERMISSION_DENIED, 크기 제한 적용)**
8. **Invalid Status Transition**: 연결 해제(`disconnected`)된 환자 차트에 대해 승인 없이 처방 갱신 시도 -> **차단 (PERMISSION_DENIED)**
9. **Unauthenticated Read**: 비로그인 사용자가 `users`, `workoutLogs`, `feedbacks`를 스크래핑 시도 -> **차단 (PERMISSION_DENIED)**
10. **ID Poisoning Attack**: 비정상적인 특수문자나 128자를 초과하는 문서 ID로 생성 시도 -> **차단 (PERMISSION_DENIED)**
11. **Negative Value Injection**: 세트 수나 통증 점수(0~10)에 음수나 100을 주입하여 통계 왜곡 시도 -> **차단 (PERMISSION_DENIED)**
12. **Orphan Prescription Write**: 존재하지 않는 환자 UID로 운동 프로그램을 처방 등록 시도 -> **차단 (PERMISSION_DENIED)**
