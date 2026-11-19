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
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '허리 아래쪽과 엉덩이 근육 (요추·둔근)',
    purpose: '뭉친 허리 아래쪽과 엉덩이 근육을 부드럽게 늘려주어, 허리에 가해지는 부담을 줄이고 움직임을 편안하게 만듭니다.',
    startPosition: '매트 위에 등을 대고 편안하게 누운 뒤, 두 무릎을 가볍게 세워 발바닥을 바닥에 붙입니다.',
    executionSteps: [
      '한쪽 무릎을 두 손으로 가볍게 감싸 잡습니다.',
      '숨을 천천히 내쉬면서 잡은 무릎을 가슴 쪽으로 부드럽게 당겨 올립니다.',
      '허리 아래쪽과 엉덩이가 시원하게 당기는 곳에서 15~20초 동안 자세를 유지합니다.',
      '숨을 들이마시며 천천히 처음 자세로 돌아오고, 반대쪽 다리도 같은 방법으로 반복합니다.'
    ],
    precautions: [
      '엉덩이와 골반이 바닥에서 너무 높이 들리거나 한쪽으로 틀어지지 않게 주의합니다.',
      '아픈 느낌이 날 때까지 억지로 당기지 말고, 기분 좋게 시원한 정도까지만 당겨 유지합니다.',
      '목이나 어깨에 힘이 들어가지 않도록 등 위쪽과 머리는 바닥에 편안히 붙여 둡니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['골반이 들리지 않게 유지', '목·어깨 힘 빼기', '반동 없이 숨 내쉬며 당기기'],
      illustrationType: 'knee-chest'
    }
  },
  {
    id: 'ex-2',
    name: '고양이-낙타 운동',
    category: '관절 가동성',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '등과 허리 전체 (척추 마디)',
    purpose: '굳어 있는 등뼈와 허리뼈를 위아래로 부드럽게 움직여 척추를 유연하게 만들고, 등·허리 근육의 긴장을 풀어줍니다.',
    startPosition: '바닥에 양손과 양 무릎을 대고 엎드린 네발기기 자세를 만듭니다. 양손은 어깨 바로 아래에, 양 무릎은 골반 바로 아래에 놓습니다.',
    executionSteps: [
      '숨을 들이마시면서 등을 천장 쪽으로 둥글게 말아 올리고, 고개는 자연스럽게 아래로 숙입니다 (고양이 자세).',
      '숨을 천천히 내쉬면서 배를 바닥 쪽으로 부드럽게 내리고, 가슴을 앞으로 펴며 시선은 앞쪽 바닥을 바라봅니다 (낙타 자세).',
      '각 자세에서 2~3초씩 머문 뒤, 등뼈와 허리뼈를 한 마디씩 천천히 움직이며 반복합니다.'
    ],
    precautions: [
      '배를 내릴 때 허리를 과하게 꺾어 누르지 않도록 주의합니다.',
      '손목에 체중이 쏠리지 않도록 손바닥 전체로 바닥을 고르게 짚습니다.',
      '반동을 주지 말고 호흡에 맞춰 천천히 부드럽게 움직입니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '주 4~5회',
    videoPlaceholder: {
      durationSeconds: 60,
      guidePoints: ['등을 둥글게 말았다 펴기', '어깨 아래 손목 맞추기', '허리 과하게 꺾지 않기'],
      illustrationType: 'cat-camel'
    }
  },
  {
    id: 'ex-3',
    name: '누운 자세 허리 회전 운동',
    category: '관절 가동성',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '허리 옆쪽과 옆구리 근육',
    purpose: '굳은 허리와 골반을 좌우로 부드럽게 돌려주어 허리 회전 움직임을 편하게 하고 옆구리 근육을 늘려줍니다.',
    startPosition: '매트에 등을 대고 누워 두 무릎을 세워 붙이고, 양팔은 옆으로 벌려 양쪽 어깨가 바닥에 잘 닿도록 합니다.',
    executionSteps: [
      '두 무릎을 붙인 상태로 천천히 오른쪽 바닥을 향해 부드럽게 기울여 내립니다.',
      '반대쪽(왼쪽) 어깨가 바닥에서 뜨지 않도록 붙인 채 고개는 왼쪽을 바라봅니다.',
      '허리와 옆구리가 편안하게 늘어나는 위치에서 10~15초 동안 머문 뒤 가운데로 돌아옵니다.',
      '같은 방법으로 무릎을 왼쪽으로 기울이며 반대쪽도 진행합니다.'
    ],
    precautions: [
      '반대쪽 어깨가 바닥에서 떨어질 만큼 무리해서 무릎을 바닥 끝까지 내리지 않습니다.',
      '허리 통증이나 다리 저림이 느껴지면 즉시 기울이는 각도를 줄입니다.',
      '다리를 툭 떨어뜨리지 말고 천천히 속도를 조절하며 움직입니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['양쪽 어깨 바닥에 붙이기', '두 무릎 붙인 채 기울이기', '천천히 숨 쉬며 유지하기'],
      illustrationType: 'trunk-rotation'
    }
  },
  {
    id: 'ex-4',
    name: '복부 브레이싱',
    category: '코어 안정화',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '배 안쪽 깊은 근육과 허리 지지 근육 (코어 근육)',
    purpose: '배 둘레 근육에 고르게 힘을 주어 허리뼈를 든든하게 받쳐주고, 일상생활에서 허리에 가는 부담을 줄여줍니다.',
    startPosition: '등을 대고 누워 무릎을 세운 뒤, 양손 끝을 골반뼈 안쪽의 아랫배 위에 가볍게 올려놓습니다.',
    executionSteps: [
      '코로 숨을 편안하게 들이마신 뒤, 입으로 촛불을 불듯 "후-" 하고 숨을 내쉽니다.',
      '배를 억지로 홀쭉하게 집어넣지 말고, 기침하거나 웃을 때처럼 배 전체를 단단한 원통 모양으로 힘주어 버텨줍니다.',
      '손끝 아래 아랫배가 단단해진 것을 느끼면서, 숨을 참지 않고 자연스럽게 쉬며 5~10초 동안 유지합니다.',
      '배의 힘을 천천히 풀고 3~5초 동안 쉰 다음 반복합니다.'
    ],
    precautions: [
      '숨을 꾹 참으면 혈압이 오르고 몸이 긴장되므로, 힘을 준 상태에서도 편안하게 숨을 쉽니다.',
      '허리를 바닥에 억지로 세게 짓누르지 말고, 허리의 자연스러운 곡선을 그대로 유지합니다.',
      '어깨나 목에 힘이 들어가지 않도록 상체를 편안히 이완합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 7회)',
    videoPlaceholder: {
      durationSeconds: 40,
      guidePoints: ['배 전체에 고르게 힘주기', '숨 참지 않고 호흡하기', '허리 자연스러운 곡선 유지'],
      illustrationType: 'bracing'
    }
  },
  {
    id: 'ex-5',
    name: '버드독',
    category: '코어 안정화',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '허리·등 지지 근육과 엉덩이 근육',
    purpose: '팔과 다리를 뻗는 동안 몸통이 흔들리지 않게 버티는 힘을 길러, 허리와 골반을 안정적으로 지지해 줍니다.',
    startPosition: '양손과 양 무릎을 바닥에 댄 네발기기 자세에서 등과 허리를 평평하게 펴고, 시선은 두 손 사이 바닥을 바라봅니다.',
    executionSteps: [
      '배에 가볍게 힘을 주어 허리를 고정한 상태에서, 오른팔은 앞으로 뻗고 왼쪽 다리는 뒤로 곧게 뻗습니다.',
      '팔과 다리를 몸통과 수평이 되는 높이까지만 들어 올린 뒤 3초 동안 자세를 유지합니다.',
      '천천히 처음 자세로 돌아온 후, 반대쪽(왼팔과 오른쪽 다리)도 똑같이 뻗어 유지합니다.',
      '몸통이 좌우로 흔들리지 않게 속도를 조절하며 번갈아 반복합니다.'
    ],
    precautions: [
      '팔다리를 높이 드는 것보다 허리와 골반이 옆으로 기울어지지 않게 평평하게 유지하는 것이 중요합니다.',
      '허리가 아래로 처지거나 꺾이지 않도록 배에 가벼운 힘을 유지합니다.',
      '바닥을 짚은 쪽 어깨가 귀 쪽으로 움츠러들지 않게 바닥을 밀어내듯 버팁니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '주 3~4회',
    videoPlaceholder: {
      durationSeconds: 60,
      guidePoints: ['골반 수평 유지하기', '고개 들지 않고 바닥 보기', '몸통 흔들림 줄이기'],
      illustrationType: 'bird-dog'
    }
  },
  {
    id: 'ex-6',
    name: '데드버그',
    category: '코어 안정화',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '앞쪽 배 근육과 허리·골반 지지 근육',
    purpose: '누워서 팔다리를 움직일 때 허리가 바닥에서 들뜨지 않게 잡는 힘을 길러 아랫배와 허리 중심 근육을 튼튼하게 합니다.',
    startPosition: '등을 대고 누워 양팔은 천장을 향해 뻗고, 두 다리는 무릎을 90도로 구부려 의자에 앉은 모양처럼 들어 올립니다.',
    executionSteps: [
      '배에 힘을 주어 허리 아래쪽이 바닥에서 들뜨지 않도록 평평하게 유지합니다.',
      '숨을 내쉬면서 오른팔은 머리 위로, 왼쪽 다리는 앞쪽 바닥을 향해 천천히 길게 뻗어 내립니다.',
      '허리가 바닥에서 뜨지 않는 범위까지만 내린 후 1~2초 멈췄다가 천천히 처음 위치로 돌아옵니다.',
      '반대쪽(왼팔과 오른쪽 다리)도 같은 방법으로 번갈아 가며 반복합니다.'
    ],
    precautions: [
      '팔다리를 내릴 때 허리가 바닥에서 들려 틈이 벌어지면, 다리를 내리는 높이를 줄여서 진행합니다.',
      '목에 힘이 들어가지 않도록 턱을 살짝 당겨 편안하게 유지합니다.',
      '팔다리를 빠르게 내리지 말고 호흡에 맞춰 천천히 움직입니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 55,
      guidePoints: ['허리가 바닥에서 뜨지 않게 유지', '반대쪽 팔다리 천천히 뻗기', '숨 내쉬며 배에 힘주기'],
      illustrationType: 'dead-bug'
    }
  },
  {
    id: 'ex-7',
    name: '브리지',
    category: '근력 강화',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '엉덩이 근육과 허벅지 뒤쪽 근육',
    purpose: '엉덩이와 허벅지 뒤쪽 근육을 튼튼하게 만들어 걷거나 서 있을 때 허리에 실리는 부담을 덜어줍니다.',
    startPosition: '등을 대고 누워 두 무릎을 세우고, 양발은 골반 너비로 벌려 발뒤꿈치를 엉덩이에서 한 뼘 정도 떨어진 곳에 놓습니다.',
    executionSteps: [
      '양 발바닥(특히 발뒤꿈치)으로 바닥을 누르면서 엉덩이를 천장 쪽으로 천천히 들어 올립니다.',
      '무릎, 골반, 어깨가 비스듬히 일직선이 될 때까지 올린 뒤, 엉덩이에 힘을 꼭 주고 2초 동안 유지합니다.',
      '허리가 과하게 꺾이지 않도록 배에도 가볍게 힘을 줍니다.',
      '엉덩이 근육의 힘을 느끼면서 위쪽 등부터 엉덩이 순서로 천천히 바닥에 내려놓습니다.'
    ],
    precautions: [
      '허리를 활처럼 과하게 젖혀 올리지 말고, 엉덩이 근육의 힘으로 골반을 들어 올립니다.',
      '무릎이 안쪽으로 모이거나 바깥으로 벌어지지 않도록 골반 너비를 유지합니다.',
      '목에 힘이 들어가지 않게 어깨와 등 위쪽으로 바닥을 지지합니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '주 3~4회',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['발뒤꿈치로 바닥 밀어 올리기', '엉덩이 근육 조이기', '허리 과하게 꺾지 않기'],
      illustrationType: 'bridge'
    }
  },
  {
    id: 'ex-8',
    name: '클램셸',
    category: '근력 강화',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '엉덩이 옆쪽 근육과 허리·골반 지지 근육',
    purpose: '엉덩이 옆쪽 근육을 강화하여 걸을 때나 한 발로 설 때 골반이 한쪽으로 기울어지는 것을 막아줍니다.',
    startPosition: '옆으로 누워 팔이나 베개로 머리를 편안히 받치고, 무릎을 살짝 구부려 앞으로 당긴 뒤 양발 뒤꿈치를 서로 붙입니다.',
    executionSteps: [
      '양발 뒤꿈치를 붙인 채로, 위쪽 무릎을 조개껍데기가 열리듯 천천히 위쪽으로 들어 올립니다.',
      '몸통과 골반이 뒤로 넘어가지 않는 범위까지 무릎을 벌리고, 엉덩이 옆쪽 위가 단단해지는 것을 느끼며 2초간 버팁니다.',
      '힘을 갑자기 빼지 않고 천천히 위쪽 무릎을 내려 처음 자세로 돌아옵니다.'
    ],
    precautions: [
      '무릎을 들어 올릴 때 골반과 상체가 뒤쪽으로 함께 넘어가지 않도록 위쪽 손으로 골반을 잡아 고정합니다.',
      '허리가 비틀리지 않게 몸통을 일직선으로 유지합니다.',
      '동작 내내 양발 뒤꿈치가 서로 떨어지지 않도록 붙여 둡니다.'
    ],
    defaultReps: 15,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['양발 뒤꿈치 붙인 채 무릎 열기', '골반이 뒤로 넘어가게 하지 않기', '엉덩이 옆쪽 힘 느끼기'],
      illustrationType: 'clamshell'
    }
  },
  {
    id: 'ex-9',
    name: '옆으로 누워 다리 들기',
    category: '근력 강화',
    bodyParts: ['허리·몸통'],
    isPrescribable: true,
    targetArea: '엉덩이 옆쪽 근육 (허리·골반 옆 지지 근육)',
    purpose: '다리를 옆으로 들어 올리는 엉덩이 옆 근육을 키워, 걸을 때 골반이 좌우로 흔들리지 않게 잡아줍니다.',
    startPosition: '옆으로 곧게 누워 아래쪽 다리는 무릎을 살짝 구부려 몸을 안정시키고, 위쪽 다리는 무릎을 곧게 폅니다.',
    executionSteps: [
      '위쪽 다리의 발끝이 천장을 향하지 않고 정면을 향하도록 발목을 바르게 맞춥니다.',
      '위쪽 다리를 몸통과 일직선으로 유지한 채 천장 쪽으로 30~45도 정도 천천히 들어 올립니다.',
      '가장 높은 위치에서 1~2초 동안 멈춘 뒤, 엉덩이 옆쪽의 힘을 느끼며 천천히 다리를 내립니다.'
    ],
    precautions: [
      '다리를 앞쪽으로 차 올리지 말고, 몸통과 일직선이거나 살짝 뒤쪽 방향으로 들어 올립니다.',
      '다리를 너무 높이 들어 옆구리와 허리가 꺾이지 않도록 적당한 높이까지만 올립니다.',
      '골반이 뒤로 젖혀지지 않도록 위쪽 손으로 가슴 앞 바닥을 짚어 몸을 고정합니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '주 3~4회',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['발끝이 정면을 향하게 유지', '몸통과 다리 일직선 유지', '반동 없이 천천히 올리고 내리기'],
      illustrationType: 'side-leg-raise'
    }
  },
  {
    id: 'ex-10',
    name: '의자에서 일어서기',
    category: '기능적 움직임',
    bodyParts: ['골반·엉덩관절', '무릎', '발목·발'],
    isPrescribable: false,
    targetArea: '허벅지 앞쪽 근육과 엉덩이 근육',
    purpose: '의자에서 앉고 일어서는 일상 동작을 안전하게 연습하여 허벅지와 엉덩이 근력을 키우고 하체 균형 감각을 회복합니다.',
    startPosition: '움직이지 않는 튼튼한 의자 앞쪽에 걸터앉아, 양발을 골반 너비로 벌리고 발 위치를 무릎보다 살짝 뒤쪽에 놓습니다.',
    executionSteps: [
      '양팔을 가슴 앞에 가볍게 포개어 얹고, 허리는 곧게 편 채 상체를 앞으로 살짝 숙입니다.',
      '양 발바닥 전체로 바닥을 고르게 밀면서 반동 없이 천천히 일어섭니다.',
      '완전히 일어선 자세에서 엉덩이에 가볍게 힘을 주며 1초 동안 몸을 곧게 세웁니다.',
      '엉덩이를 뒤로 천천히 빼면서 무릎을 굽혀 버티듯이 부드럽게 의자에 다시 앉습니다.'
    ],
    precautions: [
      '일어서거나 앉을 때 두 무릎이 안쪽으로 모이지 않도록 발끝 방향과 나란히 유지합니다.',
      '앉을 때 쿵 하고 주저앉지 말고, 허벅지 근육으로 속도를 조절하며 천천히 내려앉습니다.',
      '균형 잡기가 어지럽거나 불안하면 의자 팔걸이나 앞쪽 테이블을 잡고 안전하게 진행합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['무릎이 안으로 모이지 않게 유지', '상체를 살짝 숙이며 일어서기', '천천히 속도 조절하며 앉기'],
      illustrationType: 'sit-to-stand'
    }
  },
  {
    id: 'ex-11',
    name: '턱 당기기 (경추 심부 안정화)',
    category: '근력 강화',
    bodyParts: ['목'],
    isPrescribable: false,
    targetArea: '목 안쪽 깊은 근육과 뒷목 아래 근육',
    purpose: '앞으로 나온 거북목 자세를 바르게 교정하고, 목 안쪽 근육을 튼튼하게 만들어 목과 어깨의 뻐근함을 줄여줍니다.',
    startPosition: '의자에 허리를 펴고 바르게 앉거나 벽에 등과 뒤통수를 가볍게 기대고, 시선은 정면을 바라봅니다.',
    executionSteps: [
      '검지 손가락 하나를 턱 끝에 가볍게 가져다 댑니다.',
      '고개를 아래로 숙이지 말고, 서랍을 뒤로 밀어 넣듯이 턱과 머리를 수평으로 뒤쪽을 향해 부드럽게 당깁니다.',
      '뒷목이 위로 길게 펴지는 느낌을 느끼며 5초 동안 자세를 유지합니다.',
      '천천히 힘을 빼고 처음 자세로 돌아옵니다.'
    ],
    precautions: [
      '고개를 바닥 쪽으로 숙이거나 끄덕이지 말고, 시선을 정면에 둔 채 턱만 뒤로 수평 이동합니다.',
      '어깨가 귀 쪽으로 올라가지 않도록 어깨 힘을 편안하게 뺍니다.',
      '숨을 참지 않고 자연스럽게 호흡하며 진행합니다.'
    ],
    defaultReps: 10,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 40,
      guidePoints: ['턱을 수평으로 뒤로 당기기', '뒷목 길게 펴기', '어깨 힘 빼고 내리기'],
      illustrationType: 'chin-tuck'
    }
  },
  {
    id: 'ex-12',
    name: '견갑골 모으기 (어깨 안정화)',
    category: '기능적 움직임',
    bodyParts: ['목', '어깨', '허리·몸통'],
    isPrescribable: false,
    targetArea: '등 가운데 근육과 날개뼈 주변 근육 (승모근·능형근)',
    purpose: '앞으로 말린 어깨를 펴주고 등 가운데 날개뼈 주변 근육을 강화하여 구부정한 상체 자세를 바르게 세워줍니다.',
    startPosition: '의자에 앉거나 바르게 서서 허리를 펴고, 양팔은 몸 옆에 자연스럽게 내려놓습니다.',
    executionSteps: [
      '등 뒤 양쪽 날개뼈(견갑골) 사이에 연필을 끼워 잡는다는 느낌으로, 날개뼈를 등 가운데와 아래쪽 방향으로 부드럽게 모아줍니다.',
      '가슴을 자연스럽게 펴고 등 가운데에 힘이 들어가는 것을 느끼며 3~5초 동안 유지합니다.',
      '천천히 힘을 풀면서 어깨를 원래 위치로 되돌립니다.'
    ],
    precautions: [
      '어깨를 귀 쪽으로 으쓱 올리지 말고, 어깨를 아래로 낮추면서 날개뼈를 모읍니다.',
      '가슴을 편다고 허리를 과하게 뒤로 젖히지 않도록 배에 가볍게 힘을 줍니다.'
    ],
    defaultReps: 12,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['어깨는 내리고 날개뼈 모으기', '가슴 활짝 펴기', '목과 어깨 위쪽 긴장 풀기'],
      illustrationType: 'scapular-retraction'
    }
  },
  {
    id: 'ex-13',
    name: '코드만 진자 운동 (어깨 가동성)',
    category: '관절 가동성',
    bodyParts: ['어깨', '팔·손'],
    isPrescribable: false,
    targetArea: '어깨 관절과 어깨 주변 근육 (회전근개)',
    purpose: '어깨에 힘을 뺀 채 팔의 무게로 관절 사이 공간을 부드럽게 넓혀주어, 굳은 어깨를 통증 없이 부드럽게 풀어줍니다.',
    startPosition: '아프지 않은 쪽 손으로 식탁이나 책상을 짚고 상체를 앞으로 숙인 뒤, 아픈 쪽 팔은 힘을 완전히 빼고 바닥을 향해 툭 늘어뜨립니다.',
    executionSteps: [
      '늘어뜨린 팔과 어깨의 힘을 완전히 빼고, 몸통을 앞뒤·좌우로 살짝 흔들어 팔이 시계추처럼 자연스럽게 움직이게 합니다.',
      '작은 원부터 시작하여 통증이 없는 범위 안에서 시계 방향으로 15번, 반시계 방향으로 15번 부드럽게 원을 그립니다.',
      '어깨 근육에 힘을 주어 팔을 직접 돌리지 말고, 몸통의 움직임으로 팔이 흔들리도록 합니다.'
    ],
    precautions: [
      '팔이나 어깨에 스스로 힘을 주어 억지로 돌리지 않습니다.',
      '허리가 아프지 않도록 책상을 짚은 손에 체중을 충분히 기대어 지지합니다.'
    ],
    defaultReps: 15,
    defaultSets: 3,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 50,
      guidePoints: ['어깨와 팔 힘 완전히 빼기', '몸통 흔들림으로 팔 움직이기', '통증 없는 크기로 원 그리기'],
      illustrationType: 'codman-pendulum'
    }
  },
  {
    id: 'ex-14',
    name: '손목 굴곡·신전 스트레칭',
    category: '유연성/스트레칭',
    bodyParts: ['팔·손'],
    isPrescribable: false,
    targetArea: '팔뚝 안쪽·바깥쪽 근육과 손목 관절',
    purpose: '자주 써서 뭉친 팔뚝 근육과 손목 주변을 부드럽게 늘려주어 손목 시큰거림과 팔꿈치 주변 통증을 줄여줍니다.',
    startPosition: '한쪽 팔을 가슴 높이로 앞으로 곧게 뻗고, 손바닥이 정면을 보이도록 손목을 위로 세웁니다.',
    executionSteps: [
      '반대쪽 손으로 뻗은 손의 손가락들을 잡고 몸 쪽으로 천천히 부드럽게 당겨 팔뚝 안쪽을 늘려줍니다.',
      '팔뚝 안쪽이 기분 좋게 당기는 상태에서 15초 동안 유지합니다.',
      '이번에는 손등이 정면을 보이게 손목을 아래로 숙인 뒤, 반대쪽 손으로 손등을 몸 쪽으로 부드럽게 당겨 팔뚝 바깥쪽을 15초 동안 늘려줍니다.',
      '양쪽 팔을 번갈아 가며 같은 방법으로 반복합니다.'
    ],
    precautions: [
      '손목이 찌릿하거나 손가락이 저린 느낌이 들면 즉시 당기는 힘을 줄입니다.',
      '동작하는 동안 팔꿈치가 구부러지지 않게 곧게 편 상태를 유지합니다.'
    ],
    defaultReps: 5,
    defaultSets: 3,
    defaultFrequency: '매일 (주 7회)',
    videoPlaceholder: {
      durationSeconds: 40,
      guidePoints: ['팔꿈치 곧게 펴기', '15초 동안 부드럽게 유지', '저리지 않는 범위까지만 당기기'],
      illustrationType: 'wrist-stretch'
    }
  },
  {
    id: 'ex-15',
    name: '서서 뒤꿈치 들기 (카프 레이즈)',
    category: '근력 강화',
    bodyParts: ['발목·발', '무릎'],
    isPrescribable: false,
    targetArea: '종아리 근육과 발목 뒤쪽 힘줄 (아킬레스건)',
    purpose: '종아리와 발목 근육을 튼튼하게 길러 걸을 때 바닥을 밀어내는 힘을 높이고 발목이 쉽게 접질리지 않게 잡아줍니다.',
    startPosition: '벽이나 튼튼한 의자 등받이를 양손으로 가볍게 잡고, 두 발을 골반 너비로 벌려 나란히 섭니다.',
    executionSteps: [
      '엄지발가락과 발 앞쪽에 체중을 고르게 실으면서 양쪽 발뒤꿈치를 동시에 천천히 높이 들어 올립니다.',
      '가장 높이 올라간 위치에서 종아리에 힘이 들어가는 것을 느끼며 2초 동안 멈춥니다.',
      '뒤꿈치가 바닥에 쿵 떨어지지 않도록 속도를 조절하며 천천히 바닥으로 내립니다.'
    ],
    precautions: [
      '뒤꿈치를 들 때 발목이 바깥쪽(새끼발가락 쪽)으로 꺾이지 않도록 발목을 곧게 세워 올립니다.',
      '무릎을 뒤로 과하게 꺾어 잠그지 말고 자연스럽게 펴서 유지합니다.'
    ],
    defaultReps: 15,
    defaultSets: 3,
    defaultFrequency: '주 3~5회',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['발목이 꺾이지 않게 수직으로 들기', '엄지발가락 쪽에 체중 싣기', '내려올 때 천천히 버티며 내리기'],
      illustrationType: 'calf-raise'
    }
  },
  {
    id: 'ex-16',
    name: '발가락 수건 당기기 (발 내재근 강화)',
    category: '기능적 움직임',
    bodyParts: ['발목·발'],
    isPrescribable: false,
    targetArea: '발바닥 안쪽 근육과 발바닥 아치(움푹 들어간 부분)',
    purpose: '발바닥의 움푹 들어간 아치를 받쳐주는 작은 근육들을 튼튼하게 만들어, 발바닥 통증과 피로를 줄이고 서 있을 때 균형을 잘 잡도록 돕습니다.',
    startPosition: '의자에 바르게 앉아 바닥에 얇은 수건을 펴 놓고, 맨발을 수건 끝부분 위에 올려놓습니다.',
    executionSteps: [
      '발뒤꿈치를 바닥에 붙인 상태에서 발가락 5개를 부채처럼 활짝 폅니다.',
      '발가락을 오므려 바닥의 수건을 움켜쥐고, 발뒤꿈치 쪽으로 수건을 끌어당깁니다.',
      '발바닥 가운데가 움푹하게 힘이 들어가는 것을 느끼며 수건을 10~15번 반복해서 당겨 모읍니다.',
      '수건을 다시 펴고 반대쪽 발도 같은 방법으로 진행합니다.'
    ],
    precautions: [
      '수건을 당길 때 발뒤꿈치가 바닥에서 들리지 않도록 꼭 붙여 둡니다.',
      '발바닥에 쥐가 날 것 같으면 바로 멈추고 발바닥을 부드럽게 주물러 풀어줍니다.'
    ],
    defaultReps: 10,
    defaultSets: 2,
    defaultFrequency: '매일 (주 5~7회)',
    videoPlaceholder: {
      durationSeconds: 45,
      guidePoints: ['발뒤꿈치 바닥에 붙이기', '발가락으로 수건 움켜쥐어 당기기', '발바닥 아치에 힘 느끼기'],
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
