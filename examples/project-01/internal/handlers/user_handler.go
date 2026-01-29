package handlers

import (
	"net/http"

	"github.com/example/api-server/internal/dto"
	"github.com/gin-gonic/gin"
)

type UserHandler struct {
	// In real app, you'd have service layer here
}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

// @gohit POST /api/v1/users dto.CreateUserRequest
func (h *UserHandler) CreateUser(c *gin.Context) {
	var req dto.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Mock response - in real app, you'd call service layer
	resp := dto.UserResponse{
		ID:    1,
		Name:  req.Name,
		Email: req.Email,
		Role:  req.Role,
	}

	c.JSON(http.StatusCreated, resp)
}

// @gohit GET /api/v1/users
func (h *UserHandler) ListUsers(c *gin.Context) {
	// Mock data
	users := []dto.UserResponse{
		{ID: 1, Name: "John Doe", Email: "john@example.com", Role: "admin"},
		{ID: 2, Name: "Jane Smith", Email: "jane@example.com", Role: "user"},
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

// @gohit GET /api/v1/users/:id
func (h *UserHandler) GetUser(c *gin.Context) {
	id := c.Param("id")

	// Mock data
	user := dto.UserResponse{
		ID:    1,
		Name:  "John Doe",
		Email: "john@example.com",
		Role:  "admin",
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "user": user})
}

// @gohit PUT /api/v1/users/:id dto.UpdateUserRequest
func (h *UserHandler) UpdateUser(c *gin.Context) {
	id := c.Param("id")

	var req dto.UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Mock response
	resp := dto.UserResponse{
		ID:    1,
		Name:  req.Name,
		Email: req.Email,
		Role:  req.Role,
	}

	c.JSON(http.StatusOK, gin.H{"id": id, "user": resp})
}

// @gohit DELETE /api/v1/users/:id
func (h *UserHandler) DeleteUser(c *gin.Context) {
	id := c.Param("id")
	c.JSON(http.StatusOK, gin.H{"message": "User deleted", "id": id})
}
