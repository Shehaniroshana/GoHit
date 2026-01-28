package main

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

type CreateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    int    `json:"priority"`
	Assignee    string `json:"assignee"`
	DueDate     string `json:"dueDate"`
}

type UpdateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    int    `json:"priority"`
	Status      string `json:"status"`
}

type TaskResponse struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Priority    int    `json:"priority"`
	Assignee    string `json:"assignee"`
	DueDate     string `json:"dueDate"`
	Status      string `json:"status"`
}

func main() {
	e := echo.New()

	e.GET("/api/tasks", listTasks)
	e.GET("/api/tasks/:id", getTask)
	e.POST("/api/tasks", createTask)
	e.PUT("/api/tasks/:id", updateTask)
	e.DELETE("/api/tasks/:id", deleteTask)

	e.Start(":8080")
}

func listTasks(c echo.Context) error {
	tasks := []TaskResponse{
		{ID: 1, Title: "Task 1", Description: "First task", Priority: 1, Assignee: "John", DueDate: "2024-12-31", Status: "open"},
		{ID: 2, Title: "Task 2", Description: "Second task", Priority: 2, Assignee: "Jane", DueDate: "2024-12-30", Status: "in_progress"},
	}

	return c.JSON(http.StatusOK, tasks)
}

func getTask(c echo.Context) error {
	id := c.Param("id")

	task := TaskResponse{
		ID:          1,
		Title:       "Task 1",
		Description: "First task",
		Priority:    1,
		Assignee:    "John",
		DueDate:     "2024-12-31",
		Status:      "open",
	}

	return c.JSON(http.StatusOK, task)
}

func createTask(c echo.Context) error {
	var req CreateTaskRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	response := TaskResponse{
		ID:          123,
		Title:       req.Title,
		Description: req.Description,
		Priority:    req.Priority,
		Assignee:    req.Assignee,
		DueDate:     req.DueDate,
		Status:      "open",
	}

	return c.JSON(http.StatusCreated, response)
}

func updateTask(c echo.Context) error {
	id := c.Param("id")
	var req UpdateTaskRequest

	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
	}

	return c.JSON(http.StatusOK, map[string]string{"message": "Task updated", "id": id})
}

func deleteTask(c echo.Context) error {
	id := c.Param("id")
	return c.JSON(http.StatusOK, map[string]string{"message": "Task deleted", "id": id})
}
