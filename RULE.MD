# Current Implemented Rules

이 문서는 **현재 코드가 실제로 구현하는 규칙**만 설명합니다. 원작 Bomb Link의 근거/확신도는 `ORIGINAL_SPEC.md`에서 별도로 관리합니다.

## Board

- logical canvas: `240 x 360`
- board: `5 columns x 8 logical rows`
- cell size: `32 px`
- playable rows: `row 0 .. row 6`
- preview row: `row 7`
- death row: `row 0`
- 시작 시 playable 영역의 아래 5행이 채워집니다.
- preview row는 다음 상승 때 들어올 1개 행입니다.
- 커서는 preview row로 들어갈 수 없습니다.

## Normal Bomb / Fuse

일반 폭탄은 심지 방향을 정확히 하나 가집니다.

```text
up | right | down | left
```

`connectors: Direction[]` 타입은 내부 호환을 위해 유지하지만 일반 폭탄의 배열 길이는 항상 1입니다.

일반 폭탄만 시계/반시계 방향으로 90도 회전할 수 있습니다.

## Fuse Readability

심지의 **소유 폭탄, 방향, 실제 연결 상태**를 바로 읽을 수 있도록 다음 시각 규칙을 사용합니다.

- 밝은 아이보리 실선: 해당 폭탄의 심지가 실제 playable bomb를 향함
- 금색 실선: 좌/우 edge flame rail을 향함
- 어두운 짧은 점선: 빈 공간 또는 비활성 경계를 향함
- 삼각형 tip: 그 심지가 향하는 방향
- 연결된 대상 지점: 작은 접촉 링 표시
- preview row의 심지: 흐리게 표시

선택 커서도 현재 선택 폭탄의 상태를 알려줍니다.

- green: bomb를 향함
- gold: edge flame을 향함
- red/pink: 빈 공간을 향함
- white: 빈 셀

이 표현은 원작 픽셀 그래픽 복제가 아니라 PC에서 규칙을 읽기 위한 reconstruction UI입니다.

## Directed Chain Rule

폭탄 A가 이미 타고 있거나 폭발하고 있고 B가 A의 이웃이라면, **B의 심지가 A를 향할 때만** B로 연쇄가 전달됩니다.

```text
[A][B]
```

A가 먼저 폭발했다면 B의 fuse가 `left`일 때 B가 연쇄됩니다.

A가 `right` 심지를 가진 것만으로는 B가 폭발하지 않습니다.

연쇄 탐색은 BFS로 처리하며 preview row는 제외됩니다.

## Edge Flame

- 불꽃은 좌 또는 우 가장자리를 따라 아래로 내려갑니다.
- 왼쪽 끝 폭탄의 심지가 `left`이면 왼쪽 불꽃에 점화됩니다.
- 오른쪽 끝 폭탄의 심지가 `right`이면 오른쪽 불꽃에 점화됩니다.
- playable row 0..6만 검사합니다.
- 다음 불꽃의 좌/우는 매 event마다 독립적으로 무작위 선택합니다.

### Flame Pause / Resume

한 번의 불꽃 낙하는 첫 점화에서 끝나지 않습니다.

1. 불꽃이 edge fuse에 닿으면 그 진행 위치에서 정지합니다.
2. 그 폭탄에서 directed chain이 시작됩니다.
3. chain explosion 중에도 커서 이동/심지 회전은 가능합니다.
4. 연쇄 제거와 gravity가 끝나면 **같은 FlameEvent**가 다시 내려갑니다.
5. 아래쪽에서 다른 edge fuse를 만나면 또 다른 chain을 점화할 수 있습니다.
6. 불꽃이 최하단까지 지나가야 한 번의 flame drop이 종료됩니다.

따라서 `100 ATTACK`에서는 하나의 불꽃으로 여러 chain을 일으켜도 FLAMES는 추가로 줄어들지 않습니다.

## Raise / Incoming Row

자동 상승 또는 사용자 `RAISE` 입력이 발생하면:

1. 현재 playable row가 한 줄 위로 이동합니다.
2. preview row가 bottom playable row로 들어옵니다.
3. 새로운 preview row가 생성됩니다.
4. 상승 후 death row에 폭탄이 생기면 game over pending 상태가 됩니다.

사용자 입력:

- `X`
- `Left Shift`
- `Right Shift`
- 모바일 `RAISE` 버튼

