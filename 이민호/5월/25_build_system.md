> 모노레포란 버전 관리 시스템에서 두 개 이상의 프로젝트 코드가 동일한 저장소에 저장되는 소프트웨어 개발 전략

우리가 네이버와 같은 거대 서비스를 개발할 때, 소스 코드가 모듈화 없이 하나의 프로젝트로 구성된다면 어떻게 될까? 코드가 서로 직접적으로 의존하며 단 하나의 버전으로 관리되면서 [관심 분리(separation of concerns)](https://ko.wikipedia.org/wiki/%EA%B4%80%EC%8B%AC%EC%82%AC_%EB%B6%84%EB%A6%AC)가 어려워지고, 설계, 리팩터링, 배포 등의 작업을 매번 거대한 단위로 처리해야 하므로 개발상 많은 제약과 비효율이 있을 것이다.

그렇다면 모듈을 적절히 분리하여 관심 분리를 이루면서, 동시에 분리된 모듈을 쉽게 참조하고 테스트, 빌드, 배포 과정도 쉽게 한 번에 할 수는 없을까 이제 모노레포가 출동할 시간이다.

![스크린샷 2025-05-18 19.38.21.jpg](attachment:d24fdb2b-a2d7-466e-8048-21e927938565:스크린샷_2025-05-18_19.38.21.jpg)

모노레포란 잘 정의된 관계

코드 공유가 어려움

모던 모노레포의 기능들

1. 로컬캐싱
2. 로컬 오케스트레이션
3. 원격캐싱
4. 변경 프로젝트 감지
   1.

![image.png](attachment:64510658-0cc5-4b0a-bd41-f81b5b79a45a:image.png)

저장소 생성 > 커미터 추가 > 개발환경 구축 > CI/CD 구축 > 빌드 > 패키지 저장소에 publish

ui에서 Button 을 직접 가져오는데 이는 ui 앱의 package.json을 보면 어떻게 사용할 수 있는 것인지 확인할 수 있다.

```bash
{
  "main": "./index.tsx",
  "types": "./index.tsx"
}
```

ui에서 작업공간을 불러올 때, main에서 내가 가져오려는 코드에 접근할 수 있는 위치를 알려주며, types는 TypeScript가 위치한 곳을 알려준다.

![image.png](attachment:be763e4a-3986-45ee-9b69-35d09265f336:image.png)

```tsx
{
  "name": "tsconfig",
  "version": "0.0.0",
  "private": true,
  "license": "MIT",
  "publishConfig": {
    "access": "public"
  },
  "files": [
    "base.json",
    "nextjs.json",
    "react-library.json"
  ]
}
```

문서에서는 files 프로퍼티가 있다고 했었는데 없어서 추가해줬다.

files에는 세 가지 파일이 내보내지고 있다. 즉, tsconfig에 종속된 패키지들을 직접 가져올 수 있다는 것을 의미한다.

예를 들어, packages/ui/package.json에서 tsconfig을 의존하고 있다.

```tsx
{
  "devDependencies": {
    "tsconfig": "*"
  }
}
```

1. 증분 빌드(Incremental builds): 이미 수행한 작업은 캐시하고, 같은 작업이 다시 발생하면 스킵한다.
2. 내용 기반 해싱(Content-aware hashing): 작업을 캐시 할 때, 파일의 타임스탬프가 아닌 내용을 기반으로 한다.
3. 병렬 실행(Parallel execution): 작업을 순차적으로 수행하는 대신, CPU 낭비 없이 최대한 병렬적으로 수행한다.
4. 원격 캐싱(Remote Caching): 동일한 머신뿐만 아니라 원격에서 수행한 작업도 캐시하여, 다른 머신에서 중복 작업을 수행하지 않는다.\\

### **dependsOn**

```tsx
"dependsOn": ["^build"]
```

dependsOn은 작업 간의 의존 관계를 설정하는 속성입니다.

즉, 특정 작업을 실행하기 전에 다른 작업이 먼저 실행되도록 지정할 수 있어, 이를 통해 작업 실행 순서를 명시적으로 조정할 수 있습니다.

예를 들어 아래와 같이 설정해 두었다고 가정하겠습니다.

```tsx
{
  "tasks": {
    "build": {
      "dependsOn": ["^build"]
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["build", "lint"]
    }
  }
}
```

- `"build": { "dependsOn": ["^build"] }`
  - ^build는 현재 작업뿐만 아니라, 의존하는 모든 패키지에서 build 작업을 먼저 실행하도록 설정하는 것입니다.
  - build 작업이 실행되기 전에, 모든 의존성 패키지들의 build 작업이 먼저 완료됩니다.
  - 예를 들어, ui 패키지가 web을 의존하고 있으면, web의 build 작업은 ui가 먼저 빌드된 후 실행됩니다.
- `"test": { "dependsOn": ["build", "lint"] }`
  - test 작업을 실행하기 전에 build와 lint 작업이 먼저 완료되도록 합니다.
  - 따라서, test는 build와 lint가 모두 끝난 후에 실행됩니다.

### **🔎 캐싱**

turborepo의 강력한 기능 중 하나인 캐싱은 여러 속성에 의해 영향받기 때문에 한 번에 묶어서 설명드리겠습니다.

```tsx
{
  "tasks": {
    "build": {
      "inputs": ["$TURBO_DEFAULT$", ".env*"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

- `cache`
  - 캐싱 활성화 여부
  - false면 매번 새로 실행
- `presistent`
  - 지속 실행 여부
  - true면 실행 후 종료되지 않고 계속 실행
  - watch mode가 필요한 경우 사용
- `inputs`
  - 캐싱을 무효화할 파일 지정
- `outputs`
  - 특정 폴더를 빌드 결과물로 지정해서 변화 유무에 따라 캐싱

---

그럼 터보레포를 이용해 모노레포를 구축하는 방법은 여기서 마무리하며 이정도만 알고 있어도 시작하는데는 큰 무리가 없을 것으로 보입니다.

저는 계속 학습하며 빌드 방법까지 소개하는 글을 올려보도록 노력하겠습니다.

```tsx
"dependencies": {
  "@repo/ui": "workspace:*",
  ...
},
```

위 프로젝트에서 packages/ui 패키지를 apps/web에서 사용하기 위해선, 위와 같이 사용할 패키지 이름과 모노레포에서 사용되는 버전  `["@repo/ui: "workspace:*"]`을 지정해 주면 항상 로컬의 최신 버전을 참조할 수 있게 됩니다.

### **📌 pnpm-workspace.yaml**

```tsx
packages: -"apps/*" - "packages/*";
```

`pnpm-workspace.yaml`은 **pnpm**에서 모노레포를 관리할 때 사용하는 **워크스페이스 설정 파일**입니다.

packages 키워드로 모노레포 내에서 관리할 패키지들의 경로를 지정할 수 있으며, 위에서 생성한 프로젝트의 경우 apps/_, packages/_ 폴더를 관리할 패키지로 등록합니다.

이렇게 등록한 패키지들은 서로 각 폴더 내 package.json의 **dependencies**로 추가해 링크할 수 있으며, install시 각 패키지의 최신 버전이 자동으로 반영되어 중복된 코드를 손쉽게 관리할 수 있습니다.

![image.png](attachment:ab5d75af-3cb1-4a90-ac53-8d4e854813a5:image.png)

1. 증분 빌드(Incremental builds): 이미 수행한 작업은 캐시하고, 같은 작업이 다시 발생하면 스킵한다.
2. 내용 기반 해싱(Content-aware hashing): 작업을 캐시 할 때, 파일의 타임스탬프가 아닌 내용을 기반으로 한다.
3. 병렬 실행(Parallel execution): 작업을 순차적으로 수행하는 대신, CPU 낭비 없이 최대한 병렬적으로 수행한다.
4. 원격 캐싱(Remote Caching): 동일한 머신뿐만 아니라 원격에서 수행한 작업도 캐시하여, 다른 머신에서 중복 작업을 수행하지 않는다.
5. 증분 빌드(Incremental builds): 이미 수행한 작업은 캐시하고, 같은 작업이 다시 발생하면 스킵한다.
6. 내용 기반 해싱(Content-aware hashing): 작업을 캐시 할 때, 파일의 타임스탬프가 아닌 내용을 기반으로 한다.
7. 병렬 실행(Parallel execution): 작업을 순차적으로 수행하는 대신, CPU 낭비 없이 최대한 병렬적으로 수행한다.
8. 원격 캐싱(Remote Caching): 동일한 머신뿐만 아니라 원격에서 수행한 작업도 캐시하여, 다른 머신에서 중복 작업을 수행하지 않는다.
9. 증분 빌드(Incremental builds): 이미 수행한 작업은 캐시하고, 같은 작업이 다시 발생하면 스킵한다.
10. 내용 기반 해싱(Content-aware hashing): 작업을 캐시 할 때, 파일의 타임스탬프가 아닌 내용을 기반으로 한다.
11. 병렬 실행(Parallel execution): 작업을 순차적으로 수행하는 대신, CPU 낭비 없이 최대한 병렬적으로 수행한다.
12. 원격 캐싱(Remote Caching): 동일한 머신뿐만 아니라 원격에서 수행한 작업도 캐시하여, 다른 머신에서 중복 작업을 수행하지 않는다.

공식 문서 설명에 따르면, JavaScript나 TypeScript 코드를 위해 최적화된 빌드 시스템이라고 한다. JavaScript와 TypeScript의 린트나 빌드, 테스트와 같은 코드베이스 작업은 시간이 꽤 소요되는 작업인데, Turborepo는 캐싱을 통해 로컬 설정을 진행하고 CI 속도를 높여준다.

터보레포는 향상된 빌드 시스템 기술을 사용하여 로컬에서나 CI/CD를 할 때 개발 속도를 높여준다.

먼저 캐싱을 사용하기 때문에 동일한 작업을 진행하지 않으며, 스케쥴링 및 CPU 유휴를 최소한으로 하며 병렬적으로 작업을 수행하기 때문에 멀티태스킹 능력을 극대화했다.

https://turborepo.com/docshttps://d2.naver.com/helloworld/0923884
https://toss.tech/article/monorepo-pipeline
https://www.youtube.com/watch?v=Ix9gxqKOatY

https://techblog.woowahan.com/7976/
https://d2.naver.com/helloworld/7553804
https://tech.kakaoent.com/front-end/2021/211127-211209-suspense/
https://github.com/kowoohyuk/monorepo-template/tree/main

- **모듈 로딩 방식**
  - **동기 로딩**(synchronous): CJS의 `require()`는 호출 시점에 파일을 읽고 평가 → 블로킹 발생 가능
  - **정적 분석**(static): ESM의 `import`는 컴파일 단계에서 종속성 트리를 구성하고 비동기 로딩/최적화 가능
- **실행 환경**
  - Node.js 전통은 CJS, 최신 Node 버전은 확장자 `.mjs` 혹은 `package.json`의 `"type":"module"` 지정 시 ESM
  - 브라우저는 `<script type="module">` 태그로 ESM 직접 지원

1. **IIFE 번들링 방식**
   - 전체 코드를 `(function(){ … })();` 형태로 감싸서, 로드 즉시 실행되는 하나의 스크립트로 만듭니다. [MDN Web Docs](https://developer.mozilla.org/en-US/docs/Glossary/IIFE?utm_source=chatgpt.com)
   - 별도의 모듈 로더(import/require)가 필요 없고, `<script>` 태그로 바로 포함만 하면 작동합니다.
2. **전역 네임스페이스에 노출**

   - 번들링 시 `output.name`(Rollup 기준) 혹은 유사 옵션으로 전역 변수 이름을 지정해야 합니다.
   - 예를 들어 `name: 'MyLib'`로 설정하면, 스크립트 로드 후 `window.MyLib` 형태로 접근 가능합니다. [Rollup](https://rollupjs.org/tutorial/?utm_source=chatgpt.com)

   ```
   js
   복사편집
   // rollup.config.mjs 예시
   export default {
     input: 'src/main.js',
     output: {
       file: 'dist/bundle.iife.js',
       format: 'iife',
       name: 'MyLib',      // 전역에 MyLib라는 객체로 노출
     }
   };

   ```

3. **코드 스플리팅 및 트리 셰이킹 제한**
   - IIFE 포맷은 “단일 즉시 실행 스크립트”이므로, 여러 청크(chunk)로 분리하는 코드 스플리팅(code-splitting)을 지원하지 않습니다.
   - 또한, ESM의 정적 import가 아니므로 번들러가 Dead Code(사용되지 않는 코드)를 완벽히 제거하기 어려워 트리 셰이킹 효율이 떨어질 수 있습니다. [remarkablemark](https://remarkablemark.org/blog/2019/07/12/rollup-commonjs-umd/?utm_source=chatgpt.com)
4. **장점과 단점 요약**

   | 구분 | 설명                                                          |
   | ---- | ------------------------------------------------------------- |
   | 장점 | • 모듈 로더 필요 없음• 브라우저 직접 삽입 가능                |
   | 단점 | • 전역 변수 충돌 위험• 코드 스플리팅 불가• 트리 셰이킹 비효율 |

5. **활용 시나리오**
   - 작은 라이브러리나 위젯(single file) 형태로 배포할 때 유용
   - `<script src="bundle.iife.js"></script>` 만으로 설치와 사용이 간단해야 할 경우

---

**정리**:

IIFE 포맷으로 배포하면, 번들 전체가 즉시 실행 함수로 래핑되어 전역 변수를 통해 노출되고, 추가 설정 없이 브라우저에 삽입해 바로 사용할 수 있지만, 모듈 분할이나 트리 셰이킹 같은 현대적 최적화 기능은 제한됩니다.

IIFE 포맷으로 번들하면서도 트리 셰이킹을 최대한 활용하려면, “트리 셰이킹→IIFE 래핑” 순으로 처리 과정을 나눠야 합니다. 아래 순서대로 설정해 보세요.

```
ts
복사편집
// vite.config.ts
import { defineConfig } from 'vite';
import path from 'path';
import { terser } from 'rollup-plugin-terser';

export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      name: 'MyLib',
      formats: ['iife'],                      // IIFE 출력
      fileName: () => 'bundle.iife.js'
    },
    rollupOptions: {
      // 1) 사이드 이펙트 없는 모듈로 간주 → dead code 제거
      treeshake: {
        moduleSideEffects: false
      },
      // 2) 외부 의존성 제외 (필요시)
      external: [],
      output: {
        globals: {
          // 예: lodash: '_'
        }
      },
      // 3) terser로 추가적인 dead code 제거 및 미니파이
      plugins: [terser()]
    }
  }
});

```

```json
json
복사편집
// package.json
{
  "name": "my-lib",
  "version": "1.0.0",
  "type": "module",
  "sideEffects": false,            /* 트리 셰이킹 최적화 */
  "main": "dist/bundle.iife.js",
  "scripts": {
    "build": "vite build"
  }
}

```

```json
json
복사편집
// tsconfig.json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",            /* ESM 상태로 유지하여 정적 분석 가능 */
    "moduleResolution": "Node",
    "strict": true,
    "esModuleInterop": true},
  "include": ["src"]
}

```

---

### 새로운 부분

1. **vite.config.ts**
   - `build.lib.formats: ['iife']` 로 IIFE 전용 번들링
   - `rollupOptions.treeshake.moduleSideEffects: false`
   - `rollup-plugin-terser` 추가
2. **package.json**
   - `"sideEffects": false` 설정
3. **tsconfig.json**
   - `"module": "ESNext"` 유지

---

이렇게 하면

1. **TypeScript → ESM** 상태로 컴파일
2. **Rollup/Vite** 단계에서 unused export 제거
3. **IIFE**로 결과를 래핑
4. **Terser**로 추가적인 unused 코드 제거 및 미니파이

과정을 거쳐 IIFE 형식 번들에서도 트리 셰이킹 효과를 최대한 누릴 수 있습니다.

**Terser란?**

Terser는 ES6+ 코드를 지원하는 표준 JavaScript 미니파이어(minifier) 라이브러리로, 변수 이름 단축(mangling), 공백·주석 제거, 사용되지 않는 코드(dead code) 삭제 기능을 제공합니다. 빌드 도구나 자체 스크립트에서 바로 호출하거나, Rollup/Vite 플러그인으로 통합해 사용할 수 있습니다. [terser.org](https://terser.org/?utm_source=chatgpt.com)

---

## 1. 핵심 아키텍처

1. **파싱(Parser)**
   - Acorn 기반 파서를 사용해 소스 코드를 AST(Abstract Syntax Tree)로 변환합니다. [GitHub](https://github.com/terser/terser?utm_source=chatgpt.com)
2. **압축(Compress)**
   - 수많은 `compress` 옵션(불필요한 비교·조건문 제거, 상수 간소화, `dead_code` 삭제 등)을 통해 AST를 최적화합니다.
3. **단축(Mangle)**
   - 변수·함수·클래스 이름을 짧게 바꿔 코드 크기를 더 줄입니다.
4. **출력(Output)**
   - `format` 옵션으로 공백·개행·세미콜론 등을 제어해 최종 코드를 생성합니다.

---

## 2. CLI 사용법

```bash
bash
복사편집
# 기본 사용 예시
terser src/index.js --compress --mangle --output dist/index.min.js
```

- **`-compress`**: 압축(기본 `dead_code`, `drop_debugger` 등 활성)
- **`-mangle`**: 변수 이름 단축
- **옵션 전달**: `-compress ecma=2015,drop_console=true` 식으로 세부 설정 가능
- STDIN/STDOUT 지원으로 파이프 연동도 자유롭습니다. [terser.org](https://terser.org/docs/cli-usage/?utm_source=chatgpt.com)

---

## 3. Node.js API 사용법

```
js
복사편집
import { minify } from 'terser';

const code = `function add(a, b) { return a + b; }`;
const result = await minify(code, {
  sourceMap: true,
  toplevel: true               // 최상위 스코프 정리
});
console.log(result.code);      // 최적화된 코드 출력

```

- **`minify(code, options)`**: 비동기 메서드(기본 `compress`·`mangle` 활성)
- **`minify_sync()`**: 동기 호출 버전
- **`toplevel`**: 최상위 선언(함수·변수)까지 제거 대상에 포함 [terser.org](https://terser.org/docs/api-reference/?utm_source=chatgpt.com)

---

## 4. 주요 옵션 구성

### 4.1 Compress 옵션

- `dead_code` (기본 `true`): 도달 불가능 코드 삭제
- `drop_console` (`false` → `true`): `console.*` 호출 제거
- `passes` (기본 `1`): 최적화 반복 적용 횟수 증가
- `ecma` (기본 `5` → `2015` 이상): ES6+ 변환 허용 [terser.org](https://terser.org/docs/options/?utm_source=chatgpt.com)

### 4.2 Mangle 옵션

- `toplevel`: 최상위 변수·함수도 이름 단축
- `properties`: 객체 프로퍼티 이름까지 단축
- `keep_classnames`·`keep_fnames`: 특정 이름 보존

### 4.3 기타 포맷 옵션

- `output.comments`: 주석 보존 규칙 제어
- `output.beautify`: 가독성 있게 출력
- **Annotations**:
  - `/*@__PURE__*/` → 순수 함수 호출로 간주, 미사용 시 제거
  - `/*@__NOINLINE__*/` → 함수 인라인 방지 [terser.org](https://terser.org/docs/miscellaneous/?utm_source=chatgpt.com)

---

## 5. Rollup·Vite 통합

```
js
복사편집
// vite.config.ts
import { defineConfig } from 'vite';
import { terser } from '@rollup/plugin-terser';

export default defineConfig({
  build: {
    rollupOptions: {
      plugins: [
        terser({
          compress: { drop_console: true },
          mangle: { toplevel: true }
        })
      ]
    }
  }
});

```

- Vite는 내부적으로 Rollup을 사용하므로, `@rollup/plugin-terser`를 그대로 적용 가능합니다.
- **Node 14+ · Rollup v2+** 환경이 필요합니다. [Npm](https://www.npmjs.com/package/%40rollup/plugin-terser?utm_source=chatgpt.com)

---

## 6. 활용 팁 & 주의사항

1. **`sideEffects: false`** 설정 시 트리 셰이킹 효율↑
2. **Source Map**: 배포용 미니파이된 코드에도 디버깅용 맵 생성 권장
3. **성능**: 대용량 번들 시 `passes` 증가→최적화↑·빌드 시간↑ 트레이드오프
4. **외부 의존성**은 `external`로 제외해 중복 번들링 방지

---

이처럼 Terser는 **파서→압축→단축→출력** 단계별 세부 옵션을 통해 강력한 코드 최적화를 제공하며, Rollup/Vite 플러그인으로 간단히 통합해 사용할 수 있습니다. 필요에 따라 옵션을 커스터마이징해 보세요!

# vite

Vite 설정 파일(`vite.config.js/ts`)은 크게 아래 6개 섹션으로 나뉘며, 각 섹션마다 수십 가지 세부 옵션을 제공합니다. 중요한 옵션들을 하나씩 살펴보겠습니다.

---

## 1. Shared Options (공통 설정)

- **root** (`string`, 기본값 `process.cwd()`)
  프로젝트의 루트 디렉터리(예: `index.html` 위치)를 지정합니다. 절대 경로 혹은 cwd 기준의 상대경로를 설정할 수 있습니다.
- **base** (`string`, 기본값 `/`)
  개발/빌드시 모든 에셋과 모듈 경로 앞에 붙는 공용 URL 경로입니다. `/foo/`, `./` 등 배포 경로에 맞춰 조정하세요.
- **mode** (`string`, 기본값 `serve` 일 땐 `development`, `build` 일 땐 `production`)
  - `-mode` 플래그나 이 옵션으로 환경 모드를 설정해, 환경변수(`.env.[mode]`) 로딩과 조건부 설정을 제어합니다.
- **define** (`Record<string, any>`)
  `process.env` 같은 글로벌 상수를 빌드 타임에 치환합니다. 예:
  ```
  define: { __API_URL__: JSON.stringify('https://api/') }
  ```
- **plugins** (`Plugin[]`)
  Vite 생태계의 모든 플러그인을 사용합니다. 비동기 리턴, 중첩 배열, `false` 무시 등을 지원합니다.
- **resolve.alias** (`Record<string,string> | {find, replacement}[]`)
  경로별칭을 설정해 `@/components` → `src/components` 같은 짧은 import를 사용합니다.
- **publicDir** (`string | false`, 기본값 `"public"`)
  빌드시 그대로 복사·서빙할 정적 파일 디렉터리를 지정합니다. `false`로 비활성화 가능.
- **cacheDir** (`string`, 기본값 `"node_modules/.vite"`)
  의존성 프리번들링 캐시를 저장할 디렉터리입니다. `--force` 플래그로 재생성할 수 있습니다.
- **envDir / envPrefix**
  `.env` 파일 경로(`envDir`)와 클라이언트에 노출할 변수 접두사(`envPrefix`, 기본 `"VITE_"`)를 설정합니다.

---

## 2. Server Options (개발 서버) [Vite](https://v2.vitejs.dev/config/?utm_source=chatgpt.com)[vitejs](https://vite.dev/config/shared-options)

- **server.host** (`string|boolean`, 기본 `"127.0.0.1"`)
  개발 서버가 바인딩할 IP를 지정합니다. `"0.0.0.0"` 혹은 `true`로 LAN까지 열 수 있습니다.
- **server.port** (`number`, 기본 `3000`)
  개발 서버 포트. 충돌 시 다음 사용 가능한 포트를 자동 할당합니다.
- **server.strictPort** (`boolean`, 기본 `false`)
  `true`면 포트 충돌 시 에러를 던지고 종료합니다.
- **server.https** (`boolean|https.ServerOptions`)
  HTTPS+HTTP/2 지원. `https.createServer()` 옵션 객체 전달도 가능합니다.
- **server.open** (`boolean|string`)
  서버 시작 시 브라우저를 자동으로 열고, 문자열일 경우 경로로 이동합니다.
- **server.proxy** (`Record<string,string|ProxyOptions>`)
  API 요청 프록시 설정. `'^/api'`처럼 정규식 키, `rewrite`·`changeOrigin` 등 세부 옵션 지원합니다.
- **server.hmr** (`boolean|{overlay, host,…}`)
  HMR(Hot Module Replacement) 설정을 커스터마이징하거나 비활성화합니다.

---

## 3. Build Options (프로덕션 빌드) [vitejs](https://vite.dev/guide/build?utm_source=chatgpt.com)[vitejs](https://vite.dev/config/shared-options)

- **build.target** (`string|string[]`, 기본 `"es2015"`)
  변환할 JS 문법 수준. 구형 브라우저 대응이 필요하면 낮은 값으로 설정합니다.
- **build.outDir** (`string`, 기본 `"dist"`)
  빌드 결과물 산출 디렉터리입니다.
- **build.assetsDir** (`string`, 기본 `"assets"`)
  JS/CSS 외 에셋의 하위 디렉터리명입니다.
- **build.assetsInlineLimit** (`number`, 기본 `4096`)
  이 바이트 미만의 파일을 Base64로 인라인 처리합니다.
- **build.cssCodeSplit** (`boolean`, 기본 `true`)
  CSS를 JS 청크와 분리해 독립 번들링할지 여부입니다.
- **build.sourcemap** (`boolean|'inline'|'hidden'`)
  소스맵 생성 방식 제어. 디버깅용으로 CI에도 포함시킬 수 있습니다.
- **build.minify** (`boolean|'esbuild'|'terser'`)
  기본 `esbuild` 미니파이어, `terser` 플러그인 사용, 혹은 비활성화가 가능합니다.
- **build.brotliSize** (`boolean`, 기본 `true`)
  브라우틀리 압축 크기 예측 통계를 출력할지 여부입니다.
- **build.rollupOptions** (`RollupOptions`)
  Rollup의 모든 설정을 직접 조작할 수 있습니다. 다중 출력, 외부 의존성, 플러그인 추가 등이 가능합니다.
- **build.emptyOutDir** (`boolean`, 기본 `true`)
  빌드 전 `outDir`을 초기화할지 여부를 설정합니다.
- **build.lib** (`{entry, name, formats, fileName}`)
  라이브러리 번들링 전용 모드로, ESM/CJS/IIFE 등 형식을 지정해 배포용 번들을 생성합니다.

---

## 4. Dep Optimization Options (의존성 프리번들링)

- **optimizeDeps.include / exclude** (`string[]`)
  pre-bundling 대상 또는 제외할 모듈을 명시적으로 지정합니다.
- **optimizeDeps.entries** (`string[]`)
  엔트리 파일 경로를 추가로 지정해 사전 로딩 범위를 확장합니다.
- **optimizeDeps.force** (`boolean`)
  캐시를 무시하고 매번 pre-bundling을 강제 실행합니다.
- **optimizeDeps.esbuildOptions** (`ESBuildOptions`)
  esbuild 레벨에서 JSX·TS 변환 옵션을 커스터마이징할 수 있습니다.

---

## 5. Preview Options (빌드 결과 미리보기) [Vite](https://v2.vitejs.dev/config/?utm_source=chatgpt.com)[vitejs](https://vite.dev/config/shared-options)

- **preview.port / strictPort / https / open**
  `server` 옵션과 동일한 형태로, `vite preview`용 설정입니다.
- **preview.proxy / cors**
  개발 서버와 마찬가지로 API 프록시나 CORS 정책을 지정할 수 있습니다.

---

## 6. 기타 섹션

- **SSR Options**: `ssr.external`, `ssr.noExternal` 등 서버사이드 렌더링 전용 설정 [vitejs](https://vite.dev/config/?utm_source=chatgpt.com)
- **Worker Options**: Web Worker 빌드 관련 `worker.format`, `worker.plugins` 등 [vitejs](https://vite.dev/config/?utm_source=chatgpt.com)

---

### 학습 팁

1. 공식 문서(ko.vite.dev/config)를 한 번 훑어보며 전체 옵션 구조를 파악하세요.
2. 실제 프로젝트 `vite.config.ts`에 `defineConfig`와 JSDoc/타입힌트를 활용해 인텔리센스를 활성화해 보세요.
3. 필요할 때마다 `build.rollupOptions`, `optimizeDeps` 등을 단계별로 실험하며 동작을 검증해 보는 것을 권장합니다.

## `resolve.alias`

- **역할**: 코드 내 `import` 경로를 짧게 치환해 주는 설정입니다.
- **형식**:
  ```

  resolve: {
    alias: {
      '@': '/absolute/path/to/src',
      'components': '/absolute/path/to/src/components'
    }
    // 또는
    alias: [
      { find: '@', replacement: '/abs/path/to/src' },
      { find: 'utils', replacement: '/abs/path/to/src/utils' }
    ]
  }

  ```
- **동작 원리**:
  - Vite(내부 Rollup)는 이 매핑을 보고 `@/foo` 같은 import를 실제 파일 시스템 경로로 변환해 줍니다.
  - **절대 경로**를 써야 충돌 없이 제대로 해석되며, 상대경로는 변환 없이 그대로 사용됩니다. [vitejs](https://vite.dev/config/shared-options?utm_source=chatgpt.com)

---

## 2. `publicDir` vs `build.outDir`

### a. `publicDir`

- **역할**: 프로젝트 루트에 놓인 **정적 자산** 폴더를 지정합니다.
- **기본값**: `"public"`
- **동작**:
  - 개발 서버 구동 중엔 `/파일명` 으로 **원본 그대로** 서빙
  - 빌드 시엔 `outDir` 최상단에 **복사**됨 (파일명·내용 변경 없이) [Vite](https://v2.vitejs.dev/config/?utm_source=chatgpt.com)[vitejs](https://vite.dev/guide/assets?utm_source=chatgpt.com)
- **비활성화**: `publicDir: false`

### b. `build.outDir`

- **역할**: Vite가 번들된 **코드와 에셋**을 최종적으로 출력할 디렉터리 경로입니다.
- **기본값**: `"dist"`
- **동작**:
  - JS/CSS 번들, 청크, 인라인 자산 등 모든 빌드 결과물이 이 폴더로 생성됩니다.
  - `publicDir`에 있던 파일도 이 폴더 안으로 복사됩니다. [vitejs](https://vite.dev/config/build-options?utm_source=chatgpt.com)

---

## 3. `build.sourcemap` 옵션과 “소스맵”이란?

- **옵션값**
  - `false`: 소스맵 생성 안 함
  - `true`: 별도 `.map` 파일 생성
  - `"inline"`: 번들 파일 안에 Base64로 **인라인** 삽입
  - `"hidden"`: `.map` 파일 생성하되, 번들 상단에 주석(`//# sourceMappingURL`)을 **생략**
- **소스맵이란?**
  - \*“변환된(minified/compiled) 코드”**를 **“원본 소스”\*\*와 1:1로 대응시켜 주는 메타데이터 파일입니다.
  - 예를 들어 TypeScript, JSX, 번들러 최적화 등으로 바뀐 코드를 디버깅할 때, 개발자 도구가 소스맵을 참조해 **원본 위치(파일·라인·컬럼)**로 역추적해 줍니다.
  - 덕분에 운영 환경에서도 압축된 코드가 아닌 원본 코드를 보면서 중단점(breakpoint)을 찍거나 로그를 분석할 수 있습니다.

ESM의 `import`/`export` 구문은 IIFE 번들 단계에서 **“모듈 해석 → 트리 셰이킹 → 코드 병합 → IIFE 래핑”** 순으로 처리됩니다. 자세히 단계별로 살펴보면:

---

### 1. 정적 분석(모듈 해석)

- Rollup은 프로젝트의 진입점(entry) 파일에서 시작해, 모든 `import`/`export` 구문을 **정적으로 분석**하여 모듈 간 의존성 그래프를 만듭니다.
- 예를 들어
  ```
  js
  복사편집
  // src/foo.js
  export function foo() { console.log('foo'); }

  // src/main.js
  import { foo } from './foo.js';
  foo();

  ```
  이 두 파일은 `main.js` → `foo.js` 의 관계로 연결됩니다 [rollupjs.org](https://rollupjs.org/tutorial/).

---

### 2. 트리 셰이킹 & 병합

- 불필요한 코드(사용되지 않는 `export`, dead code)를 제거한 뒤,
- 모듈별로 만든 AST(추상 구문 트리)를 **한 파일**로 병합합니다.
- `import { foo }` 구문은 내부적으로
  ```
  js
  복사편집
  // foo.js 에서
  function foo() { … }
  // → export 와 동시에 로컬 변수 선언

  ```
  로 변환되고, `main.js` 쪽에서는
  ```
  js
  복사편집
  // import 구문 대신 로컬 바인딩
  const foo = /* foo.js 의 foo 함수 참조 */;
  foo();

  ```
  처럼 **로컬 스코프 변수 참조**로 치환됩니다.

---

### 3. IIFE 래핑 & exports 할당

- 병합된 코드를 하나의 즉시 실행 함수로 감쌉니다.
- 각 모듈에서 내보낸(export) 식별자들은 이 함수의 `exports` 객체에 할당되고,
- IIFE 전체의 반환값(`exports`)이 Rollup 설정의 `name` 옵션에 지정한 전역 변수에 바인딩됩니다.
  ```
  js
  복사편집
  // 번들 후 최종 구조 예시
  var MyLib = (function (exports) {
    'use strict';

    // foo.js 에서 병합된 코드
    function foo() { console.log('foo'); }
    // foo 함수 export 처리
    exports.foo = foo;

    // main.js 에서 병합된 코드
    const foo_1 = exports.foo;   // import {foo} → exports.foo 참조
    foo_1();

    // 외부에 노출할 API 리턴
    return exports;
  })({});

  ```
  이때 `MyLib.foo()` 를 호출하면 내부 `foo`가 실행됩니다 [rollupjs.org](https://rollupjs.org/tutorial/).

---

### 4. 외부 의존성 처리

- `rollupOptions.external` 로 지정된 모듈은 번들에 포함되지 않고,
- `output.globals` 에 매핑된 전역 변수로 대체됩니다.
- 예를 들어 `import _ from 'lodash';` 가 외부화된 상태라면
  ```
  js
  복사편집
  var MyLib = (function (exports, _ ) {
    // … code using _
  })( {}, window._ );

  ```
  처럼 IIFE 호출 시 `window._` 를 전달해 내부에서 `_` 식별자로 사용하게 됩니다 [rollupjs.org](https://rollupjs.org/configuration-options/?utm_source=chatgpt.com).

"sideEffects": false, }
rollupOptions: {
// 1) 사이드 이펙트 없는 모듈로 간주 → dead code 제거
treeshake: {
moduleSideEffects: false
},
// 2) 외부 의존성 제외 (필요시)
external: [],
output: {
globals: {
// 예: lodash: '\_'
}
},
// 3) terser로 추가적인 dead code 제거 및 미니파이
plugins: [terser()]
}
}

성능: 대용량 번들 시 passes 증가→최적화↑·빌드 시간↑ 트레이드오프

- **cacheDir** (`string`, 기본값 `"node_modules/.vite"`)
  의존성 프리번들링 캐시를 저장할 디렉터리입니다. `--force` 플래그로 재생성할 수 있습니다.
- **build.brotliSize** (`boolean`, 기본 `true`)
  브라우틀리 압축 크기 예측 통계를 출력할지 여부입니다.
- **build.outDir** (`string`, 기본 `"dist"`)
- **build.sourcemap** (`boolean|'inline'|'hidden'`)
  소스맵 생성 방식 제어. 디버깅용으로 CI에도 포함시킬 수 있습니다.
  빌드 결과물 산출 디렉터리입니다.
- **`noImplicitAny`**: 암시적 `any` 금지
-
- **`strictNullChecks`**: `null`·`undefined` 구분
- **`alwaysStrict`**: 파일마다 `"use strict"` 자동 삽입

SSR Options: ssr.external, ssr.noExternal 등 서버사이드 렌더링 전용 설정 vitejs

- **`declaration`** / **`declarationMap`**: `.d.ts` 타입 선언 파일 및 매핑

###
