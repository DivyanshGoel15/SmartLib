const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const User = require('../models/User');
const Exam = require('../models/Exam');
const Resource = require('../models/Resource');
const Reservation = require('../models/Reservation');
const Seat = require('../models/Seat');
const seatRoutes = require('../routes/seatRoutes');
const { authenticate, requireRole } = require('../middleware/auth');
const { errorHandler } = require('../middleware/errorHandler');
const { signToken, assertAuthConfiguration } = require('../utils/authTokens');
const { resolveAdminConfig } = require('../scripts/seedAdmin');
const { escapeRegex } = require('../utils/regex');
const { resolveCorsOptions } = require('../utils/corsConfig');
const { assertWriteConfirmation } = require('../seedSeats');
const { connectDB } = require('../config/db');
const { register } = require('../controllers/authController');
const { createExam, deleteExam } = require('../controllers/examController');
const { createStudent } = require('../controllers/userController');
const {
  createReservation,
  getReservationById,
  returnReservation
} = require('../controllers/reservationController');
const { createResource, updateResource } = require('../controllers/resourceController');

const originalEnv = {
  nodeEnv: process.env.NODE_ENV,
  jwtSecret: process.env.JWT_SECRET,
  adminSecret: process.env.ADMIN_SECRET
};
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'unit-test-only-jwt-secret';

function responseMock() {
  return {
    statusCode: 200,
    data: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    }
  };
}

async function withStubs(stubs, callback) {
  const targets = {
    Exam,
    Reservation,
    ReservationPrototype: Reservation.prototype,
    Resource,
    Seat,
    User
  };
  const originals = [];
  try {
    for (const [name, replacements] of Object.entries(stubs)) {
      const target = targets[name];
      assert.ok(target, `Unknown stub target: ${name}`);
      const saved = {};
      for (const key of Object.keys(replacements)) {
        saved[key] = {
          value: target[key],
          own: Object.prototype.hasOwnProperty.call(target, key)
        };
        target[key] = replacements[key];
      }
      originals.push([target, saved]);
    }
    return await callback();
  } finally {
    for (const [target, saved] of originals.reverse()) {
      for (const [key, original] of Object.entries(saved)) {
        if (original.own) target[key] = original.value;
        else delete target[key];
      }
    }
  }
}

function routeHandler(path, method) {
  const layer = seatRoutes.stack.find(item =>
    item.route && item.route.path === path && item.route.methods[method]
  );
  assert.ok(layer, `Expected ${method.toUpperCase()} ${path} route`);
  return layer.route.stack[layer.route.stack.length - 1].handle;
}

