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


## Features

### Workspace Route Detection
GoHit automatically identifies API endpoints across your entire workspace, supporting multiple Go frameworks:
- **Gin** - Nested group and method detection
- **Fiber** - Support for v2 groups and PascalCase methods
- **Echo** - Context-aware route extraction
- **net/http** - Standard library handler detection
- **WebSockets** - Integrated terminal with real-time logging

### Integrated User Interface
A modern, space-efficient interface built directly into VS Code:
- **Horizontal Header**: streamlined layout for request configuration
- **Full-Height Sidebar**: Unified navigation for all project routes
- **Copy as cURL**: Quick export of configured requests
- **Native Notifications**: Integrated feedback via VS Code notifications

### Intelligent Request Configuration
- **Auto-Suggest**: Real-time endpoint discovery as you type
- **Struct Analysis**: Automatic JSON body generation by scanning project structs
- **Environment Management**: Unified configuration for local, staging, and production
- **Authentication**: Native support for Bearer tokens and API keys

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

### Method 1: Zero-Config Discovery
1. Press `Ctrl+Shift+P` → **"GoHit: Open API Tester"**
2. The sidebar will automatically populate with all detected routes in your project.
3. Click a route to pre-fill the tester.
4. Click **Send Request**.

### Method 2: Precise Annotations
Use `@gohit` annotations for 100% reliable detection and automatic DTO mapping:

```go
// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)
    // Your handler logic
}
```

---

## 📖 Documentation

- 📘 **[User Guide](USER_GUIDE.md)** - Complete guide to using GoHit
- 📗 **[Annotation System](docs/ANNOTATIONS.md)** - Using `@gohit` annotations for reliable endpoint detection
- 📙 **[Contributing](CONTRIBUTING.md)** - How to contribute to GoHit

---

## 🎮 Commands

| Command | Description |
|---------|-------------|
| `GoHit: Test API Endpoint` | Open API tester at cursor position |
| `GoHit: Open API Tester` | Open API tester with auto-suggest |
| `GoHit: Manage Environments` | Configure environments |

---

## 📋 Extension Settings

| Setting | Type | Description |
|---------|------|-------------|
| `gohit.environments` | Array | Environment configurations (name + baseUrl) |
| `gohit.activeEnvironment` | String | Currently active environment name |
| `gohit.openRouterApiKey` | String | API key for AI features |

---

## 🗺️ Roadmap

- [x] Zero-config framework detection (Gin, Fiber, Echo)
- [x] WebSocket testing terminal
- [x] Advanced Auth (Bearer & API Key)
- [x] "Copy as cURL" support
- [x] AI-powered body generation from local structs
- [ ] Request history and favorites
- [ ] Collection management (like Postman)
- [ ] Code generation from OpenAPI specs
- [ ] GraphQL support
- [ ] Response validation and assertions

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

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

<div align="center">

**Enjoy testing your APIs faster with GoHit!** 🚀

⭐ Star us on GitHub if you find GoHit helpful!

</div>
