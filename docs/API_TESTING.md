SmartLib API Testing Report


1. Overview
This document records the API tests performed against the deployed
SmartLib backend using Postman.

- Frontend: https://smartlib-frontend-nhu7.onrender.com

- Backend: https://smartlib-sjya.onrender.com

- Testing tool: Postman

- Database: MongoDB Atlas

- Test scope: Health, authentication, exams, reservations,
  resources, and seats/waiting queues
This report documents observed test outcomes from the testing session.

It is not a substitute for a complete automated test suite or a
security audit. Where an exact HTTP status was not explicitly
recorded, the result is described without claiming a specific status
code.

2. Test Summary
  API area                Tests performed          Observed result
  Health                  Backend health check     Passed

  Authentication          Register, login,         Passed
                          current-user lookup      

  Exams                   List, department filter, Passed
                          fetch by ID, create      

  Reservations            List, create, fetch by   Passed
                          ID, return, PATCH, PUT,
                          delete, verify deletion  

  Resources               List,                    Passed
                          department/type/search
                          filters, create, fetch
                          by ID, PUT, PATCH,
                          delete, verify deletion  

  Seats                   List, department query   Passed
                          filter, department path,
                          occupy, queue, priority
                          order, duplicate
                          prevention, leave queue,
                          release and priority
                          handoff, release with
                      empty queue              


3. Environment and Safety
The deployed API base URL is:

https://smartlib-sjya.onrender.com

The frontend URL is:

https://smartlib-frontend-nhu7.onrender.com
Important test-data notes
- Temporary records were created for API testing.
- The test exam was named API Test Exam - Delete Later.
- The temporary reservation used custom ID API-TEST-RES-001 and was
  deleted after testing.
- The temporary resource used custom ID API-TEST-RES-999 and was
  deleted after testing.
- Seat testing used seat code CSE-S01 and test-only student IDs. The
  release workflow was tested and the seat was confirmed to be
  available at the end.
- Before repeating these tests, check the live database to ensure that
  test data is not still present.
- Do not commit credentials, JWTs, .env files, database connection
  strings, or other secrets to Git.


4. Health API
Test: Backend health check
- Method: GET
- Endpoint: /api/health
- Full URL: https://smartlib-sjya.onrender.com/api/health
- Observed result: Passed
- Verification: The response reported status: ok and the
  database was connected.


5. Authentication APIs

5.1 Register
- Method: POST
- Endpoint: /api/auth/register
- Observed result: Passed
- Verification: A test account was created and persisted to
  MongoDB.
The registration controller supports fields such as name, email,
password, role, department, year, studentId, rollNumber, and
adminSecret, subject to role-specific validation.

5.2 Login
- Method: POST
- Endpoint: /api/auth/login
- Observed result: Passed
- Verification: Login succeeded for the test student account.

5.3 Current user
- Method: GET
- Endpoint: /api/auth/me
- Authentication: Bearer token required
- Observed result: Passed
- Verification: The endpoint returned the authenticated user's
  information.
Security note: Never store or publish real passwords or bearer
tokens in this document, screenshots, Git commits, or shared Postman
collections.


6. Exam APIs
The following routes were verified:

  Method   Endpoint                      Observed result
  GET    /api/exams                  Passed
  GET    /api/exams/department/CSE   Passed
  GET    /api/exams/:id              Passed
  POST   /api/exams                  Passed; created a clearly labelled test exam

The test exam used these details:
- Name: API Test Exam - Delete Later
- Department: CSE
- Year: 3rd Year
- Date: 2026-11-15
- Venue: API Testing Room
- Faculty name: API Test Faculty
The create request was tested using the test faculty account. The
creation succeeded.

Cleanup note: Verify whether the test exam still exists before
deleting it. Do not delete any real exam records.


7. Reservation APIs
The following reservation operations were verified:

  Method     Endpoint                                 Observed result
  GET      /api/reservations                      Passed
  POST     /api/reservations                      Passed; test reservation created
  GET      /api/reservations/:id                  Passed
  POST     /api/reservations/:id/return           Passed
  PATCH    /api/reservations/:id                  Passed
  PUT      /api/reservations/:id                  Passed
  DELETE   /api/reservations/:id                  Passed
  GET      /api/reservations/:id after deletion   Confirmed not found

