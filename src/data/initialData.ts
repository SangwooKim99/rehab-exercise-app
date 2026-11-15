/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Exercise, Patient, Therapist, WorkoutLog } from '../types/rehab';

export const EXERCISE_LIBRARY: Exercise[] = [
  {
    id: 'ex-1',
    name: '무릎 가슴 당기기',
    category: '유연성/스트레칭',
    bodyParts: ['허리·몸통', '골반·엉덩관절', '무릎'],
    targetArea: '요추 후면 및 대둔근',
    purpose: '요추 후방 구조물과 둔근을 부드럽게 신장시켜 요추 부위의 과도한 압력을 낮추고 관절 가동 범위를 개선합니다.',
    startPosition: '매트 위에 편안히 등을 대고 바로 눕고, 무릎을 가볍게 굽혀 발바닥을 바닥에 놓습니다.',
    executionSteps: [
      '한쪽 무릎을 양손으로 가볍게 감싸 잡습니다.',
      '숨을 천천히 내쉬며 무릎을 가슴 방향으로 부드럽게 당겨 올립니다.',
      '허리 뒤쪽과 엉덩이가 편안하게 당겨지는 지점에서 15~20초간 자세를 유지합니다.',
      '숨을 들이마시며 천천히 시작 자세로 돌아오고, 반대쪽 다리도 동일하게 수행합니다.'
    ],
    precautions: [
      '골반이 바닥에서 과도하게 들리거나 비틀리지 않도록 주의합니다.',
      '통증이 느껴지는 범위까지 억지로 당기지 말고 기분 좋은 당김 수준에서 유지합니다.',
      '목이나 어깨에 과도한 힘이 들어가지 않도록 상체는 바닥에 밀착합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['골반 수평 유지', '목/어깨 이완', '반동 없는 호흡 동기화'],
      illustrationType: 'knee-chest'
    }
  },
  {
    id: 'ex-2',
    name: '고양이-낙타 운동',
    category: '관절 가동성',
    bodyParts: ['목', '허리·몸통'],
    targetArea: '흉추 및 요추 전반',
    purpose: '흉추와 요추의 굴곡 및 신전 분절 가동성을 향상시키고 척추 주변 기립근의 긴장을 안전하게 완화합니다.',
    startPosition: '양손은 어깨 바로 아래, 양 무릎은 골반 바로 아래에 위치하도록 네발기기(Quadruped) 자세를 취합니다.',
    executionSteps: [
      '숨을 들이마시며 등을 둥글게 말아 올리고 머리는 자연스럽게 아래로 숙입니다 (고양이 자세).',
      '숨을 천천히 내쉬며 복부를 부드럽게 바닥 쪽으로 내리고 가슴을 앞으로 펴며 시선은 정면 사선 아래를 봅니다 (낙타 자세).',
      '각 자세에서 2~3초간 부드럽게 머문 뒤 척추 분절을 하나씩 움직이며 반복합니다.'
    ],
    precautions: [
      '허리를 꺾듯이 과도하게 아래로 짓누르지 않습니다.',
      '손목 관절에 체중이 과도하게 실리지 않도록 손바닥 전체로 지면을 지지합니다.',
      '반동을 사용하지 않고 일정한 속도로 호흡과 함께 부드럽게 움직입니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '주 4~5회',
    videoPlaceholder: {
      durationSeconds: 60,
      guidePoints: ['척추 분절 순차적 움직임', '손목-어깨 수직 정렬', '과신전 주의'],
      illustrationType: 'cat-camel'
    }
  },
  {
    id: 'ex-3',
    name: '누운 자세 허리 회전 운동',
    category: '관절 가동성',
    bodyParts: ['허리·몸통', '골반·엉덩관절'],
    targetArea: '요추 회전 가동성 및 외복사근',
    purpose: '골반과 체간의 회전 가동 범위를 점진적으로 회복시키고 허리 외측 연부조직의 유연성을 증진합니다.',
    startPosition: '매트에 등을 대고 누워 양 무릎을 세워 모으고, 양팔은 양옆으로 벌려 어깨를 바닥에 밀착합니다.',
    executionSteps: [
      '양 무릎을 모은 상태를 유지하며 천천히 오른쪽 바닥으로 부드럽게 기울여 내립니다.',
      '반대쪽(왼쪽) 어깨가 바닥에서 뜨지 않도록 유지하며 시선은 왼쪽을 향합니다.',
      '가장 편안한 회전 위치에서 10~15초 머문 후 중앙으로 돌아옵니다.',
      '동일한 요령으로 왼쪽 방향으로도 부드럽게 진행합니다.'
    ],
    precautions: [
      '어깨가 바닥에서 떨어질 정도로 무리해서 무릎을 바닥에 닿게 하지 않습니다.',
      '요통이나 신경 압박 증상이 유발되는 경우 즉시 각도를 줄입니다.',
      '다리를 떨어뜨리듯 빠르게 움직이지 말고 제어된 속도를 지킵니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['양 어깨 바닥 고정', '무릎 모음 유지', '천천히 조절된 호흡'],
      illustrationType: 'trunk-rotation'
    }
  },
  {
    id: 'ex-4',
    name: '복부 브레이싱',
    category: '코어 안정화',
    bodyParts: ['허리·몸통', '골반·엉덩관절'],
    targetArea: '복횡근, 다열근, 복부 심부근육',
    purpose: '복부 주변의 360도 원통형 복압을 활성화하여 척추 중립을 유지하고 일상 동작 중 요추 부담을 최소화합니다.',
    startPosition: '등을 대고 누워 무릎을 세우고, 양손 손가락 끝을 골반 안쪽 복벽(장골능 내측)에 가볍게 올려놓습니다.',
    executionSteps: [
      '코로 숨을 편안히 들이마신 후, 입으로 촛불을 끄듯 "후-"하고 호흡을 뱉습니다.',
      '배를 홀쭉하게 집어넣는 것이 아니라, 기침할 때처럼 복벽 전체를 단단한 원통처럼 밖으로 단단히 버텨줍니다.',
      '손가락 아래의 복벽이 단단하게 팽팽해진 상태를 확인하며 자연스럽게 숨을 쉬면서 5~10초간 힘을 유지합니다.',
      '힘을 서서히 풀고 3~5초간 휴식 후 반복합니다.'
    ],
    precautions: [
      '숨을 완전히 참는 발살바(Valsalva) 호흡은 혈압을 높이므로 금지합니다.',
      '골반을 뒤로 굴려 허리를 바닥으로 과도하게 짓누르지 말고 척추 중립을 유지합니다.',
      '어깨나 목에 힘이 들어가지 않도록 주의합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 7회)',
    videoPlaceholder: {
      durationSeconds: 40,
      guidePoints: ['360도 균일한 복압', '호흡 단절 방지', '척추 중립 유지'],
      illustrationType: 'bracing'
    }
  },
  {
    id: 'ex-5',
    name: '버드독',
    category: '코어 안정화',
    bodyParts: ['어깨', '허리·몸통', '골반·엉덩관절'],
    targetArea: '다열근, 둔근, 광배근 및 체간 안정화',
    purpose: '사지의 상반된 움직임 중에서도 척추의 중립 안정성을 유지할 수 있도록 신경근 조절 능력을 훈련합니다.',
    startPosition: '네발기기 자세에서 척추와 골반의 중립 정렬을 맞추고 시선은 양손 사이 바닥을 봅니다.',
    executionSteps: [
      '복부 브레이싱을 가볍게 유지한 상태에서 오른팔을 앞으로, 왼다리를 뒤로 곧게 뻗습니다.',
      '팔과 다리가 몸통과 수평이 되는 높이까지 올리고 3초간 자세를 유지합니다.',
      '천천히 시작 위치로 내려놓은 후, 반대쪽(왼팔과 오른다리)도 동일하게 뻗습니다.',
      '좌우 교대로 1회씩 제어된 속도로 반복합니다.'
    ],
    precautions: [
      '팔다리를 높이 드는 것보다 골반과 체간이 좌우로 기울어지지 않는 것이 중요합니다.',
      '허리가 아래로 꺾이거나 활처럼 휘지 않도록 복부 긴장감을 유지합니다.',
      '지지하는 어깨가 솟아오르지 않도록 바닥을 단단히 밀어냅니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '주 3~4회',
    videoPlaceholder: {
      durationSeconds: 60,
      guidePoints: ['골반 수평 정렬', '목 중립 위치', '체간 흔들림 제어'],
      illustrationType: 'bird-dog'
    }
  },
  {
    id: 'ex-6',
    name: '데드버그',
    category: '코어 안정화',
    bodyParts: ['팔·손', '허리·몸통', '무릎'],
    targetArea: '복직근, 복횡근, 요추-골반 복합체',
    purpose: '팔다리의 동적 가동 범위 내에서 요추의 전만 증가를 억제하고 전면 코어의 협응 수축 능력을 키웁니다.',
    startPosition: '등을 대고 누워 양팔은 천장을 향해 뻗고, 고관절과 무릎은 90도 각도로 들어올려 테이블탑 자세를 만듭니다.',
    executionSteps: [
      '허리가 바닥에서 과도하게 뜨지 않도록 복부 브레이싱을 단단히 잡습니다.',
      '숨을 내쉬며 오른팔은 머리 위로, 왼다리는 앞으로 길게 뻗어 바닥 가까이 내립니다.',
      '허리가 바닥에서 뜨기 직전 위치에서 1~2초 멈춘 뒤 시작 위치로 복귀합니다.',
      '반대쪽(왼팔과 오른다리)으로 교대하며 리듬감 있게 반복합니다.'
    ],
    precautions: [
      '팔다리를 내릴 때 요추가 바닥에서 아치형으로 들리면 즉시 다리 내리는 각도를 얕게 줄입니다.',
      '목에 긴장이 들어가지 않도록 턱을 가볍게 당겨 유지합니다.',
      '발목과 무릎의 각도를 안정적으로 제어합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 55,
      guidePoints: ['요추 중립 밀착', '팔다리 교차 조절', '호흡 리듬 유지'],
      illustrationType: 'dead-bug'
    }
  },
  {
    id: 'ex-7',
    name: '브리지',
    category: '근력 강화',
    bodyParts: ['허리·몸통', '골반·엉덩관절', '무릎'],
    targetArea: '대둔근, 햄스트링, 골반기저근',
    purpose: '둔근의 선택적 수축을 촉진하여 보행 및 체중 지지 능력을 향상시키고 요추 과부하를 방지합니다.',
    startPosition: '등을 대고 누워 무릎을 세우고 발은 골반 너비로 벌려 뒤꿈치를 엉덩이 한 뼘 정도 거리에 둡니다.',
    executionSteps: [
      '양 발바닥(특히 뒤꿈치)으로 바닥을 수직으로 밀며 엉덩이를 들어 올립니다.',
      '무릎, 골반, 어깨가 사선 일직선이 될 때까지 올린 후 엉덩이 근육을 2초간 강하게 조입니다.',
      '허리가 꺾이지 않도록 복부에 힘을 준 상태를 유지합니다.',
      '엉덩이 근육의 긴장을 느끼며 천천히 시작 자세로 내려옵니다.'
    ],
    precautions: [
      '허리를 과도하게 젖혀 활 모양으로 들지 말고 엉덩이의 힘으로만 들어 올립니다.',
      '무릎이 안쪽으로 모이거나 바깥으로 벌어지지 않도록 평행을 유지합니다.',
      '목이나 머리로 체중을 받치지 말고 날개뼈 부위로 지지합니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '주 3~4회',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['뒤꿈치로 지면 반력', '엉덩이 수축 집중', '허리 꺾임 방지'],
      illustrationType: 'bridge'
    }
  },
  {
    id: 'ex-8',
    name: '클램셸',
    category: '근력 강화',
    bodyParts: ['골반·엉덩관절', '무릎'],
    targetArea: '중둔근(외회전 섬유) 및 고관절 안정근',
    purpose: '고관절 외회전 및 안정화 근육을 강화하여 한 발 지지 시 골반이 반대쪽으로 떨어지는 현상(트렌델렌버그 징후)을 예방합니다.',
    startPosition: '옆으로 누워 베개나 팔로 머리를 받치고, 고관절 45도, 무릎 90도로 굽힌 채 양발 뒤꿈치를 맞댑니다.',
    executionSteps: [
      '양 뒤꿈치를 맞댄 상태를 축으로 삼아 위쪽 무릎을 조개껍질이 벌어지듯 위로 천천히 들어 올립니다.',
      '골반이 뒤로 넘어가지 않는 최대 범위에서 2초간 엉덩이 측면 상단의 수축을 유지합니다.',
      '저항을 느끼며 천천히 무릎을 내려 시작 자세로 돌아옵니다.'
    ],
    precautions: [
      '무릎을 올릴 때 골반과 몸통이 뒤쪽으로 함께 회전하지 않도록 손으로 골반 전면을 지지합니다.',
      '허리가 비틀리지 않도록 척추 정렬을 바르게 유지합니다.',
      '양발 뒤꿈치가 떨어지지 않도록 가볍게 붙여둡니다.'
    ],
    defaultReps: 15,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['뒤꿈치 피벗 회전', '골반 뒤틀림 방지', '중둔근 자극 집중'],
      illustrationType: 'clamshell'
    }
  },
  {
    id: 'ex-9',
    name: '옆으로 누워 다리 들기',
    category: '근력 강화',
    bodyParts: ['골반·엉덩관절', '무릎'],
    targetArea: '중둔근 및 소둔근 (고관절 외전근)',
    purpose: '고관절 외전 근력을 집중 강화하여 보행 중 골반의 좌우 동요를 줄이고 안정된 보행 패턴을 확립합니다.',
    startPosition: '옆으로 곧게 누워 아래쪽 다리는 살짝 굽혀 지지력을 높이고, 위쪽 다리는 무릎을 곧게 폅니다.',
    executionSteps: [
      '위쪽 다리의 발끝이 천장을 향하지 않도록 정면 또는 살짝 아래쪽을 향하게 정렬합니다.',
      '다리를 몸통과 일직선 상태로 유지하며 30~45도 높이까지 천천히 들어 올립니다.',
      '최고점에서 1~2초간 버틴 후 중둔근의 긴장을 유지하며 천천히 내립니다.'
    ],
    precautions: [
      '다리를 앞으로 차 올리지 말고 골반보다 약간 뒤쪽 사선으로 들어 올립니다.',
      '다리를 너무 높이 들어 허리가 옆으로 꺾이지 않도록 주의합니다.',
      '골반이 뒤로 눕지 않도록 위쪽 손으로 바닥 앞을 짚어 상체를 고정합니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '주 3~4회',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['발끝 수평 정렬', '골반 정면 유지', '반동 없는 외전'],
      illustrationType: 'side-leg-raise'
    }
  },
  {
    id: 'ex-10',
    name: '의자에서 일어서기',
    category: '기능적 움직임',
    bodyParts: ['골반·엉덩관절', '무릎', '발목·발'],
    targetArea: '대퇴사두근, 대둔근, 전신 협응력',
    purpose: '앉았다 일어서는 일상 기본 기능을 재교육하고 하지 근력과 체중 부하 균형 능력을 안전하게 회복합니다.',
    startPosition: '흔들리지 않는 안정적인 의자 앞쪽에 걸터앉아 양발을 골반 너비로 두고 무릎보다 살짝 뒤에 둡니다.',
    executionSteps: [
      '양팔은 가슴 앞에 교차하여 얹고 상체를 고관절에서부터 앞으로 가볍게 기울입니다.',
      '발바닥 전체로 바닥을 균등하게 지지하며 반동 없이 부드럽게 일어섭니다.',
      '완전히 일어선 상태에서 1초간 엉덩이에 힘을 주고 전신을 곧게 정렬합니다.',
      '엉덩이를 천천히 뒤로 빼면서 무릎을 굽혀 조심스럽게 의자에 착석합니다.'
    ],
    precautions: [
      '일어서거나 앉을 때 무릎이 안쪽으로 모이지 않도록 두 번째 발가락 방향을 향하게 합니다.',
      '쿵 소리가 나게 주저앉지 말고 하지 근육의 원심성 수축으로 속도를 제어하며 앉습니다.',
      '균형이 불안정한 경우 안전을 위해 손잡이나 보조 기구를 활용합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['무릎-발가락 정렬', '체중 중심 전방 이동', '충격 없는 착석'],
      illustrationType: 'sit-to-stand'
    }
  },
  {
    id: 'ex-11',
    name: '턱 당기기 (경추 심부 안정화)',
    category: '근력 강화',
    bodyParts: ['목'],
    targetArea: '경추 심부 굴곡근 및 후두하근',
    purpose: '거북목과 경추 과전만을 교정하고 목 심부 안정화 근육을 강화하여 경추 압박과 통증을 경감합니다.',
    startPosition: '벽에 등과 뒤통수를 가볍게 기대거나 의자에 허리를 펴고 앉아 시선을 정면 수평으로 둡니다.',
    executionSteps: [
      '손가락 하나를 턱 끝에 가볍게 댑니다.',
      '고개를 아래로 숙이지 말고, 서랍을 밀어 넣듯이 턱을 목 뒤쪽으로 수평으로 부드럽게 당깁니다.',
      '목 뒤쪽이 곧게 길어지는 느낌을 유지하며 5초간 자세를 유지합니다.',
      '천천히 힘을 빼고 시작 위치로 돌아옵니다.'
    ],
    precautions: [
      '고개를 아래로 끄덕이거나 숙이지 않고 수평 후방으로 당깁니다.',
      '어깨가 솟아오르지 않도록 편안하게 내립니다.',
      '숨을 참지 않고 부드럽게 호흡합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 40,
      guidePoints: ['턱 수평 후인', '목 뒤 신장', '어깨 이완 유지'],
      illustrationType: 'chin-tuck'
    }
  },
  {
    id: 'ex-12',
    name: '견갑골 모으기 (어깨 안정화)',
    category: '기능적 움직임',
    bodyParts: ['목', '어깨', '허리·몸통'],
    targetArea: '중·하부 승모근 및 능형근',
    purpose: '말린 어깨(라운드 숄더)를 펴고 견갑골의 동적 안정성을 증진시켜 상체 자세를 바르게 정렬합니다.',
    startPosition: '바르게 서거나 앉아서 양팔을 자연스럽게 내리고 척추를 곧게 폅니다.',
    executionSteps: [
      '양 날개뼈(견갑골) 사이에 동전을 쥐어짜듯 뒤쪽 아래 대각선 방향으로 부드럽게 모아줍니다.',
      '가슴을 활짝 열어주고 3~5초간 등 중앙의 수축감을 유지합니다.',
      '천천히 힘을 풀며 어깨를 제자리로 복귀시킵니다.'
    ],
    precautions: [
      '어깨를 으쓱거리며 위로 올리지 말고, 아래로 내리면서 모읍니다.',
      '허리가 과도하게 꺾이지 않도록 복부에 가벼운 긴장감을 줍니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['어깨 내리며 후인', '가슴 개방', '목 중립 정렬'],
      illustrationType: 'scapular-retraction'
    }
  },
  {
    id: 'ex-13',
    name: '코드만 진자 운동 (어깨 가동성)',
    category: '관절 가동성',
    bodyParts: ['어깨', '팔·손'],
    targetArea: '어깨 관절낭(G-H 관절) 및 회전근개',
    purpose: '어깨 관절에 중력을 이용한 관절 분리 견인력을 제공하여 오십견 및 회전근개 손상 후 초기 관절 가동 범위를 안전하게 확보합니다.',
    startPosition: '건측(건강한 팔)으로 테이블을 짚고 상체를 60~90도 앞으로 숙이며 환측 팔을 자연스럽게 아래로 늘어뜨립니다.',
    executionSteps: [
      '어깨 근육의 힘을 완전히 빼고 체간(몸통)을 앞뒤, 좌우로 가볍게 흔들어 팔이 시계추처럼 원을 그리도록 유도합니다.',
      '작은 원에서 시작하여 통증 없는 범위 내에서 시계 방향 15회, 반시계 방향 15회 회전합니다.',
      '팔 근육의 힘이 아닌 몸통의 반동으로 자연스럽게 흔들리게 합니다.'
    ],
    precautions: [
      '어깨 자체에 힘을 주어 팔을 돌리지 않습니다.',
      '허리에 무리가 가지 않도록 테이블에 체중을 안정적으로 지지합니다.'
    ],
    defaultReps: 15,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['어깨 완전 이완', '체간 반동 이용', '통증 없는 원 회전'],
      illustrationType: 'codman-pendulum'
    }
  },
  {
    id: 'ex-14',
    name: '손목 굴곡·신전 스트레칭',
    category: '유연성/스트레칭',
    bodyParts: ['팔·손'],
    targetArea: '전완 전면 굴곡근 및 후면 신전근, 수근관',
    purpose: '손목터널증후군과 테니스/골프 엘보를 예방하고 전완부 근육의 긴장을 해소하여 손목 관절 가동 범위를 개선합니다.',
    startPosition: '팔을 가슴 높이로 앞으로 곧게 뻗고 손바닥이 앞을 향하도록 꺾습니다.',
    executionSteps: [
      '반대쪽 손으로 손가락 끝을 잡고 몸쪽 방향으로 천천히 부드럽게 당깁니다 (손목 굴곡근 스트레칭).',
      '전완 안쪽이 시원하게 당겨지는 위치에서 15초간 유지합니다.',
      '이어서 손등이 앞을 향하게 내리고 손등을 몸쪽으로 부드럽게 당겨 전완 바깥쪽을 15초간 신장합니다.',
      '좌우 팔을 번갈아 가며 수행합니다.'
    ],
    precautions: [
      '손목이 찌릿하거나 신경 저림 증상이 생기면 즉시 당기는 강도를 줄입니다.',
      '팔꿈치가 구부러지지 않도록 곧게 편 상태를 유지합니다.'
    ],
    defaultReps: 5,
    defaultSets: 3,
    defaultFrequency: '매일 (주 7회)',
    videoPlaceholder: {
      durationSeconds: 40,
      guidePoints: ['팔꿈치 신전 유지', '지속적인 15초 신장', '손가락 전체 지지'],
      illustrationType: 'wrist-stretch'
    }
  },
  {
    id: 'ex-15',
    name: '서서 뒤꿈치 들기 (카프 레이즈)',
    category: '근력 강화',
    bodyParts: ['발목·발', '무릎'],
    targetArea: '비복근, 가자미근, 아킬레스건',
    purpose: '종아리 근육과 족관절 족저굴곡 근력을 증진하여 보행 시 추진력을 강화하고 발목 관절의 안정성을 높입니다.',
    startPosition: '벽이나 튼튼한 의자 등받이에 손을 가볍게 대고 양발을 골반 너비로 평행하게 섭니다.',
    executionSteps: [
      '엄지발가락 관절 부위에 체중을 고르게 실으며 양 발뒤꿈치를 최대한 높이 들어 올립니다.',
      '최고점에서 2초간 종아리 근육의 수축을 유지합니다.',
      '뒤꿈치를 쿵 떨어뜨리지 않고 천천히 저항을 느끼며 바닥으로 내립니다.'
    ],
    precautions: [
      '발목이 바깥으로 꺾이지 않도록 발목 축을 수직으로 유지합니다.',
      '무릎이 과도하게 뒤로 꺾이는 과신전(Back knee)을 방지합니다.'
    ],
    defaultReps: 15,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['수직 상하 이동', '발목 외측 흔들림 제어', '제어된 원심성 하강'],
      illustrationType: 'calf-raise'
    }
  },
  {
    id: 'ex-16',
    name: '발가락 수건 당기기 (발 내재근 강화)',
    category: '기능적 움직임',
    bodyParts: ['발목·발'],
    targetArea: '족부 내재근, 족저근막, 족궁(아치)',
    purpose: '발바닥의 아치를 지지하는 심부 내재근을 강화하여 평발, 족저근막염 및 족부 피로를 완화하고 균형 감각을 개선합니다.',
    startPosition: '의자에 바르게 앉아 맨발을 바닥에 펼쳐놓은 얇은 수건 끝부분에 올려놓습니다.',
    executionSteps: [
      '발뒤꿈치를 바닥에 고정한 상태에서 발가락 5개를 부채처럼 활짝 폅니다.',
      '발가락들을 구부려 수건을 쥐고 자신의 몸쪽으로 주름을 잡으며 당겨옵니다.',
      '수건 전체를 끝까지 모아 당길 때까지 10~15회 쥐어짜듯 반복합니다.',
      '반대쪽 발도 동일하게 진행합니다.'
    ],
    precautions: [
      '뒤꿈치가 바닥에서 들리지 않도록 고정합니다.',
      '발바닥에 쥐가 날 것 같은 느낌이 들면 즉시 중단하고 발바닥을 마사지합니다.'
    ],
    defaultReps: 10,
    defaultSets: 2,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['뒤꿈치 바닥 고정', '발가락 전갈 쥠', '발바닥 아치 수축'],
      illustrationType: 'towel-curl'
    }
  }
];

export const INITIAL_PATIENTS: Patient[] = [];

export const INITIAL_THERAPIST: Therapist = {
  id: '',
  name: '담당 물리치료사',
  title: '물리치료사',
  license: '',
  clinic: '재활치료센터'
};

export const INITIAL_WORKOUT_LOGS: WorkoutLog[] = [];

