import env from "@/configs/env.config.js";
import { SeederService, type ISeederService } from "@/services/seeder.service.js";

export const SeederFunction = () => {
  const seederService: ISeederService = new SeederService();

  return seederService.seedRolesAndPermission().match(
    () => {
      return seederService
        .seedSystemAdmin({
          account: {
            email: env.EMAIL_FROM,
            password: "!SuperAdmin123",
          },
          details: {
            institutional_id: "04-0204-20",
            last_name: "Larido",
            first_name: "Michael John",
            middle_name: null,
            suffix: null,
          },
          role: "SYS_ADMIN",
        })
        .match(
          () => {
            console.info("Superadmin created successfully. Continuing application setup...");
          },
          (err) => {
            if (err.status === 409) {
              console.info(
                "An active Superadmin already exists. Safe to continue application startup.",
              );
              return;
            }

            return handleFatalError("Super Admin verification failed", err);
          },
        );
    },
    (err) => {
      if (err.status !== 409) return handleFatalError("Roles validation failed", err);
      console.info("System roles already present.");
    },
  );
};

function handleFatalError(context: string, error: any) {
  console.error(`FATAL SYSTEM ERROR: ${context}. ${error.message || error}`);
  console.error("Shutting down application process because no Super Admin is guaranteed.");
  process.exit(1);
}
