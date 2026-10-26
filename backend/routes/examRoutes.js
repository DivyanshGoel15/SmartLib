const express = require('express');
const router = express.Router();
const {
  getExamsByDepartment,
  getAllExams,
  getExamById,
  createExam,
  deleteExam
} = require('../controllers/examController');
const { authenticate, requireRole } = require('../middleware/auth');

// Public read endpoints for exam schedules
// /api/exams/department/:dept
router.get('/department/:dept', getExamsByDepartment);

// /api/exams
router.route('/')
  .get(getAllExams)
  .post(authenticate, requireRole('faculty', 'library_admin', 'admin'), createExam);

// /api/exams/:id
router.route('/:id')
  .get(getExamById)
  .delete(authenticate, requireRole('faculty', 'library_admin', 'admin'), deleteExam);

module.exports = router;
