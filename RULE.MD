# Current Implemented Rules

이 문서는 **현재 코드가 실제로 구현하는 규칙**만 설명합니다. 원작 Bomb Link의 근거/확신도는 `ORIGINAL_SPEC.md`, 타이밍 근거는 `TIMING_RESEARCH.md`에서 별도로 관리합니다.

## Board

- logical canvas: `240 x 360`
- board: `5 columns x 8 logical rows`
- playable rows: `row 0 .. row 6`
- preview row: `row 7`
- death row: `row 0`
- 시작 시 playable 영역의 아래 **4행**이 일반 폭탄으로 채워집니다.
- preview row는 다음 상승 때 들어올 행이며 직접 조작/연쇄 대상이 아닙니다.

## Cursor

- 위/아래 이동은 playable 영역 끝에서 멈춥니다.
- 좌/우 이동은 원작 복원 구현처럼 **가로 wrap** 됩니다.

```text
right edge + right -> left edge
left edge + left   -> right edge
```

## Normal Bomb / Fuse

일반 폭탄은 심지 방향을 정확히 하나 가집니다.

```text
up | right | down | left
```

일반 폭탄만 시계/반시계 방향으로 90도 회전할 수 있습니다.

## Directed Chain Rule

폭발 중인 A에서 이웃 B로 불이 전달되려면 **B의 심지가 A를 향해야 합니다.**

```text
[A][B]
```

A가 먼저 폭발했다면 B가 `left`를 향할 때만 B가 이어서 폭발합니다. A가 `right`를 향하는 것은 조건이 아닙니다.

### Runtime propagation

연쇄 전체를 최초 점화 순간에 미리 계산하지 않습니다.

각 폭탄이 폭발하면 약 `0.4s` 뒤에 그 폭탄의 네 이웃을 다시 검사합니다. 이때 **그 순간의 실제 fuse direction**으로 다음 폭탄의 점화 여부를 결정합니다.

따라서 다음 플레이가 가능합니다.

```text
A 폭발
  ↓ 0.4초 안에 B를 A쪽으로 회전
B 점화 성공
```

반대로 처음에는 B가 A를 향하고 있었더라도 전파 판정 전에 B를 다른 방향으로 돌리면 그 edge는 끊어집니다.

## Edge Flame

- 불꽃은 좌 또는 우 가장자리를 따라 아래로 내려갑니다.
- 왼쪽 끝 폭탄의 심지가 `left`이면 왼쪽 불꽃에 점화됩니다.
- 오른쪽 끝 폭탄의 심지가 `right`이면 오른쪽 불꽃에 점화됩니다.
- playable row `0..6`만 검사합니다.

### Flame cadence

현재 reference-derived 재현:

```text
불꽃이 없는 대기          ~= 3.0s
상단 불꽃 예고/대기       ~= 1.0s
불꽃 하강                 ~= 3.0s
다음 불꽃 전 대기         ~= 3.0s
```

따라서 폭발이 없다면 하강 시작 시점 사이 간격은 약 `7s`입니다. 첫 하강은 플레이 루프 시작 약 `4s` 후입니다.

### Flame side pattern

각 불꽃을 독립 50:50으로 고르지 않습니다. 공개 복원 구현의 상태 전이를 재현합니다.

```text
0 = right
1 = right
2 = left
3 = left
```

기본적으로 `R R L L` 순환이며, 다음 상태로 넘어가기 전에 **20% 확률로 한 상태를 추가로 건너뜁니다.** 이 부분은 reference-derived입니다.

### Flame pause / resume

1. 불꽃이 edge fuse에 닿으면 현재 위치에서 멈춥니다.
2. 그 폭탄에서 runtime directed chain이 시작됩니다.
3. chain 중에도 커서 이동과 아직 점화되지 않은 일반 폭탄 회전이 가능합니다.
4. 마지막 폭탄이 더 이상 연쇄를 만들지 못하면 chain 점수/레벨 진행을 확정합니다.
5. 제거와 gravity가 끝나면 같은 FlameEvent가 다시 내려갑니다.
6. 아래쪽의 다른 edge fuse를 만나면 별도 chain을 다시 만들 수 있습니다.

`100 ATTACK`에서는 이 전체 과정이 한 번의 flame drop으로 계산됩니다.

## Raise / Incoming Row

자동 상승 또는 사용자 `RAISE` 입력이 발생하면:

1. playable 영역이 한 줄 위로 이동
2. preview row가 bottom playable row로 진입
3. 새로운 preview row 생성
4. death row가 차 있으면 game over

사용자 입력:

- `X`
- `Left Shift`
- `Right Shift`
- 모바일 `RAISE`

### Raise motion

한 줄 상승 애니메이션은 약 `0.75s`입니다. gravity의 `0.25s / cell`과 별개입니다.

불꽃이 단순히 이동 중일 때 raise가 시작되어도 불꽃 자체는 계속 진행합니다. **폭발/중력 처리 중일 때만** 불꽃과 자동 상승 압력이 멈춥니다.

### Automatic raise pressure

기본 가속 규칙:

```text
initial interval = 41.0s
after every raise = -1.5s
minimum = 0.5s
```

하지만 상승 간격은 0.5초까지 단조롭게 내려가기만 하지 않습니다. 공개 복원 구현의 중요한 회복 규칙을 반영합니다.

```text
after a completed clear:
raiseInterval = max(raiseInterval, explodedBombCount)
pressureTimer = raiseInterval
```

