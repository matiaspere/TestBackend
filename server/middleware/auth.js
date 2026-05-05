import jwt from 'jsonwebtoken';
import { createError } from '../utils/error.js';

export const verifyToken = async (req, res, next) => {
    try {
        const token = req.headers.authtoken;
        if (!token) return next(createError(401, 'Token is required'))

        const decodedData = await jwt.verify(token, process.env.JWT_SECRET);
        req.user = decodedData;

        next();
    } catch (err) {
        next(createError(401, 'Invalid token'));
    }
};

export const verifyEmployee = (req, res, next) => {
    try {
        verifyToken(req, res, () => {
            const allowedRoles = ['employee', 'manager', 'super_admin'];
            if (allowedRoles.includes(req.user.role)) {
                next();
            } else {
                next(createError(403, 'Only employee can access this route'))
            }
        });
    } catch (err) {
        next(createError(500, err.message));
    }
};


export const verifyManager = (req, res, next) => {
    try {
        verifyToken(req, res, () => {
            const allowedRoles = ['manager', 'super_admin'];
            if (allowedRoles.includes(req.user.role)) {
                next();
            } else {
                next(createError(403, 'Only manager can access this route'))
            }
        });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const verifySuperAdmin = (req, res, next) => {
    try {
        verifyToken(req, res, () => {
            if (req.user.role === 'super_admin') {
                next();
            } else {
                next(createError(403, 'Access denied'))
            }
        });
    } catch (err) {
        next(createError(500, err.message));
    }
};

export const verifyIsSameUser = (req, res, next) => {
    try {
        verifyToken(req, res, () => {
            const { userId } = req.params;
            const requestingUserId = req.user._id;
            const userRole = req.user.role;

            // Allow access if user is requesting their own data or is manager/super_admin
            const isSameUser = userId === requestingUserId;
            const isAuthorized = ['manager', 'super_admin'].includes(userRole);

            if (isSameUser || isAuthorized) {
                next();
            } else {
                next(createError(403, 'You can only access your own user information'))
            }
        });
    } catch (err) {
        next(createError(500, err.message));
    }
};