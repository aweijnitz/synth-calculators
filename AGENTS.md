# synth-calculators Agent Guide

## Project overview
This repository contains a responsive, mobile-first Next.js application that provides a foundation for building synthesizer calculator tools. The UI follows Material Design 3 principles and is structured as a modern React app with TypeScript for static typing.

## Main technologies and frameworks
- **Next.js 14** with the App Router for server-rendered React pages and API routes.
- **React 18** for client-side interactivity.
- **TypeScript 5** for type-safe components and utilities.
- **Material UI (MUI) 5** with Emotion for theming and styling.
- **Jest 30** for unit and component testing in a JSDOM environment.

## Build and test commands
Run all commands from the repository root (`synth-calculators`).

```bash
npm install          # Install dependencies
npm run dev          # Start the Next.js development server at http://localhost:3000
npm run build        # Create a production build
npm run start        # Serve the production build
npm run lint         # Run ESLint using the Next.js config
npm test             # Execute the Jest test suite
```

## Code style guidelines
- Adhere to the default Next.js ESLint configuration (`npm run lint`).
- Use TypeScript across the codebase; avoid introducing plain `.js` modules unless necessary.
- Follow React best practices: functional components, hooks, and idiomatic JSX/TSX patterns.
- Prefer MUI components and theming utilities for layout and styling instead of custom CSS when practical.
- Keep components small and composable; extract shared logic into reusable hooks or utilities.

## Testing instructions
- Add or update Jest tests alongside the code in the `__tests__` directory or colocated `*.test.ts(x)` files.
- Mock network and browser APIs using Jest mocks when needed.
- Ensure `npm test` passes before committing.
- For changes affecting behavior or layout, consider adding integration-style tests with React Testing Library if the setup exists.

## Security considerations
- Do not commit secrets (API keys, tokens, etc.); rely on environment variables managed outside version control.
- Sanitize and validate any user-provided input before processing or rendering to avoid injection vulnerabilities.
- Prefer Next.js API routes or server actions for sensitive operations instead of exposing them in the client bundle.
- Review third-party dependencies for known vulnerabilities and keep them up to date via `npm audit`.
- When adding new dependencies, ensure they are maintained and compatible with the project's licenses.
