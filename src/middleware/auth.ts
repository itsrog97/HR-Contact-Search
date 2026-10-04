import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { getOrCreateUser } from '../db/users.ts';

export interface AuthRequest extends Request {
  user?: {
    uid: string;
    email: string;
    name?: string;
    dbUser?: any;
  };
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If no header, allow dev mode fallback if dev header is sent
    const devUid = req.headers['x-user-uid'] as string;
    const devEmail = req.headers['x-user-email'] as string;
    const devName = req.headers['x-user-name'] as string;

    if (devUid && devEmail) {
      try {
        const dbUser = await getOrCreateUser(devUid, devEmail, devName);
        req.user = {
          uid: devUid,
          email: devEmail,
          name: devName,
          dbUser,
        };
        return next();
      } catch (err) {
        console.error('Failed to create/get dev user:', err);
      }
    }

    return res.status(401).json({ error: 'Unauthorized: Missing or invalid token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const dbUser = await getOrCreateUser(
      decodedToken.uid,
      decodedToken.email || 'user@example.com',
      decodedToken.name
    );
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      name: decodedToken.name,
      dbUser,
    };
    next();
  } catch (error: any) {
    console.warn('Firebase token verification note:', error?.message || error);
    // Allow development fallback if token format is dev-token
    const devUid = req.headers['x-user-uid'] as string;
    const devEmail = req.headers['x-user-email'] as string;
    const devName = req.headers['x-user-name'] as string;
    if (devUid && devEmail) {
      try {
        const dbUser = await getOrCreateUser(devUid, devEmail, devName);
        req.user = {
          uid: devUid,
          email: devEmail,
          name: devName,
          dbUser,
        };
        return next();
      } catch (err) {
        // Fall through
      }
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
