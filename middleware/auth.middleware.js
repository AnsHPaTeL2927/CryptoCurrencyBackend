import { verifyToken } from '../utils/jwt.utils.js';
import { catchAsync } from '../utils/catchAsync.js';
import User from '../models/user.model.js';
import { ApiError } from '../utils/ApiError.js';
export const authenticate = catchAsync(async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    throw new ApiError(401, 'Please authenticate');
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new ApiError(401, 'User not found');
  }

  req.user = user;
  next();
});