수동 상승 후 자동 상승 타이머는 다시 설정됩니다.

## Special Pieces

현재 `Bomb.kind`는 다음 세 종류입니다.

```text
normal | bonus | obstruction
```

### Bonus Bomb

- 회전 불가
- `B2`, `B3`, `B4`로 시각적으로 구분
- 한 연속 explosion의 logical chain length가 다음 기준을 만족하면 next preview row에 예약됩니다.

```text
9+  -> B2
18+ -> B3
27+ -> B4
```

가장 큰 조건 하나만 적용합니다.

현재 구현은 정확한 multi-cell geometry를 아직 복원하지 못했기 때문에 **한 logical cell**로 존재하되 점수 계산에서 각각 `2 / 3 / 4`개의 exploded unit으로 취급합니다.

즉 이 부분은 긴 폭탄의 scoring/등장 규칙을 먼저 재현한 proxy입니다.

### Obstruction / Square Bomb

- 사각형/탱크형 실루엣
- 회전 불가
- preview row에서 생성될 수 있음
- difficulty가 높아질수록 생성 확률 증가

현재 확률은 피처폰판의 정확한 표가 아니라 replaceable reconstruction tuning입니다.

```text
start difficulty = 0.18
chance scale     = 0.20
max chance       = 0.16
```

초기 보드에는 special piece를 만들지 않습니다.

## Gravity

폭발이 끝난 뒤 각 열의 남은 폭탄은 playable 영역 안에서 아래로 떨어집니다.

preview row는 gravity 영향을 받지 않습니다.

## Modes

현재 메뉴 UI는 아직 구현하지 않았으며 URL 파라미터로 선택합니다.

### 100 ATTACK

```text
?mode=flames100
```

- `FLAMES 100`으로 시작
- **새 flame drop이 시작될 때만** 1 감소
- 같은 불꽃의 pause/resume 중 여러 chain을 만들더라도 추가 차감 없음
- 100번째 불꽃이 보드 끝까지 지나가고 진행 중 chain이 모두 처리된 뒤 `RESULT`

### ENDLESS

```text
?mode=endless
```

- 불꽃 횟수 제한 없음
- death row 조건으로 game over될 때까지 진행

## Difficulty

```text
?difficulty=easy
?difficulty=normal
?difficulty=hard
```

preset은 불꽃 주기, 불꽃 이동 속도, 자동 상승 간격의 시작 압력값에 영향을 줍니다.

또한 obstruction bomb 생성 확률 계산에도 현재 difficulty 값이 들어갑니다.

정확한 피처폰판 숫자표는 아직 확인하지 못했으므로 numeric timing/obstruction chance는 reconstruction tuning입니다.

## Score

일반적인 한 chain에서:

```text
score += explodedUnits * 100
       + max(0, combo - 2)^2 * 100
```

- `combo`: 해당 directed chain의 logical piece 수
- `explodedUnits`: 일반/obstruction은 1, bonus는 B2/B3/B4에 따라 2/3/4

같은 flame drop이 여러 chain을 점화하면 각각 별도의 combo로 계산합니다.

## Level

현재 stage와 difficulty preset을 분리했습니다.

```text
level = min(99, floor(totalExploded / 20))
```

단, **20개당 1레벨은 원작 확정 규칙이 아니라 placeholder**입니다.

공식 자료에서 level-up 자체가 추가 점수를 준다는 사실은 확인됐지만, 정확한 level-up 조건과 bonus amount를 아직 찾지 못했기 때문에 현재는 가짜 bonus 수치를 넣지 않았습니다.

## Timing Values Still Reconstructed

다음 값은 원작 확정 수치가 아닙니다.

- first flame grace: 약 12초
- first automatic raise: 약 18초
- flame delay base: `13.5 - difficulty * 5`
- flame travel duration: `3.1 - difficulty * 0.9`
- raise delay: `15 - difficulty * 5`
- chain animation interval
- falling speed

## Remaining Unresolved Original Details

- 정확한 level-up threshold/table
- 정확한 level-up bonus score
- 긴 bonus bomb의 실제 2/3/4-cell geometry 및 gravity/raise 처리
- 피처폰판 square/obstruction의 정확한 출현 확률
- 정확한 flame/raise/animation timing table
- 원작 ENDLESS / 100 ATTACK / difficulty 선택 화면
- 원작 high-score / option / help 화면
