# T03 repeatable checks

Implemented formatting (Prettier), Expo flat ESLint configuration, strict TypeScript checking, and Jest with the jest-expo/android preset. Exact tooling versions are pinned in package.json and package-lock.json.

Commands:
- npm ci: reproduce dependencies.
- npm run format: format application/configuration files.
- npm run format:check: check formatting without writing.
- npm run lint: lint with zero allowed warnings.
- npm run typecheck: check TypeScript without emitting files.
- npm test: run Android-preset Jest tests serially; currently explicitly allows no tests.
- npm run check: run formatting, lint, types, and tests.

There is no game behavior yet, so no placeholder behavioral tests were added. Future tests belong beside source under src as *.test.ts or *.test.tsx. Remove --passWithNoTests when the first behavioral tests land (T10). Formatting targets source/config files and CI YAML; original planning documents and prototypes are preserved. TypeScript and lint exclude local generated artifacts.

Verification: clean npm ci succeeded; npm run check passed; npx expo install --check passed; npx expo export --platform android succeeded. A temporary TypeScript file deliberately assigning a string to a number produced TS2322 and a nonzero compiler status, then was removed; clean typechecking passed afterward.

.github/workflows/checks.yml performs these checks from the lockfile on Node 24.18.0 under Ubuntu for pushes and pull requests with read-only repository permissions. Workflow is prepared locally; no remote GitHub Actions run has been observed and no push was performed.

Dependency limitations: npm audit reports 28 entries (1 low, 27 moderate), including the previously recorded Expo fingerprint/minimatch chain and test-tool dependencies. No forced major downgrade was applied. Expo-compatible ESLint 9 also emits an upstream deprecation warning. npm reports an unapproved optional @parcel/watcher install script; installation and bundle generation succeed without approving it. Reassess upstream compatible dependency updates before release.

Next: T04 native Android build, installation, and development-server reconnection on the connected S23 Ultra. T02 starter-load acceptance remains pending that verification.

References:
- https://docs.expo.dev/guides/using-eslint/
- https://docs.expo.dev/develop/unit-testing/
