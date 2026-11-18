# Stuwy

## Project info

This checkout contains the Stuwy practice branch application.

## Open the app — Vercel links

The development, practice and guided-activity previews belong to the **Stuwy** Vercel project. The main app belongs to the **tutorly-navi** Vercel project. You may need to sign in
to Vercel with access to the Stuwy team.

| Branch | Open the app | GitHub source |
| --- | --- | --- |
| Main | [Main app](https://tutorly-navi.vercel.app/) | [`main`](https://github.com/UltraSaura/tutorly-navi/tree/main) |
| Guided activities | [Guided activities preview](https://stuwy-git-feature-guided-practice-lessons-stuwy.vercel.app) | [`feature/guided-practice-lessons`](https://github.com/UltraSaura/tutorly-navi/tree/feature/guided-practice-lessons) |
| Development | [Development preview](https://stuwy-git-development-stuwy.vercel.app) | [`development`](https://github.com/UltraSaura/tutorly-navi/tree/development) |
| Practice | [Practice preview](https://stuwy-git-practice-stuwy.vercel.app) | [`practice`](https://github.com/UltraSaura/tutorly-navi/tree/practice) |

Branch preview links point to the deployment assigned to that branch. The
following links identify the specific deployments confirmed ready on
16 November 2026 (fixed historical snapshots, not necessarily the latest branch builds):

| Branch | Specific deployment | Source commit | Vercel deployment details |
| --- | --- | --- | --- |
| Development | [Open development deployment](https://stuwy-2lqvpwjb3-stuwy.vercel.app) | `a8708d5459e7c2bd94d85cf4ef6440c2c52622f1` | [Build details](https://vercel.com/stuwy/stuwy/HcSPQVC5YxWyh8w5aHJyLCsUsWUp) |
| Practice | [Open practice deployment](https://stuwy-lz52zo37c-stuwy.vercel.app) | `cf8d3348072075d70abe9c4caa4ca36283ab6fc6` | [Build details](https://vercel.com/stuwy/stuwy/DTQ4XTMAubwPRc2p4HRC2Ba6C9Bf) |

[Manage the Stuwy Vercel project](https://vercel.com/stuwy/stuwy).

The guided exercises, clock and arithmetic display work in this checkout are on
[`feature/guided-practice-lessons`](https://github.com/UltraSaura/tutorly-navi/tree/feature/guided-practice-lessons).
The main, development and practice previews do not include feature-branch changes unless those changes have been integrated into their respective branches and deployed.

Implementation notes: [guided exercise delivery and validation](docs/tutorly-learning-project/IMPLEMENTATION-REPORT-2026-11-18.md) · [Brilliant evaluation and implementation plan](docs/tutorly-learning-project/BRILLIANT-IMPLEMENTATION-PLAN.md).

## How can I edit this code?

There are several ways of editing your application.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Use the Node version in .nvmrc, then install the locked dependencies.
nvm use
npm ci

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

Baseline checks: `npm run typecheck`, `npm run lint:ci`,
`npm run test:tooling`, `npm run test:ci`, and `npm run build`.
`npm run lint` still reports the complete legacy lint debt and currently fails.
See [the development baseline](docs/development-baseline/README.md) for the
lint policy, CI evidence, dependency review and known limitations. npm and
`package-lock.json` are the supported CI installation path; legacy Bun lockfiles
are retained without being used by CI.

Browser QA: after building, run `npm run browser:install -- --with-deps` and
`npm run browser:test`. Desktop/mobile journeys and reviewed screenshot comparisons
run against the production bundle with synthetic backend reads. See
[browser QA coverage, evidence and limitations](docs/browser-qa/README.md).

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with .

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Staging

The practice build is published for testers at:

`https://stuwy-practice-staging.grittydace256.chatgpt.site`

The password recovery route is `/auth`.
