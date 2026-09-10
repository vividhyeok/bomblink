# Bomb Link Original Reconstruction Spec

이 문서는 피처폰판 **Bomb Link**의 규칙을 가능한 한 근거 기반으로 재구성하기 위한 research spec입니다.

자료의 성격을 섞지 않기 위해 규칙을 다음처럼 구분합니다.

- `confirmed`: 공식 매뉴얼 또는 복수의 1차 자료로 확인
- `strong`: 공식 자료와 당시 플레이 기록/복수 자료가 같은 방향을 지지
- `reference-derived`: 공개된 후대 복원 구현에서 코드 수준으로 확인되지만 원본 ROM의 직접 추출값은 아님
- `provisional`: 보존 자료/후대 포트에서 확인되지만 기기별 동일 여부가 불확실
- `unknown`: 아직 근거 부족

## 1. Normal Bomb / Directed Fuse

**Confidence: strong**

일반 폭탄은 회전 가능한 **단일 방향 심지**를 가진다.

```text
up | right | down | left
```

공식 P700i/P506iC 매뉴얼은 폭탄의 fuse 방향을 회전시키고, 다른 폭탄의 fuse가 현재 폭발 중인 폭탄을 향하도록 만들어 연쇄시키는 방식으로 설명한다.

### Directed chain

**Confidence: confirmed**

폭발 중인 폭탄 A의 이웃 B가 연쇄되려면:

```text
B의 심지가 A를 향해야 한다.
```

즉 `[A][B]`에서 A가 먼저 폭발했다면 B의 심지가 `left`일 때 B가 이어서 폭발한다.

## 2. Edge Flame

**Confidence: confirmed**

불꽃은 좌/우 가장자리를 따라 내려오며 가장자리 폭탄의 심지가 불꽃 방향을 향하면 최초 점화가 발생한다.

- left edge -> `left` fuse
- right edge -> `right` fuse

### Flame pause/resume

**Confidence: strong**

2004년 당시 플레이 기록에는 폭탄이 폭발하는 동안 가장자리 불꽃이 멈추고, 그 동안 다른 폭탄은 계속 조작할 수 있다고 직접 기록되어 있다.

따라서 한 번의 flame drop은:

1. 내려오다가 fuse를 만남
2. 그 위치에서 정지
3. chain explosion 진행
4. gravity 정리
5. 같은 불꽃이 다시 내려감
6. 아래에서 또 다른 chain을 점화할 수 있음

으로 복원한다.

`100 ATTACK`의 100은 개별 점화 횟수가 아니라 **flame drop 횟수**로 본다.

## 3. Board / Preview Row

**Confidence: strong**

복원 목표:

```text
5 columns x 8 logical rows
= 7 playable rows + 1 incoming preview row
```

GameSpot 2004 리뷰는 실제 플레이 영역을 `5 x 7`로 설명하며, 피처폰 보존 자료는 별도 다음 행을 포함한 8행 구조를 설명한다.

preview row는 직접 회전/연쇄 대상이 아니고 다음 raise에서 playable 영역으로 들어온다.

### Starting rows

**Confidence: reference-derived**

Null38의 공개 복원 구현은 시작 시 일반 폭탄 **4행**을 생성한다.

현재 구현도 이 값을 사용한다.

## 4. Raise

**Confidence: confirmed**

공식 P700i/P506iC/P252is 매뉴얼에서 사용자가 next bomb/board를 한 단계 올리는 조작이 확인된다.

현재 reconstruction mapping:

- PC: `X`, `Shift`
- Mobile: `RAISE`

## 5. Modes / Difficulty

**Confidence: confirmed**

피처폰 공식 매뉴얼에서 확인되는 모드:

- `ENDLESS`
- `100 ATTACK`

난이도:

- `EASY`
- `NORMAL`
- `HARD`

난이도 선택과 플레이 중 level은 별개의 상태로 취급한다.

## 6. Score

### Basic chain score

**Confidence: provisional-strong**

피처폰 보존 자료와 공개 복원 구현이 다음 형태를 동일하게 지지한다.

```text
score += 100 * explodedBombCount
       + 100 * max(0, combo - 2)^2
```

### Bonus/long-bomb score

**Confidence: confirmed for extra score existence / reference-derived for amounts**

공식 매뉴얼은 큰 bonus bomb을 터뜨리면 일반 폭탄보다 높은 점수를 준다고 명시한다.

