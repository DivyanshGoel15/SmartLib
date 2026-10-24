const mongoose = require('mongoose');

const reservationSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    resourceId: {
      type: String,
      required: [true, 'Resource ID is required'],
      trim: true
    },
    resource: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resource'
    },
    resourceName: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true
    },
    userId: {
      type: String,
      required: [true, 'User ID is required'],
      trim: true
    },
    userName: {
      type: String,
      required: [true, 'User name is required'],
      trim: true
    },
    userEmail: {
      type: String,
      default: '',
      trim: true
    },
    department: {
      type: String,
      default: '',
      trim: true
    },
    year: {
      type: String,
      default: '',
      trim: true
    },
    userRole: {
      type: String,
      default: 'student',
      trim: true
    },
    reservedAt: {
      type: Date,
      default: Date.now
    },
    returnedAt: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'returned', 'cancelled'],
        message: 'Status must be active, returned, or cancelled'
      },
      default: 'active'
    },
    promotedFromQueue: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        return ret;
      }
    },
    toObject: {
      virtuals: true,
      transform: function (doc, ret) {
        ret.id = ret.customId || ret._id.toString();
        return ret;
      }
    }
  }
);

// Auto-populate customId if not provided
reservationSchema.pre('save', function (next) {
  if (!this.customId) {
    this.customId = `RSV${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

const Reservation = mongoose.model('Reservation', reservationSchema);

module.exports = Reservation;
