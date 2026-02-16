# Backlink Collector

Collect all backlinks to a note and compile them into a single organized document with full context.

## Features

- 📑 **Collect backlinks** from any note in your vault
- 🔍 **Full context included** - captures indented sub-items and nested content
- 🎯 **Clean output** - minimal formatting, focus on content
- ⚡ **Quick access** - available via command palette and context menu
- 🔄 **Auto-exclude** - prevents recursive inclusion of backlink documents
- 📂 **Custom output folder** - organize backlink documents in a dedicated folder

## 설치 방법

### 개발 버전 설치

1. 이 폴더를 Obsidian vault의 `.obsidian/plugins/` 디렉토리에 복사
2. 터미널에서 플러그인 폴더로 이동
3. 의존성 설치 및 빌드:

```bash
npm install
npm run build
```

4. Obsidian을 재시작하거나 설정 > 커뮤니티 플러그인에서 플러그인 새로고침
5. "Backlink Collector" 플러그인 활성화

## 사용 방법

### 방법 1: 커맨드 팔레트

1. 백링크를 수집하고 싶은 노트 열기
2. `Cmd/Ctrl + P`로 커맨드 팔레트 열기
3. "Collect backlinks for current note" 검색 및 실행

### 방법 2: 컨텍스트 메뉴

1. 파일 탐색기에서 노트 우클릭
2. "Collect backlinks" 선택

## 설정

- **Output folder**: 백링크 문서를 저장할 폴더 지정
  - 비어있으면 vault 루트에 저장됩니다

## 출력 형식

생성되는 문서는 다음과 같은 구조를 가집니다:

```markdown
# Backlinks to [[노트이름]]

Generated on: 2026-02-16

Total files with backlinks: 5

---

## 1. [[첫번째 파일]]

- **Path**: `경로`
- **References**: 2

### Contexts:

#### Context 1

```
백링크가 포함된 문맥 (들여쓰기된 하위 항목 포함)...
```

---
```

## 개발

### 개발 모드 실행

```bash
npm run dev
```

파일 변경 시 자동으로 재빌드됩니다.

### 프로덕션 빌드

```bash
npm run build
```

## 라이선스

MIT

## 참고 자료

- [Obsidian Plugin Documentation](https://docs.obsidian.md)
- [Obsidian Sample Plugin](https://github.com/obsidianmd/obsidian-sample-plugin)