Null38 복원 구현의 실제 segment별 보너스를 piece 단위로 합산하면:

```text
length 2 -> +20,000
length 3 -> +90,000
length 4 -> +200,000
```

이 숫자는 원본 ROM 직접 추출값이 아니라 **reference-derived** 값이다.

## 7. Level / Level-up Bonus

**Confidence: confirmed for existence / reference-derived for threshold and amounts**

공식 P700i/P506iC 매뉴얼은 level-up 시 추가 점수를 얻는다고 명시한다.

Null38 복원 구현에서 확인되는 값:

```text
level progress threshold = 16 exploded cells
EASY   level-up bonus =  50,000
NORMAL level-up bonus = 100,000
HARD   level-up bonus = 200,000
level cap = 99
```

당시 플레이어 기록에서도 한 번의 큰 처리에서 1~3 level이 오를 수 있다는 설명이 있어 `16 cells` 단위 진행과 정성적으로 잘 맞는다.

### Level 99 이후 보너스

여기에는 자료 충돌이 있다.

- Null38 구현: level 99에서 level progress/bonus를 멈춤
- 2006년 플레이어 기록: 100 ATTACK에서 99레벨을 먼저 만든 뒤에도 level-up 점수를 노리는 전략을 설명

현재 reconstruction은 **당시 플레이 기록을 우선하여** level 99 이후에도 16-unit progress마다 점수만 지급한다. 이 부분은 `provisional`로 유지한다.

## 8. Square / Obstruction Bomb

### Existence and rotation

**Confidence: confirmed**

공식 P700i/P506iC 매뉴얼에서 square bomb의 존재와 **회전 불가**가 확인된다.

하지만 회전 불가라고 해서 제거 불가 물체는 아니다. 다른 폭탄과 마찬가지로 자기 fuse가 폭발 중인 이웃을 향하면 chain에 들어가 터질 수 있다.

### Incoming-row frequency

**Confidence: reference-derived**

Null38 복원 구현의 row generation 코드를 해석하면 한 incoming row당 fixed square는 최대 1개이며 확률은 다음과 같다.

```text
EASY   1/4
NORMAL 1/3
HARD   1/2
```

같은 확률로 empty gap도 최대 1개 생성된다.

이전 reconstruction에서 셀마다 독립적으로 obstruction 확률을 굴려 한 줄에 여러 개가 생기던 방식은 이 근거와 맞지 않는다.

### Fuse orientation after falling

**Confidence: reference-derived, high confidence**

Null38 `BombDown()` 구현은 폭탄이 gravity로 한 칸 아래로 내려갈 때 세로 방향을 뒤집는다.

```text
up   <-> down
left  -> left
right -> right
```

따라서 고정 square가 `up`을 향하고 있어도 아래를 비워 낙하시킬 수 있다면 방향이 `down`으로 바뀔 수 있다.

이 규칙이 없으면 reconstruction에서 회전 불가 square가 원작보다 훨씬 쉽게 사실상 영구 고립되는 문제가 생긴다.

## 9. Bonus / Long Bomb

### Existence / non-rotation

**Confidence: confirmed**

공식 매뉴얼에서 큰 bonus bomb의 존재, 회전 불가, 고득점 특성이 확인된다.

### 9 / 18 / 27 trigger

**Confidence: provisional-strong**

피처폰 보존 자료와 Null38 구현이 다음 대응을 지지한다.

```text
9 bombs  -> length 2
18 bombs -> length 3
27 bombs -> length 4
```

Null38 구현에서는 `dummy_List.Count == 8 / 17 / 26` 시 다음 폭발이 9/18/27번째가 되면서 `bigCount`가 증가한다.

### Physical geometry

**Confidence: reference-derived, high confidence**

Null38 구현은 long bomb을 한 칸짜리 proxy가 아니라 **실제 가로 2/3/4-cell rigid piece**로 생성한다.

동작:

- 위에서 떨어짐
- 가로 연속 칸을 점유
- 아래 기존 폭탄이 받치는 위치 중 하나를 anchor로 선택
- anchor의 활성 fuse는 supporting bomb을 향함
- anchor 좌측 segment는 내부적으로 `right`, 우측 segment는 내부적으로 `left` 방향을 가져 anchor 쪽으로 연결됨
- 따라서 anchor가 폭발하면 내부 연쇄로 **전체 long bomb이 함께 폭발**
- gravity에서도 segment가 열별로 분리되지 않고 rigid group으로 이동

