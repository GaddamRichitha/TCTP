# TCTP — Software Financial Simulator

A modern, full-stack financial simulation application for software project cost analysis, earned value management (EVM), break-even analysis, and cash flow projections.

Built with **React + TypeScript + Tailwind CSS** on the frontend and **Node.js + Express + MySQL** on the backend.

![Tech Stack](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue) ![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38bdf8) ![Express](https://img.shields.io/badge/Express-4.21-green) ![MySQL](https://img.shields.io/badge/MySQL-8.0-orange)

---

## Features

- **Dashboard** — Real-time KPIs: total costs, cost per unit, break-even, ROI, payback period
- **Cost Inputs** — Manage costs across 5 categories (Labour, Infrastructure, APIs, LLM/AI, Overhead) with inline editing
- **Time Tracking** — Log actual hours per resource per month for EVM calculations
- **Assumptions** — Configure pricing strategy, margins, churn, growth rates, and thresholds
- **Analysis** — Break-even analysis, sensitivity scenarios, cash flow projections, go/no-go verdict
- **EVM (Earned Value Management)** — CPI, SPI, CV, SV, EAC, VAC metrics with per-resource variance
- **Report** — Financial summary with CSV/PDF export
- **Authentication** — JWT-based login with role-based access

---

## Project Structure

```
tctp-financial-simulator/
├── client/                     # React + TypeScript + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/         # Shared UI components
│   │   │   ├── AppBar.tsx      # Top navigation bar
│   │   │   ├── Sidebar.tsx     # Left sidebar navigation
│   │   │   ├── MetricCard.tsx  # Reusable KPI card
│   │   │   ├── PageHeader.tsx  # Page title header
│   │   │   └── LoginPage.tsx   # Login form
│   │   ├── pages/              # Main page views
│   │   │   ├── Dashboard.tsx   # KPIs, category chart, EVM
│   │   │   ├── CostInputs.tsx  # Cost item tables + time tracking
│   │   │   ├── Assumptions.tsx # Pricing & scenario settings
│   │   │   ├── Analysis.tsx    # Break-even, sensitivity, cashflow
│   │   │   └── Report.tsx      # Summary report + export
│   │   ├── hooks/
│   │   │   └── useProject.ts   # Project state management
│   │   ├── lib/
│   │   │   ├── api.ts          # Typed API client
│   │   │   └── utils.ts        # Formatters, category constants
│   │   ├── types/
│   │   │   └── index.ts        # TypeScript type definitions
│   │   ├── App.tsx             # Root component with auth gate
│   │   ├── main.tsx            # Entry point
│   │   └── index.css           # Tailwind + custom styles
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
│
├── server/                     # Node.js + Express backend
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js           # MySQL connection pool
│   │   ├── middleware/
│   │   │   └── auth.js         # JWT authentication middleware
│   │   ├── routes/
│   │   │   ├── auth.js         # Login, register, profile
│   │   │   ├── projects.js     # Project CRUD
│   │   │   ├── costItems.js    # Cost item CRUD
│   │   │   ├── timeLogs.js     # Time log CRUD
│   │   │   └── calculations.js # Financial calculation engine
│   │   └── index.js            # Express app entry point
│   ├── .env.example
│   └── package.json
│
├── database/
│   ├── schema.sql              # MySQL DDL (tables, indexes, FKs)
│   └── seed.sql                # Demo data (users, project, costs, time logs)
│
├── README.md                   # This file
└── DATABASE_SETUP.md           # Detailed database setup guide
```

---

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | 18+ | Runtime for both client and server |
| npm or yarn | 8+ / 1.22+ | Package management |
| MySQL | 8.0+ | Database |
| Git | Latest | Version control (optional) |

---

## Quick Start

### 1. Clone and enter the project

```bash
cd tctp-financial-simulator
```

### 2. Set up the database

See [DATABASE_SETUP.md](./DATABASE_SETUP.md) for detailed instructions.

```bash
# Create tables
mysql -u root -p < database/schema.sql

# Seed demo data
mysql -u root -p tctp_simulator < database/seed.sql
```

### 3. Configure the server

```bash
cd server
cp .env.example .env
```

Edit `server/.env` with your MySQL credentials:

```env
PORT=5000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=24h
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=tctp_simulator
```

### 4. Install server dependencies and start

```bash
cd server
npm install
npm run dev
```

The server starts on **http://localhost:5000**.

### 5. Install client dependencies and start (in a new terminal)

```bash
cd client
npm install
npm run dev
```

The client starts on **http://localhost:5173** and proxies API requests to the server.

### 6. Log in

Open **http://localhost:5173** in your browser and log in with:

| Username | Password |
|----------|----------|
| `demo` | `demo1234` |
| `admin` | `admin1234` |

---

## API Endpoints

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/register` | Register new user |
| GET | `/api/auth/me` | Get current user profile |

### Projects
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/projects` | List all projects |
| GET | `/api/projects/:id` | Get project with cost items |
| POST | `/api/projects` | Create project |
| PUT | `/api/projects/:id` | Update project settings |
| DELETE | `/api/projects/:id` | Soft-delete project |

### Cost Items
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cost-items/:projectId` | List items (optional `?category=`) |
| POST | `/api/cost-items/:projectId` | Create cost item |
| PUT | `/api/cost-items/:id` | Update cost item |
| DELETE | `/api/cost-items/:id` | Delete cost item |

### Time Logs
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/time-logs/:projectId` | List all time logs |
| PUT | `/api/time-logs/:costItemId` | Upsert time log entry |
| DELETE | `/api/time-logs/:costItemId/:month` | Delete time log |

### Calculations (Analytics)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/calculations/:projectId/summary` | Full financial summary |
| GET | `/api/calculations/:projectId/evm` | Earned Value Management metrics |
| GET | `/api/calculations/:projectId/sensitivity` | Sensitivity analysis (5 scenarios) |
| GET | `/api/calculations/:projectId/cashflow` | 24-month cash flow projection |
| GET | `/api/calculations/:projectId/waterfall` | Cost waterfall breakdown |

---

## Key Calculation Formulas

### Pricing
- **Cost Per Unit** = (Total Project Cost / Target Volume) + Per-Unit Costs
- **Derived Price** = Cost Per Unit / (1 - Target Margin%)
- **Selling Price** = Manual Override (if set) or Derived Price

### Break-Even
- **Contribution Per Unit** = Selling Price - Per-Unit Cost
- **Break-Even Units** = Total Project Cost / Contribution Per Unit
- **Break-Even Revenue** = Break-Even Units x Selling Price

### EVM (Earned Value Management)
- **PV** (Planned Value) = Sum of planned monthly costs for elapsed months
- **EV** (Earned Value) = PV x (actual hours / planned hours), capped at 100%
- **AC** (Actual Cost) = Sum of (implied hourly rate x actual hours)
- **CPI** = EV / AC (Cost Performance Index)
- **SPI** = EV / PV (Schedule Performance Index)
- **EAC** = PV / CPI (Estimate at Completion)
- **VAC** = PV - EAC (Variance at Completion)

### Verdict Logic
- **GO**: ROI >= Min ROI AND Payback <= Max Payback AND Margin >= Min Margin
- **NO-GO**: ROI < 0 OR Payback > Max Payback x 1.5 OR Margin < 0
- **CAUTION**: Everything else

---

## Tech Stack Details

### Frontend
- **React 18** with TypeScript 5
- **Vite 5** for build tooling and HMR
- **Tailwind CSS 3.4** for utility-first styling
- **Lucide React** for consistent iconography
- **clsx** for conditional classnames

### Backend
- **Express 4** with async/await
- **MySQL2** with promise-based API and connection pooling
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT authentication
- **cors** for cross-origin support
- **dotenv** for environment configuration

---

## Production Deployment Notes

1. **JWT Secret**: Change `JWT_SECRET` to a strong, random string (min 32 chars)
2. **CORS**: Restrict `cors()` origin to your actual domain in production
3. **MySQL**: Use SSL connections and a dedicated database user with minimal privileges
4. **Rate Limiting**: Add `express-rate-limit` middleware for production
5. **Build Client**: Run `cd client && npm run build` and serve the `dist/` folder with Nginx
6. **Process Manager**: Use PM2 or systemd to keep the server running