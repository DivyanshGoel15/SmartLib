SmartLib — Library Seat Reservation System
SmartLib is a web-based library management application focused on seat reservations and library resource management. It combines a browser-based interface with a Node.js/Express backend and MongoDB storage.

The backend is organized into routes, controllers, models, middleware, configuration, and utility modules. It is designed to validate requests, enforce access rules for protected actions, and preserve reservation and resource consistency.
Repository: https://github.com/DivyanshGoel15/SmartLib

Contents
- Features
- Technology Stack
- Architecture
- Project Structure
- Getting Started
- Environment Configuration
- Running the Application
- Backend Overview
- API Overview
- Security and Data Integrity
- Testing
- Troubleshooting
- Development Workflow
Features
- Seat reservations: View seat information and perform supported seat reservation actions.
- Resource management: Manage library resources such as books and equipment.
- Resource availability: Track total and available quantities.
- Waiting queue: Support queue-based handling for users waiting for a seat or resource, where enabled by the relevant workflow.
- Authentication and authorization: Protect operations that require a signed-in user or particular permissions.
- Reservation ownership checks: Prevent users from modifying another user's reservation or queue entry where those checks are implemented.
- Input validation: Validate request data and resource quantities on the backend.
- Conflict handling: Return appropriate errors when an operation conflicts with the current reservation or inventory state.
- Automated tests: Test backend behavior, security rules, and API integration.
Technology Stack
Technology	Role
HTML, CSS, JavaScript	Browser-based user interface
Node.js	JavaScript runtime for the backend
Express.js	HTTP server, routing, and middleware
MongoDB	Document database
Mongoose	MongoDB models, schema validation, and queries
npm	Dependency and script management
Git and GitHub	Version control and collaboration


Authentication-related packages and mechanisms should be confirmed against the current package.json and source files before changing or documenting them.
Architecture
SmartLib follows a modular client-server design:
Browser UI
   |
   | HTTP requests / JSON responses
   v
Express routes
   |
   v
Middleware
(authentication, authorization, request processing)
   |
   v
Controllers
(request handling and application rules)
   |
   v
Mongoose models
   |
   v
MongoDB
- Routes connect HTTP methods and URL paths to request handlers.
- Middleware performs cross-cutting tasks such as authentication and request processing.
- Controllers validate and process requests, call models, and return HTTP responses.
- Models define data structures and database operations.
- Utilities hold reusable helpers such as validation and identifier handling.
Project Structure
The following is a guide to the backend modules discussed in this project. Check the current branch for the exact full directory tree.
SmartLib/
├── backend/
│   ├── config/
│   │   └── db.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── reservationController.js
│   │   └── resourceController.js
│   ├── middleware/
│   │   └── auth.js
│   ├── models/
│   │   ├── Resource.js
│   │   └── Reservation.js
│   ├── routes/
│   │   └── seatRoutes.js
│   ├── utils/
│   │   ├── academicYears.js
│   │   ├── authTokens.js
│   │   ├── corsConfig.js
│   │   └── regex.js
│   ├── tests/
│   └── server.js
├── js/
├── css/
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
Some folders or filenames may differ in the current checkout; use the repository itself as the source of truth.
Getting Started
Prerequisites
Install:
- Node.js and npm
- A MongoDB database, such as a MongoDB Atlas cluster or local MongoDB
- Git
1. Clone the repository
git clone https://github.com/DivyanshGoel15/SmartLib.git
cd SmartLib
2. Install dependencies
Install dependencies from the repository root if it contains the relevant package.json:
npm install
If the backend has its own package.json, install its dependencies as well:
cd backend
npm install
Run installation only in directories that actually contain a package.json.
Environment Configuration
Create a .env file in the directory from which the application loads environment variables. The exact variable names must match the code in backend/config/db.js, backend/server.js, and any authentication configuration.

A typical configuration may look like this:
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=replace_with_a_strong_random_secret
These are illustrative names, not a guarantee that every variable is named exactly this way in the current code. Check the source before running the app.
Important security notes
- Do not commit .env files or real credentials to GitHub.
- Use strong, unique secrets outside development.
- Add .env to .gitignore.
- For MongoDB Atlas, ensure the database user credentials and Network Access allowlist are configured correctly.
- Use a separate test database for automated tests; do not run destructive tests against production data.
Running the Application
Check the scripts section in the applicable package.json and use the command defined by the project. Common examples are:
npm start
or:
npm run dev
If the backend is started from its own directory, run the command there. When the server starts, verify the terminal output and confirm that the database connection succeeds.

