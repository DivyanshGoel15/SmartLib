# SmartLib Backend API (Reservations & Resources)

Backend REST API for SmartLib's **Reservations** and **Resources** modules built with Node.js, Express.js, MongoDB Atlas, and Mongoose adhering to strict **MVC architecture**.

---

## 1. Architecture Overview (MVC Pattern)

```text
backend/
├── config/
│   └── db.js                        # MongoDB Atlas connection & diagnostics
├── controllers/
│   ├── reservationController.js     # Reservations business logic, validation, CRUD
│   └── resourceController.js        # Resources business logic, filtering, CRUD
├── middleware/
│   └── errorHandler.js              # Centralized error handler & CastError / 404 handler
├── models/
│   ├── Reservation.js               # Mongoose reservation schema & validation
│   └── Resource.js                  # Mongoose resource schema & validation
├── routes/
│   ├── reservationRoutes.js         # REST endpoints for /api/reservations
│   └── resourceRoutes.js            # REST endpoints for /api/resources
├── .env.example                     # Environment variables template
├── package.json                     # Dependencies, scripts (npm start, npm run dev)
├── server.js                        # Express server entry point & health check
└── SmartLib_API.postman_collection.json # Complete API testing collection
```

---

## 2. Environment Variables

Create a `.env` file in the `backend/` directory (already configured locally and excluded from git in `.gitignore`):

| Variable | Description | Example Value |
| :--- | :--- | :--- |
| `PORT` | Port the Express server listens on | `5000` |
| `MONGODB_URI` | MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net/?appName=SmartLib` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated or `*`) | `*` or `https://smartlib-frontend.onrender.com` |

> **Security Note:** Never commit `.env` or credentials to GitHub. A template is provided in `.env.example`.

---

## 3. MongoDB Atlas IP Whitelist Setup

If the server logs indicate `MongooseServerSelectionError`:
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. In the left navigation, select **Security** → **Network Access**.
3. Click **+ Add IP Address**.
4. Choose **Allow Access from Anywhere** (`0.0.0.0/0`) or enter your current public IP address.
5. Click **Confirm**. (Atlas updates rules in 1-2 minutes).
6. The backend server automatically retries the connection in the background.

---

## 4. Local Installation & Running

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Start in production mode
npm start

# Or start in watch/development mode
npm run dev
```

Server endpoints:
- Health check: `http://localhost:5000/api/health`
- Resources: `http://localhost:5000/api/resources`
- Reservations: `http://localhost:5000/api/reservations`

---

## 5. REST API Endpoints

### System
- `GET /` - Root service welcome message and available endpoints.
- `GET /api/health` - Health check reporting server uptime and database connectivity.

### Resources (`/api/resources`)
- `GET /api/resources` - Retrieve all library resources (supports `?type=Book`, `?department=CSE`, `?search=...`).
- `GET /api/resources/:id` - Retrieve a resource by MongoDB `_id` or `customId` (e.g. `RES001`).
- `POST /api/resources` - Create a new resource (`name`, `type`, `department`, `totalQuantity`, `availableQuantity`).
- `PUT /api/resources/:id` or `PATCH /api/resources/:id` - Update an existing resource.
- `DELETE /api/resources/:id` - Delete a resource.

### Reservations (`/api/reservations`)
- `GET /api/reservations` - Retrieve reservations (supports `?userId=...`, `?status=active`, `?resourceId=...`).
- `GET /api/reservations/:id` - Retrieve single reservation by `_id` or `customId` (e.g. `RSV001`).
- `POST /api/reservations` - Create a new reservation:
  - Enforces max 2 active reservations per student.
  - Prevents duplicate reservations for the same resource.
  - Decrements available resource quantity in MongoDB.
- `POST /api/reservations/:id/return` - Return a resource:
  - Sets `status: "returned"` and `returnedAt`.
  - Increments available quantity in MongoDB.
- `PUT /api/reservations/:id` or `PATCH /api/reservations/:id` - Update reservation record.
- `DELETE /api/reservations/:id` - Delete reservation record (restores quantity if active).

---

## 6. Frontend Integration & Deployed URL Configuration

The frontend in `resources/` and `reservations/` dynamically connects to the backend through `js/config.js`.

### How to configure the deployed API URL in the frontend:
Option A: **In the browser console or application settings:**
```javascript
// Point frontend to your deployed Render URL:
window.SMARTLIB_CONFIG.setApiUrl("https://your-backend.onrender.com/api");
```
*(This is stored in `localStorage` and persists across page reloads and browser sessions).*

Option B: **In `js/config.js`:**
Change `defaultApiUrl` to your deployed backend URL:
```javascript
const defaultApiUrl = "https://your-backend.onrender.com/api";
```

---

## 7. Step-by-Step Render Deployment Instructions

1. **Push your code to GitHub** (ensure `.env` is ignored).
2. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Web Service**.
3. Connect your GitHub repository.
4. Configure the Web Service settings:
   - **Name:** `smartlib-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
5. Under **Environment Variables**, add:
   - `PORT`: `5000` (or leave default assigned by Render)
   - `MONGODB_URI`: `mongodb+srv://divyanjalitiwari07_db_user:nGgwCIWL5mvi2waT@smartlibcluster.vnniqic.mongodb.net/?appName=SmartLibCluster`
   - `CLIENT_ORIGIN`: `*` (or your frontend deployment domain)
6. Click **Deploy Web Service**.
7. Once deployed, test the live health check at `https://smartlib-backend.onrender.com/api/health`.

---

## 8. Postman Testing Guide

1. Open Postman.
2. Click **Import** (top left).
3. Drag and drop `backend/SmartLib_API.postman_collection.json`.
4. The collection includes collection variables:
   - `baseUrl`: Defaults to `http://localhost:5000/api` (change to your deployed URL when testing production).
   - `resourceId`: `RES001`
   - `reservationId`: `RSV001`
5. Run the requests individually or click **Run Collection** to execute all tests automatically.
