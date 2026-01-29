package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// Auth middleware - mock authentication
func Auth() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "No authorization token"})
			c.Abort()
			return
		}

		// Mock user context
		c.Set("user_id", 1)
		c.Set("user_role", "user")
		c.Next()
	}
}

// AdminOnly middleware - require admin role
func AdminOnly() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("user_role")
		if !exists || role != "admin" {
			c.JSON(http.StatusForbidden, gin.H{"error": "Admin access required"})
			c.Abort()
			return
		}
		c.Next()
	}
}
