package controllers

import (
	"finance-manager-backend/database"
	"finance-manager-backend/models"
	"finance-manager-backend/utils"
	"net/http"

	"github.com/gin-gonic/gin"
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

type UpdateAccountInput struct {
	Name       *string             `json:"name"`
	Currency   *string             `json:"currency"`
	Type       *models.AccountType `json:"type"`
	CardNumber *string             `json:"cardNumber"`
}

type UpdateTargetInput struct {
	Name     *string            `json:"name"`
	Currency *string            `json:"currency"`
	Type     *models.TargetType `json:"type"`
	Note     *string            `json:"note"`
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
		Balance:    0, // Start at 0 for ledger tracking
		Currency:   input.Currency,
		Type:       input.Type,
		CardNumber: input.CardNumber,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&account).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create account"})
		return
	}

	// Create initial balance transaction if amount > 0
	if input.Balance > 0 {
		transaction := models.Transaction{
			UserID:          uid,
			Amount:          input.Balance,
			Currency:        input.Currency,
			Type:            models.Income,
			Description:     "Initial Balance",
			SourceAccountID: &account.ID,
		}
		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create initial transaction"})
			return
		}
	}

	tx.Commit()
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
		AssignedAmount: 0, // Start at 0 for ledger tracking
		Currency:       input.Currency,
		Type:           input.Type,
		Note:           input.Note,
	}

	tx := database.DB.Begin()
	if err := tx.Create(&target).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create target"})
		return
	}

	// If initial amount is provided, we treat it as an initial allocation
	if input.AssignedAmount > 0 {
		transaction := models.Transaction{
			UserID:      uid,
			Amount:      input.AssignedAmount,
			Currency:    input.Currency,
			Type:        models.Transfer,
			Description: "Initial Allocation",
			TargetID:    &target.ID,
		}
		if err := tx.Create(&transaction).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create initial allocation transaction"})
			return
		}
	}

	tx.Commit()
	c.JSON(http.StatusCreated, gin.H{"targetId": target.ID})
}

// UpdateAccount modifies an existing account
func UpdateAccount(c *gin.Context) {
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

	id := c.Param("id")
	var account models.Account
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&account).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Account not found"})
		return
	}

	var input UpdateAccountInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Currency != nil {
		updates["currency"] = *input.Currency
		// If user changes currency, we should also update the currency of the initial balance transaction if it exists
		database.DB.Model(&models.Transaction{}).
			Where("user_id = ? AND source_account_id = ? AND description = ?", uid, account.ID, "Initial Balance").
			Update("currency", *input.Currency)
	}
	if input.Type != nil {
		updates["type"] = *input.Type
	}
	if input.CardNumber != nil {
		updates["card_number"] = *input.CardNumber
	}

	if err := database.DB.Model(&account).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update account"})
		return
	}

	c.JSON(http.StatusOK, account)
}

// UpdateTarget modifies an existing target
func UpdateTarget(c *gin.Context) {
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

	id := c.Param("id")
	var target models.Target
	if err := database.DB.Where("id = ? AND user_id = ?", id, uid).First(&target).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Target not found"})
		return
	}

	var input UpdateTargetInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updates := make(map[string]interface{})
	if input.Name != nil {
		updates["name"] = *input.Name
	}
	if input.Currency != nil {
		updates["currency"] = *input.Currency
		// Update currency of initial allocation transaction
		database.DB.Model(&models.Transaction{}).
			Where("user_id = ? AND target_id = ? AND description = ?", uid, target.ID, "Initial Allocation").
			Update("currency", *input.Currency)
	}
	if input.Type != nil {
		updates["type"] = *input.Type
	}
	if input.Note != nil {
		updates["note"] = *input.Note
	}

	if err := database.DB.Model(&target).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update target"})
		return
	}

	c.JSON(http.StatusOK, target)
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

	var transactions []models.Transaction
	if err := database.DB.Where("user_id = ?", uid).Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	// Ledger Calculation
	accountBalances := make(map[uint]float64)
	targetBalances := make(map[uint]float64)

	for _, t := range transactions {
		switch t.Type {
		case models.Income:
			if t.SourceAccountID != nil {
				accountBalances[*t.SourceAccountID] += t.Amount
			}
		case models.Expense:
			if t.SourceAccountID != nil {
				accountBalances[*t.SourceAccountID] -= t.Amount
			}
		case models.Transfer:
			if t.SourceAccountID != nil {
				accountBalances[*t.SourceAccountID] -= t.Amount
			}
			if t.DestinationAccountID != nil {
				accountBalances[*t.DestinationAccountID] += t.Amount
			}
			if t.TargetID != nil {
				targetBalances[*t.TargetID] += t.Amount
			}
		}
	}

	var totalActualMoney float64 = 0
	var totalAssignedTargets float64 = 0

	// Sum Accounts in Base Currency
	for i := range accounts {
		// Override balance with ledger calculation
		accounts[i].Balance = accountBalances[accounts[i].ID]
		
		converted, err := utils.ConvertCurrency(accounts[i].Balance, accounts[i].Currency, baseCurrency)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Currency conversion error: " + err.Error()})
			return
		}
		totalActualMoney += converted
	}

	// Sum Targets in Base Currency
	for i := range targets {
		// Override assigned amount with ledger calculation
		targets[i].AssignedAmount = targetBalances[targets[i].ID]
		
		converted, err := utils.ConvertCurrency(targets[i].AssignedAmount, targets[i].Currency, baseCurrency)
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

	if err := tx.Create(&transaction).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create transaction"})
		return
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

	transactions := []models.Transaction{}
	if err := database.DB.Where("user_id = ?", uid).Order("created_at desc").Find(&transactions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch transactions"})
		return
	}

	c.JSON(http.StatusOK, transactions)
}
