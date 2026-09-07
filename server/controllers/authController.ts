import { Request, Response, NextFunction } from 'express';
import { User, UserRole } from '../models/User.js';
import { authService } from '../services/authService.js';
import { SEED_CREDENTIALS } from '../services/seedService.js';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';

export const authController = {
  /**
   * Register a new user
   * Public registration is strictly restricted to STUDENT role
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, phone, role } = req.body;

      // 1. Basic validation
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        res.status(400).json({
          success: false,
          message: 'Name is required and must be at least 2 characters long.',
        });
        return;
      }

      if (!email || typeof email !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Valid email address is required.',
        });
        return;
      }

      const emailNormalized = email.trim().toLowerCase();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(emailNormalized)) {
        res.status(400).json({
          success: false,
          message: 'Please provide a valid email format (e.g. name@campus.edu).',
        });
        return;
      }

      if (!password || typeof password !== 'string' || password.length < 6) {
        res.status(400).json({
          success: false,
          message: 'Password is required and must be at least 6 characters long.',
        });
        return;
      }

      // Security rule: Prevent public registration of ADMIN or TECHNICIAN roles
      if (role && role !== 'STUDENT') {
        res.status(400).json({
          success: false,
          message:
            'Unauthorized role selection. Public registration is restricted to STUDENT accounts only. Contact campus IT for staff or technician access.',
        });
        return;
      }

      // 2. Check duplicate email
      const existingUser = await User.findOne({ email: emailNormalized });
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: 'An account with this email address already exists. Please log in instead.',
        });
        return;
      }

      // 3. Create user (password hashed in User pre-save hook)
      const user = new User({
        name: name.trim(),
        email: emailNormalized,
        password,
        phone: phone ? String(phone).trim() : '',
        role: 'STUDENT',
        isActive: true,
      });

      await user.save();

      // 4. Generate JWT & set HTTP-only cookie
      const token = authService.generateToken({
        userId: user._id.toString(),
        role: user.role,
      });
      authService.setAuthCookie(res, token);

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: user.toSafeObject(),
          token,
        },
      });
    } catch (err: any) {
      next(err);
    }
  },

  /**
   * Login with email and password
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          message: 'Email and password are required.',
        });
        return;
      }

      const emailNormalized = String(email).trim().toLowerCase();

      // Explicitly select password which is excluded by default
      const user = await User.findOne({ email: emailNormalized })
        .select('+password')
        .populate('department', 'name code');

      if (!user) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
        return;
      }

      if (!user.isActive) {
        res.status(403).json({
          success: false,
          message: 'Your account has been deactivated. Please contact campus administration.',
        });
        return;
      }

      const isMatch = await user.comparePassword(String(password));
      if (!isMatch) {
        res.status(401).json({
          success: false,
          message: 'Invalid email or password.',
        });
        return;
      }

      // Generate JWT & set HTTP-only cookie
      const token = authService.generateToken({
        userId: user._id.toString(),
        role: user.role,
      });
      authService.setAuthCookie(res, token);

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          user: user.toSafeObject(),
          token,
        },
      });
    } catch (err: any) {
      next(err);
    }
  },

  /**
   * Log out user by clearing the HTTP-only cookie
   */
  async logout(req: Request, res: Response): Promise<void> {
    authService.clearAuthCookie(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  },

  /**
   * Get current authenticated user profile
   */
  async getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Not authenticated',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  },

  /**
   * Development helper: list seed credentials for testing
   */
  async getDevSeedInfo(req: Request, res: Response): Promise<void> {
    const safeSeedList = SEED_CREDENTIALS.map((c) => ({
      name: c.name,
      email: c.email,
      password: c.password,
      role: c.role,
      departmentName: c.departmentName || 'N/A',
    }));

    res.status(200).json({
      success: true,
      data: {
        message: 'Development seed accounts for role verification',
        accounts: safeSeedList,
      },
    });
  },
};
