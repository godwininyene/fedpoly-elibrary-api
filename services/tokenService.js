import jwt from 'jsonwebtoken';

/**
 * Signs a JWT for a given user payload.
 *
 * @param {Object} payload - { id, role }
 * @returns {string} Signed JWT
 */
export const signToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Builds the sanitized user response object + token.
 * Strips sensitive fields before sending to client.
 */
export const createTokenResponse = (user) => {
  const token = signToken({ id: user._id, role: user.role });

  return {
    token,
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      matricNumber: user.matricNumber,
      role: user.role,
      department: user.department,
      level: user.level,
      avatar: user.avatar,
    },
  };
};