import * as admin from 'firebase-admin';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

export const FIREBASE_ADMIN = 'FIREBASE_ADMIN';

const logger = new Logger('FirebaseProvider');

export const FirebaseProvider = {
  provide: FIREBASE_ADMIN,
  inject: [ConfigService],
  useFactory: (config: ConfigService): admin.app.App | null => {
    if (admin.apps.length > 0) return admin.apps[0];

    const projectId = config.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = config.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = config.get<string>('FIREBASE_PRIVATE_KEY');

    // Service account not configured yet — OTP/phone-login endpoints will be unavailable
    if (!clientEmail || !privateKey) {
      logger.warn(
        'Firebase Admin SDK not initialised — FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY missing. ' +
        'Phone auth (OTP) endpoints will throw until the service account is configured. ' +
        'Get it from: Firebase Console → Project Settings → Service Accounts → Generate new private key',
      );
      return null;
    }

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        // GCP private keys use literal \n in env files — restore real newlines
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });
  },
};
