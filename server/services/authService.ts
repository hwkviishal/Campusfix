import jwt, { SignOptions } from 'jsonwebtoken';
import { Response } from 'express';
import { ENV } from '../config/env.js';

export interface JwtPayload {
  userId: string;
  role: string;
}

export const AUTH_COOKIE_NAME = 'campusfix_auth';

export const authService = {
  generateToken(payload: JwtPayload): string {
    const options: SignOptions = {
      expiresIn: (ENV.JWT_EXPIRES_IN || '7d') as any,
    };
    return jwt.sign(payload, ENV.JWT_SECRET, options);
  },

  verifyToken(token: string): JwtPayload {
    return jwt.verify(token, ENV.JWT_SECRET) as JwtPayload;
  },

  getCookieOptions() {
    const isProduction = ENV.NODE_ENV === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    };
  },

  setAuthCookie(res: Response, token: string) {
    res.cookie(AUTH_COOKIE_NAME, token, this.getCookieOptions());
  },

  clearAuthCookie(res: Response) {
    const isProduction = ENV.NODE_ENV === 'production';
    res.clearCookie(AUTH_COOKIE_NAME, {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as 'none' | 'lax' | 'strict',
      path: '/',
    });
  },
};
