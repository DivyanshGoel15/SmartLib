const express = require('express');
const router = express.Router();
const {
  getUsers,
  createStudent,
  deleteUser
} = require('../controllers/userController');
const { authenticate, requireRole } = require('../middleware/auth');

// All administrative student operations require library_admin / admin authorization
router.use(authenticate, requireRole('library_admin', 'admin'));

// /api/users/students
router.route('/students')
  .get(getUsers)
  .post(createStudent);

// /api/users
router.route('/')
  .get(getUsers)
  .post(createStudent);

// /api/users/:id
router.route('/:id')
  .delete(deleteUser);

module.exports = router;
