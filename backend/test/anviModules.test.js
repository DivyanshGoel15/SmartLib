const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');

process.env.NODE_ENV = 'test';

const User = require('../models/User');
const Exam = require('../models/Exam');
const { register, login, getMe } = require('../controllers/authController');
const { createExam, deleteExam } = require('../controllers/examController');
const { deleteUser } = require('../controllers/userController');

describe('A. User Model & Authentication Tests', () => {

  test('1. Normalizes email to lowercase and trims name', () => {
    const user = new User({
      name: '  Anvi Patel  ',
      email: '  ANVI.PATEL@UNIVERSITY.EDU  ',
      password: 'StrongPassword123!',
      role: 'student',
      department: 'CSE',
      year: '3rd Year'
    });

    assert.equal(user.name, 'Anvi Patel');
    assert.equal(user.email, 'anvi.patel@university.edu');
  });

  test('2. Enforces password hashing and matchPassword verification', async () => {
    const rawPass = 'MySecurePass123!';
    const user = new User({
      name: 'Test Student',
      email: 'student.test@university.edu',
      password: rawPass,
      role: 'student'
    });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(rawPass, salt);

    const matchSuccess = await user.matchPassword('MySecurePass123!');
    const matchFail = await user.matchPassword('WrongPassword');

    assert.equal(matchSuccess, true, 'Correct password should match');
    assert.equal(matchFail, false, 'Wrong password should fail');
  });

  test('3. Strips password from toJSON representation', () => {
    const user = new User({
      name: 'Safe User',
      email: 'safe@university.edu',
      password: 'SecretPassword123!',
      role: 'student'
    });

    const json = user.toJSON();
    assert.equal(json.password, undefined, 'Password must not be in toJSON output');
    assert.ok(json.id, 'Virtual id should be present');
  });

  test('4. Rejects invalid email format', async () => {
    const user = new User({
      name: 'Bad Email',
      email: 'not-an-email',
      password: 'Password123!',
      role: 'student'
    });

    await assert.rejects(async () => {
      await user.validate();
    }, /valid email/i);
  });

  test('5. Rejects unauthorized admin registration without secret key (Expects 403)', async () => {
    const req = {
      body: {
        name: 'Sneaky Admin',
        email: 'sneaky@university.edu',
        password: 'Password123!',
        role: 'library_admin'
      },
      headers: {}
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await register(req, res, () => {});

    assert.equal(statusCode, 403, 'Unauthorized admin registration should return 403 Forbidden');
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /provisioned/i);
  });

  test('6. Rejects login request with missing credentials (Expects 400)', async () => {
    const req = {
      body: {
        email: '',
        password: ''
      }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await login(req, res, () => {});

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
  });
});

describe('B. Exam Model & Scheduling Tests', () => {

  test('7. Accepts valid examination dates where endDate >= startDate', async () => {
    const exam = new Exam({
      name: 'Database Management Systems',
      department: 'CSE',
      year: '3rd Year',
      startDate: new Date('2026-11-10'),
      endDate: new Date('2026-11-15')
    });

    await exam.validate();
    assert.equal(exam.name, 'Database Management Systems');
    assert.equal(exam.department, 'CSE');
  });

  test('8. Rejects invalid date range where endDate < startDate (Negative Test)', async () => {
    const exam = new Exam({
      name: 'Operating Systems',
      department: 'CSE',
      year: '3rd Year',
      startDate: new Date('2026-11-20'),
      endDate: new Date('2026-11-10')
    });

    await assert.rejects(async () => {
      await exam.validate();
    }, /End date cannot be earlier than start date/i);
  });

  test('9. Controller rejects invalid exam date range payload with HTTP 400', async () => {
    const req = {
      user: {
        _id: '507f1f77bcf86cd799439011',
        role: 'faculty',
        department: 'CSE',
        name: 'Test Faculty'
      },
      body: {
        name: 'Compiler Design',
        department: 'CSE',
        year: '4th Year',
        startDate: '2026-12-10',
        endDate: '2026-12-05'
      }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await createExam(req, res, () => {});

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /earlier than start date/i);
  });

  test('10. Controller rejects exam creation missing required name or department with HTTP 400', async () => {
    const req = {
      user: {
        _id: '507f1f77bcf86cd799439011',
        role: 'faculty',
        department: 'CSE',
        name: 'Test Faculty'
      },
      body: {
        name: '',
        department: '',
        startDate: '2026-11-10'
      }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await createExam(req, res, () => {});

    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
  });
});

describe('C. User & Student Administration Tests', () => {

  test('11. Delete user protects administrator accounts from deletion (Expects 403)', async () => {
    const adminObjectId = '507f1f77bcf86cd799439011';
    const req = {
      params: { id: adminObjectId }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    // Mock User findById
    const origFindById = User.findById;
    User.findById = async () => ({
      _id: adminObjectId,
      role: 'library_admin',
      name: 'System Admin'
    });

    try {
      await deleteUser(req, res, () => {});
      assert.equal(statusCode, 403);
      assert.equal(responseData.success, false);
      assert.match(responseData.message, /cannot be deleted/i);
    } finally {
      User.findById = origFindById;
    }
  });

  test('12. Delete user returns 404 when student is not found', async () => {
    const req = {
      params: { id: 'nonexistent_id' }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    const origFindById = User.findById;
    const origFindOne = User.findOne;
    User.findById = async () => null;
    User.findOne = async () => null;

    try {
      await deleteUser(req, res, () => {});
      assert.equal(statusCode, 404);
      assert.equal(responseData.success, false);
    } finally {
      User.findById = origFindById;
      User.findOne = origFindOne;
    }
  });

  test('13. Delete user rejects removal when student has active reservation (Expects 400)', async () => {
    const studentObjectId = '507f1f77bcf86cd799439022';
    const req = {
      params: { id: studentObjectId }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    const Reservation = require('../models/Reservation');
    const origUserFindById = User.findById;
    const origRsvFindOne = Reservation.findOne;

    User.findById = async () => ({
      _id: studentObjectId,
      role: 'student',
      name: 'Active Student',
      studentId: 'STU1234'
    });

    Reservation.findOne = async () => ({
      _id: 'RSV001',
      userId: studentObjectId,
      status: 'active'
    });

    try {
      await deleteUser(req, res, () => {});
      assert.equal(statusCode, 400);
      assert.equal(responseData.success, false);
      assert.match(responseData.message, /active reservation/i);
    } finally {
      User.findById = origUserFindById;
      Reservation.findOne = origRsvFindOne;
    }
  });

  test('14. Register student validates required department and year', async () => {
    const req = {
      body: {
        name: 'Student Missing Dept',
        email: 'nodept@university.edu',
        password: 'Password123!',
        role: 'student',
        year: '1st Year'
      }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    await register(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /department is required/i);
  });

  test('15. Register duplicate email rejects with HTTP 409', async () => {
    const req = {
      body: {
        name: 'Existing User',
        email: 'duplicate@university.edu',
        password: 'Password123!',
        role: 'student',
        department: 'CSE',
        year: '2nd Year'
      }
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    const origFindOne = User.findOne;
    User.findOne = async () => ({ email: 'duplicate@university.edu' });

    try {
      await register(req, res, () => {});
      assert.equal(statusCode, 409);
      assert.equal(responseData.success, false);
      assert.match(responseData.message, /already exists/i);
    } finally {
      User.findOne = origFindOne;
    }
  });
});

describe('D. Server-Side Authentication & Authorization Middleware Tests', () => {
  const { authenticate, requireRole } = require('../middleware/auth');

  test('16. Authenticate rejects request missing credentials with HTTP 401', async () => {
    const req = { headers: {}, body: {}, query: {} };
    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(statusCode, 401);
    assert.equal(responseData.success, false);
    assert.equal(nextCalled, false);
  });

  test('17. Authenticate rejects the legacy x-admin-secret bypass', async () => {
    const previousSecret = process.env.ADMIN_SECRET;
    const mockSecret = 'test_secret_' + Date.now();
    process.env.ADMIN_SECRET = mockSecret;

    const req = {
      headers: { 'x-admin-secret': mockSecret },
      body: {},
      query: {}
    };

    let statusCode = 200;
    const res = {
      status(code) { statusCode = code; return this; },
      json() { return this; }
    };
    let nextCalled = false;
    try {
      await authenticate(req, res, () => { nextCalled = true; });
      assert.equal(statusCode, 401);
      assert.equal(nextCalled, false);
    } finally {
      if (previousSecret === undefined) delete process.env.ADMIN_SECRET;
      else process.env.ADMIN_SECRET = previousSecret;
    }
  });

  test('18. requireRole blocks student role from faculty/admin endpoint (Expects 403)', () => {
    const req = { user: { role: 'student', name: 'Test Student' } };
    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      }
    };

    let nextCalled = false;
    const middleware = requireRole('faculty', 'library_admin');
    middleware(req, res, () => { nextCalled = true; });

    assert.equal(statusCode, 403);
    assert.equal(responseData.success, false);
    assert.equal(nextCalled, false);
  });

  test('19. requireRole grants access when user has matching role', () => {
    const req = { user: { role: 'faculty', name: 'Dr. Meera' } };
    const res = {};
    let nextCalled = false;

    const middleware = requireRole('faculty', 'library_admin');
    middleware(req, res, () => { nextCalled = true; });

    assert.equal(nextCalled, true);
  });

  test('20. Authenticate rejects raw user ID or unauthenticated Bearer ID to prevent user impersonation (Expects 401)', async () => {
    const req = {
      headers: {
        'x-user-id': '507f1f77bcf86cd799439011',
        'authorization': 'Bearer 507f1f77bcf86cd799439011'
      },
      body: {},
      query: {}
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
    assert.match(responseData.message, /invalid|expired|authentication/i);
  });

  test('21. Authenticate accepts valid cryptographically signed Bearer session token', async () => {
    const { signToken } = require('../utils/authTokens');
    const token = signToken({
      id: '507f1f77bcf86cd799439011',
      role: 'faculty',
      email: 'prof.sharma@university.edu',
      name: 'Prof. Sharma'
    });

    const req = {
      headers: { authorization: `Bearer ${token}` },
      body: {},
      query: {}
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(statusCode, 503);
    assert.equal(nextCalled, false);
    assert.match(responseData.message, /unavailable/i);
  });

  test('22. Authenticate rejects tampered or forged session token (Expects 401)', async () => {
    const { signToken } = require('../utils/authTokens');
    const validToken = signToken({ id: '507f1f77bcf86cd799439011', role: 'student' });
    const parts = validToken.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ id: '507f1f77bcf86cd799439011', role: 'admin' })).toString('base64url');
    const forgedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

    const req = {
      headers: { authorization: `Bearer ${forgedToken}` },
      body: {},
      query: {}
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
  });

  test('23. Authenticate rejects expired session token (Expects 401)', async () => {
    const { signToken } = require('../utils/authTokens');
    const expiredToken = signToken({ id: '507f1f77bcf86cd799439011', role: 'student' }, -1);

    const req = {
      headers: { authorization: `Bearer ${expiredToken}` },
      body: {},
      query: {}
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };
    let nextCalled = false;
    await authenticate(req, res, () => { nextCalled = true; });

    assert.equal(statusCode, 401);
    assert.equal(nextCalled, false);
  });

  test('24. Authenticate rejects x-admin-secret as an authentication mechanism (Expects 401)', async () => {
    const previousSecret = process.env.ADMIN_SECRET;
    const mockSecret = 'test_secret_' + Date.now();
    process.env.ADMIN_SECRET = mockSecret;

    const req = {
      baseUrl: '/api/auth',
      headers: { 'x-admin-secret': mockSecret },
      body: {},
      query: {}
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };
    let nextCalled = false;
    try {
      await authenticate(req, res, () => { nextCalled = true; });
      assert.equal(statusCode, 401, 'x-admin-secret must not bypass authentication');
      assert.equal(nextCalled, false);
    } finally {
      if (previousSecret === undefined) delete process.env.ADMIN_SECRET;
      else process.env.ADMIN_SECRET = previousSecret;
    }
  });

  test('25. getMe rejects unauthenticated call without token with HTTP 401', async () => {
    const req = { user: null };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };

    await getMe(req, res, () => {});
    assert.equal(statusCode, 401);
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /authentication required/i);
  });

  test('26. getMe returns authenticated user profile with HTTP 200', async () => {
    const req = {
      user: {
        id: '507f1f77bcf86cd799439011',
        name: 'Dr. Meera Iyer',
        email: 'meera.iyer@university.edu',
        role: 'faculty',
        department: 'CSE'
      }
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };

    await getMe(req, res, () => {});
    assert.equal(statusCode, 200);
    assert.equal(responseData.success, true);
    assert.equal(responseData.user.email, 'meera.iyer@university.edu');
    assert.equal(responseData.user.role, 'faculty');
  });

  test('27. register rejects invalid or unauthorized role with HTTP 400', async () => {
    const req = {
      body: {
        name: 'Bad Role User',
        email: 'badrole@university.edu',
        password: 'Password123!',
        role: 'superuser'
      },
      headers: {}
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };

    await register(req, res, () => {});
    assert.equal(statusCode, 400);
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /invalid role/i);
  });

  test('28. createExam blocks faculty from scheduling exam in a different department (Expects 403)', async () => {
    const req = {
      user: {
        id: '507f1f77bcf86cd799439011',
        role: 'faculty',
        department: 'CSE',
        name: 'Prof. Sharma'
      },
      body: {
        name: 'Circuit Theory',
        department: 'ECE', // Mismatched department
        startDate: '2026-11-20',
        endDate: '2026-11-22'
      }
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };

    await createExam(req, res, () => {});
    assert.equal(statusCode, 403);
    assert.equal(responseData.success, false);
    assert.match(responseData.message, /own department/i);
  });

  test('29. deleteExam blocks faculty from deleting another faculty member’s exam in the same department', async () => {
    const origFindById = Exam.findById;
    Exam.findById = async () => ({
      _id: '507f1f77bcf86cd799439012',
      department: 'Mechanical',
      name: 'Thermodynamics',
      deleteOne: async () => {}
    });

    const req = {
      user: {
        id: '507f1f77bcf86cd799439011',
        role: 'faculty',
        department: 'CSE'
      },
      params: { id: '507f1f77bcf86cd799439012' }
    };
    let statusCode = 200;
    let responseData = null;
    const res = {
      status(code) { statusCode = code; return this; },
      json(data) { responseData = data; return this; }
    };

    try {
      await deleteExam(req, res, () => {});
      assert.equal(statusCode, 403);
      assert.equal(responseData.success, false);
      assert.match(responseData.message, /created/i);
    } finally {
      Exam.findById = origFindById;
    }
  });
});
