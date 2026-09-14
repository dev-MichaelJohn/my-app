import type { GetUser } from "@my-app/shared";

declare global {
  namespace Express {
    interface User extends GetUser {}

    interface Request {
      user?: GetUser;
    }
  }
}
