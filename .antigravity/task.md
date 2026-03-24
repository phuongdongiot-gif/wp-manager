# WordPress Management Tauri App

## Task 1: Project Architecture & Setup
- [x] Initialize Tauri project with React (Vite) and TypeScript
- [x] Install TailwindCSS and configure
- [x] Install Tauri plugins: `@tauri-apps/plugin-http` and `@tauri-apps/plugin-store`
- [x] Define folder structure (`src/services`, `src/stores`, `src/components`, `src/views`)

## Task 2: Authentication Module
- [x] Implement secure storage logic for WP credentials
- [x] Build Login UI component (Site URL, Username, Application Password)
- [x] Implement WP REST API credential validation logic (`/wp-json/wp/v2/users/me`)

## Task 2b: Multi-Site Support
- [x] Update secure store to save an array of sites
- [x] Refactor AuthContext to handle switching active sites
- [x] Refactor API service to use active site credentials
- [x] Update Login UI to "Add Site" instead of a single login
- [x] Update Dashboard to allow switching and managing sites

## Task 3: API Service Layer
- [x] Create HTTP service using `@tauri-apps/plugin-http`
- [x] Handle Basic Auth header injection automatically

## Task 4: Post Publishing Feature
- [x] Build Post management UI
- [x] Implement Post publishing logic (`POST /wp-json/wp/v2/posts`)

## Task 5: Page Management Feature (CRUD)
- [/] Build Pages list view (`GET /wp-json/wp/v2/pages`)
- [/] Build Create/Edit Page form
- [/] Implementation Delete Page logic with confirmation

## Task 6: UI Polish & Final Testing
- [ ] Refine styling (TailwindCSS) and UX (loading states, toast notifications)
- [ ] Test cross-platform responsiveness
- [ ] Verify global error handling
