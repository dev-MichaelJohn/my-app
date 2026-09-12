import { OTPEmailTemplate, OTPTextTemplate } from "@/libs/email.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { runAsync, runMiddleware } from "@/libs/express-adapter.lib.js";
import { AuthenticateLocal, AuthenticateOTP, AuthenticateJWT } from "@/libs/passport.lib.js";
import { EmailService, type IEmailService } from "@/services/email.service.js";
import { OTPService, type IOTPService } from "@/services/otp.service.js";
import { TokenService, type ITokenService } from "@/services/token.service.js";
import { UserService, type IUserService } from "@/services/user.service.js";
import { errAsync, okAsync } from "neverthrow";

export class AuthController {
  constructor(
    private emailService: IEmailService = new EmailService(),
    private otpService: IOTPService = new OTPService(),
    private tokenService: ITokenService = new TokenService(),
    private userService: IUserService = new UserService(),
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

          return this.emailService
            .sendEmail({
              to: email,
              options: {
                subject: "Login Verification Code",
                text: OTPTextTemplate(otpCode.code),
                html: OTPEmailTemplate(otpCode.code),
              },
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
      const cookieOptions = this.tokenService.generateCookieOptions();

      res.clearCookie("refresh", cookieOptions);

      return this.tokenService.deleteRefreshToken(refreshToken).map(() => undefined);
    },
    { message: "Logged out successfully." },
  );

  private generateResendTime(expires_at: Date) {
    const OTP_LIFESPAN_MS = 5 * 60 * 1000; // 5 minutes
    const OTP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    const expiryTime = new Date(expires_at).getTime();
    const createdAt = expiryTime - OTP_LIFESPAN_MS;

    return createdAt + OTP_COOLDOWN_MS;
  }
}
