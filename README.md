# 💰 Finance Manager

A premium personal finance management application designed to track "Actual Money" vs "Available Money" through a pure ledger-based system.

## ✨ Features

- **Double-Entry Style Ledger**: Every balance is calculated from a source-of-truth transaction history.
- **Actual vs Available Balance**: Automatically subtracts your savings targets from your cash to show what you can *actually* spend.
- **Monthly Automation**: Set recurring income/expense rules (e.g., Salary) with manual confirmation prompts.
- **Multi-Currency Support**: Manage accounts in AZN, USD, or EUR with automated conversion.
- **Transaction History**: Detailed audit trail of all financial movements.
- **Modern UI**: Dark-themed, high-performance interface with glassmorphism aesthetics.

---

## 🚀 Getting Started

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone git@github.com:kananxaliloff/finance-manager.git
   cd finance-manager
   ```

2. **Configure Environment Variables:**
   Copy the example environment file and update the values if necessary:
   ```bash
   cp .env.example .env
   ```

3. **Start the application:**
   ```bash
   docker-compose up --build -d
   ```

### Accessing the Application

- **Frontend (Web UI)**: [http://localhost](http://localhost) (or your `FRONTEND_PORT`)
- **Backend API**: [http://localhost:8080/api/health](http://localhost:8080/api/health)
- **Database**: Port `5433` (accessible via any psql client)

---

## 🛠 Tech Stack

- **Backend**: Go (Golang) with Gin Framework & GORM.
- **Frontend**: React + Vite with Lucide icons and Vanilla CSS.
- **Database**: PostgreSQL 16.
- **Reverse Proxy**: Nginx (Dockerized).

---

## 🔒 Security Note
The `.env` file is ignored by Git to protect your sensitive credentials. Always ensure you do not commit your production secrets.

---

## 📄 License
This project is licensed under the MIT License.
