import jwt from 'jsonwebtoken';
import { environment } from '../config/environment.js';

export const generateToken = (userId) => {
  return jwt.sign({ id: userId }, environment.jwt.secret, {
    expiresIn: environment.jwt.expiresIn,
  });
};

export const verifyToken = (token) => {
  return jwt.verify(token, environment.jwt.secret);
};