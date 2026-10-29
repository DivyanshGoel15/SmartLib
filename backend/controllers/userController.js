const mongoose = require('mongoose');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const { isAcademicYear } = require('../utils/academicYears');
const { escapeRegex } = require('../utils/regex');

/**
 * @desc    Get all users or students (supports filters)
 * @route   GET /api/users
 * @route   GET /api/users/students
 * @access  Public / Admin
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, department, search } = req.query;
    const query = {};

    if ([role, department, search].some(value => value !== undefined && typeof value !== 'string')) {
      return res.status(400).json({
        success: false,
        message: 'Filters must be strings.'
      });
    }

    // Filter by role (default to student if route is /students)
    if (req.path.includes('/students') || role === 'student') {
      query.role = 'student';
    } else if (role) {
      query.role = role;
    }

    if (department && department.trim() && department !== 'All departments') {
      query.department = new RegExp(`^${escapeRegex(department.trim())}$`, 'i');
    }

    if (search && search.trim()) {
      const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { studentId: searchRegex },
        { department: searchRegex }
      ];
    }

    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a student (by Admin)
 * @route   POST /api/users/students
 * @access  Admin
 */
const createStudent = async (req, res, next) => {
  try {
    const { name, studentId, email, department, year = '1st Year', password } = req.body;

    if (typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Student name is required.'
      });
    }

    if (typeof studentId !== 'string' || !studentId.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Student ID is required.'
      });
    }

    if (typeof email !== 'string' || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required.'
      });
    }

    if (typeof department !== 'string' || !department.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Department is required.'
      });
    }

    if (typeof year !== 'string' || !isAcademicYear(year.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Academic year must be one of 1st Year, 2nd Year, 3rd Year, or 4th Year.'
      });
    }

    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const cleanStudentId = studentId.trim();

    // Check duplicate email or studentId
    const existing = await User.findOne({
      $or: [
        { email: normalizedEmail },
        { studentId: cleanStudentId }
      ]
    });

    if (existing) {
      const msg = existing.email === normalizedEmail
        ? 'A user with this email address already exists.'
        : 'A student with this Student ID already exists.';
      return res.status(409).json({
        success: false,
        message: msg
      });
    }

    const student = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      studentId: cleanStudentId,
      department: department.trim(),
      year: year ? year.trim() : '1st Year',
      role: 'student',
      password
    });

    res.status(201).json({
      success: true,
      message: 'Student added successfully.',
      data: student.toJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'A student with this email address or Student ID already exists.'
      });
    }
    next(error);
  }
};

/**
 * @desc    Delete a user (restricted: students only; prevents deleting users with active reservations)
 * @route   DELETE /api/users/:id
 * @access  Admin
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    let user;

    if (mongoose.Types.ObjectId.isValid(id)) {
      user = await User.findById(id);
    }
    if (!user) {
      user = await User.findOne({ studentId: id });
    }
    if (!user) {
      user = await User.findOne({ email: id.toLowerCase() });
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: `Student with ID '${id}' not found.`
      });
    }

    // Never allow deleting administrator accounts through this endpoint
    if (user.role === 'library_admin' || user.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Administrator accounts cannot be deleted.'
      });
    }

    // Check if student has active reservations
    const activeReservation = await Reservation.findOne({
      $or: [
        { userId: user._id.toString() },
        { userId: user.studentId },
        { userEmail: user.email }
      ],
      status: 'active'
    });

    if (activeReservation) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete a student with an active reservation.'
      });
    }

    await user.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Student deleted successfully.',
      data: { id: user._id.toString(), studentId: user.studentId, name: user.name }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  createStudent,
  deleteUser
};
