# Contributing to GoHit

Thank you for your interest in contributing to GoHit! This guide will help you set up your development environment and understand the project structure.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Development Setup](#development-setup)
3. [Project Structure](#project-structure)
4. [Development Workflow](#development-workflow)
5. [Testing](#testing)
6. [Code Style](#code-style)
7. [Submitting Changes](#submitting-changes)

---

## Getting Started

### Prerequisites

- **Node.js** 16.x or higher
- **npm** 8.x or higher
- **VS Code** 1.85.0 or higher
- **Go** 1.18 or higher (for testing example projects)
- **Git**

### Fork and Clone

1. Fork the GoHit repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/GoHit.git
   cd GoHit
   ```

---

## Development Setup

### Install Dependencies

```bash
npm install
```

This installs all required dependencies including:
- TypeScript compiler
- VS Code extension API types
- ESLint for code linting
- Axios for HTTP requests

### Compile TypeScript

```bash
npm run compile
```

This compiles all TypeScript files in the `src/` directory to JavaScript in the `out/` directory.

### Watch Mode

For active development, use watch mode to automatically recompile on changes:

```bash
npm run watch
```

Leave this running in a terminal while you develop.

---

## Project Structure

```
GoHit/
├── .vscode/              # VS Code configuration
│   └── launch.json       # Debug configuration
├── docs/                 # Documentation
│   ├── ANNOTATIONS.md
│   ├── AUTO_SUGGEST_FEATURE.md
│   ├── BODY_EXAMPLE_FEATURE.md
│   └── TROUBLESHOOTING_DTO.md
├── examples/             # Example Go projects for testing
│   ├── gin-example.go
│   ├── fiber-example.go
│   ├── echo-example.go
│   └── real-world-project/
├── src/                  # Source code
│   ├── extension.ts      # Extension entry point
│   ├── client/           # HTTP client
│   │   └── httpClient.ts
│   ├── parser/           # Go code parsers
│   │   └── goParser.ts
│   ├── services/         # Business logic
│   │   ├── annotationParser.ts
│   │   ├── endpointDetector.ts
│   │   └── environmentManager.ts
│   ├── utils/            # Utilities
│   │   └── validators.ts
│   └── webview/          # Webview panel
│       ├── panel.ts
│       ├── endpointSuggestionService.ts
│       └── ui/
│           └── index.html
├── out/                  # Compiled JavaScript (generated)
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript configuration
├── README.md             # Main documentation
├── USER_GUIDE.md         # User guide
└── CONTRIBUTING.md       # This file
```

### Key Files

#### `src/extension.ts`
- Extension activation and registration
- Command handlers
- Extension lifecycle management

#### `src/parser/goParser.ts`
- Parses Go source code
- Detects endpoint definitions
- Extracts struct information for request body generation

#### `src/webview/panel.ts`
- Manages the webview panel
- Handles messages between extension and webview
- Coordinates endpoint detection and suggestions

#### `src/webview/endpointSuggestionService.ts`
- Scans workspace for endpoints
- Provides autocomplete suggestions
- Generates request body examples from structs

#### `src/webview/ui/index.html`
- Webview UI (HTML, CSS, JavaScript)
- API tester interface
- Auto-suggest dropdown

---

## Development Workflow

### Running the Extension

1. **Open the project** in VS Code
2. **Start watch mode** (optional but recommended):
   ```bash
   npm run watch
   ```
3. **Press F5** to start debugging
4. A new VS Code window opens (Extension Development Host)
5. Open a Go project in the Extension Development Host to test

### Making Changes

1. **Edit source files** in `src/`
2. **Compile** (if not using watch mode):
   ```bash
   npm run compile
   ```
3. **Reload the Extension Development Host**:
   - Press `Ctrl+Shift+P`
   - Type "Reload Window"
   - Or press **Ctrl+R** in the Extension Development Host

### Testing Your Changes

#### Manual Testing

1. **Open the examples folder** in the Extension Development Host:
   ```
   File → Open Folder → d:\for moon\GoHit\examples
   ```

2. **Test endpoint detection**:
   - Open `examples/gin-example.go`
   - Place cursor on a route handler
   - Right-click → "GoHit: Test API Endpoint"
   - Verify endpoint is correctly detected

3. **Test auto-suggest**:
   - Press `Ctrl+Shift+P` → "GoHit: Open API Tester"
   - Type in the URL field (e.g., `/api`)
   - Verify suggestions appear and are correct

#### Test Real-World Project

The `examples/real-world-project/` demonstrates complex routing:

```bash
cd examples/real-world-project
go run cmd/server/main.go
```

Test features like:
- Cross-package DTO resolution
- Annotation parsing
- Complex routing structures

### Debugging

#### Extension Code

1. Set breakpoints in TypeScript files
2. Press F5 to start debugging
3. Breakpoints will be hit when the extension code executes

#### Webview Code

1. In the Extension Development Host, open the GoHit panel
2. Press `Ctrl+Shift+P` → "Developer: Open Webview Developer Tools"
3. This opens Chrome DevTools for the webview
4. Debug HTML/CSS/JavaScript in the webview

#### Logs

View extension logs:
1. `View → Output`
2. Select "GoHit" from the dropdown

Add logging in your code:
```typescript
import { getLogger } from './utils/logger';

const logger = getLogger();
logger.info('Your log message');
logger.error('Error message', error);
```

---

## Testing

### Running Tests

Currently, the project uses manual testing. To run automated tests (when implemented):

```bash
npm test
```

### Manual Test Checklist

Before submitting changes, verify:

- [ ] Endpoint detection works for all frameworks (net/http, Gin, Fiber, Echo)
- [ ] Annotation parsing works correctly
- [ ] Auto-suggest shows relevant endpoints
- [ ] Request body is auto-generated for POST/PUT/PATCH
- [ ] Environment switching works
- [ ] HTTP requests complete successfully
- [ ] Error handling works (connection refused, 404, 500, etc.)
- [ ] UI is responsive and accessible
- [ ] No TypeScript compilation errors
- [ ] No ESLint warnings

---

## Code Style

### TypeScript Guidelines

#### Naming Conventions

- **Classes**: PascalCase
  ```typescript
  class EndpointDetector { }
  ```

- **Functions**: camelCase
  ```typescript
  function detectEndpoint() { }
  ```

- **Constants**: UPPER_SNAKE_CASE
  ```typescript
  const MAX_SUGGESTIONS = 10;
  ```

- **Interfaces**: PascalCase with `I` prefix (optional)
  ```typescript
  interface EndpointInfo { }
  // or
  interface IEndpointInfo { }
  ```

#### Code Formatting

Use consistent formatting:
- **Indentation**: 2 spaces (not tabs)
- **Quotes**: Single quotes for strings
- **Semicolons**: Use them
- **Line length**: Max 100 characters
- **Trailing commas**: Use in multi-line arrays/objects

#### TypeScript Best Practices

- Always specify types (avoid `any`)
  ```typescript
  // ❌ Bad
  function parse(data: any): any { }

  // ✅ Good
  function parse(data: string): ParsedData { }
  ```

- Use interfaces for object shapes
  ```typescript
  interface EndpointInfo {
    method: string;
    path: string;
    framework: string;
  }
  ```

- Use async/await over callbacks
  ```typescript
  // ✅ Good
  async function scanWorkspace(): Promise<Endpoint[]> {
    const files = await findGoFiles();
    return await parseFiles(files);
  }
  ```

- Handle errors properly
  ```typescript
  try {
    const result = await riskyOperation();
    return result;
  } catch (error) {
    logger.error('Operation failed', error);
    throw new Error('User-friendly message');
  }
  ```

### Linting

Run ESLint to check code style:

```bash
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

---

## Submitting Changes

### Before Submitting

1. **Test thoroughly** - Verify all features work
2. **Run linter** - `npm run lint`
3. **Compile successfully** - `npm run compile`
4. **Update documentation** - If adding features, update relevant docs
5. **Write clear commit messages** - Follow conventional commits format

### Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(parser): add support for Chi framework

Added Chi router detection to the Go parser. Updated regex patterns
to match Chi's routing syntax.

Closes #42
```

```
fix(webview): prevent duplicate endpoint suggestions

Fixed issue where endpoints were appearing twice in auto-suggest
dropdown when using both annotations and auto-detection.

Fixes #38
```

### Creating a Pull Request

1. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Open a Pull Request** on GitHub

3. **Fill out the PR template**:
   - Description of changes
   - Why the change is needed
   - How to test the changes
   - Screenshots (if UI changes)

4. **Wait for review** - Address any feedback from maintainers

---

## Architecture Overview

### Extension Lifecycle

1. **Activation** (`extension.ts`)
   - Extension activates when a Go file is opened
   - Commands are registered
   - Services are initialized

2. **Command Execution**
   - User triggers a command (e.g., "Test API Endpoint")
   - Command handler executes
   - Logic coordinates between services

3. **Endpoint Detection** (`parser/goParser.ts`)
   - Reads Go source code
   - Parses for endpoint definitions
   - Extracts struct information

4. **Webview Panel** (`webview/panel.ts`)
   - Creates and manages webview
   - Handles messages from webview UI
   - Sends data to webview

5. **Auto-Suggest** (`webview/endpointSuggestionService.ts`)
   - Scans workspace for endpoints
   - Provides filtered suggestions
   - Generates request bodies

### Message Passing

Extension ↔ Webview communication uses `postMessage`:

**Extension → Webview:**
```typescript
panel.webview.postMessage({
  command: 'suggestions',
  data: endpoints
});
```

**Webview → Extension:**
```javascript
vscode.postMessage({
  command: 'sendRequest',
  method: 'POST',
  url: '/api/users',
  body: { ... }
});
```

---

## Feature Development Guide

### Adding a New Framework

To add support for a new web framework:

1. **Update `goParser.ts`**:
   ```typescript
   // Add regex pattern for the framework
   const chiPattern = /r\.(Get|Post|Put|Delete|Patch)\s*\(\s*["']([^"']+)["']\s*,/;
   
   // Add to detectRoutes function
   if (line.match(chiPattern)) {
     // Extract method and path
     // Add to endpoints array
   }
   ```

2. **Update documentation**:
   - Add framework to README.md
   - Create example file in `examples/`

3. **Test**:
   - Create test Go project with the framework
   - Verify detection works

### Adding a New Feature

Example: Adding JWT token management

1. **Plan the feature**:
   - What problem does it solve?
   - How will users interact with it?
   - What components need to change?

2. **Update UI** (`webview/ui/index.html`):
   - Add UI elements (input field, button, etc.)
   - Add event listeners
   - Add message handlers

3. **Update extension logic** (`webview/panel.ts` or new service):
   - Handle messages from webview
   - Implement business logic
   - Store/retrieve data as needed

4. **Update documentation**:
   - Add to USER_GUIDE.md
   - Create detailed docs in `docs/`

5. **Test thoroughly**

---

## Release Process

### Versioning

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR** version for incompatible API changes
- **MINOR** version for new features (backward compatible)
- **PATCH** version for bug fixes

### Creating a Release

1. **Update version** in `package.json`

2. **Update CHANGELOG** (create if doesn't exist)

3. **Commit changes**:
   ```bash
   git commit -m "chore: bump version to 1.2.0"
   ```

4. **Create tag**:
   ```bash
   git tag v1.2.0
   git push origin v1.2.0
   ```

5. **Package extension**:
   ```bash
   npx vsce package
   ```

6. **Publish to marketplace**:
   ```bash
   npx vsce publish
   ```

---

## Getting Help

### Resources

- **VS Code Extension API**: https://code.visualstudio.com/api
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Project Documentation**: `docs/` folder

### Questions?

- Open an issue on GitHub
- Reach out to maintainers

---

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow
- Focus on what's best for the community

---

Thank you for contributing to GoHit! 🚀
