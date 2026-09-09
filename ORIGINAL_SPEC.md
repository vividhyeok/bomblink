# Bomb Link Original Reconstruction Spec

이 문서는 피처폰판 **Bomb Link**를 재구성하기 위한 research spec입니다.

규칙을 `confirmed / strong / provisional / unknown`으로 구분해서, 앞으로 AI나 사람이 코드를 수정할 때 추정값을 원작 사실처럼 굳히지 않도록 하는 것이 목적입니다.

## Confidence Labels

- `confirmed`: 공식 매뉴얼 문구 또는 복수의 강한 1차 자료로 확인
- `strong`: 공식 자료 + 당시 플레이 기록/복수 자료가 같은 방향을 지지
- `provisional`: 2차 보존 자료 또는 후대 공식 포트에서 확인되지만 피처폰판의 정확한 수치/조건은 추가 검증 필요
- `unknown`: 아직 근거 부족

## Core Rule: One Directional Fuse

**Confidence: strong**

일반 폭탄은 회전 가능한 단일 심지를 가진 것으로 모델링한다.

공식 P700i/P506iC 매뉴얼은 폭탄의 fuse가 향하는 방향을 회전시키고, 다른 폭탄의 fuse를 현재 폭발 중인 폭탄 쪽으로 향하게 하여 연쇄시킨다고 설명한다.

Target model:

```ts
normalBomb.fuseDirection = up | right | down | left
```

현재 코드에서는 렌더러/규칙 호환을 위해 `connectors: Direction[]`를 유지하되 일반 폭탄은 정확히 한 방향만 생성한다.

## Core Rule: Directed Chain

**Confidence: confirmed**

폭발 중인 폭탄 A에서 이웃 B로 연쇄가 전달되는 조건:

```text
B의 심지가 A를 향한다.
```

즉 연쇄 탐색은 현재 폭발 지점에서 주변을 탐색하되 후보 이웃 폭탄의 fuse 방향을 검사한다.

```text
[A][B]
```

A가 먼저 폭발했다면 B는 `left` 심지를 가져야 B가 이어서 폭발한다.

## Edge Flame Ignition

**Confidence: confirmed**

불꽃은 보드 좌우 가장자리를 따라 진행하며, 가장자리 폭탄의 심지를 불꽃 쪽으로 맞추면 최초 폭발이 발생한다.

- left edge -> left-facing fuse
- right edge -> right-facing fuse

정확한 불꽃 출현 시간, 좌우 확률, 프레임 속도는 별도 검증 대상이다.

## Flame Pause / Resume During Explosion

**Confidence: strong**

2004년 당시 플레이 기록에서 다음 동작이 직접 설명된다.

- 폭탄이 폭발하는 동안 화면 가장자리의 불꽃은 정지한다.
- 그 동안에도 다른 폭탄은 자유롭게 조작할 수 있다.
- 따라서 하나의 불꽃 낙하 중 여러 묶음의 폭탄을 순차적으로 제거할 수 있다.

이는 `100 ATTACK`의 100이 점화 횟수가 아니라 **불꽃 낙하 횟수**라는 공식 매뉴얼 설명과도 일치한다.

Reconstruction behavior:

1. 불꽃이 심지에 닿으면 그 위치에서 일시 정지한다.
2. 연결된 연쇄가 폭발한다.
3. 폭발/중력이 끝나면 동일한 불꽃이 그 위치부터 다시 내려간다.
4. 이후 다른 심지를 만나면 또 정지하고 새로운 연쇄를 만들 수 있다.
5. 이 과정 전체가 한 번의 flame drop으로 계산된다.

폭발 중 커서 이동/심지 회전도 허용한다.

## Board / Incoming Row

**Confidence: strong**

복원 목표는 `5 columns x 8 logical rows`로 둔다.

- 7 playable rows
- 1 incoming / preview row

GameSpot의 2004년 리뷰는 플레이 보드를 `5 x 7`로 명시하고, 피처폰 보존 자료는 8번째 가로줄을 다음 폭탄을 보여주는 비조작 영역으로 설명한다.

P252is 매뉴얼도 수동 상승을 `Raises next bomb one step up`으로 표현한다.

preview row는 선택/회전/연쇄 대상이 아니며 다음 raise 때 playable 영역으로 들어온다.

