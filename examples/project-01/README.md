# project-01

project-01/
├── cmd/
│   └── server/
│       └── main.go              # Entry point
├── internal/
│   ├── dto/
│   │   └── dto.go               # Request/Response DTOs
│   ├── handlers/
│   │   ├── user_handler.go      # User CRUD with @gohit annotations
│   │   ├── product_handler.go   # Product CRUD with @gohit annotations
│   │   └── order_handler.go     # Order CRUD with @gohit annotations
│   ├── middleware/
│   │   └── auth.go              # Auth & authorization middleware
│   └── routes/
│       └── routes.go            # Route setup with middleware chains
└── go.mod
```

## Features Demonstrated

✅ **Proper Package Structure** - DTOs, handlers, middleware, routes in separate packages  
✅ **@gohit Annotations** - All handlers annotated for easy testing  
✅ **Cross-Package DTOs** - Handlers reference `dto.CreateUserRequest` from another package  
✅ **Middleware Chains** - Auth, AdminOnly middleware on routes  
✅ **RESTful API** - Users, Products, Orders with full CRUD  

## Testing with GoHit

### 1. Open Any Handler File

Open any file in `internal/handlers/` (e.g., `user_handler.go`)

### 2. Use GoHit Commands

**Option A: Direct Testing**
- Place cursor on a handler function (e.g., `CreateUser`)
- Right-click → "GoHit: Test API Endpoint"
- Even though routes are defined elsewhere, `@gohit` annotation makes it work!

**Option B: Auto-Suggest**
- Press `Ctrl+Shift+P` → "GoHit: Open API Tester"
- Start typing in URL field: `/api`
- See all annotated endpoints from across the project!

### 3. What You'll See

The extension will detect **all 16 endpoints** across 3 handlers:

**Users** (from `user_handler.go`):
- `POST /api/v1/users` → Auto-fills `CreateUserRequest` body
- `GET /api/v1/users`
- `GET /api/v1/users/:id`
- `PUT /api/v1/users/:id` → Auto-fills `UpdateUserRequest` body
- `DELETE /api/v1/users/:id`

**Products** (from `product_handler.go`):
- `POST /api/v1/products` → Auto-fills `CreateProductRequest` body
- `GET /api/v1/products`
- `GET /api/v1/products/:id`
- `PUT /api/v1/products/:id` → Auto-fills `UpdateProductRequest` body
- `DELETE /api/v1/products/:id`

**Orders** (from `order_handler.go`):
- `POST /api/v1/orders` → Auto-fills `CreateOrderRequest` body (with nested items!)
- `GET /api/v1/orders`
- `GET /api/v1/orders/:id`
- `PATCH /api/v1/orders/:id/status`

## Example: Testing Create User

1. Open `internal/handlers/user_handler.go`
2. Cursor on `CreateUser` function
3. Right-click → "GoHit: Test API Endpoint"
4. **Body is auto-filled** with:
   ```json
   {
     "name": "string",
     "email": "string",
     "password": "string",
     "role": "string"
   }
   ```
5. Modify values:
   ```json
   {
     "name": "John Doe",
     "email": "john@example.com",
     "password": "secure123",
     "role": "admin"
   }
   ```
6. Click **Send Request**

## Why This Works Anywhere

Notice that:
- **Routes are defined** in `routes/routes.go`
- **Handlers are in** `handlers/` package
- **DTOs are in** `dto/` package
- **Middleware chains** `Auth()`, `AdminOnly()` are used

Despite this complex structure, `@gohit` annotations make testing trivial!

## Key Takeaway

```go
// Just add this comment above your handler:
// @gohit POST /api/v1/users dto.CreateUserRequest

func (h *UserHandler) CreateUser(c *gin.Context) {
    // ... handler code
}
```

**That's it!** GoHit will:
1. ✅ Detect the endpoint
2. ✅ Find the DTO struct (even in different package)
3. ✅ Generate the JSON request body
4. ✅ Make it available in auto-suggest

## Running the Server (Optional)

If you want to actually test against a running server:

```bash
cd examples/real-world-project
go mod tidy
go run cmd/server/main.go
```

Server starts on `http://localhost:8080`

Then in GoHit:
1. Set environment to `http://localhost:8080`
2. Test any endpoint
3. See real responses!

## Compare with Non-Annotated Version

Without `@gohit` annotations, GoHit would need to:
- Parse `routes/routes.go` to find route definitions
- Match handler names across files
- Trace back to find which DTO is used
- Handle middleware chains

**With annotations**: It just works! You tell it exactly what you want tested.
