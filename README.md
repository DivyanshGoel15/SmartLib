# SmartLib
Department-Wise Library Resource, Seat Reservation & Priority Queue System

SmartLib is a full-stack library management system featuring department-wise seat allocation, priority queues, physical resource catalog reservations, examination scheduling, and role-based administration for Students, Faculty, and Library Administrators.

## Project Structure
- `landingpage/` — Landing, login, and registration portals with responsive authentication UI.
- `home/studentportal/` — Student dashboard with department exam schedules, profile management, and quick navigation.
- `facultyportal/` — Faculty portal for departmental examination scheduling and management.
- `adminportal/` — Library administration workspace for managing the student directory and library resources.
- `resources/` — Resource catalog with live stock tracking, category/department filtering, and reservation checkout.
- `reservations/` — Student active and historical reservation tracking with resource return workflows.
- `seats.html` / `js/seats.js` — Dynamic department seat layout with priority queue waiting lists.
- `backend/` — Express.js REST API with MongoDB Atlas persistence, MVC pattern, RFC 7519 JWT session authentication, bcrypt password hashing, and role-based access control.

## Quick Start
1. Navigate to `backend/` and install dependencies: `npm install`
2. Start the backend: `npm start` (runs on `http://localhost:5000`)
3. Open `landingpage/landingpage.html` in your browser to begin testing.
4. Detailed API documentation, test runners, and demo workflows are in `backend/README.md`.
