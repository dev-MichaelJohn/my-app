import { OTPEmailTemplate, OTPTextTemplate } from "@/libs/email.lib.js";
import { AppError } from "@/libs/error.lib.js";
import { runAsync } from "@/libs/express-adapter.lib.js";
import { AuthenticateLocal } from "@/libs/passport.lib.js";
import { EmailService, type IEmailService } from "@/services/email.service.js";
import { OTPService, type IOTPService } from "@/services/otp.service.js";
import { errAsync, okAsync } from "neverthrow";

export class AuthController {
  constructor(
    private emailService: IEmailService = new EmailService(),
    private otpService: IOTPService = new OTPService(),
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

  private generateResendTime(expires_at: Date) {
    const OTP_LIFESPAN_MS = 5 * 60 * 1000; // 5 minutes
    const OTP_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

    const expiryTime = new Date(expires_at).getTime();
    const createdAt = expiryTime - OTP_LIFESPAN_MS;

    return createdAt + OTP_COOLDOWN_MS;
  }
}
