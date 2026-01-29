# @gohit Annotations - Simple & Reliable Endpoint Detection

## Problem Solved

Auto-detecting endpoints from routing code is complex and fragile across different projects. 
**Annotations give you full control** - just add one comment line above your handler!

## How It Works

Add a `@gohit` comment above any handler function:

```go
// @gohit METHOD PATH [StructName]
func YourHandler(c *gin.Context) { ... }
```

### Format

- **METHOD**: HTTP method (GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD)
- **PATH**: Full endpoint path (e.g., `/api/users`, `/api/products/:id`)
- **StructName**: (Optional) Request body struct name for POST/PUT/PATCH

### Examples

#### GET endpoint (no body):
```go
// @gohit GET /api/users
func ListUsers(c *gin.Context) {
    // ...
}
```

#### POST endpoint with DTO:
```go
type CreateUserRequest struct {
    Name  string `json:"name" binding:"required"`
    Email string `json:"email" binding:"required,email"`
}

// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)
    // ...
}
```

#### PUT endpoint with path parameter:
```go
// @gohit PUT /api/users/:id UpdateUserDTO
func UpdateUser(c *gin.Context) {
    var req UpdateUserDTO
    c.ShouldBindJSON(&req)
    // ...
}
```

#### DELETE endpoint:
```go
// @gohit DELETE /api/products/:id
func DeleteProduct(c *gin.Context) {
    // ...
}
```

## Benefits

✅ **Works with ANY project structure** - doesn't matter how you define routes  
✅ **Explicit control** - you define exactly what GoHit should detect  
✅ **Simple syntax** - just one comment line  
✅ **Auto body generation** - specify struct name, get JSON example automatically  
✅ **No code changes** - just comments, doesn't affect your application  
✅ **Framework agnostic** - works with Gin, Echo, Fiber, net/http, or anything  

## Fallback

Don't want to use annotations? **No problem!**

GoHit still auto-detects endpoints from routing code:
- It tries annotations first (highest priority)
- Falls back to auto-detection if no annotations found
- You can mix both approaches in the same project

## Usage

1. Add `@gohit` comment above your handlers
2. Press `Ctrl+Shift+P` → "GoHit: Open API Tester"
3. Start typing in URL field (e.g., `/api`)
4. See your annotated endpoints in the suggestions!

## Pro Tips

### Organize by feature:
```go
// User Management APIs

// @gohit POST /api/users CreateUserRequest
func CreateUser(c *gin.Context) { ... }

// @gohit GET /api/users
func ListUsers(c *gin.Context) { ... }

// @gohit PUT /api/users/:id UpdateUserRequest
func UpdateUser(c *gin.Context) { ... }
```

### Use meaningful struct names:
```go
// Clear naming convention
type CreateProductRequest struct { ... }
type UpdateProductInput struct { ... }
type DeleteProductDTO struct { ... }

// @gohit POST /api/products CreateProductRequest
// @gohit PUT /api/products/:id UpdateProductInput
// @gohit DELETE /api/products/:id
```

### Keep DTOs near handlers:
```go
// Request DTO defined right above handler
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

## See It In Action

Check out `examples/annotation-example.go` for a complete working example!
