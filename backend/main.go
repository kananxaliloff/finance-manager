package main

import (
	"log"
	"os"

	"finance-manager-backend/controllers"
	"finance-manager-backend/database"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	err := godotenv.Load()
	if err != nil {
		log.Println("Warning: Error loading .env file")
	}

	// Connect to database
	database.ConnectDB()

	// Initialize Gin router
	r := gin.Default()

	// Basic route
	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"message": "Finance Manager API is running",
		})
	})

	auth := r.Group("/api/v1/auth")
	auth.POST("/register", controllers.Register)
	auth.POST("/login", controllers.Login)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	r.Run(":" + port)
}
