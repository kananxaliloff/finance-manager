package utils

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

type ExchangeRateResponse struct {
	Rates map[string]float64 `json:"rates"`
}

var (
	ratesCache   map[string]float64
	lastFetch    time.Time
	cacheMutex   sync.Mutex
	cacheTTL     = 24 * time.Hour // Cache rates for 24 hours
)

// FetchRates fetches the latest exchange rates with USD as the base from a free API
func FetchRates() error {
	resp, err := http.Get("https://open.er-api.com/v6/latest/USD")
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("failed to fetch rates: %v", resp.Status)
	}

	var data ExchangeRateResponse
	if err := json.NewDecoder(resp.Body).Decode(&data); err != nil {
		return err
	}

	cacheMutex.Lock()
	ratesCache = data.Rates
	lastFetch = time.Now()
	cacheMutex.Unlock()

	return nil
}

// ConvertCurrency converts an amount from one currency to another using the cached rates
func ConvertCurrency(amount float64, fromCurrency string, toCurrency string) (float64, error) {
	fromCurrency = strings.ToUpper(fromCurrency)
	toCurrency = strings.ToUpper(toCurrency)

	if fromCurrency == toCurrency {
		return amount, nil
	}

	cacheMutex.Lock()
	needsFetch := ratesCache == nil || time.Since(lastFetch) > cacheTTL
	cacheMutex.Unlock()

	if needsFetch {
		if err := FetchRates(); err != nil {
			return 0, fmt.Errorf("error fetching exchange rates: %v", err)
		}
	}

	cacheMutex.Lock()
	defer cacheMutex.Unlock()

	fromRate, fromExists := ratesCache[fromCurrency]
	toRate, toExists := ratesCache[toCurrency]

	if !fromExists {
		return 0, fmt.Errorf("unsupported source currency: %s", fromCurrency)
	}
	if !toExists {
		return 0, fmt.Errorf("unsupported target currency: %s", toCurrency)
	}

	// Calculate cross rate through USD (since the API base is USD)
	// Example: AZN to EUR -> (amount / AZN_rate) * EUR_rate
	usdAmount := amount / fromRate
	convertedAmount := usdAmount * toRate

	return convertedAmount, nil
}
