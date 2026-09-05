import { Request, Response, NextFunction } from 'express';
import { authService, AUTH_COOKIE_NAME, JwtPayload } from '../services/authService.js';
import { User, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: Partial<IUser> & { id: string };
}

export async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie first
    if (req.cookies && req.cookies[AUTH_COOKIE_NAME]) {
      token = req.cookies[AUTH_COOKIE_NAME];
    }
    // 2. Check Authorization header (Bearer token fallback)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
      return;
    }

    let decoded: JwtPayload;
    try {
      decoded = authService.verifyToken(token);
    } catch (err: any) {
      const message =
        err.name === 'TokenExpiredError'
          ? 'Session expired. Please log in again.'
          : 'Invalid authentication token.';
      res.status(401).json({
        success: false,
        message,
      });
      return;
    }

    const user = await User.findById(decoded.userId).populate('department', 'name code');

    if (!user) {
      res.status(401).json({
        success: false,
        message: 'User belonging to this token no longer exists.',
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        success: false,
        message: 'Your account has been deactivated. Please contact an administrator.',
      });
      return;
    }

    // Attach safe user object to request
    req.user = user.toSafeObject() as Partial<IUser> & { id: string };
    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      message: 'Authentication failed',
      error: error.message,
    });
  }
}
