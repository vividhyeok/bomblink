# Current Implemented Rules

이 문서는 **현재 코드가 실제로 구현하는 규칙**만 설명합니다. 원작 Bomb Link의 근거/확신도는 `ORIGINAL_SPEC.md`에서 별도로 관리합니다.

## Board

- logical canvas: `240 x 360`
- board: `5 columns x 8 logical rows`
- cell size: `32 px`
- playable rows: `row 0 .. row 6`
- preview row: `row 7`
- death row: `row 0`
- 시작 시 playable 영역의 아래 **4행**이 일반 폭탄으로 채워집니다.
- preview row는 다음 상승 때 들어올 1개 행입니다.
- 커서는 preview row로 들어갈 수 없습니다.

## Normal Bomb / Fuse

일반 폭탄은 심지 방향을 정확히 하나 가집니다.

```text
up | right | down | left
```

일반 폭탄만 시계/반시계 방향으로 90도 회전할 수 있습니다.

## Directed Chain Rule

폭탄 A가 이미 폭발하고 있고 B가 A의 이웃이라면 **B의 심지가 A를 향할 때만** B로 연쇄가 전달됩니다.

```text
[A][B]
```

A가 먼저 폭발했다면 B의 fuse가 `left`일 때 B가 연쇄됩니다.

A가 `right` 심지를 가진 것만으로 B가 폭발하는 것은 아닙니다.

preview row는 연쇄 탐색에서 제외됩니다.

## Edge Flame

- 불꽃은 좌 또는 우 가장자리를 따라 아래로 내려갑니다.
- 왼쪽 끝 폭탄의 심지가 `left`이면 왼쪽 불꽃에 점화됩니다.
- 오른쪽 끝 폭탄의 심지가 `right`이면 오른쪽 불꽃에 점화됩니다.
- playable row 0..6만 검사합니다.

### Flame Pause / Resume

한 번의 불꽃 낙하는 첫 점화에서 끝나지 않습니다.

1. 불꽃이 edge fuse에 닿으면 현재 위치에서 멈춥니다.
2. 그 폭탄에서 directed chain이 시작됩니다.
3. chain explosion 중에도 커서 이동/일반 폭탄 회전은 가능합니다.
4. 연쇄 제거와 gravity가 끝나면 **같은 FlameEvent**가 다시 내려갑니다.
5. 아래쪽의 다른 edge fuse를 만나면 또 다른 chain을 점화할 수 있습니다.
6. 최하단까지 지나가야 한 번의 flame drop이 끝납니다.

따라서 `100 ATTACK`에서는 하나의 불꽃으로 여러 chain을 일으켜도 FLAMES는 추가로 줄지 않습니다.

## Raise / Incoming Row

자동 상승 또는 사용자 `RAISE` 입력이 발생하면:

1. playable 영역이 한 줄 위로 이동합니다.
2. preview row가 bottom playable row로 들어옵니다.
3. 새로운 preview row가 생성됩니다.
4. death row가 차 있으면 game over가 됩니다.

사용자 입력:

- `X`
- `Left Shift`
- `Right Shift`
- 모바일 `RAISE` 버튼

불꽃이 내려오는 중에도 chain/fall 상태가 아니라면 수동 RAISE를 사용할 수 있습니다.

자동 상승 간격은 현재 구현 레퍼런스를 따라:

```text
initial 41.0 sec
-1.5 sec after every manual/automatic raise
minimum 0.5 sec
```

으로 동작합니다.

## Incoming Row Generation

이전 구현처럼 각 셀마다 square bomb 확률을 굴리지 않습니다.

새 preview row마다:

- fixed square/obstruction: **최대 1개**
- empty gap: **최대 1개**

가 독립적으로 결정됩니다.

현재 row-level 확률:

```text
EASY   1/4
NORMAL 1/3
HARD   1/2
```

square와 gap이 같은 column으로 뽑히면 gap이 우선하므로 그 행에는 square가 없을 수 있습니다.

이 확률은 공개된 피처폰 복원 구현의 코드에서 가져온 값이며 공식 원본 ROM에서 추출한 값은 아닙니다.

## Special Pieces

현재 `Bomb.kind`:

```text
normal | bonus | obstruction
```

### Square / Obstruction Bomb

- 사각형/탱크형
- 심지 방향은 생성 시 고정
- 사용자가 회전할 수 없음
- 다른 폭탄과 마찬가지로 **자기 심지가 이미 폭발 중인 이웃을 향하면** 연쇄에 들어가 터질 수 있음
- 일부 순간에는 심지가 빈 공간을 향해 바로 터뜨릴 수 없는 상태가 될 수 있음

중요한 규칙:

**폭탄이 gravity로 한 칸 아래로 떨어질 때 세로 심지는 뒤집힙니다.**

```text
up   <-> down
left  -> left
right -> right
```

따라서 고정 square가 `up`을 향한다고 해서 그 방향이 게임 끝까지 영구 고정되는 것은 아닙니다. 아래 공간을 비워 낙하시킬 수 있으면 세로 방향이 반전됩니다.

이전 버그는 다음 두 가지였습니다.

