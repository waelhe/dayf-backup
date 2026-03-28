/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Auth Service
 * 
 * خدمة المصادقة الأساسية
 */

'use server';

import { db } from '@/lib/db';
import { UserRole, hasPermission, hasRole } from '@/core/domain';
import type { User } from '@prisma/client';

export interface AuthResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * تسجيل الدخول
 */
export async function login(email: string, _password: string): Promise<AuthResult> {
  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: 'AUTH_001' };
    }

    // TODO: التحقق من كلمة المرور باستخدام bcrypt
    // const isValid = await bcrypt.compare(password, user.passwordHash);
    // if (!isValid) return { success: false, error: 'AUTH_001' };

    // تحديث آخر تسجيل دخول
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    return { success: true, user };
  } catch {
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * إنشاء حساب
 */
export async function register(
  email: string,
  _password: string,
  displayName: string,
  language: 'ar' | 'en' = 'ar'
): Promise<AuthResult> {
  try {
    // التحقق من عدم وجود المستخدم
    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return { success: false, error: 'AUTH_004' };
    }

    // TODO: تشفير كلمة المرور
    // const passwordHash = await bcrypt.hash(password, 10);

    const user = await db.user.create({
      data: {
        email,
        displayName,
        role: UserRole.USER,
        language,
      },
    });

    return { success: true, user };
  } catch {
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * الحصول على المستخدم الحالي
 */
export async function getCurrentUser(userId: string): Promise<User | null> {
  try {
    return await db.user.findUnique({
      where: { id: userId },
    });
  } catch {
    return null;
  }
}

/**
 * تحديث الملف الشخصي
 */
export async function updateProfile(
  userId: string,
  data: { displayName?: string; photoURL?: string; language?: string }
): Promise<AuthResult> {
  try {
    const user = await db.user.update({
      where: { id: userId },
      data,
    });

    return { success: true, user };
  } catch {
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * التحقق من الصلاحيات
 */
export async function checkPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    return hasPermission(user as any, permission as any);
  } catch {
    return false;
  }
}

/**
 * التحقق من الدور
 */
export async function checkRole(
  userId: string,
  roles: UserRole | UserRole[]
): Promise<boolean> {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) return false;

    return hasRole(user as any, roles);
  } catch {
    return false;
  }
}
