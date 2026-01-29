package main

import (
	"log"

	"github.com/example/api-server/internal/routes"
	"github.com/gin-gonic/gin"
)

func main() {
	r := gin.Default()

	// Setup all routes
	routes.SetupRoutes(r)

	log.Println("Server starting on :8080...")
	if err := r.Run(":8080"); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