The test reservation used custom ID API-TEST-RES-001. After the return
workflow, the resource availability was checked and restored to 5. The
test reservation was then deleted, and a subsequent GET confirmed it was
no longer found.
Reservation security observation
The supplied reservationRoutes.js showed no authentication middleware
on the list, create, return, fetch, update, or delete routes. These
routes should be reviewed and protected with authentication and
authorization appropriate to each operation before production use.


8. Resource APIs
The following operations were verified:
  Method                  Endpoint                            Observed result
  GET                   /api/resources                    Passed

  GET                   /api/resources?department=CSE     Passed

  GET                   /api/resources?type=Book          Passed

  GET                   /api/resources?search=Python      Passed

  POST                  /api/resources                    Passed; test resource
                                                              created

  GET                   /api/resources/API-TEST-RES-999   Passed

  PUT                   /api/resources/API-TEST-RES-999   Passed

  PATCH                 /api/resources/API-TEST-RES-999   Passed

  DELETE                /api/resources/API-TEST-RES-999   Passed

  GET                   /api/resources/API-TEST-RES-999   Confirmed not found
                      after deletion                      
The temporary resource used custom ID API-TEST-RES-999 and name
API Test Resource - Delete Later. The PUT request changed the name,
the PATCH request changed the type, and the resource was subsequently
deleted. A final GET confirmed that it was no longer found.
Resource security observation
The supplied resourceRoutes.js showed no authentication middleware on
create, update, or delete operations. Restrict write operations to
authenticated users with appropriate roles before production use.


9. Seat and Waiting-Queue APIs
The following routes were verified:

  Method     Endpoint                                  Observed result
  GET      /api/seats                              Passed
  GET      /api/seats?department=CSE               Passed
  GET      /api/seats/CSE                          Passed
  PUT      /api/seats/:seatCode/occupy             Passed
  POST     /api/seats/:seatCode/queue              Passed
  DELETE   /api/seats/:seatCode/queue/:studentId   Passed
  PUT      /api/seats/:seatCode/release            Passed
Occupancy and queue scenarios
Testing used seat code CSE-S01 and test-only student IDs.

The following scenarios passed:
1. An available seat was occupied by a test student.
2. A second test student joined the waiting queue.
3. A higher-priority test student joined the queue.
4. The queue order placed the higher-priority student first.
5. Attempting to add the same student twice returned 409 Conflict
   with Student is already in this queue.
6. Removing a queued student succeeded.
7. Releasing the seat assigned it to the highest-priority waiting
   student.
8. The assigned student was removed from the queue.
9. Releasing the occupied seat again, with no one waiting, made the
   seat available and cleared the occupant.
Seat validation scenarios
The following validation behavior was also checked:
- Re-occupying an already occupied seat returned 409 Conflict.
- Queueing on an available seat is expected to return 409 Conflict,
  according to the route implementation.
- Missing studentId or studentName for occupancy is expected to
  return 400 Bad Request, according to the route implementation.
- Releasing a nonexistent or non-occupied seat is expected to return
  404 Not Found, according to the route implementation.
The last three outcomes are listed as expected behavior from code
inspection; only mark them as executed tests if you actually sent those
requests and observed the responses.
Seat security observation
The supplied seatRoutes.js showed no authentication middleware on seat
occupancy, release, or queue operations. These operations can change
seat assignments and should be protected with authentication and
authorization before production use.
10. Known Issues and Recommended Follow-up
1. Add authentication and role-based authorization. Review
   reservation, resource write, and seat mutation endpoints.
2. Review public registration roles. The registration controller
   appears to allow faculty registration without an additional approval
   step. Confirm whether this is intentional and prevent unauthorized
   privilege escalation.
3. Run frontend end-to-end tests. API tests alone do not prove that
   the deployed website's forms, session handling, portals, and UI
   actions work correctly.
4. Confirm cleanup. Check the live database for test records before
   presenting the system or running tests again.
5. Add automated tests. Consider repeatable integration tests for
   success cases, validation errors, authorization, and not-found
   cases.
6. Protect secrets. Keep .env, JWT secrets, admin secrets,
   passwords, and bearer tokens out of source control and
   documentation.

   
11. Overall Result
The API operations listed in this report were tested manually in Postman
and reported as successful, except where the document explicitly labels
a result as expected from code inspection rather than a confirmed
request. The next recommended stage is end-to-end testing of the
deployed SmartLib frontend and a security review of the API routes.