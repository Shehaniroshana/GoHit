# GoHit Project Overview

## What is GoHit?

**GoHit** is a VS Code extension that allows developers to test Go API endpoints directly from their code editor. It eliminates the need to switch to external tools like Postman or Insomnia, keeping developers in their flow and testing faster.

---

## Project Information

- **Name**: GoHit
- **Version**: 0.1.0
- **License**: MIT
- **Author**: Shehaniroshana
- **Category**: VS Code Extension, API Testing, Go Development
- **Repository**: https://github.com/Shehaniroshana/GoHit

---

## Key Features

### 1. **Automatic Handler Detection**
GoHit automatically detects API handlers in your Go code for all major web frameworks:
- **net/http** - Go's standard library
- **Gin** - Most popular Go web framework
- **Fiber** - Express-inspired Go framework
- **Echo** - High-performance Go framework

### 2. **Annotation System**
For 100% reliable endpoint detection, use simple `@gohit` annotations:
```go
// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) { ... }
```

### 3. **Intelligent Auto-Suggest**
- Real-time endpoint suggestions as you type
- Color-coded HTTP methods for quick identification
- Framework badges showing where endpoints are defined
- Full keyboard navigation support

### 4. **Smart Request Body Generation**
- Analyzes Go struct definitions
- Automatically generates example JSON request bodies
- Supports cross-package DTOs (e.g., `dto.CreateUserRequest`)
- Detects JSON tags and generates appropriate sample values

### 5. **Environment Management**
- Switch between multiple environments (local, dev, staging, production)
- Pre-configured base URLs for each environment
- Quick environment switching from the panel or command palette

### 6. **Inline Testing**
- Test endpoints without leaving VS Code
- Send HTTP requests with custom headers and body
- View formatted responses with status codes and timing
- No external tools required

---

## Architecture

### Technology Stack

**Frontend (Webview)**:
- HTML5
- CSS3
- Vanilla JavaScript
- VS Code Webview API

**Backend (Extension)**:
- TypeScript
- Node.js
- VS Code Extension API
- Axios (HTTP client)

### Project Structure

```
GoHit/
├── .vscode/              # VS Code configurations
├── docs/                 # Feature documentation
├── examples/             # Example Go projects for testing
├── src/                  # Source code
│   ├── extension.ts      # Extension entry point
│   ├── client/           # HTTP client
│   ├── parser/           # Go code parsers
│   ├── services/         # Business logic
│   ├── utils/            # Utilities
│   └── webview/          # Webview panel & UI
├── out/                  # Compiled JavaScript
├── package.json          # Extension manifest
├── tsconfig.json         # TypeScript config
├── README.md             # Main documentation
├── USER_GUIDE.md         # User documentation
└── CONTRIBUTING.md       # Developer documentation
```

### Core Components

#### 1. Extension (src/extension.ts)
- Entry point for the VS Code extension
- Registers commands and activation events
- Manages extension lifecycle

#### 2. Go Parser (src/parser/goParser.ts)
- Parses Go source code
- Detects endpoint definitions using regex patterns
- Extracts struct information for body generation
- Supports annotation-based detection

#### 3. Webview Panel (src/webview/panel.ts)
- Creates and manages the API tester panel
- Handles communication between extension and UI
- Coordinates endpoint detection and suggestions
- Sends HTTP requests via the HTTP client

#### 4. Endpoint Suggestion Service (src/webview/endpointSuggestionService.ts)
- Scans entire workspace for Go files
- Collects all endpoints from all frameworks
- Provides filtered suggestions based on user input
- Generates request body examples from struct definitions

#### 5. HTTP Client (src/client/httpClient.ts)
- Sends HTTP requests to API endpoints
- Handles different HTTP methods (GET, POST, PUT, DELETE, etc.)
- Manages headers and request bodies
- Returns formatted responses

#### 6. Webview UI (src/webview/ui/index.html)
- User interface for the API tester
- Auto-suggest dropdown with keyboard navigation
- Request/response panels
- Environment selector

---

## How It Works

### Workflow

