const mongoose = require('mongoose');
const Exam = require('../models/Exam');

/**
 * @desc    Get exams by department
 * @route   GET /api/exams/department/:dept
 * @access  Public
 */
const getExamsByDepartment = async (req, res, next) => {
  try {
    const { dept } = req.params;

    if (!dept) {
      return res.status(400).json({
        success: false,
        message: 'Department parameter is required.'
      });
    }

    // Case-insensitive department match
    const query = {
      department: new RegExp(`^${dept.trim()}$`, 'i')
    };

    // Optional year filter if passed via query params
    if (req.query.year) {
      query.$or = [
        { year: req.query.year },
        { year: 'All Years' }
      ];
    }

    // Sort by start date ascending (chronological)
    const exams = await Exam.find(query).sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all exams (with optional search, department and year filters)
 * @route   GET /api/exams
 * @access  Public
 */
const getAllExams = async (req, res, next) => {
  try {
    const { department, year, search } = req.query;
    const query = {};

    if (department && department.trim() && department !== 'All departments') {
      query.department = new RegExp(`^${department.trim()}$`, 'i');
    }

    if (year && year.trim() && year !== 'All Years') {
      query.year = year.trim();
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: searchRegex },
        { facultyName: searchRegex },
        { createdByFaculty: searchRegex },
        { venue: searchRegex },
        { department: searchRegex }
      ];
    }

    const exams = await Exam.find(query).sort({ startDate: 1 });

    res.status(200).json({
      success: true,
      count: exams.length,
      data: exams
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single exam by ID
 * @route   GET /api/exams/:id
 * @access  Public
 */
const getExamById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let exam;

    if (mongoose.Types.ObjectId.isValid(id)) {
      exam = await Exam.findById(id);
    }
    if (!exam) {
      exam = await Exam.findOne({ customId: id });
    }

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: `Examination with ID '${id}' not found.`
      });
    }

    res.status(200).json({
      success: true,
      data: exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Schedule / Create a new examination
 * @route   POST /api/exams
 * @access  Public (Faculty / Admin)
 */
const createExam = async (req, res, next) => {
  try {
    const {
      name,
      department,
      year = 'All Years',
      startDate,
      endDate,
      time,
      venue,
      facultyName,
      createdByFaculty,
      createdBy,
      createdByRole = 'faculty'
    } = req.body;

    // Field validations
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Exam name / subject is required.'
      });
    }

    if (!department || !department.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department is required.'
      });
    }

    // Departmental check: Faculty may only schedule exams for their own department
    if (req.user && req.user.role === 'faculty') {
      const userDept = (req.user.department || '').trim().toLowerCase();
      const targetDept = department.trim().toLowerCase();
      if (userDept && targetDept && userDept !== targetDept) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Faculty members may only schedule examinations for their own department.'
        });
      }
    }

    if (!startDate) {
      return res.status(400).json({
        success: false,
        message: 'Exam start date is required.'
      });
    }

    // Default endDate to startDate if not provided (single-day exam)
    const effectiveEndDate = endDate || startDate;

    const startObj = new Date(startDate);
    const endObj = new Date(effectiveEndDate);

    if (isNaN(startObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start date format.'
      });
    }

    if (isNaN(endObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end date format.'
      });
    }

    // Ensure start of day comparison for proper date range check
    const startCompare = new Date(startObj);
    startCompare.setHours(0, 0, 0, 0);
    const endCompare = new Date(endObj);
    endCompare.setHours(0, 0, 0, 0);

    if (endCompare < startCompare) {
      return res.status(400).json({
        success: false,
        message: 'End date cannot be earlier than start date.'
      });
    }

    const assignedFaculty = facultyName || createdByFaculty || 'Faculty';

    const exam = await Exam.create({
      name: name.trim(),
      department: department.trim(),
      year: year ? year.trim() : 'All Years',
      startDate: startObj,
      endDate: endObj,
      time: time ? time.trim() : '',
      venue: venue ? venue.trim() : '',
      facultyName: assignedFaculty,
      createdByFaculty: assignedFaculty,
      createdBy: createdBy || '',
      createdByRole: createdByRole || 'faculty'
    });

    res.status(201).json({
      success: true,
      message: 'Examination scheduled successfully.',
      data: exam
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete an examination
 * @route   DELETE /api/exams/:id
 * @access  Public (Faculty / Admin)
 */
const deleteExam = async (req, res, next) => {
  try {
    const { id } = req.params;
    let exam;

    if (mongoose.Types.ObjectId.isValid(id)) {
      exam = await Exam.findById(id);
    }
    if (!exam) {
      exam = await Exam.findOne({ customId: id });
    }

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: `Examination with ID '${id}' not found.`
      });
    }

    // Departmental check: Faculty may only delete exams within their own department
    if (req.user && req.user.role === 'faculty') {
      const userDept = (req.user.department || '').trim().toLowerCase();
      const examDept = (exam.department || '').trim().toLowerCase();
      if (userDept && examDept && userDept !== examDept) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: Faculty members may only delete examinations within their own department.'
        });
      }
    }

    await exam.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Examination deleted successfully.',
      data: { id }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getExamsByDepartment,
  getAllExams,
  getExamById,
  createExam,
  deleteExam
};

