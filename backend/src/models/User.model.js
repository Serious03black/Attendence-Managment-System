import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

const { Schema } = mongoose;

/**
 * Single collection for all three roles (admin/faculty/student) rather than
 * separate collections. This keeps auth simple (one login endpoint, one JWT
 * shape) while role-specific fields (e.g. `enrolledCourses` for students,
 * `specialization` for faculty) are optional and only populated for the
 * relevant role. Role-specific relational data (batches, attendance, etc.)
 * lives in its own collection referencing `User._id` — it is NOT embedded
 * here, so this document stays small regardless of a student's history.
 */
const userSchema = new Schema(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: { type: String, required: true, minlength: 8, select: false },
    phone: { type: String, trim: true },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    role: {
      type: String,
      enum: ['admin', 'faculty', 'student'],
      required: true,
      default: 'student',
    },
    isActive: { type: Boolean, default: true }, // admin can deactivate instead of hard-delete
    lastLogin: { type: Date },

    // --- Faculty-only fields ---
    facultyDetails: {
      employeeId: { type: String, trim: true },
      specialization: [{ type: String, trim: true }],
      qualification: { type: String, trim: true },
      experienceYears: { type: Number, min: 0 },
      joiningDate: { type: Date },
    },

    // --- Student-only fields ---
    studentDetails: {
      rollNumber: { type: String, trim: true },
      enrollmentDate: { type: Date, default: Date.now },
      guardianName: { type: String, trim: true },
      guardianPhone: { type: String, trim: true },
      dateOfBirth: { type: Date },
      address: { type: String, trim: true },
    },

    refreshToken: { type: String, select: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });
userSchema.index({ 'facultyDetails.employeeId': 1 }, { sparse: true });
userSchema.index({ 'studentDetails.rollNumber': 1 }, { sparse: true });

// Hash password only when it's new or changed.
userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.isPasswordCorrect = async function isPasswordCorrect(candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.generateAccessToken = function generateAccessToken() {
  return jwt.sign(
    { _id: this._id, email: this.email, role: this.role, fullName: this.fullName },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiry }
  );
};

userSchema.methods.generateRefreshToken = function generateRefreshToken() {
  return jwt.sign({ _id: this._id }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshExpiry,
  });
};

// Never leak password/refreshToken even if a controller forgets to .select('-password')
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    delete ret.passwordResetToken;
    delete ret.passwordResetExpiry;
    return ret;
  },
});

export const User = mongoose.model('User', userSchema);