```
1. User opens GoHit panel
   ↓
2. Extension scans workspace for Go files
   ↓
3. Parser extracts endpoint definitions
   ↓
4. User types in URL field
   ↓
5. Suggestions are filtered and displayed
   ↓
6. User selects an endpoint
   ↓
7. URL, method, and body are auto-filled
   ↓
8. User clicks "Send Request"
   ↓
9. HTTP client sends request
   ↓
10. Response is displayed in the panel
```

### Endpoint Detection

GoHit uses two methods for detecting endpoints:

**1. Annotation-based (Highest Priority)**
```go
// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) { ... }
```
- Most reliable method
- Works with any project structure
- Explicit control over what's detected

**2. Auto-detection (Fallback)**
- Regex-based parsing of routing code
- Supports Gin, Fiber, Echo, net/http
- Works without annotations
- May miss complex routing patterns

### Request Body Generation

1. **Annotation specifies struct**: `// @gohit POST /api/users CreateUserRequest`
2. **Parser searches workspace** for struct definition
3. **Struct is analyzed** for fields and JSON tags
4. **Sample values are generated** based on data types:
   - `string` → `"example"`
   - `int` → `0` or `42`
   - `bool` → `true`
   - `float` → `0.0` or `3.14`
   - Arrays/slices → `[]`
   - Nested structs → Recursively generated

Example struct:
```go
type CreateUserRequest struct {
    Name  string `json:"name" binding:"required"`
    Email string `json:"email" binding:"required,email"`
    Age   int    `json:"age"`
}
```

Generated body:
```json
{
  "name": "example",
  "email": "example",
  "age": 0
}
```

---

## Installation & Setup

### For Users

**Prerequisites**:
- VS Code 1.85.0+
- Go project with supported frameworks

**Installation** (when published):
1. Open VS Code Extensions (`Ctrl+Shift+X`)
2. Search for "GoHit"
3. Click Install

**Manual Installation**:
1. Download `.vsix` file from releases
2. `Extensions → ... → Install from VSIX`

### For Developers

**Prerequisites**:
- Node.js 16+
- npm 8+
- VS Code 1.85.0+
- Go 1.18+ (for testing)
- Git

**Setup**:
```bash
# Clone repository
git clone https://github.com/Shehaniroshana/GoHit.git
cd GoHit

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in development
# Press F5 in VS Code
```

---

## Configuration

### Environment Configuration

Add to VS Code `settings.json`:

```json
{
  "gohit.environments": [
    {
      "name": "local",
      "baseUrl": "http://localhost:8080"
    },
    {
      "name": "dev",
      "baseUrl": "https://api-dev.example.com"
    },
    {
      "name": "staging",
      "baseUrl": "https://api-staging.example.com"
    },
    {
      "name": "production",
      "baseUrl": "https://api.example.com"
    }
  ],
  "gohit.activeEnvironment": "local"
}
```

### Extension Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `gohit.environments` | Array | `[{name: "local", baseUrl: "http://localhost:8080"}]` | List of environment configurations |
| `gohit.activeEnvironment` | String | `"local"` | Currently active environment |

---

## Usage Examples

### Example 1: Simple GET Request

```go
// @gohit GET /api/users
func ListUsers(c *gin.Context) {
    users := []User{...}
    c.JSON(200, users)
}
```

**Steps**:
1. Right-click on function → "GoHit: Test API Endpoint"
2. Click "Send Request"
3. View JSON response

### Example 2: POST Request with Body

```go
type CreateUserRequest struct {
    Name  string `json:"name"`
    Email string `json:"email"`
}

// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)
    // Create user logic
    c.JSON(201, gin.H{"id": 1, "name": req.Name})
}
```

**Steps**:
1. Right-click on function → "GoHit: Test API Endpoint"
2. Body is auto-filled with example JSON
3. Modify body values as needed
4. Click "Send Request"
5. View response

### Example 3: Cross-Package DTOs

```go
package handlers

import "myapp/internal/dto"

// @gohit POST /api/products dto.CreateProductRequest
func CreateProduct(c *gin.Context) {
    var req dto.CreateProductRequest
    c.ShouldBindJSON(&req)
    // Logic here
}
```