describe('Security hardening unit tests', () => {
  test('authentication rejects missing and invalid tokens', async () => {
    for (const headers of [{}, { authorization: 'Bearer not.a.valid.token' }]) {
      const res = responseMock();
      let nextCalled = false;
      await authenticate({ headers }, res, () => { nextCalled = true; });
      assert.equal(res.statusCode, 401);
      assert.equal(nextCalled, false);
    }
  });

  test('a valid signed token is rejected when its account database is unavailable', async () => {
    const res = responseMock();
    let nextCalled = false;
    await authenticate(
      { headers: { authorization: `Bearer ${signToken({ id: '507f1f77bcf86cd799439011', role: 'admin' })}` } },
      res,
      () => { nextCalled = true; }
    );
    assert.equal(res.statusCode, 503);
    assert.equal(nextCalled, false);
  });

  test('production startup requires an explicitly configured JWT secret', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwtSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      assert.throws(assertAuthConfiguration, /JWT_SECRET must be configured/i);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  test('production rejects JWT secrets shorter than 32 bytes', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousJwtSecret = process.env.JWT_SECRET;
    try {
      process.env.NODE_ENV = 'production';
      process.env.JWT_SECRET = 'short-secret';
      assert.throws(assertAuthConfiguration, /at least 32 bytes/i);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousJwtSecret === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = previousJwtSecret;
    }
  });

  test('production CORS requires explicit exact trusted origins', () => {
    assert.throws(
      () => resolveCorsOptions({ NODE_ENV: 'production' }),
      /CLIENT_ORIGIN must list explicit trusted origins/i
    );
    assert.throws(
      () => resolveCorsOptions({ NODE_ENV: 'production', CLIENT_ORIGIN: '*' }),
      /CLIENT_ORIGIN must list explicit trusted origins/i
    );
    assert.throws(
      () => resolveCorsOptions({ NODE_ENV: 'production', CLIENT_ORIGIN: 'not-an-origin' }),
      /CLIENT_ORIGIN must contain valid HTTP or HTTPS origins/i
    );
    assert.deepEqual(
      resolveCorsOptions({
        NODE_ENV: 'production',
        CLIENT_ORIGIN: 'https://frontend.example.test,https://admin.example.test'
      }).origin,
      ['https://frontend.example.test', 'https://admin.example.test']
    );
  });

  test('administrator provisioning requires explicit credentials and write confirmation', () => {
    assert.throws(
      () => resolveAdminConfig({}, ['--confirm-smartlib-write']),
      /INITIAL_ADMIN_EMAIL must be explicitly configured/
    );
    assert.throws(
      () => resolveAdminConfig({
        INITIAL_ADMIN_EMAIL: 'admin@example.test',
        INITIAL_ADMIN_PASSWORD: 'short'
      }, ['--confirm-smartlib-write']),
      /at least 12 characters/
    );
    assert.throws(
      () => resolveAdminConfig({
        INITIAL_ADMIN_EMAIL: 'admin@example.test',
        INITIAL_ADMIN_PASSWORD: 'UseAUniqueAdminPassword123!'
      }),
      /without --confirm-smartlib-write/
    );
    assert.equal(
      resolveAdminConfig({
        INITIAL_ADMIN_EMAIL: ' ADMIN@example.test ',
        INITIAL_ADMIN_PASSWORD: 'UseAUniqueAdminPassword123!'
      }, ['--confirm-smartlib-write']).adminEmail,
      'admin@example.test'
    );
  });

  test('seat seeding requires explicit write confirmation', () => {
    assert.throws(
      () => assertWriteConfirmation([]),
      /without --confirm-smartlib-write/
    );
    assert.doesNotThrow(() => assertWriteConfirmation(['--confirm-smartlib-write']));
  });

  test('production error responses do not disclose internal error messages', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      const res = responseMock();
      errorHandler(new Error('database connection details'), {}, res, () => {});
      assert.equal(res.statusCode, 500);
      assert.equal(res.data.message, 'Internal Server Error');
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  test('search text is treated as a literal regular-expression value', () => {
    assert.equal(escapeRegex('CSE.*(admin)'), 'CSE\\.\\*\\(admin\\)');
  });

  test('test database connections require a dedicated smartlib_test URI', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    const previousTestUri = process.env.TEST_MONGODB_URI;
    const previousMongoUri = process.env.MONGODB_URI;
    const previousAlternateUri = process.env.MONGO_URI;
    const originalConnect = mongoose.connect;
    let connectionAttempts = 0;
    mongoose.connect = async () => {
      connectionAttempts += 1;
      throw new Error('Unexpected database connection attempt.');
    };
    try {
      process.env.NODE_ENV = 'test';
      delete process.env.TEST_MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/smartlib';
      await assert.rejects(
        connectDB({ logErrors: false }),
        /TEST_MONGODB_URI must be explicitly configured/i
      );

      process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/smartlib';
      await assert.rejects(
        connectDB({ logErrors: false }),
        /isolated smartlib_test database/i
      );

      process.env.TEST_MONGODB_URI = 'https://127.0.0.1/smartlib_test';
      await assert.rejects(
        connectDB({ logErrors: false }),
        /valid MongoDB connection URI/i
      );

      process.env.TEST_MONGODB_URI = 'mongodb://127.0.0.1:27017/smartlib_test';
      process.env.NODE_ENV = 'production';
      process.env.MONGODB_URI = 'mongodb://primary-host/smartlib';
      process.env.MONGO_URI = 'mongodb://other-host/smartlib';
      await assert.rejects(
        connectDB({ logErrors: false }),
        /MONGODB_URI and MONGO_URI disagree/i
      );
      process.env.MONGO_URI = process.env.MONGODB_URI;
      process.env.MONGODB_URI = 'mongodb://primary-host/other';
      process.env.MONGO_URI = process.env.MONGODB_URI;
      await assert.rejects(
        connectDB({ logErrors: false }),
        /must target the smartlib database/i
      );
      assert.equal(connectionAttempts, 0);
    } finally {
      mongoose.connect = originalConnect;
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
      if (previousTestUri === undefined) delete process.env.TEST_MONGODB_URI;
      else process.env.TEST_MONGODB_URI = previousTestUri;
      if (previousMongoUri === undefined) delete process.env.MONGODB_URI;
      else process.env.MONGODB_URI = previousMongoUri;
      if (previousAlternateUri === undefined) delete process.env.MONGO_URI;
      else process.env.MONGO_URI = previousAlternateUri;
    }
  });

  test('public registration cannot grant faculty or administrator privileges without approval', async () => {
    for (const role of ['faculty', 'library_admin', 'admin']) {
      const res = responseMock();
      await register(
        {
          body: {
            name: 'Unapproved Account',
            email: `${role}@example.test`,
            password: 'Password123!',
            role,
            adminSecret: 'client-provided',
            facultySecret: ''
          },
          headers: { 'x-admin-secret': 'client-provided' }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 403);
    }
  });

  test('student registration rejects academic years outside the supported list', async () => {
    const res = responseMock();
    await register(
      {
        body: {
          name: 'Student',
          email: 'student@example.test',
          password: 'Password123!',
          role: 'student',
          department: 'CSE',
          year: '9999 Year'
        }
      },
      res,
      error => { throw error; }
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.data.message, /Academic year must be one of/i);
  });

  test('registration rejects malformed field types before querying for an account', async () => {
    const res = responseMock();
    await register(
      {
        body: {
          name: { $ne: '' },
          email: 'student@example.test',
          password: 'Password123!',
          role: 'student',
          department: 'CSE',
          year: '1st Year'
        }
      },
      res,
      error => { throw error; }
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.data.message, /full name/i);
  });

  test('administrator-created students reject unsupported academic years before querying the database', async () => {
    const res = responseMock();
    await createStudent(
      {
        body: {
          name: 'Student',
          studentId: 'S-100',
          email: 'student@example.test',
          department: 'CSE',
          year: '9999 Year',
          password: 'Password123!'
        }
      },
      res,
      error => { throw error; }
    );
    assert.equal(res.statusCode, 400);
    assert.match(res.data.message, /Academic year must be one of/i);
  });

  test('role checks distinguish admin from library_admin', () => {
    const res = responseMock();
    let nextCalled = false;
    requireRole('library_admin')(
      { user: { role: 'admin' } },
      res,
      () => { nextCalled = true; }
    );
    assert.equal(res.statusCode, 403);
    assert.equal(nextCalled, false);
  });

  test('students cannot fetch another user’s reservation', async () => {
    const ownerId = new mongoose.Types.ObjectId();
    const requesterId = new mongoose.Types.ObjectId();
    await withStubs({
      Reservation: {
        findById: async () => ({ _id: new mongoose.Types.ObjectId(), userId: String(ownerId) })
      }
    }, async () => {
      const res = responseMock();
      await getReservationById(
        { params: { id: String(new mongoose.Types.ObjectId()) }, user: { _id: requesterId, role: 'student' } },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 404);
      assert.equal(res.data.success, false);
    });
  });

  test('returning an already-returned reservation cannot restore inventory again', async () => {
    let inventoryUpdates = 0;
    await withStubs({
      Reservation: {
        findById: async () => ({
          _id: new mongoose.Types.ObjectId(),
          userId: 'owner-id',
          status: 'returned'
        }),
        findOneAndUpdate: async () => { inventoryUpdates += 1; }
      }
    }, async () => {
      const res = responseMock();
      await returnReservation(
        {
          params: { id: String(new mongoose.Types.ObjectId()) },
          user: { _id: 'owner-id', role: 'student' }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 409);
      assert.equal(inventoryUpdates, 0);
    });
  });

  test('failed reservation allocation removes the tentative reservation and ignores claimed identity', async () => {
    const userId = new mongoose.Types.ObjectId();
    let savedReservation;
    let removedReservation;
    let allocationFilter;
    let allocationUpdate;
    const resourceId = new mongoose.Types.ObjectId();
    await withStubs({
      Resource: {
        findOne: async () => ({
          _id: resourceId,
          customId: 'RES-TEST',
          name: 'Test resource'
        }),
        findOneAndUpdate: async (filter, update) => {
          allocationFilter = filter;
          allocationUpdate = update;
          return null;
        }
      },
      Reservation: {
        findOne: async () => null,
        countDocuments: async () => 0,
        deleteOne: async query => { removedReservation = query; return { deletedCount: 1 }; }
      },
      ReservationPrototype: {
        save: async function () {
          savedReservation = this;
          return { _id: new mongoose.Types.ObjectId() };
        }
      }
    }, async () => {
      const res = responseMock();
      await createReservation(
        {
          user: {
            _id: userId,
            name: 'Authenticated User',
            email: 'user@example.test',
            department: 'CSE',
            year: '2nd Year',
            role: 'student'
          },
          body: {
            resourceId: 'RES-TEST',
            userId: 'forged-user-id',
            userName: 'Forged Name',
            userRole: 'admin'
          }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 409);
      assert.equal(savedReservation.userId, String(userId));
      assert.equal(savedReservation.userName, 'Authenticated User');
      assert.equal(savedReservation.userRole, 'student');
      assert.ok(removedReservation);
      assert.deepEqual(allocationFilter.availableQuantity, { $gt: 0 });
      assert.deepEqual(allocationUpdate.$inc, { availableQuantity: -1 });
    });
  });

  test('resource creation rejects fractional inventory quantities', async () => {
    const res = responseMock();
    await createResource(
      { body: { name: 'Test', department: 'CSE', totalQuantity: 1.5 } },
      res,
      error => { throw error; }
    );
    assert.equal(res.statusCode, 400);
  });

  test('resource updates cannot reduce quantity below active reservations', async () => {
    const resourceId = new mongoose.Types.ObjectId();
    let writes = 0;
    await withStubs({
      Resource: {
        findOne: async () => ({
          _id: resourceId,
          customId: 'RES-TEST',
          totalQuantity: 4,
          availableQuantity: 2
        }),
        findOneAndUpdate: async () => { writes += 1; }
      },
      Reservation: {
        countDocuments: async () => 2
      }
    }, async () => {
      const res = responseMock();
      await updateResource(
        { params: { id: 'RES-TEST' }, body: { totalQuantity: 1 } },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 409);
      assert.equal(writes, 0);
    });
  });

  test('faculty cannot delete another faculty member’s exam in the same department', async () => {
    let deleted = false;
    await withStubs({
      Exam: {
        findById: async () => ({
          _id: new mongoose.Types.ObjectId(),
          department: 'CSE',
          createdBy: String(new mongoose.Types.ObjectId()),
          deleteOne: async () => { deleted = true; }
        })
      }
    }, async () => {
      const res = responseMock();
      await deleteExam(
        {
          user: { _id: new mongoose.Types.ObjectId(), role: 'faculty', department: 'CSE' },
          params: { id: String(new mongoose.Types.ObjectId()) }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 403);
      assert.equal(deleted, false);
    });
  });

  test('exam creator identity and faculty display name come from the authenticated account', async () => {
    let createdExam;
    await withStubs({
      Exam: {
        create: async payload => { createdExam = payload; return payload; }
      }
    }, async () => {
      const creatorId = new mongoose.Types.ObjectId();
      const res = responseMock();
      await createExam(
        {
          user: { _id: creatorId, name: 'Verified Faculty', role: 'faculty', department: 'CSE' },
          body: {
            name: 'Data Structures',
            department: 'CSE',
            startDate: '2026-11-20',
            createdBy: 'forged-account-id',
            createdByRole: 'admin',
            facultyName: 'Impersonated Faculty'
          }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 201);
      assert.equal(createdExam.createdBy, String(creatorId));
      assert.equal(createdExam.createdByRole, 'faculty');
      assert.equal(createdExam.facultyName, 'Verified Faculty');
    });
  });

  test('students cannot release another student’s seat', async () => {
    let seatWrites = 0;
    await withStubs({
      Seat: {
        findOne: async () => ({
          _id: new mongoose.Types.ObjectId(),
          __v: 1,
          currentOccupant: { studentId: 'different-student' },
          waitingQueue: []
        }),
        findOneAndUpdate: async () => { seatWrites += 1; }
      }
    }, async () => {
      const res = responseMock();
      await routeHandler('/:seatCode/release', 'put')(
        {
          params: { seatCode: 'CSE-S01' },
          user: { _id: new mongoose.Types.ObjectId(), role: 'student' }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 403);
      assert.equal(seatWrites, 0);
    });

    test('seat listings require authentication before exposing occupant and queue records', async () => {
      for (const path of ['/', '/:dept']) {
        const route = seatRoutes.stack.find(item =>
          item.route && item.route.path === path && item.route.methods.get
        );
        assert.ok(route, `Expected GET ${path} seat route`);
        assert.equal(route.route.stack[0].handle, authenticate);

        const res = responseMock();
        let nextCalled = false;
        await route.route.stack[0].handle(
          { headers: {} },
          res,
          () => { nextCalled = true; }
        );
        assert.equal(res.statusCode, 401);
        assert.equal(nextCalled, false);
      }
    });
  });

  test('students cannot remove another student from a seat queue', async () => {
    let queueWrites = 0;
    const Seat = require('../models/Seat');
    await withStubs({
      Seat: {
        findOneAndUpdate: async () => { queueWrites += 1; }
      }
    }, async () => {
      const res = responseMock();
      await routeHandler('/:seatCode/queue/:studentId', 'delete')(
        {
          params: { seatCode: 'CSE-S01', studentId: 'another-student' },
          user: { _id: new mongoose.Types.ObjectId(), role: 'student' }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 403);
      assert.equal(queueWrites, 0);
    });
  });

  test('queue entry identity and academic-year priority come from the authenticated account', async () => {
    let updateDocument;
    let examFilter;
    await withStubs({
      Exam: {
        exists: async filter => {
          examFilter = filter;
          return { _id: new mongoose.Types.ObjectId() };
        }
      },
      Seat: {
        exists: async () => null,
        findOneAndUpdate: async (filter, update) => {
          updateDocument = update;
          return { seatCode: 'CSE-S01', waitingQueue: update.$push.waitingQueue.$each };
        }
      }
    }, async () => {
      const studentId = new mongoose.Types.ObjectId();
      const res = responseMock();
      await routeHandler('/:seatCode/queue', 'post')(
        {
          params: { seatCode: 'CSE-S01' },
          user: {
            _id: studentId,
            name: 'Verified Student',
            role: 'student',
            year: '3rd Year',
            department: 'CSE'
          },
          body: {
            studentId: 'other-occupant',
            studentName: 'Forged Name',
            year: '4th Year',
            hasExamSoon: true
          }
        },
        res,
        error => { throw error; }
      );
      const queuedStudent = updateDocument.$push.waitingQueue.$each[0];
      assert.equal(res.statusCode, 201);
      assert.equal(queuedStudent.studentId, String(studentId));
      assert.equal(queuedStudent.studentName, 'Verified Student');
      assert.equal(queuedStudent.year, '3rd Year');
      assert.equal(queuedStudent.priorityScore, 130);
      assert.equal(queuedStudent.hasExamSoon, true);
      assert.equal(examFilter.department, 'CSE');
      assert.deepEqual(examFilter.year.$in, ['3rd Year', 'All Years']);
    });
  });

  test('seat queue ignores a client-claimed exam priority without a scheduled exam', async () => {
    let queuedEntry;
    await withStubs({
      Exam: { exists: async () => null },
      Seat: {
        exists: async () => null,
        findOneAndUpdate: async (filter, update) => {
          queuedEntry = update.$push.waitingQueue.$each[0];
          return { seatCode: 'CSE-S01', waitingQueue: [queuedEntry] };
        }
      }
    }, async () => {
      const res = responseMock();
      await routeHandler('/:seatCode/queue', 'post')(
        {
          params: { seatCode: 'CSE-S01' },
          user: {
            _id: new mongoose.Types.ObjectId(),
            name: 'Verified Student',
            role: 'student',
            year: '2nd Year',
            department: 'CSE'
          },
          body: { hasExamSoon: true }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 201);
      assert.equal(queuedEntry.hasExamSoon, false);
      assert.equal(queuedEntry.priorityScore, 20);
    });
  });

  test('seat queue rejects arbitrary academic years before writing', async () => {
    let writes = 0;
    await withStubs({
      Exam: { exists: async () => null },
      Seat: {
        exists: async () => null,
        findOneAndUpdate: async () => { writes += 1; }
      }
    }, async () => {
      const res = responseMock();
      await routeHandler('/:seatCode/queue', 'post')(
        {
          params: { seatCode: 'CSE-S01' },
          user: {
            _id: new mongoose.Types.ObjectId(),
            name: 'Verified Student',
            role: 'student',
            year: '9999 Year',
            department: 'CSE'
          },
          body: { hasExamSoon: true }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 400);
      assert.equal(writes, 0);
    });
  });

  test('seat handoff keeps priority ordering and uses a versioned conditional update', async () => {
    const Seat = require('../models/Seat');
    const occupantId = new mongoose.Types.ObjectId();
    const highPriorityId = new mongoose.Types.ObjectId();
    const lowPriorityId = new mongoose.Types.ObjectId();
    const seat = {
      _id: new mongoose.Types.ObjectId(),
      __v: 7,
      seatCode: 'CSE-S01',
      status: 'occupied',
      currentOccupant: { studentId: String(occupantId) },
      waitingQueue: [
        { studentId: String(lowPriorityId), studentName: 'Low', priorityScore: 10, joinedAt: new Date(1) },
        { studentId: String(highPriorityId), studentName: 'High', priorityScore: 100, joinedAt: new Date(2) }
      ]
    };
    let updateFilter;
    let updateDocument;
    let assignedSeat;
    await withStubs({
      Seat: {
        findOne: async () => seat,
        exists: async () => null,
        findOneAndUpdate: async (filter, update) => {
          updateFilter = filter;
          updateDocument = update;
          assignedSeat = { ...seat, currentOccupant: update.$set.currentOccupant };
          return assignedSeat;
        },
        updateMany: async () => ({ modifiedCount: 1 })
      },
      User: {
        findById: async id => ({
          _id: id,
          role: 'student',
          name: String(id) === String(highPriorityId) ? 'High Priority Student' : 'Low Priority Student'
        })
      }
    }, async () => {
      const res = responseMock();
      await routeHandler('/:seatCode/release', 'put')(
        {
          params: { seatCode: 'CSE-S01' },
          user: { _id: occupantId, role: 'student' }
        },
        res,
        error => { throw error; }
      );
      assert.equal(res.statusCode, 200);
      assert.equal(res.data.assignedStudent.studentId, String(highPriorityId));
      assert.equal(updateFilter.__v, 7);
      assert.equal(updateDocument.$inc.__v, 1);
    });
  });
});

test('security test environment is restored', () => {
  if (originalEnv.nodeEnv === undefined) delete process.env.NODE_ENV;
  else process.env.NODE_ENV = originalEnv.nodeEnv;
  if (originalEnv.jwtSecret === undefined) delete process.env.JWT_SECRET;
  else process.env.JWT_SECRET = originalEnv.jwtSecret;
  if (originalEnv.adminSecret === undefined) delete process.env.ADMIN_SECRET;
  else process.env.ADMIN_SECRET = originalEnv.adminSecret;
});
