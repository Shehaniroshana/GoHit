package routes

import (
	"github.com/example/api-server/internal/handlers"
	"github.com/example/api-server/internal/middleware"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine) {
	// Initialize handlers
	userHandler := handlers.NewUserHandler()
	productHandler := handlers.NewProductHandler()
	orderHandler := handlers.NewOrderHandler()
	wsHandler := handlers.NewWSHandler()

	// API v1 group
	v1 := r.Group("/api/v1")
	{
		// WebSocket route
		v1.GET("/ws", wsHandler.HandleWS)

		// Health check
		v1.GET("/health", func(c *gin.Context) {
			c.JSON(200, gin.H{"status": "ok"})
		})

		// User routes
		users := v1.Group("/users")
		{
			users.POST("", userHandler.CreateUser)
			users.GET("", userHandler.ListUsers)
			users.GET("/:id", userHandler.GetUser)
			users.PUT("/:id", middleware.Auth(), userHandler.UpdateUser)
			users.DELETE("/:id", middleware.Auth(), middleware.AdminOnly(), userHandler.DeleteUser)
		}

		// Product routes
		products := v1.Group("/products")
		{
			products.POST("", middleware.Auth(), productHandler.CreateProduct)
			products.GET("", productHandler.ListProducts)
			products.GET("/:id", productHandler.GetProduct)
			products.PUT("/:id", middleware.Auth(), productHandler.UpdateProduct)
			products.DELETE("/:id", middleware.Auth(), middleware.AdminOnly(), productHandler.DeleteProduct)
		}

		// Order routes
		orders := v1.Group("/orders")
		orders.Use(middleware.Auth()) // All order routes require auth
		{
			orders.POST("", orderHandler.CreateOrder)
			orders.GET("", orderHandler.ListOrders)
			orders.GET("/:id", orderHandler.GetOrder)
			orders.PATCH("/:id/status", middleware.AdminOnly(), orderHandler.UpdateOrderStatus)
		}
	}
}
