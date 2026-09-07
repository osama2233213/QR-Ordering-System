# QuickServe — Multi-Tenant QR Restaurant Ordering & POS System

A high-performance multi-tenant platform featuring QR-based table ordering, real-time kitchen display and order queue, desktop restaurant management, and DevGate super-admin controls.

---

## Repository Structure

```text
qr-restaurant-system/
├── backend/
│   ├── src/
│   │   ├── config/          # Database (Mongoose) & WebSockets (Socket.IO)
│   │   ├── middleware/      # JWT Auth, Tenant Context, Role Authorization, Error Handling
│   │   ├── models/          # Multi-tenant Mongoose schemas
│   │   ├── modules/         # Domain-driven architecture (routes, controllers, services)
│   │   │   ├── auth/
│   │   │   ├── restaurant/
│   │   │   ├── menu/
│   │   │   ├── table/
│   │   │   ├── public/      # Customer-facing public endpoints (table + menu)
│   │   │   ├── order/
│   │   │   ├── session/
│   │   │   ├── devgate/     # Super-admin onboarding & tenant approval (POC placeholder)
│   │   │   └── pos/         # Future POS / FBR Connector (Placeholder)
│   │   ├── sockets/         # Realtime order event dispatchers
│   │   ├── utils/           # QR generator & validators
│   │   ├── app.js           # Express app setup
│   │   └── server.js        # HTTP & Socket.IO server entry point
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance & domain API wrappers
│   │   ├── context/         # AuthContext & GuestSessionContext
│   │   ├── customer/        # Mobile-First Customer App (Menu, Cart, Order Tracking)
│   │   ├── admin/           # Restaurant Admin Dashboard (Live Order Queue, Menu, Tables)
│   │   ├── devgate/         # DevGate Super-Admin Platform Management
│   │   ├── shared/          # Shared UI primitives (Button, Badge, Modal, Toast) & Constants
│   │   ├── sockets/         # Socket.io client singleton
│   │   ├── styles/          # Tailwind CSS + Custom Design System Tokens
│   │   ├── App.jsx          # Top-level Router with Dev Launcher Landing Hub
│   │   └── main.jsx
│   ├── tailwind.config.js
│   ├── vite.config.js
│   ├── package.json
│   └── README.md
└── README.md
```

---

## ⚡ Quick Start Instructions

### Prerequisites
- Node.js >= 18.x
- MongoDB instance (local or MongoDB Atlas)

### 1. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Update MONGO_URI and JWT_SECRET in .env if needed
npm run dev
```
The backend will run on **http://localhost:5000**.

### 2. Setup Frontend
```bash
cd frontend
npm install
npm run dev
```
The frontend will run on **http://localhost:5173**.

---

## 🌐 Application Routing Zones

| Zone | Route Pattern | Purpose |
|---|---|---|
| **Dev Launcher** | `/` | Quick launcher with 3 direct cards to test each zone |
| **Customer Experience** | `/r/:restaurantId/t/:tableId` | QR destination for diners (Mobile-first) |
| **Restaurant Admin** | `/admin/login`, `/admin/*` | Kitchen & management live order queue |
| **DevGate Super-Admin**| `/devgate/login`, `/devgate/*` | Tenant onboarding & approval panel |

---

## 🔒 Multi-Tenant Security Rules
1. **Token-derived tenant identity:** All protected routes extract `restaurantId` strictly from verified JWT tokens via `tenantContext` middleware.
2. **Strict query isolation:** All database operations on tenant models filter by `restaurantId`.
3. **Public URL validation:** Public customer queries verify that `tableId` belongs to `restaurantId` before returning any restaurant/menu data.
