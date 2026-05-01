<div align="center">

# 🚀 GoHit

**Test Go API Endpoints Directly from VS Code**

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/Shehaniroshana/GoHit)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![VS Code](https://img.shields.io/badge/VS%20Code-1.85.0+-blue.svg)](https://code.visualstudio.com/)

Test your Go API endpoints without leaving your editor. No more switching to Postman or Insomnia!

[Features](#features) • [Installation](#installation) • [Quick Start](#quick-start) • [Documentation](#documentation) • [Contributing](#contributing)

</div>

---
<div align="center">

<img width="1754" height="987" alt="image" src="https://github.com/user-attachments/assets/d799dfc8-8778-4aa1-97cb-a78d5372d8c7" />

</div>


## ✨ Features

### 🎯 Automatic Handler Detection
Detects Go API handlers in all major frameworks:
- **net/http** - Standard library
- **Gin** - Most popular Go web framework
- **Fiber** - Express-inspired framework
- **Echo** - High-performance framework
- **🌐 WebSockets** - Automatic detection of WS routes

### 🚀 Inline API Testing
Test endpoints directly from your code editor with a **premium full-height Tester UI** - no external tools needed!

### 🔍 Intelligent Auto-Suggest
Smart endpoint suggestions with:
- 🎨 Color-coded HTTP methods (**GET, POST, WS, etc.**)
- 🏷️ Framework identification badges
- ⌨️ Full keyboard navigation
- 📝 **Automatic request body generation from Go structs**

### 🤖 AI-Powered Generation
Generate request bodies using the latest AI models:
- **OpenRouter Integration**: Access GPT-4, Claude 3, and more.
- **🎁 Free Models**: Built-in support for free AI models.
- **Custom Prompts**: Define "Custom Skills" to guide AI generation.

### 🌍 Advanced Environment Management
- **Environment UI**: Manage local, staging, and production URLs directly in the extension.
- **Dynamic Switching**: Seamlessly toggle between environments in the address bar.

---

## 📦 Installation

### From VS Code Marketplace (Coming Soon)
1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "GoHit"
4. Click **Install**

### Manual Installation
1. Download the `.vsix` file from [Releases](https://github.com/Shehaniroshana/GoHit/releases)
2. Open VS Code
3. Go to Extensions (`Ctrl+Shift+X`)
4. Click the `...` menu → **Install from VSIX...**
5. Select the downloaded `.vsix` file

---

## 🚀 Quick Start

### Method 1: Test from Code
```go
// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)
    // Your handler logic
}
```

1. Place cursor on the function
2. **Right-click** → **"GoHit: Test API Endpoint"**
3. Panel opens with auto-filled method, URL, and request body
4. Click **Send Request**
5. View the response!

### Method 2: Use Auto-Suggest
1. Press `Ctrl+Shift+P` → **"GoHit: Open API Tester"**
2. Start typing in the URL field (e.g., `/api`)
3. Select an endpoint from suggestions
4. Click **Send Request**

---

## 📖 Documentation

### Core Guides

- 📘 **[User Guide](USER_GUIDE.md)** - Complete guide to using GoHit
- 📗 **[Annotation System](docs/ANNOTATIONS.md)** - Using `@gohit` annotations for reliable endpoint detection
- 📙 **[Contributing](CONTRIBUTING.md)** - How to contribute to GoHit

### Feature Documentation

- [Auto-Suggest Feature](docs/AUTO_SUGGEST_FEATURE.md)
- [Request Body Generation](docs/BODY_EXAMPLE_FEATURE.md)
- [Troubleshooting](docs/TROUBLESHOOTING_DTO.md)

---

## 🎯 Using Annotations

For **100% reliable** endpoint detection in ANY project structure, use `@gohit` annotations:

```go
// @gohit METHOD PATH [StructName]
```

### Examples

```go
// GET endpoint - no body needed
// @gohit GET /api/users
func ListUsers(c *gin.Context) { ... }

// POST endpoint with request body
// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)
    // ...
}

// PUT endpoint with path parameter
// @gohit PUT /api/users/:id UpdateUserRequest
func UpdateUser(c *gin.Context) { ... }

// Cross-package DTOs
// @gohit POST /api/products dto.CreateProductRequest
func CreateProduct(c *gin.Context) { ... }
```

### Why Annotations?

✅ Works with **any project structure**  
✅ Works with **any framework**  
✅ **Explicit control** - you define what gets detected  
✅ **Auto body generation** - specify struct name, get JSON automatically  
✅ **No code changes** - just comments  
✅ **Fallback support** - still works with auto-detection  

---

## ⚙️ Configuration

### Configure Environments

Add to your VS Code `settings.json`:

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

---

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `GoHit: Test API Endpoint` | Open API tester at cursor position |
| `GoHit: Open API Tester` | Open API tester with auto-suggest |
| `GoHit: Manage Environments` | Configure environments |

---

## 🛠️ Requirements

- **VS Code** 1.85.0 or higher
- **Go project** using one of the supported frameworks

---

## 📋 Extension Settings

| Setting | Type | Description |
|---------|------|-------------|
| `gohit.environments` | Array | Environment configurations (name + baseUrl) |
| `gohit.activeEnvironment` | String | Currently active environment name |

---

## 🗺️ Roadmap

- [x] WebSocket testing
- [x] AI-powered body generation
- [x] Environment management UI
- [ ] JWT token auto-extraction and injection
- [ ] Request history and favorites
- [ ] Collection management (like Postman)
- [ ] Code generation from OpenAPI specs
- [ ] GraphQL support
- [ ] Response validation and assertions

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Setup

```bash
# Clone the repository
git clone https://github.com/Shehaniroshana/GoHit.git
cd GoHit

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Run in development mode
# Press F5 in VS Code to start debugging
```

---

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

Built with ❤️ for the Go community

Special thanks to:
- VS Code Extension API team
- The Go programming language team
- All framework maintainers (Gin, Fiber, Echo)

---

## 📧 Support

- 🐛 **Bug Reports**: [GitHub Issues](https://github.com/Shehaniroshana/GoHit/issues)
- 💡 **Feature Requests**: [GitHub Issues](https://github.com/Shehaniroshana/GoHit/issues)
- 📖 **Documentation**: [docs/](docs/)
- 💬 **Questions**: Open an issue with the `question` label

---

<div align="center">

**Enjoy testing your APIs faster with GoHit!** 🚀

⭐ Star us on GitHub if you find GoHit helpful!

</div>
