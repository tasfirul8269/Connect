import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sql from '../config/database';
import { User, SignupData } from '../types';

const JWT_SECRET = process.env.REACT_APP_JWT_SECRET || 'your-secret-key';

export const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

export const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  return await bcrypt.compare(password, hashedPassword);
};

export const generateToken = (userId: string): string => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
};

export const createUser = async (userData: SignupData): Promise<User | null> => {
  try {
    const hashedPassword = await hashPassword(userData.password);
    
    const user = await sql`
      INSERT INTO users (email, password, account_type)
      VALUES (${userData.email}, ${hashedPassword}, ${userData.account_type})
      RETURNING *
    `;
    
    if (userData.account_type === 'personal' && userData.personalData) {
      await sql`
        INSERT INTO personal_profiles (user_id, first_name, last_name, bio, date_of_birth, location, website)
        VALUES (${user[0].id}, ${userData.personalData.first_name}, ${userData.personalData.last_name}, 
                ${userData.personalData.bio || null}, ${userData.personalData.date_of_birth || null}, 
                ${userData.personalData.location || null}, ${userData.personalData.website || null})
      `;
    } else if (userData.account_type === 'organization' && userData.organizationData) {
      await sql`
        INSERT INTO organization_profiles (user_id, organization_name, description, industry, founded_year, location, website)
        VALUES (${user[0].id}, ${userData.organizationData.organization_name}, 
                ${userData.organizationData.description || null}, ${userData.organizationData.industry || null}, 
                ${userData.organizationData.founded_year || null}, ${userData.organizationData.location || null}, 
                ${userData.organizationData.website || null})
      `;
    }
    
    return user[0] as User;
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
};

export const authenticateUser = async (email: string, password: string): Promise<User | null> => {
  try {
    const users = await sql`
      SELECT * FROM users WHERE email = ${email}
    `;
    
    if (users.length === 0) return null;
    
    const user = users[0] as User;
    const isValidPassword = await comparePassword(password, user.password);
    
    return isValidPassword ? user : null;
  } catch (error) {
    console.error('Error authenticating user:', error);
    return null;
  }
};
