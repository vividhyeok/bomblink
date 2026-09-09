# Bomb Link Original Reconstruction Spec

이 문서는 피처폰판 **Bomb Link**를 재구성하기 위한 research spec입니다.

규칙을 `confirmed / strong / provisional / unknown`으로 구분해서, 앞으로 AI나 사람이 코드를 수정할 때 추정값을 원작 사실처럼 굳히지 않도록 하는 것이 목적입니다.

## Confidence Labels

- `confirmed`: 공식 매뉴얼 문구 또는 복수의 강한 1차 자료로 확인
- `strong`: 공식 자료 + 화면/복수 자료가 같은 방향을 지지
- `provisional`: 2차 자료나 플레이 기록은 있으나 정확한 수치/조건 추가 검증 필요
- `unknown`: 아직 근거 부족

## Core Rule: One Directional Fuse

**Confidence: strong**

일반 폭탄은 회전 가능한 단일 심지를 가진 것으로 모델링한다.

원작 설명은 다른 폭탄의 fuse를 현재 폭발 중인 폭탄 쪽으로 향하게 하여 연쇄시키는 방식으로 기술된다.

Target model:

```ts
normalBomb.fuseDirection = up | right | down | left
```

현재 코드에서는 렌더러 호환을 위해 `connectors: Direction[]`를 유지하되 일반 폭탄은 정확히 한 방향만 생성한다.

## Core Rule: Directed Chain

**Confidence: confirmed**

폭발 중인 폭탄 A에서 이웃 B로 연쇄가 전달되는 조건:

```text
B의 심지가 A를 향한다.
```

즉 연쇄 탐색은 현재 폭발 지점에서 주변을 탐색하되, 후보 이웃 폭탄의 fuse 방향을 검사해야 한다.

```text
[A][B]
```

A가 폭발 중이면 B의 fuse가 `left`일 때 B가 연쇄된다.

## Edge Flame Ignition

**Confidence: confirmed**

불꽃은 보드 좌우 가장자리를 따라 진행하며, 가장자리 폭탄의 심지를 불꽃 쪽으로 맞추면 최초 폭발이 발생한다.

- left edge -> left-facing fuse
- right edge -> right-facing fuse

정확한 불꽃 출현 시간, 좌우 확률, 프레임 속도는 별도 검증 대상이다.

## Board / Incoming Row

**Confidence: strong**

복원 목표는 5열 × 8행 논리 레이아웃으로 둔다.

현재 reconstruction target:

- 7 playable rows
- 1 incoming / preview row

preview row는 선택/회전/연쇄 대상이 아니며 다음 raise 때 playable 영역으로 들어온다.

## Raise Control

**Confidence: confirmed**

원작 매뉴얼에는 사용자가 폭탄을 한 단계 끌어 올리는 조작이 존재한다.

PC reconstruction mapping:

- `X`
- `Shift`

모바일 reconstruction:

- `RAISE` button

자동 상승의 정확한 간격은 아직 provisional이다.

## Modes

**Confidence: confirmed**

원작 계열 메뉴에 다음 게임 모드가 존재한다.

- `ENDLESS`
- `100 ATTACK`

100 ATTACK은 100회의 fire/flame 기회를 기준으로 하는 모드로 복원한다.

현재 UI 메뉴는 아직 미구현이며 URL parameter를 임시 선택 수단으로 사용한다.

## Difficulty Selection

**Confidence: confirmed for menu existence / provisional for exact timing tables**

- EASY
- NORMAL
- HARD

난이도 선택과 플레이 중 level/stage는 별개의 개념으로 취급한다.

## Scoring

**Confidence: provisional-strong**

현존하는 Bomb Link 정리 자료에서 다음 형태의 점수식이 보고되어 있다.

```text
100 * explodedBombCount
+ 100 * max(0, combo - 2)^2
```

현재 일반 폭탄만 있는 구현에서는 `combo == explodedBombCount`로 동작하지만, 향후 multi-cell bonus piece가 들어가면 두 값을 분리할 필요가 있다.

## Stage / Level

**Confidence: unknown for exact threshold**

- stage 상한 99에 대한 플레이 기록/2차 자료가 존재
- 큰 연쇄에서 여러 level이 상승했다는 플레이 기록이 존재
- 정확한 level-up table과 bonus는 아직 확정하지 않음

따라서 `score / constant`를 원작 규칙으로 간주하지 않는다.

현재 코드의 level 계산은 gameplay tuning용 임시값이다.

## Special Pieces

**Confidence: confirmed for existence / provisional for exact spawn conditions**

공식 계열 매뉴얼에서 일반 폭탄 외 special bomb의 존재가 확인된다.

복원 대상:

- bonus / long bomb
- square bomb
- non-rotatable special pieces

다음은 아직 추가 검증 필요:

- 길이 2/3/4 piece의 정확한 생성 조건
- 9/18/27 chain과의 정확한 대응 관계
- multi-cell piece의 scoring contribution
- gravity / raise 중 occupied-cell 처리

## Timing

**Confidence: unknown**

다음 수치는 영상/실기기 기반으로 frame measurement해야 한다.

- first flame delay
- repeated flame interval
- flame travel speed
- automatic raise interval
- level별 속도 곡선
- explosion propagation interval
- falling speed

코드에 들어가는 현재 숫자는 `reconstruction tuning`으로 취급하며 원작 확정값이라고 문서화하지 않는다.

## Primary / Reference Sources

- Samsung SCH-E470 사용자 매뉴얼 계열: Bomb Link 메뉴/끌어 올리기 설명
- Panasonic / NTT DoCoMo P700i manual: Bomb Link fuse/chain, bonus bomb, square bomb 설명
  - https://www.docomo.ne.jp/english/binary/pdf/support/trouble/manual/download/p700i/P700i_E_11.pdf
- DoCoMo/Panasonic P506iC manual: raise operation 설명
- 당시 플레이어 기록 및 보존 커뮤니티 자료: level/score/special-piece 세부 조건의 보조 근거

## Implementation Rule

앞으로 기능을 추가할 때 다음 원칙을 지킨다.

1. `confirmed` 규칙은 기본 original mode에 바로 반영한다.
2. `strong` 규칙은 반영하되 문서에 근거를 남긴다.
3. `provisional` 수치는 상수/설정으로 분리하여 쉽게 교체 가능하게 만든다.
4. `unknown` 규칙을 AI가 임의로 채우지 않는다.
5. 현대적 편의 기능은 원작 규칙과 충돌하지 않는 선에서 유지한다.
