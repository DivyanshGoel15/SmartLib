const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    customId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Resource name is required'],
      trim: true
    },
    type: {
      type: String,
      required: [true, 'Resource type is required'],
      enum: {
        values: ['Book', 'Equipment'],
        message: 'Resource type must be either Book or Equipment'
      },
      default: 'Book'
    },
    department: {
      type: String,
      required: [true, 'Department is required'],
      trim: true
    },
    totalQuantity: {
      type: Number,
      required: [true, 'Total quantity is required'],
      min: [0, 'Total quantity cannot be negative']
    },
    availableQuantity: {
      type: Number,
      required: [true, 'Available quantity is required'],
      min: [0, 'Available quantity cannot be negative'],
      validate: {
        validator: function (val) {
          return val <= this.totalQuantity;
        },
        message: 'Available quantity cannot exceed total quantity'
      }
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
resourceSchema.pre('save', function (next) {
  if (!this.customId) {
    this.customId = `RES${Date.now()}${Math.floor(Math.random() * 1000)}`;
  }
  next();
});

const Resource = mongoose.model('Resource', resourceSchema);

module.exports = Resource;
