import { catchAsync } from '../utils/catchAsync.js';
import { authService } from '../services/auth.service.js';
import { environment } from '../config/environment.js';
import { ApiError } from '../utils/ApiError.js';


export const register = catchAsync(async (req, res) => {
    const user = await authService.register(req.body);
    res.status(201).json({
        status: 'success',
        data: user
    });
});

export const login = catchAsync(async (req, res) => {
    const { token, user } = await authService.login(req.body);
    res.json({
        status: 'success',
        data: { token, user }
    });
});

export const googleAuth = catchAsync(async (req, res) => {
    const { token } = req.body;

    if (!token) {
        throw new ApiError(400, 'Google token is required');
    }

    // Add some debug logging
    console.log('Received token:', token);

    const result = await authService.googleLogin(token);

    res.status(200).json({
        status: 'success',
        data: result
    });
});

export const googleCallback = catchAsync(async (req, res) => {
    try {
        const { code } = req.query;
        
        if (!code) {
            throw new Error('Authorization code not provided');
        }

        const { token, user } = await authService.handleGoogleCallback(code);

        // Redirect to frontend with token
        const redirectUrl = new URL(`${environment.frontend.url}/auth/google/callback`);
        redirectUrl.searchParams.append('token', token);
        redirectUrl.searchParams.append('user', JSON.stringify(user));

        res.redirect(redirectUrl.toString());
    } catch (error) {
        console.error('Google callback error:', error);
        // Redirect to frontend with error
        res.redirect(`${environment.frontend.url}/login?error=${encodeURIComponent(error.message)}`);
    }
});

export const verifyToken = catchAsync(async (req, res) => {
    // The user will be available from the auth middleware
    const user = req.user;

    res.json({
        status: 'success',
        user: {
            id: user._id,
            name: user.name,
            email: user.email
        }
    });
});