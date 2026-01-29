# Troubleshooting DTO Detection

## Problem: "Cannot find the right DTO"

If GoHit isn't finding your request body DTOs, here's how to fix it:

### Quick Fix: Use Simple Struct Names

Instead of:
```go
// @gohit POST /api/users pkg.subpkg.CreateUserRequest
```

Use just the struct name:
```go
// @gohit POST /api/users CreateUserRequest
```

GoHit will automatically search your entire workspace for any struct named `CreateUserRequest`, regardless of package.

## How Struct Finding Works

GoHit uses **5 fallback strategies** to find your struct:

### 1. Exact Match (Best)
```go
// Annotation
// @gohit POST /api/users CreateUserRequest

// Struct (anywhere in workspace)
type CreateUserRequest struct {
    Name string `json:"name"`
}
```
✅ Perfect match

### 2. Case-Insensitive Match
```go
// Annotation
// @gohit POST /api/users createuserrequest

// Struct
type CreateUserRequest struct { ...}
```
✅ Still works!

### 3. Partial Match
```go
// Annotation  
// @gohit POST /api/products CreateProduct

// Any of these will match:
type CreateProductRequest struct { ...}
type CreateProductDTO struct { ...}
type CreateProductInput struct { ...}
type ProductCreate struct { ...}
```
✅ Matches if either contains the other

### 4. Fuzzy Match (Suffix Stripping)
```go
// Annotation
// @gohit POST /api/users UserCreate

// Matches:
type UserCreateRequest struct { ...}
type UserCreateDTO struct { ...}
type UserCreateInput struct { ...}
```
✅ Ignores common suffixes (Request, DTO, Input, Req, Body, Form)

### 5. Similar Name Match
```go
// Annotation
// @gohit POST /api/auth Login

// Matches:
type LoginRequest struct { ...}
type LoginForm struct { ...}
type LoginDTO struct { ...}
```
✅ Very lenient - matches if names are similar

## Common Issues & Solutions

### Issue 1: Package-Prefixed Names

❌ **Don't do this:**
```go
// @gohit POST /api/users dto.CreateUserRequest
```

✅ **Do this:**
```go
// @gohit POST /api/users CreateUserRequest
```

Why? GoHit automatically strips package prefixes, but it's cleaner to just use the struct name.

### Issue 2: Nested Packages

If your struct is in `internal/dto/user/types.go`:
```go
package user

type CreateUserRequest struct { ...}
```

Just use:
```go
// @gohit POST /api/users CreateUserRequest
```

GoHit scans **all** `.go` files in your workspace.

### Issue 3: Struct Not Found At All

**Check these:**

1. **Is the file excluded from workspace?**
   - Check your `.gitignore` or workspace settings
   - GoHit only scans workspace files

2. **Is it actually a struct?**
   ```go
   // ✅ This works
   type CreateUserRequest struct {
       Name string
   }
   
   // ❌ This won't work (it's a type alias)
   type CreateUserRequest = SomeOtherType
   ```

3. **Check the Output logs:**
   - Open `View` → `Output`
   - Select "GoHit" from dropdown
   - Look for:
     ```
     [findStructInWorkspace] ✓ Found exact match: CreateUserRequest
     ```
   - Or:
     ```
     [findStructInWorkspace] ✗ No match found for "CreateUserRequest"
     ```

### Issue 4: Wrong Struct Being Used

If GoHit finds the **wrong** struct (e.g., you have multiple structs with similar names):

**Solution: Be more specific**
```go
// Instead of:
// @gohit POST /api/users Create

// Use full name:
// @gohit POST /api/users CreateUserRequest
```

## Debugging Steps

### Step 1: Check What GoHit Found

1. `Ctrl+Shift+P` → "GoHit: Open API Tester"
2. Open `View` → `Output`, select "GoHit"
3. Look for logs like:
   ```
   [ANNOTATION] Using struct CreateUserRequest from @gohit annotation
   [STRUCT SEARCH] "CreateUserRequest" not found in current file, searching workspace...
   [findStructInWorkspace] Searching for "CreateUserRequest" (clean: "CreateUserRequest") in 15 files
   [findStructInWorkspace] ✓ EXACT match: CreateUserRequest in d:\project\dto\user.go
   ✓ Generated body for POST /api/users from CreateUserRequest
   ```

### Step 2: If "No match found"

The logs will show:
```
[findStructInWorkspace] ✗ No match found for "CreateUserRequest" using any strategy
```

**Solutions:**
1. Make sure the struct file is in your workspace
2. Try a simpler name (just the core part, like "User" instead of "CreateUserRequest")
3. Check for typos in your annotation

### Step 3: If Match Found But Wrong Struct

The logs will show:
```
[findStructInWorkspace] ✓ Found fuzzy match: UserRequest for "CreateUser"
```

**Solution:** Use the EXACT struct name in your annotation.

## Best Practices

### ✅ DO:
```go
// Simple, clear struct names
// @gohit POST /api/users CreateUserRequest
// @gohit PUT /api/users/:id UpdateUserRequest
// @gohit POST /api/products CreateProductDTO

func CreateUser(c *gin.Context) {
    var req CreateUserRequest
    c.ShouldBindJSON(&req)
    // ...
}
```

### ❌ DON'T:
```go
// Package prefixes (unnecessary)
// @gohit POST /api/users dto.request.CreateUserRequest

// Ambiguous names
// @gohit POST /api/users User  // Too vague!

// Wrong struct type
// @gohit POST /api/users UserResponse  // That's a response, not request!
```

## Still Not Working?

1. **Reload VS Code**: `Ctrl+Shift+P` → "Reload Window"
2. **Check Output logs**: View the exact error
3. **Try the simple example project**: `examples/real-world-project/`
4. **Create an issue** with:
   - Your annotation
   - Your struct definition
   - The Output logs

The fuzzy matching is VERY lenient, so if it's still not finding your struct, there's likely a workspace or file scanning issue.
