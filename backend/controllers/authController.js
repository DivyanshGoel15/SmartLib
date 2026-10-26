const User = require('../models/User');
const { signToken } = require('../utils/authTokens');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public (student/faculty) / Protected (admin)
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'student', department, year, studentId, rollNumber, adminSecret } = req.body;

    // Validate required fields
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your full name.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address.'
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email format.'
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedRole = (role || 'student').trim().toLowerCase();

    // Validate role is an allowed system role
    const VALID_ROLES = ['student', 'faculty', 'library_admin', 'admin'];
    if (!VALID_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid role specified. Permitted public roles are student and faculty.'
      });
    }

    // Enforce permitted signup roles: Prevent unauthorized administrator public signup
    const isAdminRole = normalizedRole === 'library_admin' || normalizedRole === 'admin';
    if (isAdminRole) {
      const configuredSecret = process.env.ADMIN_SECRET;
      const providedSecret = req.headers['x-admin-secret'] || (req.body && req.body.adminSecret);

      if (!configuredSecret || !providedSecret || providedSecret.trim() !== configuredSecret.trim()) {
        return res.status(403).json({
          success: false,
          message: 'Public registration as an administrator is not permitted without a valid administrator passkey. Please contact library administration.'
        });
      }
    }

    // Role-specific field validation
    if (normalizedRole === 'student' && (!year || !year.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Academic year is required for student registration.'
      });
    }

    if ((normalizedRole === 'student' || normalizedRole === 'faculty') && (!department || !department.trim())) {
      return res.status(400).json({
        success: false,
        message: 'Department is required for student and faculty accounts.'
      });
    }

    // Check for duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password,
      role: normalizedRole,
      department: department ? department.trim() : '',
      year: normalizedRole === 'student' ? (year ? year.trim() : '') : 'Staff',
      studentId: studentId ? studentId.trim() : '',
      rollNumber: rollNumber ? rollNumber.trim() : ''
    });

    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
      department: user.department || ''
    });

    res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.'
      });
    }
    next(error);
  }
};

/**
 * @desc    Authenticate user & return profile
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user by normalized email
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password. Please check your credentials.'
      });
    }

    // Verify password securely
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password. Please check your credentials.'
      });
    }

    const token = signToken({
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.name,
      department: user.department || ''
    });

    res.status(200).json({
      success: true,
      message: `Welcome back, ${user.name}.`,
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get authenticated caller's profile
 * @route   GET /api/auth/me
 * @access  Private (Authenticated via Bearer Token)
 */
const getMe = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Invalid or missing session token.'
      });
    }

    res.status(200).json({
      success: true,
      user: typeof req.user.toJSON === 'function' ? req.user.toJSON() : req.user
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe
};