## Raise Control

**Confidence: confirmed**

공식 P700i/P506iC/P252is 매뉴얼에 사용자가 폭탄 또는 next bomb를 한 단계 올리는 조작이 명시되어 있다.

PC reconstruction mapping:

- `X`
- `Shift`

모바일 reconstruction:

- `RAISE` button

자동 상승의 정확한 간격은 아직 미확정이다.

## Modes

**Confidence: confirmed**

피처폰 Panasonic/DoCoMo 계열 공식 매뉴얼에서 확인되는 모드:

- `ENDLESS`
- `100 ATTACK`

`100 ATTACK`은 불꽃이 100회 떨어질 때까지 플레이한다.

2003~2004 T-net 해외판에는 다른 모드 구성이 존재하므로, 그 모드는 삼성/DoCoMo 복원 타깃에 혼합하지 않는다.

현재 메뉴 UI는 아직 미구현이며 URL parameter를 임시 선택 수단으로 사용한다.

## Difficulty Selection

**Confidence: confirmed for menu existence / unknown for exact numeric tables**

- EASY
- NORMAL
- HARD

난이도 선택과 플레이 중 level은 별개의 개념으로 취급한다.

후대의 공식 Capcom 포트에서도 난이도가 올라갈수록 obstruction bomb가 많아지고, level-up에 따라 게임 자체 난도가 점진적으로 올라가는 동작이 확인된다. 다만 이것의 정확한 수치표를 피처폰판에 그대로 적용하지 않는다.

## Scoring

**Confidence: provisional-strong**

현존하는 피처폰판 보존 자료에서 다음 점수식이 보고되어 있다.

```text
score += 100 * explodedBombUnits
       + 100 * max(0, combo - 2)^2
```

일반 폭탄만 있으면 `explodedBombUnits == combo`다.

공식 매뉴얼은 bonus bomb(big one)을 폭발시키면 일반 폭탄보다 높은 점수를 얻는다고 명시한다. 따라서 bonus piece는 별도의 폭발 단위 가중치를 가질 수 있도록 구현한다.

## Level / Level-up Bonus

**Confidence: confirmed for bonus existence / unknown for exact threshold and amount**

공식 P700i/P506iC 매뉴얼은 **level이 올라갈 때도 점수를 얻는다**고 명시한다.

2004년 당시 고득점 플레이 기록에서는 긴 한 번의 연쇄보다 작은 연쇄를 많이 만들어 `level-up bonus`를 자주 받는 전략이 훨씬 높은 점수로 이어졌다고 기록되어 있다.

따라서 level-up bonus가 실제 플레이 전략에 중요한 요소였다는 근거는 강하다.

아직 복원하지 못한 값:

- 정확한 level-up 조건/table
- level-up 시 추가되는 점수
- EASY/NORMAL/HARD에 따른 level 진행 차이

숫자를 확인하지 못했으므로 임의의 보너스 점수는 넣지 않는다. 현재 level 계산식은 tuning placeholder이며 원작 규칙으로 취급하지 않는다.

## Special Pieces: Bonus / Big Bomb

**Confidence: confirmed for existence/non-rotation/high score; provisional-strong for 9/18/27 rule**

공식 P700i/P506iC 매뉴얼에서 다음이 확인된다.

- `bonus bomb (big one)`이 존재한다.
- 회전할 수 없다.
- 폭발시키면 높은 점수를 얻는다.

피처폰판 보존 자료에서는 한 연속 폭발에서 터진 폭탄 수가 9의 배수일 때 긴 폭탄이 생기며 다음과 같이 정리되어 있다.

- 9 bombs -> length 2
- 18 bombs -> length 3
- 27 bombs -> length 4

현재 구현은 이 조건을 사용해 `B2/B3/B4` bonus piece를 next row에 예약한다.

단, 실제 2/3/4칸을 동시에 점유하는 정확한 geometry와 이동/중력 처리까지는 자료가 충분하지 않다. 따라서 현재는 **한 logical cell + 2/3/4 scoring-unit weight**로 구현한 명시적 proxy다.

## Special Pieces: Square / Obstruction Bomb

**Confidence: confirmed for existence/non-rotation; provisional for feature-phone frequency curve**

