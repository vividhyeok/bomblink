# Current Implemented Rules

이 문서는 **현재 코드가 실제로 구현하는 규칙**만 설명합니다. 원작 Bomb Link의 근거/확신도는 `ORIGINAL_SPEC.md`에서 별도로 관리합니다.

## Board

- logical canvas: `240 x 360`
- board: `5 columns x 8 logical rows`
- playable rows: `row 0 .. row 6`
- preview row: `row 7`
- death row: `row 0`
- 시작 시 playable 영역의 아래 **4행**이 일반 폭탄으로 채워집니다.
- preview row는 다음 상승 때 들어올 행이며 직접 조작/연쇄 대상이 아닙니다.

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

한 번 점화된 폭탄은 더 이상 회전할 수 없습니다. 아직 불이 도착하지 않은 일반 폭탄만 회전할 수 있습니다.

이 방식은 기존의 `root ignition -> entire BFS precompute` 구현을 대체합니다.

## Edge Flame

- 불꽃은 좌 또는 우 가장자리를 따라 아래로 내려갑니다.
- 왼쪽 끝 폭탄의 심지가 `left`이면 왼쪽 불꽃에 점화됩니다.
- 오른쪽 끝 폭탄의 심지가 `right`이면 오른쪽 불꽃에 점화됩니다.
- playable row 0..6만 검사합니다.

### Flame Pause / Resume

1. 불꽃이 edge fuse에 닿으면 현재 위치에서 멈춥니다.
2. 그 폭탄에서 runtime directed chain이 시작됩니다.
3. chain 중에도 커서 이동과 아직 점화되지 않은 일반 폭탄 회전이 가능합니다.
4. 마지막 폭탄이 더 이상 연쇄를 만들지 못하면 chain 점수/레벨 진행을 확정합니다.
5. 제거와 gravity가 끝나면 같은 FlameEvent가 다시 내려갑니다.
6. 아래쪽의 다른 edge fuse를 만나면 별도 chain을 다시 만들 수 있습니다.

`100 ATTACK`에서는 이 전체 과정이 한 번의 flame drop으로 계산됩니다.

## Timer Concurrency

불꽃/상승 타이머를 회전 animation phase에 묶어 멈추지 않습니다.

- `idle`: flame countdown + auto-raise countdown 진행
- `rotating`: flame countdown + auto-raise countdown 계속 진행
- `flamePassing`: auto-raise countdown 계속 진행
- `fuseBurning / exploding / falling / spawning`: explosion 처리 중이므로 auto-raise countdown 정지

따라서 반복 회전으로 다음 불꽃이나 자동 상승 시간을 인위적으로 늦출 수 없습니다.

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

불꽃이 단순히 이동 중일 때도 수동/자동 상승이 가능합니다. chain/fall 처리 중에는 상승이 대기합니다.

자동 상승 간격:

```text
initial 41.0 sec
-1.5 sec after every manual/automatic raise
minimum 0.5 sec
```

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

따라서 위를 보는 fixed square라도 아래 공간을 비워 낙하시킬 경우 방향이 바뀔 수 있습니다.

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

## Gravity

- normal/square bomb은 아래가 비면 낙하
- 한 칸 낙하할 때마다 vertical fuse `up/down` 반전
- horizontal fuse 유지
- long bonus piece는 전체 segment가 함께 내려갈 수 있을 때만 rigid group으로 낙하
- preview row는 gravity 대상 아님

시각 이동 속도는 약 `0.25 sec / cell`입니다.

## Fuse Readability

- 밝은 아이보리 실선: fuse가 playable bomb를 향함
- 금색 실선: edge flame rail을 향함
- 어두운 점선: 빈 공간을 향함
- 삼각형 tip: fuse 방향
- preview row: 흐리게 표시
- long bomb 내부 fuse: UI에서는 숨김

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

한 runtime chain이 완전히 종료된 시점의 **실제 폭발 수**로 점수를 계산합니다.

```text
score += explodedBombCount * 100
       + max(0, combo - 2)^2 * 100
```

따라서 플레이 중 회전으로 chain을 늘리거나 끊으면 실제 최종 점수도 그 결과를 반영합니다.

같은 flame drop이 여러 chain을 점화하면 각각 별도 combo입니다.

## Level

```text
level progress threshold = 16 exploded cells
level cap = 99

EASY    +50,000
NORMAL +100,000
HARD   +200,000
```

한 runtime chain에서 확정된 실제 폭발 수를 level progress에 더합니다.

## Timing

현재 값은 공개 복원 구현 기준 reference-derived 값입니다.

```text
first flame movement grace ~= 4 sec
flame travel             ~= 3 sec
next flame delay         ~= 4 sec
runtime propagation edge ~= 0.4 sec
auto raise initial       ~= 41 sec
auto raise decrement     ~= 1.5 sec / raise
auto raise minimum       ~= 0.5 sec
fall movement            ~= 0.25 sec / cell
```

## Remaining Unresolved Details

- 정확한 원본 flame 좌/우 RNG 패턴
- 삼성/파나소닉 버전별 frame-perfect timing 차이
- square/gap 출현 확률의 기기별 동일 여부
- long bonus 원본 점수
- level threshold/bonus 숫자의 기기별 동일 여부
- Lv.99 이후 level-up score 처리
- 원작 메뉴/options/instructions/high-score UI
