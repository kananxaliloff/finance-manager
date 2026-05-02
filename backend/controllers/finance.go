package controllers

import (
	"finance-manager-backend/database"
	"finance-manager-backend/models"
	"finance-manager-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type CreateAccountInput struct {
	Name       string             `json:"name" binding:"required"`
	Balance    float64            `json:"balance" binding:"required"`
	Currency   string             `json:"currency" binding:"required"`
	Type       models.AccountType `json:"type" binding:"required"`
	CardNumber *string            `json:"cardNumber" binding:"omitempty"`
}

type CreateTargetInput struct {
	Name           string            `json:"name" binding:"required"`
	AssignedAmount float64           `json:"assignedAmount" binding:"required"`
	Currency       string            `json:"currency" binding:"required"`
	Type           models.TargetType `json:"type" binding:"required"`
	Note           *string           `json:"note" binding:"omitempty"`
}

type CreateTransactionInput struct {
	Amount               float64                `json:"amount" binding:"required"`
	Currency             string                 `json:"currency" binding:"required"`
	Type                 models.TransactionType `json:"type" binding:"required"`
	Description          string                 `json:"description"`
	SourceAccountID      *uint                  `json:"sourceAccountId"`
	DestinationAccountID *uint                  `json:"destinationAccountId"`
	TargetID             *uint                  `json:"targetId"`
}

// CreateAccount adds a new bank or cash account
func CreateAccount(c *gin.Context) {
	// Extract userID from context (set by AuthMiddleware)
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input CreateAccountInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Cast float64 userID to uint (jwt mapclaims parses numbers as float64)
	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user ID type"})
		return
	}

	account := models.Account{
		UserID:     uid,
		Name:       input.Name,
		Balance:    input.Balance,
		Currency:   input.Currency,
		Type:       input.Type,
		CardNumber: input.CardNumber,
	}

	if err := database.DB.Create(&account).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"accountId": account.ID})
}

// CreateTarget adds a new savings target
func CreateTarget(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input CreateTargetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	target := models.Target{
		UserID:         uid,
		Name:           input.Name,
		AssignedAmount: input.AssignedAmount,
		Currency:       input.Currency,
		Type:           input.Type,
		Note:           input.Note,
	}

	if err := database.DB.Create(&target).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create target"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"targetId": target.ID})
}

// GetDashboard returns the actual vs available money calculation in the requested base currency
func GetDashboard(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	// Default base currency is AZN
	baseCurrency := c.DefaultQuery("baseCurrency", "AZN")

	var accounts []models.Account
	if err := database.DB.Where("user_id = ?", uid).Find(&accounts).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch accounts"})
		return
	}

	var targets []models.Target
	if err := database.DB.Where("user_id = ?", uid).Find(&targets).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch targets"})
		return
	}

	var totalActualMoney float64 = 0
	var totalAssignedTargets float64 = 0

	// Sum Accounts in Base Currency
	for _, acc := range accounts {
		converted, err := utils.ConvertCurrency(acc.Balance, acc.Currency, baseCurrency)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Currency conversion error: " + err.Error()})
			return
		}
		totalActualMoney += converted
	}

	// Sum Targets in Base Currency
	for _, trg := range targets {
		converted, err := utils.ConvertCurrency(trg.AssignedAmount, trg.Currency, baseCurrency)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Currency conversion error: " + err.Error()})
			return
		}
		totalAssignedTargets += converted
	}

	// The Core Formula!
	availableMoney := totalActualMoney - totalAssignedTargets

	c.JSON(http.StatusOK, gin.H{
		"baseCurrency":         baseCurrency,
		"totalActualMoney":     totalActualMoney,
		"totalAssignedTargets": totalAssignedTargets,
		"availableMoney":       availableMoney,
		"accounts":             accounts,
		"targets":              targets,
	})
}

// CreateTransaction adds a new transaction and updates balances
func CreateTransaction(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var input CreateTransactionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	// Start a transaction to ensure atomic updates
	tx := database.DB.Begin()

	transaction := models.Transaction{
		UserID:               uid,
		Amount:               input.Amount,
		Currency:             input.Currency,
		Type:                 input.Type,
		Description:          input.Description,
		SourceAccountID:      input.SourceAccountID,
		DestinationAccountID: input.DestinationAccountID,
		TargetID:             input.TargetID,
	}

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
	}

	// Ledger Math Logic
	switch input.Type {
	case models.Income:
		if input.SourceAccountID != nil {
			if err := tx.Model(&models.Account{}).Where("id = ? AND user_id = ?", input.SourceAccountID, uid).
				Update("balance", gorm.Expr("balance + ?", input.Amount)).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update account balance"})
				return
			}
		}
	case models.Expense:
		if input.SourceAccountID != nil {
			if err := tx.Model(&models.Account{}).Where("id = ? AND user_id = ?", input.SourceAccountID, uid).
				Update("balance", gorm.Expr("balance - ?", input.Amount)).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update account balance"})
				return
			}
		}
	case models.Transfer:
		// Deduct from Source Account
		if input.SourceAccountID != nil {
			if err := tx.Model(&models.Account{}).Where("id = ? AND user_id = ?", input.SourceAccountID, uid).
				Update("balance", gorm.Expr("balance - ?", input.Amount)).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update source account balance"})
				return
			}
		}
		// Add to Destination Account OR Target
		if input.DestinationAccountID != nil {
			if err := tx.Model(&models.Account{}).Where("id = ? AND user_id = ?", input.DestinationAccountID, uid).
				Update("balance", gorm.Expr("balance + ?", input.Amount)).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update destination account balance"})
				return
			}
		} else if input.TargetID != nil {
			if err := tx.Model(&models.Target{}).Where("id = ? AND user_id = ?", input.TargetID, uid).
				Update("assigned_amount", gorm.Expr("assigned_amount + ?", input.Amount)).Error; err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update target assigned amount"})
				return
			}
		}
	}

	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"transactionId": transaction.ID})
}

// GetTransactions returns the transaction history for the user
func GetTransactions(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var uid uint
	switch v := userID.(type) {
	case float64:
		uid = uint(v)
	case uint:
		uid = v
	}

	var transactions []models.Transaction
	if err := database.DB.Where("user_id = ?", uid).Order("created_at desc").Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	c.JSON(http.StatusOK, transactions)
}
