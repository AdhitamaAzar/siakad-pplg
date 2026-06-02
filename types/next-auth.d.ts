import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      username: string;
      role: string;
      nama: string;
    };
  }

  interface User {
    id: string;
    username: string;
    role: string;
    nama: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    username: string;
    role: string;
    nama: string;
  }
}
