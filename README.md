# Stuwy

## Project info

This checkout contains the Stuwy practice branch application.

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
