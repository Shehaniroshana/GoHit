package main

import (
	"github.com/gin-gonic/gin"
)

type Item struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

func main() {
	r := gin.Default()

	// Base level
	r.GET("/gin/ping", func(c *gin.Context) {
		c.JSON(200, gin.H{"message": "pong"})
	})

	// Nested Groups
	admin := r.Group("/gin/admin")
	{
		dashboard := admin.Group("/dashboard")
		{
			dashboard.GET("/stats", func(c *gin.Context) {
				c.JSON(200, gin.H{"stats": "ok"})
			})
		}

		users := admin.Group("/users")
		{
			users.POST("/create", func(c *gin.Context) {
				var item Item
				c.BindJSON(&item)
				c.JSON(201, item)
			})
			users.DELETE("/:id", func(c *gin.Context) {
				c.Status(204)
			})
		}
	}

	// Mixed methods in a group
	api := r.Group("/api/v2")
	api.GET("/items", func(c *gin.Context) { c.Status(200) })
	api.PUT("/items/:id", func(c *gin.Context) { c.Status(200) })

	// Deeply nested resource routes
	shop := r.Group("/shop/v1/internal")
	orders := shop.Group("/orders")
	{
		orders.GET("", func(c *gin.Context) { c.Status(200) })
		orders.POST("/submit", func(c *gin.Context) { c.Status(201) })
		
		singleOrder := orders.Group("/:order_id")
		{
			singleOrder.GET("", func(c *gin.Context) { c.Status(200) })
			singleOrder.PATCH("/cancel", func(c *gin.Context) { c.Status(200) })
		}
	}

	r.Run()
}
