import { http, setAccessToken, type ApiError } from "@/lib/api.lib";
import type { GetUser, LoginAccount, VerifyOTP } from "@my-app/shared";
import type { ResultAsync } from "neverthrow";

export interface LoginResponse {
  email: string;
  resendAt: number;
}

export interface VerifyOTPResponse {
  token: string;
  user: GetUser;
}

export interface VerificationStatusResponse {
  isVerified: boolean;
}

export class AuthAPI {
  login(credentials: LoginAccount): ResultAsync<LoginResponse, ApiError> {
    return http.post<LoginResponse>("/auth/login", credentials);
  }

  verifyOTP(payload: VerifyOTP): ResultAsync<VerifyOTPResponse, ApiError> {
    return http.post<VerifyOTPResponse>("/auth/verify-otp", payload).map((data) => {
      const cleanAccessToken = data.token.replace(/^bearer\s+/i, "");
      setAccessToken(cleanAccessToken);
      return data;
    });
  }

  getMe(): ResultAsync<GetUser, ApiError> {
    return http.get<GetUser>("/auth/me");
  }

  getVerificationStatus(): ResultAsync<VerificationStatusResponse, ApiError> {
    return http.get<VerificationStatusResponse>("/auth/verification-status");
  }

  logout(): ResultAsync<void, ApiError> {
    return http.post<void>("/auth/logout").map(() => {
      setAccessToken(null);
    });
  }
}
