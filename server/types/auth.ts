export interface User {
  id: string;
  username: string;
  email?: string;
}

export interface JWTPayload {
  userId: string;
  username: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