1. obstruction을 셀마다 확률 생성해서 한 행에 여러 개가 생길 수 있었음
2. gravity 후에도 고정 심지 방향을 그대로 유지했음

둘 다 현재 수정되었습니다.

### Bonus / Long Bomb

9/18/27 이상 연쇄 시 다음 긴 폭탄을 예약합니다.

```text
9+  -> length 2
18+ -> length 3
27+ -> length 4
```

이제 B2/B3/B4는 한 칸짜리 proxy가 아닙니다.

- 실제로 가로 `2 / 3 / 4`칸을 동시에 점유
- 하나의 rigid piece로 취급
- 위쪽에서 보드로 낙하
- 착지 가능한 horizontal span을 탐색
- 기존 폭탄이 받쳐 주는 지점을 anchor로 선택
- anchor의 고정 fuse를 그 supporting bomb 쪽(`down`)으로 배치
- anchor가 연쇄되면 긴 폭탄의 모든 segment가 한 piece로 폭발
- 이후 각 segment 주변의 fuse-directed chain으로 연쇄가 계속 전달될 수 있음
- gravity에서도 segment가 열별로 찢어지지 않고 함께 이동

긴 폭탄을 폭발시키면 일반 점수 공식 외에 구현 레퍼런스 기반 추가 보너스가 한 piece당 적용됩니다.

```text
length 2 -> +20,000
length 3 -> +90,000
length 4 -> +200,000
```

이 추가 점수 숫자는 공식 매뉴얼이 아니라 공개 복원 구현의 동작을 재현한 값입니다. 공식 매뉴얼에서 확정되는 것은 bonus bomb이 일반 폭탄보다 높은 점수를 준다는 사실입니다.

## Gravity

폭발 후 gravity는 한 logical cell씩 해석해 최종 위치를 계산합니다.

- normal/square bomb은 아래가 비면 낙하
- 한 칸 낙하할 때마다 vertical fuse `up/down` 반전
- horizontal fuse는 유지
- long bonus piece는 모든 segment가 동시에 한 칸 내려갈 수 있을 때만 rigid group으로 낙하
- preview row는 gravity 대상이 아님

시각 이동 속도는 현재 약 `0.25 sec / cell`에 맞춰져 있습니다.

## Fuse Readability

- 밝은 아이보리 실선: 해당 폭탄의 fuse가 playable bomb를 향함
- 금색 실선: edge flame rail을 향함
- 어두운 점선: 빈 공간을 향함
- 삼각형 tip: fuse 방향
- preview row fuse: 흐리게 표시

square의 고정 fuse가 당장 연결되지 않은 경우도 점선으로 명확히 보입니다. 이것은 즉시 회전할 수 있다는 뜻이 아니라, 아래를 비워 떨어뜨리거나 다른 위치 관계를 만들어야 한다는 뜻입니다.

## Modes

### 100 ATTACK

```text
?mode=flames100
```

- `FLAMES 100`으로 시작
- 새 flame drop이 시작될 때만 1 감소
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

현재 difficulty는 특히 다음에 영향을 줍니다.

- incoming row의 square bomb 확률
- incoming row의 empty gap 확률
- level-up bonus score

## Score

기본 연쇄 점수:

```text
score += explodedBombCount * 100
       + max(0, combo - 2)^2 * 100
```

같은 flame drop이 여러 chain을 점화하면 각각 별도의 combo로 계산합니다.

long bonus bomb은 위의 기본 점수에 별도의 big-bomb bonus가 추가됩니다.

## Level

현재 level progress는 **폭발한 logical bomb cell 16개마다 1회** 발생합니다.

```text
level progress threshold = 16
level cap = 99
```

한 chain에서 32개 이상을 터뜨리면 여러 번 level-up할 수 있습니다.

level-up bonus:

```text
EASY    +50,000
NORMAL +100,000
HARD   +200,000
```

99레벨 이후에도 16-unit progress를 채울 때 level-up score는 계속 지급합니다. 이는 2006년 실제 플레이어가 `100 ATTACK`에서 99레벨을 먼저 만든 뒤 level-up 점수를 계속 받는 전략을 설명한 기록과 맞춘 동작입니다.

## Timing

현재 timing은 공식 ROM 측정값이 아니라 공개 복원 구현을 기준으로 한 reference-derived 값입니다.

```text
first flame movement grace ~= 4 sec
flame travel             ~= 3 sec
next flame delay         ~= 4 sec
chain propagation step   ~= 0.4 sec
auto raise initial       ~= 41 sec
auto raise decrement     ~= 1.5 sec / raise
auto raise minimum       ~= 0.5 sec
fall movement            ~= 0.25 sec / cell
```

## Remaining Unresolved Details

아직 공식 피처폰 원본에서 직접 검증하지 못한 부분:

- 정확한 flame 좌/우 RNG 패턴
- 실제 원본의 frame-perfect animation timing
- square/gap 확률이 삼성/파나소닉 모든 버전에서 동일한지
- long bonus의 정확한 원본 보너스 점수 값
- level threshold/bonus 숫자가 모든 기기 버전에서 동일한지
- 원작 메뉴/option/help/high-score UI
