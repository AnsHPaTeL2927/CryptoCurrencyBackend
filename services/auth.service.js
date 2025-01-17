import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import User from '../models/user.model.js';
import { ApiError } from '../middleware/error.middleware.js';
import { generateToken } from '../utils/jwt.utils.js';
import { environment } from '../config/environment.js';
import axios from 'axios';

const googleClient = new OAuth2Client(
    {
        clientId: environment.google.clientId,
        clientSecret: environment.google.clientSecret,
        redirectUri: `${environment.backend.url}/api/auth/google/callback`
    }
);

export const authService = {
    async register(userData) {
        const existingUser = await User.findOne({ email: userData.email });
        if (existingUser) {
            throw new ApiError(400, 'Email already registered');
        }

        const user = await User.create(userData);
        const token = generateToken(user._id);

        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        };
    },

    async login({ email, password }) {
        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(400, 'Invalid Credentials');
        }

        const isPasswordVerified = await bcrypt.compare(password, user.password)
        if (!isPasswordVerified) {
            throw new ApiError(401, 'Invalid Password');
        }

        const token = generateToken(user._id);

        return {
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email
            }
        };
    },

    async googleLogin(accessToken) {
        try {
            // Use axios instead of fetch
            const { data: userData } = await axios.get(
                'https://www.googleapis.com/oauth2/v3/userinfo', 
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`
                    }
                }
            );

            console.log('Google User Data:', userData);

            const { 
                email, 
                name,
                sub: googleId 
            } = userData;

            if (!email) {
                throw new ApiError(400, 'Email not provided by Google');
            }

            // Find or create user
            let user = await User.findOne({ email });

            if (!user) {
                user = await User.create({
                    name: name || email.split('@')[0],
                    email,
                    googleId
                });
            } else if (!user.googleId) {
                user.googleId = googleId;
                if (!user.name && name) {
                    user.name = name;
                }
                await user.save();
            }

            const token = generateToken(user._id);

            return {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            };

        } catch (error) {
            console.error('Google authentication error:', error);
            
            if (error.response) {
                // Error from Google API
                console.error('Google API Error:', error.response.data);
                throw new ApiError(401, 'Failed to authenticate with Google');
            }
            
            throw new ApiError(500, 'Invalid Google token or authentication failed');
        }
    },

    async handleGoogleCallback(code) {
        try {
            // Exchange code for tokens
            const { tokens } = await googleClient.getToken(code);
            
            // Verify ID token
            const ticket = await googleClient.verifyIdToken({
                idToken: tokens.id_token,
                audience: environment.google.clientId
            });

            const payload = ticket.getPayload();
            const { email, name, sub: googleId } = payload;

            // Find or create user
            let user = await User.findOne({ email });
            
            if (!user) {
                user = await User.create({
                    name: name || email.split('@')[0],
                    email,
                    googleId
                });
            } else if (!user.googleId) {
                user.googleId = googleId;
                await user.save();
            }

            // Generate JWT
            const token = generateToken(user._id);

            return {
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email
                }
            };
        } catch (error) {
            console.error('Google callback error:', error);
            throw new Error('Failed to authenticate with Google');
        }
    }
};