즉 폭탄을 많이 지울수록 다음 자동 상승까지 숨 돌릴 시간이 생깁니다. 이전 구현에서 이 규칙이 빠져 후반에 보드가 `0.5s` 간격으로 계속 치솟는 현상이 있었습니다.

## Incoming Row Generation

새 preview row마다 다음이 독립적으로 결정됩니다.

- fixed square/obstruction: 최대 1개
- empty gap: 최대 1개

현재 reference-derived row probability:

```text
EASY   1/4
NORMAL 1/3
HARD   1/2
```

square와 gap이 같은 column이면 gap이 우선합니다.

## Square / Obstruction Bomb

- 회전 불가
- 자기 심지가 폭발 중인 이웃을 향하면 정상적으로 연쇄되어 제거 가능
- gravity로 한 칸 떨어질 때 vertical fuse가 반전

```text
up   <-> down
left  -> left
right -> right
```

## Bonus / Long Bomb

한 chain에서:

```text
9+  -> length 2
18+ -> length 3
27+ -> length 4
```

긴 폭탄은 실제 가로 `2 / 3 / 4`칸짜리 rigid piece입니다.

- 위에서 낙하
- 기존 폭탄이 받치는 위치를 anchor로 선택
- anchor의 외부 fuse는 supporting bomb을 향함
- 나머지 segment의 숨겨진 내부 fuse는 anchor 방향을 향함
- runtime propagation에 의해 anchor -> 내부 segment -> 바깥 연쇄 순서로 실제 시간차를 두고 진행
- gravity에서도 조각나지 않음

추가 bonus score:

```text
length 2 -> +20,000
length 3 -> +90,000
length 4 -> +200,000
```

## Gravity / Flip Animation

- normal/square bomb은 아래가 비면 낙하
- 한 칸 낙하할 때마다 vertical fuse `up/down` 반전
- horizontal fuse 유지
- long bonus piece는 전체 segment가 함께 내려갈 수 있을 때만 rigid group으로 낙하
- preview row는 gravity 대상 아님
- 낙하 속도는 약 `0.25s / cell`

시각적으로도 실제 이동 칸 수만큼 회전합니다.

```text
1칸 낙하 -> fuse 180° flip
2칸 낙하 -> fuse 360°
3칸 낙하 -> fuse 540°
```

논리 방향만 순간 변경하고 그래픽이 순간이동하던 이전 방식은 사용하지 않습니다.

## Fuse Rendering

심지는 폭탄에 붙은 **고정 길이 로컬 오브젝트**처럼 그립니다.

이전에는 연결 대상 폭탄의 `visualX/visualY`까지 선을 직접 이어서, 중력 애니메이션 중 두 폭탄 사이가 여러 칸 벌어지면 심지가 고무줄처럼 길어지는 문제가 있었습니다. 현재는 폭탄의 현재 위치와 회전각만으로 심지를 그리므로 이 현상이 발생하지 않습니다.

## Visual Direction

원본 sprite를 복사하지 않고 피처폰판의 화면 문법을 재구성합니다.

- 옅은 blue LCD형 background
- cream/gold side tower
- side flame rail
- orange bottom base
- `LV / FLAMES / TOTAL` 중심의 compact HUD
- 점선/대형 삼각형 대신 짧은 fuse 자체로 방향 표현
- 원형 커서 대신 4-corner bracket cursor
- preview row는 텍스트 박스가 아니라 얇은 separator와 낮은 alpha로 표현
- 모바일 조작부는 현대 게임패드보다 피처폰 키패드에 가까운 silver/cream 계열

## Modes

### 100 ATTACK

```text
?mode=flames100
```

- `FLAMES 100`으로 시작
- 새 flame drop 시작 시에만 1 감소
- 같은 불꽃의 pause/resume 중 추가 차감 없음

### ENDLESS

```text
?mode=endless
```

- 불꽃 횟수 제한 없음
- game over까지 진행

## Difficulty

```text
?difficulty=easy
?difficulty=normal
?difficulty=hard
```

현재 difficulty는 incoming square/gap 확률과 level-up bonus에 영향을 줍니다.

## Score

한 runtime chain이 완전히 종료된 시점의 실제 폭발 수로 계산합니다.

```text
score += explodedBombCount * 100
       + max(0, combo - 2)^2 * 100
```

같은 flame drop이 여러 chain을 점화하면 각각 별도 combo입니다.

## Level

```text
level progress threshold = 16 exploded cells
level cap = 99

EASY    +50,000
NORMAL +100,000
HARD   +200,000
```

## Timing Summary

```text
first flame movement       ~= 4.0s after loop start
flame top preview          ~= 1.0s
flame travel               ~= 3.0s
movement-start interval    ~= 7.0s without explosions
runtime propagation edge   ~= 0.4s
gravity fall               ~= 0.25s / cell
row raise animation        ~= 0.75s
auto raise initial         ~= 41.0s
auto raise decrement       ~= 1.5s / raise
auto raise minimum         ~= 0.5s
post-clear pressure reset  >= exploded bomb count (seconds)
```

## Remaining Unresolved Details

- 정확한 원본 ROM frame timing
- 삼성/파나소닉 버전별 timing/RNG 차이
- flame side state pattern이 원본과 동일한지 여부 (현재 reference-derived)
- square/gap 출현 확률의 기기별 동일 여부
- long bonus 원본 점수
- level threshold/bonus 숫자의 기기별 동일 여부
- Lv.99 이후 level-up score 처리
- 원작 메뉴/options/instructions/high-score UI
