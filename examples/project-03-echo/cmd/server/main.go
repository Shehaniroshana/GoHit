package main

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type Product struct {
	Name  string  `json:"name"`
	Price float64 `json:"price"`
}

func main() {
	e := echo.New()

	e.GET("/echo", func(c echo.Context) error {
		return c.String(http.StatusOK, "Hello, Echo!")
	})

	p := e.Group("/echo/products")
	
	p.POST("", func(c echo.Context) error {
		prod := new(Product)
		if err := c.Bind(prod); err != nil {
			return err
		}
		return c.JSON(http.StatusCreated, prod)
	})

	p.GET("/:id", func(c echo.Context) error {
		id := c.Param("id")
		return c.JSON(http.StatusOK, map[string]string{"id": id, "name": "echo_product"})
	})

	e.Logger.Fatal(e.Start(":1323"))
}
