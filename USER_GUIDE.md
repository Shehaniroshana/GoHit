# GoHit User Guide

Welcome to **GoHit** - the ultimate VS Code extension for testing Go API endpoints directly from your code editor!

## Table of Contents

1. [Getting Started](#getting-started)
2. [Features Overview](#features-overview)
3. [Basic Usage](#basic-usage)
4. [Annotation System](#annotation-system)
5. [Auto-Suggest Feature](#auto-suggest-feature)
6. [Environment Management](#environment-management)
7. [Supported Frameworks](#supported-frameworks)
8. [Best Practices](#best-practices)
9. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Prerequisites

- **VS Code** 1.85.0 or higher
- **Go project** using one of the supported frameworks (net/http, Gin, Fiber, Echo)

### Installation

1. Install the GoHit extension from the VS Code Marketplace
2. Open any Go project in VS Code
3. You're ready to test your APIs!

### Quick Start

**Method 1: Test from Code**
1. Open any Go file with API handlers
2. Place your cursor on a route/handler line
3. Right-click → Select **"GoHit: Test API Endpoint"**
4. The API tester panel opens with auto-detected endpoint information

**Method 2: Use Command Palette**
1. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
2. Type **"GoHit: Open API Tester"**
3. Start typing in the URL field to see endpoint suggestions

---

## Features Overview

### 🎯 Automatic Handler Detection
GoHit automatically detects API handlers in your code for:
- **net/http** - Standard library handlers
- **Gin** - gin.Engine router methods
- **Fiber** - fiber.App route methods
- **Echo** - echo.Echo route methods

### 🚀 Inline API Testing
Test endpoints without leaving VS Code or switching to external tools like Postman or Insomnia.

### 🔍 Intelligent Auto-Suggest
As you type in the URL field, GoHit suggests available endpoints with:
- Color-coded HTTP methods
- Framework identification
- Automatic request body generation

### 📝 Smart Request Body Generation
GoHit analyzes your Go structs and automatically generates example JSON request bodies with appropriate data types and sample values.

### 🌍 Environment Management
Easily switch between different environments (local, dev, staging, production) with pre-configured base URLs.

### ⚡ Fast & Integrated
Stay in your development flow - no context switching required!

---

## Basic Usage

### Testing an Endpoint

#### Step 1: Open the API Tester
- **From Code**: Right-click on a handler → **"GoHit: Test API Endpoint"**
- **From Command Palette**: `Ctrl+Shift+P` → **"GoHit: Open API Tester"**

#### Step 2: Configure Request
The API tester panel shows:
- **Environment**: Select from configured environments (local, dev, staging, etc.)
- **HTTP Method**: Automatically detected or manually selected (GET, POST, PUT, DELETE, etc.)
- **URL**: Endpoint path (auto-filled if detected)
- **Headers**: Add custom headers (JSON format)
- **Body**: Request body (auto-generated for POST/PUT/PATCH)

#### Step 3: Send Request
Click the **Send Request** button to execute the HTTP request.

#### Step 4: View Response
The response panel displays:
- **Status Code**: HTTP response status
- **Response Time**: Request duration
- **Headers**: Response headers
- **Body**: Response body (formatted JSON or raw text)

### Example Workflow

```go
// File: handlers/user.go
package handlers

import "github.com/gin-gonic/gin"

type CreateUserRequest struct {
    Name  string `json:"name" binding:"required"`
    Email string `json:"email" binding:"required,email"`
    Age   int    `json:"age"`
}

// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }
    // Your logic here
    c.JSON(201, gin.H{"message": "User created"})
}
```

1. Place cursor on the function or annotation
2. Right-click → **"GoHit: Test API Endpoint"**
3. Panel opens with:
   - Method: `POST`
   - URL: `/api/users`
   - Body: Auto-generated JSON from `CreateUserRequest`
4. Click **Send Request**
5. View the response!

---

## Annotation System

### Why Use Annotations?

Auto-detecting endpoints from routing code can be complex and fragile across different project structures. **Annotations give you full control** - just add one comment line above your handler!

### Annotation Format

```go
// @gohit METHOD PATH [StructName]
func YourHandler(c *gin.Context) { ... }
```

**Parameters:**
- **METHOD**: HTTP method (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- **PATH**: Full endpoint path (e.g., `/api/users`, `/api/products/:id`)
- **StructName**: *(Optional)* Request body struct name for POST/PUT/PATCH

### Examples

#### GET Endpoint (No Body)
```go
// @gohit GET /api/users
func ListUsers(c *gin.Context) {
    // Handler logic
}
```

#### POST Endpoint with DTO
```go
type CreateUserRequest struct {
    Name  string `json:"name" binding:"required"`
    Email string `json:"email" binding:"required,email"`
}

// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)
    // Handler logic
}
```

#### PUT Endpoint with Path Parameter
```go
// @gohit PUT /api/users/:id UpdateUserDTO
func UpdateUser(c *gin.Context) {
    userID := c.Param("id")
    var req UpdateUserDTO
    c.ShouldBindJSON(&req)
    // Handler logic
}
```

#### DELETE Endpoint
```go
// @gohit DELETE /api/products/:id
func DeleteProduct(c *gin.Context) {
    productID := c.Param("id")
    // Handler logic
}
```

### Cross-Package DTOs

Annotations support DTOs defined in separate packages:

```go
package handlers

import "yourproject/internal/dto"

// @gohit POST /api/users dto.CreateUserRequest
func CreateUser(c *gin.Context) {
    var req dto.CreateUserRequest
    c.ShouldBindJSON(&req)
    // Handler logic
}
```

GoHit will automatically find the struct definition across your workspace!

### Benefits of Annotations

✅ **Works with ANY project structure**  
✅ **Framework agnostic** - works with any Go web framework  
✅ **Explicit control** - you define exactly what gets detected  
✅ **Simple syntax** - just one comment line  
✅ **Auto body generation** - specify struct name, get JSON automatically  
✅ **No code changes** - just comments, doesn't affect your application  

### Fallback Behavior

Don't want to use annotations? **No problem!**

- GoHit tries annotations first (highest priority)
- Falls back to auto-detection if no annotations found
- You can mix both approaches in the same project

---

## Auto-Suggest Feature

### How It Works

1. **Workspace Scanning**: GoHit scans your entire workspace for API endpoints
2. **Real-time Filtering**: As you type in the URL field, suggestions are filtered
3. **Keyboard Navigation**: Use arrow keys to navigate, Enter to select
4. **Auto-Fill**: Selected endpoint auto-fills URL, method, and request body

### Using Auto-Suggest

1. Open the GoHit API tester panel
2. **Start typing** in the URL field (e.g., `/api` or `/users`)
3. **See suggestions** - A dropdown appears with matching endpoints
4. **Navigate** - Use ↑/↓ arrow keys or mouse to select
5. **Select** - Press Enter or click to auto-fill everything
6. **Quick close** - Press Escape to dismiss suggestions

### Features

- 🎨 **Color-coded HTTP methods**
  - GET: Blue
  - POST: Green
  - PUT: Orange
  - PATCH: Cyan
  - DELETE: Red
  - OPTIONS: Purple
  - HEAD: Gray

- 🏷️ **Framework badges** - Shows which framework the endpoint uses
- ⌨️ **Full keyboard navigation** - Navigate without touching the mouse
- 🔍 **Real-time filtering** - Instant results as you type
- 📝 **Automatic body generation** - Request bodies auto-filled for POST/PUT/PATCH

### Example

Type `/api/users` and you might see:

```
🔵 GET    /api/users              [Gin]
🟢 POST   /api/users              [Gin]
🟠 PUT    /api/users/:id          [Gin]
🔴 DELETE /api/users/:id          [Gin]
🔵 GET    /api/users/profile      [Gin]
```

Select `POST /api/users` and GoHit automatically fills:
- Method: `POST`
- URL: `/api/users`
- Body: JSON example from your struct definition

---

## Environment Management

### Default Environment

GoHit comes pre-configured with a `local` environment:
```json
{
  "name": "local",
  "baseUrl": "http://localhost:8080"
}
```

### Adding New Environments

**Method 1: Via Command Palette**
1. Press `Ctrl+Shift+P`
2. Type **"GoHit: Manage Environments"**
3. Select **"Add Environment"**
4. Enter environment name (e.g., `dev`, `staging`, `production`)
5. Enter base URL (e.g., `https://api-dev.example.com`)

**Method 2: Via VS Code Settings**
1. Open VS Code Settings (`Ctrl+,`)
2. Search for **"GoHit"**
3. Edit **"Gohit: Environments"** in `settings.json`:

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

### Switching Environments

**In the API Tester Panel:**
- Use the environment dropdown at the top of the panel
- Select your desired environment

**Or via Command Palette:**
1. Press `Ctrl+Shift+P`
2. Type **"GoHit: Manage Environments"**
3. Select **"Switch Environment"**
4. Choose the environment

The selected environment's base URL will be prepended to all request URLs.

---

## Supported Frameworks

### net/http (Standard Library)

```go
http.HandleFunc("/api/users", handleUsers)
http.Handle("/api/products", productHandler)
```

### Gin

```go
r := gin.Default()
r.GET("/api/users", getUsers)
r.POST("/api/users", createUser)
r.PUT("/api/users/:id", updateUser)
r.DELETE("/api/users/:id", deleteUser)
```

### Fiber

```go
app := fiber.New()
app.Get("/api/users", getUsers)
app.Post("/api/users", createUser)
app.Put("/api/users/:id", updateUser)
app.Delete("/api/users/:id", deleteUser)
```

### Echo

```go
e := echo.New()
e.GET("/api/users", getUsers)
e.POST("/api/users", createUser)
e.PUT("/api/users/:id", updateUser)
e.DELETE("/api/users/:id", deleteUser)
```

---

## Best Practices

### 1. Use Annotations for Production Code

For reliable endpoint detection in complex projects, use `@gohit` annotations:

```go
// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) { ... }
```

### 2. Organize DTOs by Feature

```go
// User Management DTOs
type CreateUserRequest struct { ... }
type UpdateUserRequest struct { ... }
type UserResponse struct { ... }

// Product Management DTOs
type CreateProductRequest struct { ... }
type UpdateProductRequest struct { ... }
```

### 3. Use Meaningful Struct Names

```go
// ✅ Clear naming
type CreateProductRequest struct { ... }
type UpdateProductInput struct { ... }

// ❌ Unclear naming
type Req struct { ... }
type Data struct { ... }
```

### 4. Keep DTOs Near Handlers

```go
// DTO defined right above handler
type LoginRequest struct {
    Email    string `json:"email" binding:"required,email"`
    Password string `json:"password" binding:"required"`
}

// @gohit POST /auth/login LoginRequest
func Login(c *gin.Context) {
    var req LoginRequest
    c.ShouldBindJSON(&req)
    // ...
}
```

### 5. Configure Multiple Environments

Set up environments for your entire development workflow:
- `local` - Local development
- `dev` - Development server
- `staging` - Staging environment
- `production` - Production (use carefully!)

---

## Troubleshooting

### Extension Not Activating

**Issue**: GoHit doesn't appear in the command palette or context menu.

**Solutions**:
- Ensure you're working in a Go project
- Open a `.go` file to activate the extension
- Check the Output panel: `View → Output → Select "GoHit"`
- Reload VS Code: `Ctrl+Shift+P` → "Reload Window"

### Endpoint Not Detected

**Issue**: GoHit doesn't detect your endpoint when you right-click.

**Solutions**:
- **Use Annotations**: Add `// @gohit METHOD PATH` above your handler
- Ensure your cursor is on the handler function line
- Verify the framework syntax matches supported patterns
- Check the logger output for details

### Auto-Suggest Not Working

**Issue**: No suggestions appear when typing in the URL field.

**Solutions**:
- Open the API tester: `Ctrl+Shift+P` → "GoHit: Open API Tester"
- Wait a moment for workspace scanning to complete
- Ensure you have Go files with endpoints in your workspace
- Try refreshing: reload the VS Code window

### Request Body Not Generated

**Issue**: Request body is empty for POST/PUT/PATCH requests.

**Solutions**:
- Add the struct name to your annotation: `// @gohit POST /api/users CreateUserRequest`
- Ensure the struct is defined in the workspace
- For cross-package DTOs, include the package: `dto.CreateUserRequest`
- Check that the struct has JSON tags: `json:"fieldName"`

### Connection Failed

**Issue**: Request fails with "Connection refused" or timeout.

**Solutions**:
- Ensure your Go server is running
- Verify the port matches the environment's base URL
- Check firewall settings
- Try using `localhost` instead of `127.0.0.1` or vice versa
- Ensure the endpoint path is correct

### JSON Parsing Error

**Issue**: Response shows "JSON Parse Error" or similar.

**Solutions**:
- Check if the response is actually JSON
- Verify your server is returning proper JSON with `Content-Type: application/json`
- Look at the raw response in the Response panel

### Struct Not Found

**Issue**: GoHit says "Struct not found" when using annotations.

**Solutions**:
- Ensure the struct is defined somewhere in your workspace
- Use the full package name if it's in a different package: `dto.CreateUserRequest`
- Check for typos in the struct name
- Ensure the file containing the struct is not in `node_modules`, `vendor`, or ignored directories

---

## Getting Help

### Resources

- **Documentation Folder**: Check the `docs/` folder for detailed feature documentation
- **Examples**: See the `examples/` folder for working code samples
- **GitHub Issues**: Report bugs or request features

### Logs

To view debug information:
1. Open the Output panel: `View → Output`
2. Select **"GoHit"** from the dropdown
3. Review logs for errors or warnings

---

## Next Steps

Now that you know how to use GoHit:

1. ✅ Add `@gohit` annotations to your handlers
2. ✅ Configure your environments
3. ✅ Start testing your APIs without leaving VS Code!

**Happy Testing! 🚀**
