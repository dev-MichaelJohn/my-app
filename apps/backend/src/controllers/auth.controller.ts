import env from "@/configs/env.config.js";
import { OTPEmailTemplate, OTPTextTemplate } from "@/libs/email.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { runAsync, runMiddleware } from "@/libs/express-adapter.lib.js";
import { logger } from "@/libs/logger.lib.js";
import { AuthenticateLocal, AuthenticateOTP, AuthenticateJWT } from "@/libs/passport.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { AuthService, type IAuthService } from "@/services/auth.service.js";
import { EmailService, type IEmailService } from "@/services/email.service.js";
import { OTPService, type IOTPService } from "@/services/otp.service.js";
import { TokenService, type ITokenService } from "@/services/token.service.js";
import { UserService, type IUserService } from "@/services/user.service.js";
import { ForgotPasswordRequestSchema, ResetPasswordWithOtpSchema } from "@my-app/shared";
import { errAsync, okAsync } from "neverthrow";

export class AuthController {
  constructor(
    private emailService: IEmailService = new EmailService(),
    private otpService: IOTPService = new OTPService(),
    private tokenService: ITokenService = new TokenService(),
    private userService: IUserService = new UserService(),
    private authService: IAuthService = new AuthService(),
  ) {}

  login = runAsync((req, res) => {
    return AuthenticateLocal(req, res).andThen((user) => {
      const { email } = user.account;

      return this.otpService.findActiveOTP(email).andThen((otpFlag) => {
        if (otpFlag.hasActive && otpFlag.otp) {
          const resendAt = this.generateResendTime(otpFlag.otp.expires_at);
          return okAsync({
            status: 200,
            message: "An OTP was already sent. Please wait before requesting another.",
            data: {
              email,
              resendAt,
            },
          });
        }

        return this.otpService.generateOTP(email).andThen((otpCode) => {
          if (!otpCode)
            return errAsync(new AppError(500, "Failed to generate OTP. Please try again."));

          if (env.NODE_ENV !== "production") {
            logger.info(`🔑 [DEV ONLY] Generated OTP for ${email}: ${otpCode.code}`);
          }

          return this.emailService
            .sendEmail({
              to: email,
              options: {
                subject: "Login Verification Code",
                text: OTPTextTemplate(otpCode.code),
                html: OTPEmailTemplate(otpCode.code),
              },
            })
            .orElse((err) => {
              return this.otpService.deleteOTP(otpCode.id, email).andThen(() => {
                if (env.BYPASS_OTP) {
                  return okAsync(undefined);
                }
                logger.error(`Login OTP delivery failed for ${email}: ${err.message}`);
                return errAsync(
                  new AppError(
                    500,
                    `Failed to deliver verification code to your email: ${err.message}`,
                  ),
                );
              });
            })
            .map(() => {
              const resendAt = this.generateResendTime(otpCode.expires_at);

              return {
                status: 201,
                message: "Please enter the code sent to your email. Code expires in 5 minutes.",
                data: { email, resendAt },
              };
            });
        });
      });
    });
  });

  verifyOTP = runAsync((req, res) => {
    return AuthenticateOTP(req, res).andThen((user) => {
      return this.tokenService.generateAccessToken(user).andThen((accessToken) => {
        return this.tokenService
          .generateRefreshToken(user.account.id, user.account.email)
          .andThen((refreshToken) => {
            return this.tokenService
              .storeRefreshToken({ id: user.account.id, email: user.account.email }, refreshToken)
              .map(() => {
                const cookieOptions = this.tokenService.generateCookieOptions();
                res.cookie("refresh", refreshToken, cookieOptions);
                res.setHeader("x-access-token", accessToken);

                return {
                  status: 200,
                  message: "Authentication successful.",
                  data: {
                    token: `bearer ${accessToken}`,
                    user,
                  },
                };
              });
          });
      });
    });
  });

  verifyJWT = runMiddleware((req, res) => {
    return AuthenticateJWT(req, res).andThen((user) => {
      if (!user) {
        const refreshToken = req.cookies?.refresh;
        if (!refreshToken) {
          return errAsync(new AppError(401, "Authentication required. Please log in."));
        }

        return this.refreshJWT(refreshToken).map((newData) => {
          const cookieOptions = this.tokenService.generateCookieOptions();
          res.cookie("refresh", newData.refreshToken, cookieOptions);
          res.setHeader("x-access-token", newData.token);

          req.user = newData.user;
          return;
        });
      }

      req.user = user;
      return okAsync(undefined);
    });
  });

  refreshJWT = (refreshToken: string) => {
    return this.tokenService.verifyRefreshToken(refreshToken).andThen((tokenData) => {
      return this.userService.getUserById(tokenData.account_id).andThen((user) => {
        return this.tokenService.generateAccessToken(user).andThen((accessToken) => {
          return this.tokenService
            .generateRefreshToken(user.account.id, user.account.email)
            .andThen((newRefreshToken) => {
              return this.tokenService
                .rotateRefreshToken(
                  { id: user.account.id, email: user.account.email },
                  refreshToken,
                  newRefreshToken,
                )
                .andThen(() => {
                  return okAsync({
                    refreshToken: newRefreshToken,
                    token: `bearer ${accessToken}`,
                    user,
                  });
                });
            });
        });
      });
    });
  };

  me = runAsync(
    (req, _res) => {
      if (!req.user)
        return errAsync(new AppError(401, "Token expired or missing. Please log in again."));
      return okAsync(req.user);
    },
    { message: "Session valid." },
  );

  logout = runAsync(
    (req, res) => {
      const refreshToken = req.cookies?.refresh;

      // 🔒 Ensure cookie is aggressively removed across all browsers
      const isProduction = process.env.NODE_ENV === "production";
      res.clearCookie("refresh", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "none" : "lax",
        path: "/",
      });

      if (!refreshToken) {
        return okAsync(undefined);
      }

      return this.tokenService.deleteRefreshToken(refreshToken).map(() => undefined);
    },
    { message: "Logged out successfully." },
  );

  getVerificationStatus = runAsync((req, _res) => {
    if (!req.user) return errAsync(new AppError(401, "Authentication required."));
    return this.authService.checkVerificationStatus(req.user).map((isVerified) => {
      return {
        status: 200,
        message: "Verification status retrieved.",
        isVerified,
      };
    });
  });

  forgotPassword = runAsync((req) => {
    return ValidateSchema(ForgotPasswordRequestSchema, req.body).asyncAndThen((body) => {
      return this.authService.requestPasswordReset(body).map((result) => ({
        status: 200,
        message: result.email
          ? "Password reset verification code sent to your email."
          : "If an account matches that ID, a password reset code has been sent.",
        data: result,
      }));
    });
  });

  resetPasswordWithOtp = runAsync((req, res) => {
    return ValidateSchema(ResetPasswordWithOtpSchema, req.body).asyncAndThen((body) => {
      return this.authService.resetPasswordWithOtp(body, req).map(() => {
        const isProduction = process.env.NODE_ENV === "production";
        res.clearCookie("refresh", {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? "none" : "lax",
          path: "/",
        });

        return {
          status: 200,
          message: "Password reset successfully. You can now log in with your new password.",
          data: null,
        };
      });
    });
  });

  private generateResendTime(expires_at: Date) {
    const OTP_LIFESPAN_MS = 5 * 60 * 1000; // 5 minutes
    const OTP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    const expiryTime = new Date(expires_at).getTime();
    const createdAt = expiryTime - OTP_LIFESPAN_MS;

    return createdAt + OTP_COOLDOWN_MS;
  }
}
