package main

import "fmt"

// This file demonstrates using @gohit annotations for custom route detection
// regardless of the framework or complex routing logic.

type CustomReq struct {
	Tag string `json:"tag"`
	Val int    `json:"val"`
}

// @gohit POST /custom/ping CustomReq
func HandlePing() {
	fmt.Println("Ping received")
}

// @gohit GET /custom/status
func HandleStatus() {
	fmt.Println("Status checked")
}

// @gohit WS /custom/stream
func HandleStream() {
	fmt.Println("WS Stream started")
}

func main() {
	fmt.Println("Annotation test")
}