**Steps**:
1. GoHit finds `CreateProductRequest` in `internal/dto` package
2. Auto-generates request body
3. Test as normal

---

## Supported HTTP Methods

- GET
- POST
- PUT
- PATCH
- DELETE
- OPTIONS
- HEAD

---

## Supported Frameworks

### 1. net/http (Standard Library)

**Detection pattern**:
```go
http.HandleFunc("/api/users", handleUsers)
http.Handle("/api/products", productHandler)
```

### 2. Gin

**Detection pattern**:
```go
r.GET("/api/users", getUsers)
r.POST("/api/users", createUser)
r.PUT("/api/users/:id", updateUser)
r.DELETE("/api/users/:id", deleteUser)
```

### 3. Fiber

**Detection pattern**:
```go
app.Get("/api/users", getUsers)
app.Post("/api/users", createUser)
app.Put("/api/users/:id", updateUser)
app.Delete("/api/users/:id", deleteUser)
```

### 4. Echo

**Detection pattern**:
```go
e.GET("/api/users", getUsers)
e.POST("/api/users", createUser)
e.PUT("/api/users/:id", updateUser)
e.DELETE("/api/users/:id", deleteUser)
```

---

## Development

### Build Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Lint code
npm run lint

# Package extension
npx vsce package
```

### Testing

**Manual testing**:
1. Press F5 in VS Code to start Extension Development Host
2. Open `examples/` folder
3. Test with example Go files
4. Run example servers and send real requests

**Test checklist**:
- [ ] Endpoint detection (all frameworks)
- [ ] Annotation parsing
- [ ] Auto-suggest
- [ ] Body generation
- [ ] Environment switching
- [ ] HTTP requests
- [ ] Error handling
- [ ] UI responsiveness

---

## Roadmap

### Version 0.2.0 (Planned)
- [ ] JWT token auto-extraction from responses
- [ ] JWT token auto-injection into requests
- [ ] Request history tracking
- [ ] Recent requests suggestions

### Version 0.3.0 (Planned)
- [ ] Collection management (save/organize requests)
- [ ] Request favorites
- [ ] Environment variables support

### Future Versions
- [ ] Code generation from OpenAPI/Swagger specs
- [ ] GraphQL support
- [ ] WebSocket testing
- [ ] Response validation and assertions
- [ ] Test script execution
- [ ] Mock server integration

---

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Ways to Contribute

- 🐛 Report bugs
- 💡 Suggest features
- 📝 Improve documentation
- 🔧 Submit pull requests
- ⭐ Star the project on GitHub

---

## Resources

### Documentation

- **[README.md](README.md)** - Quick overview and getting started
- **[USER_GUIDE.md](USER_GUIDE.md)** - Complete user guide
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Developer guide
- **[docs/ANNOTATIONS.md](docs/ANNOTATIONS.md)** - Annotation system documentation
- **[docs/AUTO_SUGGEST_FEATURE.md](docs/AUTO_SUGGEST_FEATURE.md)** - Auto-suggest feature details
- **[docs/BODY_EXAMPLE_FEATURE.md](docs/BODY_EXAMPLE_FEATURE.md)** - Request body generation details
- **[docs/TROUBLESHOOTING_DTO.md](docs/TROUBLESHOOTING_DTO.md)** - Troubleshooting guide

### Examples

- **examples/gin-example.go** - Gin framework example
- **examples/fiber-example.go** - Fiber framework example
- **examples/echo-example.go** - Echo framework example
- **examples/nethttp-example.go** - net/http example
- **examples/real-world-project/** - Complex project example

---

## License

MIT License - See [LICENSE](LICENSE) file for details

---

## Acknowledgments

Built with ❤️ for the Go community

Thanks to:
- VS Code Extension API team
- The Go programming language team
- Framework maintainers (Gin, Fiber, Echo)
- All contributors and users

---

## Contact & Support

- **GitHub**: https://github.com/Shehaniroshana/GoHit
- **Issues**: https://github.com/Shehaniroshana/GoHit/issues
- **Documentation**: [docs/](docs/)

---

**Enjoy testing your APIs faster with GoHit!** 🚀