The frontend may be opened or served according to the existing project setup. Do not assume a particular frontend development server or port without checking the repository configuration.
Backend Overview
Resource model
The Resource model defines fields including:
- customId — optional human-readable resource identifier.
- name — resource name.
- type — restricted to Book or Equipment.
- department — associated department.
- totalQuantity — total number of units.
- availableQuantity — currently available units.
The schema validates required fields, non-negative whole-number quantities, and that available quantity does not exceed total quantity. It also enables createdAt and updatedAt timestamps and formats a convenient id field in serialized output.
Resource controller
The resource controller supports resource listing, lookup, creation, updating, and deletion. It includes input validation and conflict checks against active reservations when changing inventory.
Reservation and seat workflows
The reservation controller and seat routes coordinate seat-related operations and reservation behavior. Sensitive actions should validate the authenticated user's identity and permissions on the server, rather than trusting user IDs supplied by the browser.
API Overview
SmartLib exposes backend HTTP endpoints through Express routes. Exact endpoint paths, payloads, and authentication requirements are defined by the current route files; consult those files before relying on a particular URL.
API area	Typical purpose
Authentication	Sign-in or other authentication actions supported by the implementation
Resources	List, retrieve, create, update, and delete resources
Seats	Retrieve seat information and perform permitted seat operations
Reservations	Create, update, cancel, or release reservations where implemented
Health	Report service health if a health endpoint is configured


Common HTTP status codes
Status	Meaning
200 OK	Request succeeded
201 Created	Resource created
400 Bad Request	Input is invalid
401 Unauthorized	Authentication is missing or invalid
403 Forbidden	The authenticated user lacks permission
404 Not Found	Requested resource does not exist
409 Conflict	Request conflicts with current data or reservation state
500 Internal Server Error	Unexpected server-side error
503 Service Unavailable	Service or required dependency is unavailable


Security and Data Integrity
The backend includes security-hardening work for authentication, authorization, request validation, and reservation integrity. Important principles include:
- Authenticate requests before allowing access to protected operations.
- Enforce authorization and reservation ownership on the server.
- Derive sensitive user identity and priority data from trusted authenticated account information where the workflow requires it.
- Validate incoming values and reject malformed or unsupported data.
- Escape user-supplied search text before using it in regular expressions.
- Validate resource quantities and prevent invalid inventory states.
- Use conditional database updates or appropriate transactional safeguards when concurrent operations could conflict.
- Keep database credentials and signing secrets out of source control.
- Handle database disconnection and errors without assuming that the database is available.
No single schema validator or middleware function guarantees that all reservation race conditions are prevented. Concurrency safety must be verified across the complete reservation workflow.
Testing
Run the test command configured in package.json, commonly:
npm test
Run it from the directory that defines the test script. If the repository separates backend tests from root scripts, follow the backend's test configuration.

Tests discussed during development cover areas such as:
- Authentication and authorization
- Seat and reservation API behavior
- Reservation ownership checks
- Input validation
- Inventory and conflict handling
- API integration and error handling
Previously reported local results: 93/93 tests passed, including 7/7 integration tests, after security-hardening changes. These are historical results, not a guarantee that the current main branch or current environment has the same result. Re-run the tests before using these numbers as a current status claim.
Troubleshooting
MongoDB is disconnected
1. Check that the application loaded the intended environment variables.
2. Verify the MongoDB connection string and database credentials.
3. For MongoDB Atlas, confirm the current public IP is permitted in Network Access.
4. Check network access and the server logs.
5. Confirm the configured test database is separate from production.
Port is already in use
Another process may already be using the configured port. Stop the previous development server or configure a different available port.
API returns 401 or 403
Check that the request includes valid authentication credentials and that the signed-in user has permission to perform the operation.
API returns 409
The request may conflict with an existing reservation or inventory state. Refresh the relevant data and retry only if the operation is still valid.
Development Workflow
1. Pull the latest changes from the intended branch.
2. Create a feature branch for your work.
3. Install dependencies using the project's lock file.
4. Configure local environment variables.
5. Run the application and relevant tests.
6. Review changes before committing.
7. Commit only the intended files and open a pull request or merge according to the team's workflow.
Useful Git commands:
git status
git log -1 --oneline
git diff
npm test