현재 reconstruction은 이 구조를 사용한다. UI에서는 내부 연결을 숨기고 anchor의 외부 fuse만 보여서 하나의 긴 폭탄으로 읽히게 한다.

## 10. Gravity

**Confidence: strong for downward settling / reference-derived for fuse flip and exact movement**

폭발 후 빈 공간으로 폭탄이 아래로 떨어지는 동작은 여러 자료에서 일관된다.

현재 세부 복원:

- 한 logical cell씩 낙하 상태를 계산
- normal/square의 vertical fuse는 각 한 칸 낙하마다 `up <-> down`
- horizontal fuse는 유지
- long bomb은 전체 segment가 동시에 내려갈 수 있을 때만 한 칸 낙하

## 11. Timing

**Confidence: reference-derived**

Null38 공개 복원 구현에서 확인되는 값:

```text
first flame movement grace ~= 4 sec
flame travel             ~= 3 sec
next flame delay         ~= 4 sec
chain propagation step   ~= 0.4 sec
auto raise initial       ~= 41 sec
auto raise decrement     ~= 1.5 sec per raise
auto raise minimum       ~= 0.5 sec
fall movement            ~= 0.25 sec per cell
```

이 값들은 기존 reconstruction의 임의 숫자보다 근거가 강하지만, **원본 ROM frame measurement는 아니다.**

## 12. Fuse Readability Layer

**Confidence: modern reconstruction aid**

PC/mobile에서 심지 방향을 빠르게 읽도록 현대적 표시를 사용한다.

- bright cream solid: 다른 playable bomb를 향함
- gold: edge flame rail을 향함
- dark dashed: 빈 공간을 향함
- triangular tip: 실제 fuse 방향
- preview row: dimmed
- long bonus bomb: 내부 연결은 숨기고 anchor fuse만 표시

이 색상/표현은 원작 픽셀 그래픽을 주장하지 않는다.

## Primary / Reference Sources

### Official / contemporary

- Samsung SCH-E470 manual: Bomb Link mode/menu/raise 설명
- Panasonic / NTT DoCoMo P700i manual: fuse chain, ENDLESS/100 ATTACK, difficulty, raise, bonus/square bomb, level-up score
  - https://www.docomo.ne.jp/english/binary/pdf/support/trouble/manual/download/p700i/P700i_E_11.pdf
- DoCoMo / Panasonic P506iC manual
  - https://www.manualslib.com/manual/3787763/Docomo-Mova-P506ic.html?page=405
- mova P252is manual
  - https://www.manualslib.com/manual/3161479/Ishot-Mova-P252is.html?page=411
- GameSpot BombLink review (2004): 5x7 board / fuse visibility
  - https://www.gamespot.com/reviews/bomblink-review/1900-6094366/
- Jun Mitani play notes (2004): explosion 중 flame pause / 조작 지속
  - https://junmitani.hatenablog.com/entry/20041030
- KLDP player discussion (2006): 100 ATTACK, multi-level-up, level 99 고득점 전략
  - https://kldp.org/node/75104

### Preservation / implementation-level references

- 피처폰판 보존 정리: 8x5 logical layout, 9/18/27 long bomb, score formula
  - https://m.namu.moe/w/Bomblink
- Null38/BombLink — 피처폰판을 재구성한 공개 Unity 구현
  - Bomb behavior: https://github.com/Null38/BombLink/blob/main/Assets/C%23/Bomb.cs
  - Game rules/timing/level/special generation: https://github.com/Null38/BombLink/blob/main/Assets/C%23/Game.cs
- Capcom iPhone port coverage (2009): obstruction/bonus 계보 보조 근거
  - https://game.watch.impress.co.jp/docs/news/319648.html

## Implementation Policy

1. `confirmed` 규칙은 기본 reconstruction에 반영한다.
2. `strong` 규칙은 반영하되 근거를 문서화한다.
3. `reference-derived` 값은 원본 확정값으로 표현하지 않는다.
4. 자료가 충돌하면 충돌 자체를 문서에 남긴다.
5. `unknown` 값을 그럴듯하게 만들어 원작 규칙처럼 고정하지 않는다.
6. 현대적 가독성 개선은 규칙과 분리해서 관리한다.