P700i/P506iC 공식 매뉴얼은 회전할 수 없는 `square bomb`의 존재를 확인한다. P252is 계열에서는 유사 특수 폭탄을 `blue bomb`으로 부르는 변형도 확인된다.

2009년 공식 Capcom 포트 자료에서는 같은 계보의 특수 폭탄을 `obstruction bomb` / 탱크형 폭탄으로 설명하며:

- 사각형이고 회전 불가
- 난이도가 높을수록 수가 증가

한다고 명시한다.

현재 복원판은 이 정성적 규칙을 반영해 난도가 높아질수록 obstruction piece가 preview row에 나타날 확률을 높인다.

**주의:** 정확한 피처폰판 등장 확률은 발견하지 못했으므로 확률 상수는 교체 가능한 reconstruction tuning이다.

## Fuse Readability Layer

**Confidence: modern reconstruction aid, not claimed original pixel art**

2004년 GameSpot 리뷰도 작은 화면에서 각 fuse orientation을 판독하려면 주의해서 봐야 했다고 지적한다. PC에서는 원작의 작은 해상도 문제까지 그대로 재현하기보다 규칙 판독성을 보존하는 것이 목적에 더 맞다고 판단한다.

현재 렌더링 의미:

- bright cream solid fuse: 다른 playable bomb를 실제로 향함
- gold fuse: 좌/우 edge flame rail을 향함
- dark short/dashed fuse: 빈 공간을 향함
- triangular tip: 해당 폭탄의 fuse 방향
- green cursor ring: selected bomb의 fuse가 bomb를 향함
- gold cursor ring: flame rail을 향함
- red/pink cursor ring: 빈 공간을 향함
- preview row fuse: dimmed

이 색상/기호 자체는 원작 그래픽을 주장하지 않는 현대적 가독성 보조층이다.

## Timing

**Confidence: unknown for exact numeric values**

다음 수치는 검색 가능한 공식 매뉴얼/당시 기록만으로 정확한 값을 찾지 못했다.

- first flame delay
- repeated flame interval
- flame travel speed
- automatic raise interval
- level별 속도 곡선
- explosion propagation interval
- falling speed

코드의 현재 숫자는 `reconstruction tuning`으로 취급하며 원작 확정값이라고 문서화하지 않는다.

## Primary / Reference Sources

- Panasonic / NTT DoCoMo P700i manual: chain, mode, difficulty, raise, bonus/square bomb, level-up score
  - https://www.docomo.ne.jp/english/binary/pdf/support/trouble/manual/download/p700i/P700i_E_11.pdf
- DoCoMo / Panasonic P506iC manual: 동일 계열 BombLink 규칙과 raise 동작
  - https://www.manualslib.com/manual/3787763/Docomo-Mova-P506ic.html?page=405
- mova P252is manual: `Raises next bomb one step up`, bonus/blue bomb
  - https://www.manualslib.com/manual/3161479/Ishot-Mova-P252is.html?page=411
- GameSpot BombLink review (2004): 5x7 playable board, fuse orientation 판독성, T-net판 게임 설명
  - https://www.gamespot.com/reviews/bomblink-review/1900-6094366/
- Jun Mitani 당시 플레이 기록 (2004): explosion 중 flame pause, 조작 지속, level-up bonus 전략
  - https://junmitani.hatenablog.com/entry/20041030
- 피처폰판 보존 자료: 8x5 logical layout, 9/18/27 long-bomb 조건, 점수식
  - https://m.namu.moe/w/Bomblink
- GAME Watch / Capcom iPhone port coverage (2009): obstruction/bonus bomb 계보와 difficulty 관계의 보조 근거
  - https://game.watch.impress.co.jp/docs/news/319648.html

## Implementation Rule

앞으로 기능을 추가할 때 다음 원칙을 지킨다.

1. `confirmed` 규칙은 기본 original reconstruction에 바로 반영한다.
2. `strong` 규칙은 반영하되 문서에 근거를 남긴다.
3. `provisional` 수치는 상수/설정으로 분리하여 쉽게 교체 가능하게 만든다.
4. `unknown` 숫자를 AI가 임의로 원작값처럼 채우지 않는다.
5. 현대적 가독성/편의 기능은 원작 규칙과 충돌하지 않는 선에서 유지하되 원작 그래픽과 구분한다.
