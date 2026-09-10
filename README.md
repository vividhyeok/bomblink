# Bomb Link Reconstruction

2000년대 삼성 애니콜/DoCoMo 계열 피처폰에서 즐길 수 있었던 **Bomb Link**의 플레이 규칙을 공개 자료를 바탕으로 재구성하는 비공식 웹 프로젝트입니다.

원본 ROM, 그래픽, 사운드 리소스는 포함하지 않습니다. 목표는 원작 자산 복제가 아니라 **규칙과 플레이 감각의 재현**입니다.

## 현재 복원된 핵심 규칙

- 보드: 5열 × 8 logical rows
- 실제 조작 영역: 상단 7행
- 최하단 1행: 다음에 올라올 폭탄을 보여주는 preview row
- 시작 시 일반 폭탄 4행
- 일반 폭탄은 **심지 방향을 하나만** 가집니다.
- 폭탄 A가 터질 때 옆 폭탄 B의 심지가 **A를 향하고 있어야** B로 불이 전달됩니다.
- 좌우 가장자리의 불꽃에 바깥쪽 심지를 연결하면 최초 폭발이 시작됩니다.
- 폭발 중에는 해당 불꽃이 멈추고 다른 폭탄을 계속 조작할 수 있습니다.
- 폭발/중력이 끝나면 같은 불꽃이 다시 내려가므로 한 번의 불꽃으로 여러 chain을 만들 수 있습니다.
- X / Shift 또는 화면의 `RAISE` 버튼으로 폭탄을 직접 한 줄 끌어 올릴 수 있습니다.
- square/obstruction과 2/3/4칸 long bonus bomb을 재구성했습니다.

## 심지 표시 읽는 법

PC/mobile에서 방향을 즉시 읽을 수 있도록 연결 상태를 명확하게 보여줍니다.

- **밝은 아이보리 실선**: 다른 폭탄을 실제로 향하는 심지
- **금색 실선**: 좌/우 불꽃 rail을 향하는 심지
- **어두운 짧은 점선**: 빈 공간을 향하는 심지
- **삼각형 끝**: 해당 폭탄의 심지가 향하는 방향
- 선택 커서: green = bomb 연결 / gold = flame 연결 / red = 빈 공간
- long bonus bomb의 내부 연결은 숨기고 외부 anchor fuse만 표시

이 색상은 원작 픽셀 아트를 그대로 복사한 것이 아니라 방향성 규칙을 읽기 쉽게 만든 reconstruction UI입니다.

## 특수 폭탄

### Square / obstruction

- 회전 불가
- 자기 심지가 폭발 중인 이웃을 향하면 일반 폭탄처럼 연쇄에 들어가 터질 수 있음
- 한 incoming row에 최대 1개
- reference-derived row 확률: EASY `1/4`, NORMAL `1/3`, HARD `1/2`
- gravity로 한 칸 떨어질 때 vertical fuse가 `up <-> down`으로 뒤집힘

따라서 당장 허공을 보는 square가 있어도 아래를 제거해 낙하시킬 수 있으면 제거 경로가 바뀔 수 있습니다.

### Long bonus bomb

한 연속 chain이 다음 크기에 도달하면 긴 bonus bomb을 예약합니다.

```text
9+  -> 2 cells
18+ -> 3 cells
27+ -> 4 cells
```

이제 B2/B3/B4는 한 칸짜리 proxy가 아니라 **실제 가로 2/3/4칸 rigid piece**입니다.

- 위에서 떨어짐
- support 위치를 anchor로 선택
- anchor fuse는 supporting bomb을 향함
- 내부 segment는 anchor 쪽으로 연결되어 anchor가 터지면 전체 piece가 연쇄 폭발
- gravity에서도 열별로 찢어지지 않고 한 덩어리로 이동

## 실행

```bash
npm install
npm run dev
```

## 조작

| 입력 | 동작 |
| --- | --- |
| 방향키 / WASD | 커서 이동 |
| Space / Enter | 심지 시계 방향 회전 |
| Z / Backspace | 심지 반시계 방향 회전 |
| X / Shift | 한 줄 끌어 올리기 |
| M | 음소거 |
| R | 재시작 |
| Esc | 일시정지 |

모바일에서는 조이스틱, `ROTATE`, `RAISE` 버튼을 사용할 수 있습니다.

## 모드 / 난이도

현재는 URL 파라미터로 테스트할 수 있습니다.

```text
?mode=flames100&difficulty=normal
?mode=endless&difficulty=hard
```

- `mode=flames100`: 100 ATTACK. **불꽃 낙하 100회**를 기준으로 종료
- `mode=endless`: 게임 오버까지 계속 진행
- `difficulty=easy|normal|hard`

## 현재 reference-derived 수치

공식 매뉴얼에서 직접 숫자가 나오지 않는 부분은 공개 복원 구현을 별도 근거층으로 사용합니다.

```text
level progress           = 16 exploded cells
level-up bonus EASY      =  50,000
level-up bonus NORMAL    = 100,000
level-up bonus HARD      = 200,000
first flame grace        ~= 4 sec
flame travel             ~= 3 sec
next flame delay         ~= 4 sec
chain propagation        ~= 0.4 sec
auto raise initial       ~= 41 sec
auto raise decrement     ~= 1.5 sec / raise
fall movement            ~= 0.25 sec / cell
```

이 값은 원본 ROM 직접 측정값이라고 주장하지 않습니다.

## 정확도 원칙

- `ORIGINAL_SPEC.md`: 원작 자료, 당시 기록, 보존 자료, 공개 복원 코드의 근거와 확신도
- `RULE.MD`: 현재 코드가 실제로 구현하는 동작

자료가 충돌하면 한쪽을 숨기지 않고 문서에 충돌 자체를 기록합니다.

## 프로젝트 성격

개인 학습 및 보존 목적의 비상업적 팬 프로젝트입니다. 원작 자산은 포함하지 않습니다.
