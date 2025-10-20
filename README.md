# synth-calculators

Synthesizer calculators with a Material Design 3 interface. Mobile-first Next.js SPA webapp.

## Overview
- Built with Next.js 14 App Router and React 18.
- Material UI 5 provides theming, layout primitives, and responsive design tokens.
- TypeScript-first codebase with Jest for unit and component testing.

## Getting Started
```bash
npm install
npm run dev
```
The development server runs at [http://localhost:3000](http://localhost:3000).

## Available Scripts
- `npm run dev` – start the Next.js dev server with hot reloading.
- `npm run build` – generate an optimized production build.
- `npm run start` – serve the production build locally.
- `npm run lint` – run ESLint using the Next.js configuration.
- `npm run typecheck` – validate TypeScript types without emitting output.
- `npm test` – execute the Jest test suite in JSDOM.
- `npm run test:watch` – run Jest in watch mode for focused development.

## Testing
- Tests run under Jest 30 with React Testing Library helpers in a browser-like environment.
- Add new tests alongside components (`*.test.ts(x)`) or under `__tests__/`.
- Mock browser or network APIs as needed with Jest mocks.
- Ensure `npm test` passes before submitting changes; add integration-style tests when UI behavior changes.

## Code Guidelines
- Prefer functional React components and hooks; keep components focused and composable.
- Use Material UI theming/styling utilities instead of ad hoc CSS when practical.
- Write TypeScript throughout the project for static typing; avoid plain `.js` modules.
- Validate and sanitize any user input in utilities or API routes before use.

## Project Structure
- `app/` – Next.js App Router entrypoint, routes, and layout components.
- `components/` – Reusable UI building blocks.
- `lib/` – Shared utilities and domain logic.
- `types/` – TypeScript type definitions.
- `__tests__/` – Jest test suites and fixtures.

## Security & Maintenance
- Do not commit secrets; rely on environment variables outside version control.
- Prefer Next.js API routes or server actions for sensitive operations.
- Review dependency updates with `npm audit` and keep packages current.

## License
This project is licensed under the terms of the [MIT License](LICENSE).

## AI Transparency
Almost 100% of the code in this app was developed in collaboration with OpenAI Codex.
