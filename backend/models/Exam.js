const mongoose = require('mongoose');

const examSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Exam name is required'],
      trim: true
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    year: {
      type: String,
      default: 'All Years',
      trim: true
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    time: {
      type: String,
      default: '',
      trim: true
    },
    venue: {
      type: String,
      default: '',
      trim: true
    },
    facultyName: {
      type: String,
      default: '',
      trim: true
    },
    createdByFaculty: {
      type: String,
      default: '',
      trim: true
    },
    createdBy: {
      type: String,
      default: '',
      trim: true
    },
    createdByRole: {
      type: String,
      default: 'faculty',
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        // Format ISO dates as YYYY-MM-DD for UI convenience while preserving raw dates
        if (ret.startDate instanceof Date) {
          ret.startDate = ret.startDate.toISOString().split('T')[0];
        }
        if (ret.endDate instanceof Date) {
          ret.endDate = ret.endDate.toISOString().split('T')[0];
        }
        // Aliases for compatibility with admin/student portals
        ret.title = ret.name;
        ret.subject = ret.name;
        ret.date = ret.startDate;
        ret.examDate = ret.startDate;
        ret.examTime = ret.time;
        ret.faculty = ret.facultyName || ret.createdByFaculty || 'Faculty';
        delete ret.__v;
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        if (ret.startDate instanceof Date) {
          ret.startDate = ret.startDate.toISOString().split('T')[0];
        }
        if (ret.endDate instanceof Date) {
          ret.endDate = ret.endDate.toISOString().split('T')[0];
        }
        ret.title = ret.name;
        ret.subject = ret.name;
        ret.date = ret.startDate;
        ret.examDate = ret.startDate;
        ret.examTime = ret.time;
        ret.faculty = ret.facultyName || ret.createdByFaculty || 'Faculty';
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Validate date range before validation
examSchema.pre('validate', function (next) {
  if (this.startDate && this.endDate) {
    const start = new Date(this.startDate);
    const end = new Date(this.endDate);
    if (isNaN(start.getTime())) {
      return next(new Error('Invalid start date provided'));
    }
    if (isNaN(end.getTime())) {
      return next(new Error('Invalid end date provided'));
    }
    if (end < start) {
      return next(new Error('End date cannot be earlier than start date'));
    }
  }
  next();
});

// Auto-generate customId if not provided
examSchema.pre('save', function (next) {
  if (!this.customId) {
    this.customId = `EXAM${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  if (!this.facultyName && this.createdByFaculty) {
    this.facultyName = this.createdByFaculty;
  }
  next();
});

const Exam = mongoose.model('Exam', examSchema);

module.exports = Exam;

