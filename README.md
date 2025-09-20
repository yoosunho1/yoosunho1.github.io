# Gemini Chat Application

이 프로젝트는 React, TypeScript, Vite를 기반으로 한 채팅 애플리케이션으로, Google의 Gemini API를 사용하여 AI와 대화할 수 있습니다. GitHub Pages에 배포할 수 있도록 설계되었습니다.

## 기능

- Gemini API를 통한 AI 채팅
- 세션 스토리지를 사용한 대화 기록 저장
- 반응형 모던 UI (Tailwind CSS 사용)
- GitHub Pages 배포 지원

## 시작하기

### 필수 조건

- Node.js (버전 16 이상)
- npm 또는 yarn

### 설치

1. 저장소를 클론하거나 다운로드합니다:

   ```bash
   git clone <repository-url>
   ```

2. 프로젝트 디렉토리로 이동합니다:

   ```bash
   cd <project-directory>
   ```

3. 의존성을 설치합니다:

   ```bash
   npm install
   ```

### 환경 설정

1. `.env` 파일을 생성합니다:

   ```bash
   cp .env.example .env
   ```

2. `.env` 파일을 열고 Gemini API 키를 추가합니다:

   ```
   VITE_GEMINI_API_KEY=your_actual_api_key_here
   ```

   > API 키는 [Google AI Studio](https://aistudio.google.com/)에서 얻을 수 있습니다.

### 개발 서버 실행

다음 명령으로 개발 서버를 시작합니다:

```bash
npm run dev
```

브라우저에서 `http://localhost:5173`으로 이동하여 애플리케이션을 확인합니다.

### 빌드

프로덕션용으로 빌드하려면 다음 명령을 실행합니다:

```bash
npm run build
```

빌드된 파일은 `dist` 디렉토리에 생성됩니다.

## GitHub Pages에 배포

1. GitHub 저장소에 코드를 푸시합니다.

2. GitHub 저장소 설정에서 Pages 섹션으로 이동합니다.

3. Source를 "GitHub Actions"로 설정합니다.

4. `.github/workflows/deploy.yml` 워크플로우가 자동으로 실행되어 배포합니다.

## 사용법

1. 애플리케이션을 실행하면 "안녕하세요! 무엇을 도와드릴까요?"라는 초기 메시지가 표시됩니다.

2. 하단의 입력창에 메시지를 입력하고 전송 버튼을 클릭하거나 Enter 키를 누릅니다.

3. Gemini API를 통해 생성된 응답이 표시됩니다.

4. 대화 기록은 브라우저의 세션 스토리지에 저장되며, 브라우저 탭을 닫을 때까지 유지됩니다.

5. "채팅 초기화" 버튼을 클릭하여 대화 기록을 초기화할 수 있습니다.

## 기술 스택

- [React](https://reactjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Gemini API](https://ai.google.dev/)

## 라이선스

MIT License