package models

import "gorm.io/gorm"

type TransactionType string

const (
	Income   TransactionType = "INCOME"
	Expense  TransactionType = "EXPENSE"
	Transfer TransactionType = "TRANSFER"
)

type Transaction struct {
	gorm.Model
	UserID               uint            `gorm:"not null;index"`
	Amount               float64         `gorm:"type:decimal(12,2);not null"`
	Currency             string          `gorm:"type:varchar(10);not null;default:'AZN'"`
	Type                 TransactionType `gorm:"type:varchar(20);not null;default:'EXPENSE'"`
	Description          string          `gorm:"type:text;null"`
	SourceAccountID      *uint           `gorm:"null;index"`
	DestinationAccountID *uint           `gorm:"null;index"`
	TargetID             *uint           `gorm:"null;index"`

	// Foreign key relation to User
	User User `gorm:"foreignKey:UserID"`

	// Foreign key relation to SourceAccount
	SourceAccount Account `gorm:"foreignKey:SourceAccountID"`

	// Foreign key relation to DestinationAccount
	DestinationAccount Account `gorm:"foreignKey:DestinationAccountID"`

	// Foreign key relation to Target
	Target Target `gorm:"foreignKey:TargetID"`
}
