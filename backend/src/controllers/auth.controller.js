import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/index.js';
import { ApiError } from '../utils/ApiError.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { env } from '../config/env.js';

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict',
};

async function issueTokens(user) {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });
  return { accessToken, refreshToken };
}

/**
 * Only admins can create faculty/student accounts (see routes — this
 * controller doesn't self-register; institute accounts are provisioned,
 * not self-signed-up, which matches "Administrator ... adding ... students
 * and faculty"). This endpoint is intentionally admin-gated at the route
 * level, kept here as the shared implementation.
 */
export const registerUser = asyncHandler(async (req, res) => {
  const { fullName, email, password, role, phone, facultyDetails, studentDetails } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('A user with this email already exists.');

  const user = await User.create({
    fullName,
    email,
    password,
    role,
    phone,
    facultyDetails: role === 'faculty' ? facultyDetails : undefined,
    studentDetails: role === 'student' ? studentDetails : undefined,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, user.toJSON(), `${role} account created successfully.`));
});

export const loginUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid email or password.');
  if (!user.isActive) throw ApiError.forbidden('This account has been deactivated.');

  const isValid = await user.isPasswordCorrect(password);
  if (!isValid) throw ApiError.unauthorized('Invalid email or password.');

  const { accessToken, refreshToken } = await issueTokens(user);

  return res
    .status(200)
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(
      new ApiResponse(
        200,
        { user: user.toJSON(), accessToken, refreshToken },
        'Login successful.'
      )
    );
});

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken || req.body.refreshToken;
  if (!incomingToken) throw ApiError.unauthorized('Refresh token missing.');

  let decoded;
  try {
    decoded = jwt.verify(incomingToken, env.jwt.refreshSecret);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token. Please log in again.');
  }

  const user = await User.findById(decoded._id).select('+refreshToken');
  if (!user || user.refreshToken !== incomingToken) {
    throw ApiError.unauthorized('Refresh token is invalid or has been revoked.');
  }

  const { accessToken, refreshToken } = await issueTokens(user);

  return res
    .status(200)
    .cookie('accessToken', accessToken, { ...cookieOptions, maxAge: 15 * 60 * 1000 })
    .cookie('refreshToken', refreshToken, { ...cookieOptions, maxAge: 7 * 24 * 60 * 60 * 1000 })
    .json(new ApiResponse(200, { accessToken, refreshToken }, 'Token refreshed.'));
});

export const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1 } });

  return res
    .status(200)
    .clearCookie('accessToken', cookieOptions)
    .clearCookie('refreshToken', cookieOptions)
    .json(new ApiResponse(200, null, 'Logged out successfully.'));
});

export const getCurrentUser = asyncHandler(async (req, res) => {
  return res.status(200).json(new ApiResponse(200, req.user.toJSON(), 'Current user fetched.'));
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user._id).select('+password');
  const isValid = await user.isPasswordCorrect(currentPassword);
  if (!isValid) throw ApiError.badRequest('Current password is incorrect.');

  user.password = newPassword;
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, 'Password changed successfully.'));
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  // Always return the same response whether or not the email exists,
  // to avoid leaking which emails are registered.
  if (user) {
    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.passwordResetExpiry = Date.now() + 30 * 60 * 1000; // 30 min
    await user.save({ validateBeforeSave: false });

    // In production: send `resetToken` via the email service (services/email.service.js).
    // Left as a clear extension point rather than assuming a specific email template here.
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, 'If that email is registered, a reset link has been sent.'));
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpiry: { $gt: Date.now() },
  }).select('+passwordResetToken +passwordResetExpiry');

  if (!user) throw ApiError.badRequest('Password reset token is invalid or has expired.');

  user.password = newPassword;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  return res.status(200).json(new ApiResponse(200, null, 'Password reset successfully. Please log in.'));
});
