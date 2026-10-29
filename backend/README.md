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
| `JWT_SECRET` | Secret key for signing RFC 7519 HMAC-SHA256 session tokens | `<your_secure_jwt_secret>` |
| `ADMIN_SECRET` | Server-side key for the existing administrator bootstrap script | `<your_secure_admin_secret>` |
| `FACULTY_REGISTRATION_SECRET` | Separate faculty onboarding code; required for public faculty registration | `<your_faculty_onboarding_secret>` |
| `INITIAL_ADMIN_EMAIL` | Explicit email for controlled initial administrator provisioning | `<initial_admin_email>` |
| `INITIAL_ADMIN_PASSWORD` | Unique initial administrator password (at least 12 characters) | `<unique_password_at_least_12_characters>` |
| `TEST_MONGODB_URI` | Dedicated database-writing test connection; database path must be `smartlib_test` | `mongodb://127.0.0.1:27017/smartlib_test` |
| `CLIENT_ORIGIN` | Allowed CORS origins (comma-separated); production requires explicit exact origins | `https://smartlib-frontend-nhu7.onrender.com` |

> **Security Note:** Never commit `.env` or credentials to GitHub. A template is provided in `.env.example`.

---

## 3. MongoDB Atlas IP Whitelist Setup

If the server logs indicate `MongooseServerSelectionError`:
1. Log in to [MongoDB Atlas](https://cloud.mongodb.com/).
2. In the left navigation, select **Security** → **Network Access**.
3. Click **+ Add IP Address**.
4. Choose **Add Current IP Address** or enter your current public IP address.
5. Click **Confirm**. (Atlas updates rules in 1-2 minutes).
6. The backend server automatically retries the connection in the background.

---

## 4. Local Installation, Testing & Running

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Run database-free unit, security, and regression tests
npm test

# Run HTTP integration tests (does not connect to MongoDB)
npm run test:integration

# Only after verifying TEST_MONGODB_URI points to a dedicated smartlib_test database:
# $env:NODE_ENV = "test"
# $env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27017/smartlib_test"
npm run test:atlas

# Provision an administrator only after configuring INITIAL_ADMIN_EMAIL and
# INITIAL_ADMIN_PASSWORD in .env; explicit confirmation is required.
npm run seed:admin -- --confirm-smartlib-write

# Start server in production mode
npm start

# Or start in watch/development mode
npm run dev
```

Server endpoints:
- Health check: `http://localhost:5000/api/health`
- Auth API: `http://localhost:5000/api/auth`
- Exams API: `http://localhost:5000/api/exams`
- Users API: `http://localhost:5000/api/users`
- Resources API: `http://localhost:5000/api/resources`
- Reservations API: `http://localhost:5000/api/reservations`

---

## 5. REST API Endpoints

### System
- `GET /` - Root service welcome message and available endpoints.
- `GET /api/health` - Health check reporting server uptime and database connectivity.

### Authentication (`/api/auth`)
- `POST /api/auth/register` - Register a student or faculty account (secure bcrypt password hashing; public admin signup rejected with 403).
- `POST /api/auth/login` - Authenticate with email and password; returns safe profile and role-based metadata.
- `GET /api/auth/me` - Retrieve current authenticated profile.

### Examinations (`/api/exams`)
- `GET /api/exams/department/:dept` - Retrieve department-specific examinations sorted chronologically by start date.
- `GET /api/exams` - Retrieve all scheduled examinations (supports `?department=...`, `?year=...`, `?search=...`).
- `GET /api/exams/:id` - Retrieve single examination by ID.
- `POST /api/exams` - Schedule a new examination with date range validation (`endDate >= startDate`).
- `DELETE /api/exams/:id` - Delete an examination by MongoDB `_id` or `customId`.

### Student Administration (`/api/users`)
- `GET /api/users/students` - Retrieve all registered students for the administrative portal.
- `POST /api/users/students` - Administrator adds a new student account.
- `DELETE /api/users/:id` - Administrator removes a student account (blocked if student has active reservations).

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
   - `MONGODB_URI`: `mongodb+srv://<username>:<password>@smartlibcluster.vnniqic.mongodb.net/smartlib?retryWrites=true&w=majority`
   - `CLIENT_ORIGIN`: your exact frontend deployment origin, such as `https://smartlib-frontend-nhu7.onrender.com`
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

---

## 9. Evaluation 2 Demo Checklist

Follow this workflow to demonstrate the working SmartLib system:

1. **Start Backend Server**:
   ```bash
   cd backend
   npm start
   ```
   Verify console outputs `SmartLib Backend running on port 5000` and MongoDB Atlas connection status.

2. **Verify System Health**:
   Open browser to `http://localhost:5000/api/health` — confirms `{"status":"ok", "database":{"connected":true}}`.

3. **Student / Faculty Signup & Login**:
   - Open `landingpage/signup.html`: Register a new student or faculty account.
   - Verify validation errors on weak password or duplicate email.
   - Open `landingpage/login.html`: Log in with the registered credentials.
   - Confirm role-based routing (Student -> Student Portal, Faculty -> Faculty Portal, Admin -> Admin Portal).

4. **Faculty Exam Management (`facultyportal/faculty.html`)**:
   - Verify department examinations table loads from `GET /api/exams/department/:dept`.
   - Click "Add Exam": Schedule a new exam for your department (validates `endDate >= startDate`).
   - Click "Delete": Confirms prompt and removes exam via `DELETE /api/exams/:id` passing `Authorization: Bearer <token>`.
   - Click "Logout": Clears session and redirects to landing page.

5. **Student Portal (`home/studentportal/home.html`)**:
   - Log in as a student.
   - Dashboard renders student's department examinations synchronized from backend.
   - Navigate to Resources and Seats directly from the dashboard.

6. **Resource Catalog & Reservations (`resources/` & `reservations/`)**:
   - Browse resources by department and type (`/api/resources`).
   - Reserve an available resource; verify available quantity decrements (`/api/reservations`).
   - Return resource in `reservations.html`; verify available quantity increments (`/api/reservations/:id/return`).

7. **Admin Portal (`adminportal/admin.html`)**:
   - Log in with administrator account (provisioned via `npm run seed:admin`).
   - View registered student directory (`GET /api/users`).
   - Add new student via admin modal (`POST /api/users`).
   - Delete student (demonstrate that deletion is rejected if student has active reservations).

8. **Seat Layout & Priority Queue (`seats.html`)**:
   - Access seat map; reserve an available seat in student's department.
   - Demonstrate priority queue and release seat functionality.
