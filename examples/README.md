# GoHit Examples

This directory contains example Go files demonstrating the GoHit extension's capabilities across different frameworks.

## Files

### 1. nethttp-example.go
Standard library `net/http` example with:
- User CRUD endpoints
- Request/Response structs
- Multiple handler functions

**Test it:**
1. Open `nethttp-example.go` in VS Code
2. Place cursor on any `http.HandleFunc` line
3. Right-click → "GoHit: Test API Endpoint"

### 2. gin-example.go
Gin framework example with:
- Product REST API
- Path parameters (`:id`)
- Request validation tags
- Binding middleware

**Test it:**
1. Open `gin-example.go` in VS Code
2. Place cursor on any route definition (e.g., `r.POST("/api/products", createProduct)`)
3. Right-click → "GoHit: Test API Endpoint"

### 3. fiber-example.go
Fiber framework example with:
- Order management API
- Array fields in structs
- Multiple HTTP methods

**Test it:**
1. Open `fiber-example.go` in VS Code
2. Place cursor on any route definition (e.g., `app.Post("/api/orders", createOrder)`)
3. Right-click → "GoHit: Test API Endpoint"

### 4. echo-example.go
Echo framework example with:
- Task management API
- Complex struct definitions
- Status handling

**Test it:**
1. Open `echo-example.go` in VS Code
2. Place cursor on any route definition (e.g., `e.POST("/api/tasks", createTask)`)
3. Right-click → "GoHit: Test API Endpoint"

## Features Demonstrated

All examples demonstrate:
- ✅ Automatic endpoint detection
- ✅ HTTP method extraction
- ✅ Route path parsing
- ✅ Request body generation from structs
- ✅ Proper JSON tag handling

## Usage Tips

1. **Testing GET endpoints**: No request body needed, just send the request
2. **Testing POST/PUT endpoints**: The extension auto-generates JSON from struct definitions
3. **Path parameters**: Replace `:id` or `*param` with actual values in the URL
4. **Headers**: Add custom headers using the "Add Header" button
5. **Environments**: Switch between local/dev/staging using the environment dropdown

## Running the Examples

To actually run these servers:

```bash
# For net/http example
go run examples/nethttp-example.go

# For Gin example (install dependency first)
go get -u github.com/gin-gonic/gin
go run examples/gin-example.go

# For Fiber example (install dependency first)
go get -u github.com/gofiber/fiber/v2
go run examples/fiber-example.go

# For Echo example (install dependency first)
go get -u github.com/labstack/echo/v4
go run examples/echo-example.go
```

All servers run on `http://localhost:8080` by default.
