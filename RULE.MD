# Current Implemented Rules

이 문서는 **현재 코드가 실제로 구현하는 규칙**만 설명합니다. 원작 Bomb Link의 확정 명세는 `ORIGINAL_SPEC.md`에서 별도로 관리합니다.

## Board

- logical canvas: `240 x 360`
- board: `5 columns x 8 logical rows`
- cell size: `32 px`
- playable rows: `row 0 .. row 6`
- preview row: `row 7`
- death row: `row 0`
- 시작 시 playable 영역의 아래 5행이 채워집니다.
- preview row는 항상 다음 상승 때 들어올 1개 행을 보여줍니다.
- 커서는 preview row로 들어갈 수 없습니다.

## Normal Bomb

현재 일반 폭탄은 심지 방향을 정확히 하나 가집니다.

```text
up | right | down | left
```

기존 `connectors: Direction[]` 타입은 렌더러 호환을 위해 유지하지만, 정상 생성 시 배열 길이는 항상 1입니다.

폭탄은 시계/반시계 방향으로 90도 회전할 수 있습니다.

## Directed Chain Rule

현재 연쇄 규칙은 방향성입니다.

폭탄 A가 이미 타고 있거나 폭발하고 있고 B가 A의 이웃이라면, **B의 심지가 A를 향할 때만** B로 연쇄가 전달됩니다.

예:

```text
[A][B]
```

A가 먼저 폭발했다면 B는 `left` 심지를 가져야 B가 이어서 폭발합니다.

A가 `right` 심지를 가진 것만으로는 B가 폭발하지 않습니다.

연쇄 탐색은 BFS로 처리하며 방향 탐색 순서는 다음과 같습니다.

1. up
2. right
3. down
4. left

preview row는 연쇄 탐색 대상에서 제외됩니다.

## Edge Flame

- 불꽃은 좌 또는 우 가장자리에서 내려옵니다.
- 왼쪽 불꽃은 각 행의 왼쪽 끝 폭탄을 검사합니다.
- 오른쪽 불꽃은 각 행의 오른쪽 끝 폭탄을 검사합니다.
- 왼쪽 끝 폭탄의 심지가 `left`이면 왼쪽 불꽃에 점화됩니다.
- 오른쪽 끝 폭탄의 심지가 `right`이면 오른쪽 불꽃에 점화됩니다.
- 불꽃은 playable row 0..6만 검사합니다.

다음 불꽃의 좌/우는 매 이벤트마다 독립적으로 무작위 선택합니다. 과거 구현의 "같은 쪽 3연속 방지" 규칙은 제거했습니다.

## Raise / Incoming Row

자동 상승 또는 사용자 `RAISE` 입력이 발생하면:

1. 현재 playable row가 한 줄 위로 이동합니다.
2. preview row의 폭탄들이 bottom playable row로 들어옵니다.
3. 새로운 preview row가 아래에서 생성됩니다.
4. 상승 후 death row에 폭탄이 생기면 game over pending 상태가 됩니다.

사용자 입력:

- `X`
- `Left Shift`
- `Right Shift`
- 모바일 `RAISE` 버튼

수동 상승 후 자동 상승 타이머는 다시 설정됩니다.

## Gravity

폭발이 끝난 뒤 각 열의 남은 폭탄은 playable 영역 안에서 아래로 떨어집니다.

preview row는 gravity 영향을 받지 않습니다.

## Modes

현재 메뉴 UI는 아직 구현하지 않았으며 URL 파라미터로 선택합니다.

### 100 ATTACK

```text
?mode=flames100
```

- `FLAMES 100`으로 시작합니다.
- 불꽃 이벤트가 시작될 때마다 1 감소합니다.
- 마지막 불꽃/연쇄 처리가 끝난 뒤 `RESULT` 화면으로 이동합니다.

### ENDLESS

```text
?mode=endless
```

- 불꽃 횟수 제한이 없습니다.
- death row 조건으로 game over될 때까지 진행합니다.

## Difficulty

현재 다음 파라미터를 지원합니다.

```text
?difficulty=easy
?difficulty=normal
?difficulty=hard
```

난이도 preset은 불꽃 주기, 불꽃 이동 속도, 자동 상승 간격 계산의 시작 압력값에 영향을 줍니다.

정확한 원작 시간표는 아직 미확정이므로 이 수치는 reconstruction tuning 값입니다.

## Score

한 번의 연쇄에서 `count`개의 폭탄이 터졌을 때:

```text
base = count * 100
comboBonus = max(0, count - 2)^2 * 100
score += base + comboBonus
```

예:

- 1개: 100
- 2개: 200
- 3개: 400
- 4개: 800
- 10개: 7400

## Level

현재 stage와 난이도를 점수에서 분리했습니다.

```text
level = min(99, floor(totalExploded / 20))
```

단, 이 **20개당 1레벨 규칙은 원작 확정 규칙이 아니라 임시 재구성값**입니다. 정확한 stage-up 조건이 확인되면 교체해야 합니다.

## Timing Values Still Reconstructed

현재 다음 값은 원작 확정 수치가 아닙니다.

- first flame grace: 약 12초
- first automatic raise: 약 18초
- flame delay base: `13.5 - difficulty * 5`
- flame travel duration: `3.1 - difficulty * 0.9`
- raise delay: `15 - difficulty * 5`
- chain animation interval
- falling speed

이 값들은 게임 영상 또는 실기기 측정으로 보정할 대상입니다.

## Known Missing Original Features

- 원작 ENDLESS / 100 ATTACK 메뉴 화면
- EASY / NORMAL / HARD 선택 화면
- bonus / long bomb
- square bomb
- 정확한 special-piece 생성 조건
- 정확한 level-up 조건 및 level-up bonus
- 원작 high-score / option / instruction 화면
- 원작 프레임 단위 timing 검증
