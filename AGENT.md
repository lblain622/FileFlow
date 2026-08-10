# AGENTS.md

## Project Overview

FileFlow is a local\ desktop application for finding, organizing, and managing files on a user's computer.

The application should:

* Run locally as a native desktop application
* Work without requiring a cloud account
* Allow users to choose which folders are indexed
* Search files by filename, metadata, and eventually document contents
* Automatically organize files using user-defined rules
* Maintain move history and support undo
* Prioritize privacy, performance, and safe file operations

## Technology Stack

### Desktop

* Tauri 2
* Rust

### Frontend

* React
* TypeScript
* Vite
* Tailwindcss
* Shadcn

### Backend

* Rust
* SQLite
* SQLite FTS5 for full-text search

### Testing

* Vitest for frontend tests
* Cargo tests for Rust code

## Project Structure

```text
fileflow/
├── src/
│   ├── components/
│   ├── features/
│   │   ├── search/
│   │   ├── organizer/
│   │   ├── history/
│   │   └── settings/
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── main.tsx
│
├── src-tauri/
│   ├── src/
│   │   ├── commands/
│   │   ├── database/
│   │   ├── indexer/
│   │   ├── organizer/
│   │   ├── search/
│   │   ├── watcher/
│   │   ├── models/
│   │   ├── errors.rs
│   │   ├── lib.rs
│   │   └── main.rs
│   ├── migrations/
│   ├── Cargo.toml
│   └── tauri.conf.json
│
├── tests/
├── docs/
├── .github/
├── AGENTS.md
├── CONTRIBUTING.md
├── LICENSE
└── README.md
```

## General Development Rules

* Prefer small, focused changes.
* Do not rewrite unrelated code.
* Follow the existing project structure and naming conventions.
* Reuse existing utilities and components before creating new ones.
* Avoid introducing new dependencies unless they provide clear value.
* Keep frontend presentation logic separate from backend file-system logic.
* Do not place direct file-system operations inside React components.
* Use Rust for privileged or native file-system operations.
* Keep TypeScript types explicit for shared application models.
* Prefer readable code over clever abstractions.

## Frontend Rules

The frontend is responsible for:

* Rendering the application interface
* Managing UI state
* Displaying search results
* Displaying file metadata
* Creating and editing organization rules
* Showing file operation history
* Calling Tauri commands

The frontend should not:

* Directly scan directories
* Directly move or delete files
* Directly access SQLite
* Implement native operating-system functionality


Keep the interface compact and desktop-oriented.

## Rust Backend Rules

Rust is responsible for:

* Directory scanning
* File metadata extraction
* File watching
* File movement
* File renaming
* Search indexing
* SQLite access
* Organization rule evaluation
* Move history
* Undo operations
* Native operating-system actions

Tauri commands should remain thin.

For example, prefer:

```rust
#[tauri::command]
async fn search_files(
    state: State<'_, AppState>,
    query: SearchQuery,
) -> Result<Vec<IndexedFile>, AppError> {
    state.search_service.search(query).await
}
```

instead of implementing the entire search operation inside the command.

## File Operation Safety

File operations are high-impact functionality.

Agents must follow these rules:

* Do not delete user files without explicit user action.
* Prefer moving files to deletion.
* Never silently overwrite an existing file.
* Detect filename collisions before moving files.
* Preserve enough history to undo automatic moves.
* Automatic organization should be disabled by default.
* Users should be able to preview organization actions before enabling automation.
* Only operate on folders the user has explicitly selected or authorized.
* Avoid system directories and hidden operating-system directories by default.
* Do not follow symbolic links unless explicitly supported and tested.

## Search and Indexing Rules

The initial index should store metadata such as:

* File name
* Full path
* Extension
* Size
* Created date
* Modified date
* Last indexed date

Do not read full file contents unless content indexing is enabled for that format.

Search development should proceed in this order:

1. Filename search
2. Path search
3. Extension filters
4. Date filters
5. Size filters
6. Full-text document search
7. Natural-language query parsing

Do not introduce an AI dependency for functionality that can be implemented reliably with standard search or filtering.

## Database Rules

Use SQLite for local application data.

Database responsibilities include:

* Indexed files
* Indexed folders
* Organization rules
* File operation history
* Application settings
* Full-text search indexes

Database schema changes should use migrations.

Do not modify existing migrations after they have been released. Add a new migration instead.

Use parameterized queries.

Never construct SQL queries by directly concatenating user input.

## Privacy Rules

FileFlow is intended to be local-first.

Agents should assume:

* File names may be sensitive.
* File contents may be sensitive.
* Folder structures may contain private information.

Therefore:

* Do not upload file metadata or contents to external services by default.
* Do not add telemetry without explicit project approval.
* Do not add analytics that expose file names, paths, or document contents.
* Do not introduce cloud dependencies for core functionality.
* Local functionality should continue to work without an internet connection.

## Error Handling

Do not use `unwrap()` or `expect()` for recoverable Rust errors in application code.

Prefer application error types using `thiserror`.

Errors shown to users should be understandable and should not expose unnecessary internal implementation details.

Log technical information separately when needed.

## Testing Requirements

Before completing a change, run relevant tests.

Frontend:

```bash
npm run test
```

Rust:

```bash
cargo test --manifest-path src-tauri/Cargo.toml
```

Formatting:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
```

Rust linting:

```bash
cargo clippy --manifest-path src-tauri/Cargo.toml
```

Frontend production build:

```bash
npm run build
```

Desktop development build:

```bash
npm run tauri dev
```

When adding file-system features, tests should use temporary directories or fixture directories.

Tests must not modify real user files.

## Dependency Rules

Before adding a dependency:

1. Check whether the project already has functionality that solves the problem.
2. Prefer maintained libraries with clear licensing.
3. Avoid very large dependencies for small utility functions.
4. Document why the dependency is needed.
5. Ensure the dependency license is compatible with the project license.

## Open Source Contribution Guidelines

Changes should be easy for outside contributors to understand.

When implementing a new feature:

* Keep modules focused.
* Add documentation for non-obvious behavior.
* Add tests for important logic.
* Avoid undocumented global state.
* Avoid unnecessary coupling between features.
* Prefer interfaces or traits where extension is expected.

Good contribution areas include:

* Additional file metadata extractors
* New document format support
* Search filters
* Search ranking improvements
* Organization rule conditions
* UI improvements
* Accessibility improvements
* Platform compatibility fixes

## Git Guidelines

Use descriptive commits.

Examples:

```text
feat: add folder selection
feat: index file metadata
fix: prevent duplicate destination filenames
test: add organizer rule tests
docs: document local database structure
refactor: separate search service from tauri command
```

Avoid committing:

```text
node_modules/
dist/
target/
src-tauri/target/
.vs/
.env
*.log
```

Do not commit user files, local databases, test downloads, or machine-specific paths.

## Current Development Priorities

Unless an issue specifies otherwise, prioritize features in this order:

1. Desktop application shell
2. Folder selection
3. Directory scanning
4. File metadata display
5. SQLite indexing
6. Filename and metadata search
7. Open and reveal file actions
8. Organization rules
9. Move history and undo
10. Folder watching
11. Document content extraction
12. Full-text search
13. Advanced search and natural-language queries

## Definition of Done

A task is complete when:

* The requested functionality works.
* Existing functionality is not broken.
* Relevant tests pass.
* Rust code is formatted.
* New behavior has appropriate error handling.
* File operations follow the safety rules in this document.
* Documentation is updated when behavior or setup changes.
