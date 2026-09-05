import { v2 as cloudinary } from 'cloudinary';
import { ENV } from './env.js';

/**
 * Checks whether all required Cloudinary environment credentials are provided.
 * Ensures secrets are never assumed or hardcoded.
 */
export const isCloudinaryConfigured = (): boolean => {
  const cloudName = ENV.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = ENV.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY;
  const apiSecret = ENV.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET;

  return Boolean(
    cloudName &&
    apiKey &&
    apiSecret &&
    cloudName.trim().length > 0 &&
    apiKey.trim().length > 0 &&
    apiSecret.trim().length > 0
  );
};

/**
 * Initializes and returns the configured Cloudinary SDK instance.
 * Returns null if Cloudinary is not configured in the environment.
 */
export const getCloudinary = () => {
  if (!isCloudinaryConfigured()) {
    return null;
  }

  const cloudName = (ENV.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME)!.trim();
  const apiKey = (ENV.CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY)!.trim();
  const apiSecret = (ENV.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET)!.trim();

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  return cloudinary;
};

/**
 * Safe diagnostics helper that never exposes CLOUDINARY_API_SECRET.
 */
export const getCloudinaryStatus = () => {
  const configured = isCloudinaryConfigured();
  const cloudName = (ENV.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME || '').trim();

  return {
    configured,
    cloudName: configured ? cloudName : undefined,
    message: configured
      ? 'Cloudinary image service is fully initialized and operational'
      : 'Cloudinary credentials are not configured. Image uploads are disabled.',
  };
};

export { cloudinary };
