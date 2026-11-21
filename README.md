# Pradyumna Aher · playable portfolio

The Next.js homepage is a compact React Three Fiber campus. The original portfolio is available at `/standard`; `/work`, both project case studies, `/experience`, `/thinking`, the sitemap, and the P’AI API remain available.

## Run

```sh
npm install
npm run dev
```

Open the Local URL printed by Next.js. Choose one of three characters and start exploring. Use WASD or arrow keys to move, Shift to run, Space to jump, E to interact, mouse drag to rotate the camera, and Esc to close chat or the computer. Touch devices have a joystick and action buttons. Controls and quality settings are available in the lower-right corner.

Enter a building, ask its guide a question, or open its workstation to complete that destination. The map supports destination highlighting and quick travel. Character choice and completed destinations use browser local storage; the settings panel can reset them. The reset-player button returns to the plaza. No audio is played.

## Content and assistant

`src/content/portfolio.ts` is the shared published-content source for standard pages, computer screens, and assistant grounding. The world contains six destinations: About Me, Experience, Projects, Systems Thinking, Skills / Toolkit, and Contact. No additional credentials, achievements, education, or certifications are claimed.

P’AI uses the existing server route `/api/portfolio-assistant`. With a valid server-side `OPENAI_API_KEY`, it calls the configured `OPENAI_PORTFOLIO_MODEL` (see `.env.example`). Without a key, or when the model fails or times out, it returns a deterministic lookup from published content. Responses identify their source as live AI or content-backed lookup. Room context, selected project, and a bounded conversation history are sent to the server; API credentials never enter client code.

## Implementation

The world is lazy-loaded and uses procedural geometry and local canvas-texture signage, avoiding remote model/font dependencies. The simulation uses bounded speed, gravity, swept substeps for collision movement, safe car exits, camera obstacle raycasts, and explicit interaction phases. Prepared interiors share reusable furniture and avatars. React owns UI state; Three.js updates simulation and animation imperatively. Low quality disables shadows and reduces pixel density. Reduced motion respects the operating-system preference and can also be selected manually. Unsupported WebGL opens a clear standard-portfolio fallback.

The production build uses Next.js’s supported Webpack bundler, which avoids Turbopack’s local CSS-worker socket requirement. The lockfile includes compatible runtime dependency updates.

## Verification

```sh
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

Unit tests cover collisions, world boundaries, doorway positions, safe vehicle exits, malformed saved progress, and grounded answers. Playwright tests exercise the full room journey, computer project switching, repeated interactions, all destinations, progress persistence, stationary car exit, navigation input guards, mobile controls, and WebGL fallback. Browser tests use installed Google Chrome and a running local server; set `PLAYWRIGHT_BASE_URL` to test another preview URL.

Production deployment stays with the existing Vercel project. The changes do not create a second hosted site.
