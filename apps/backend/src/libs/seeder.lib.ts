import env from "@/configs/env.config.js";
import { SeederService, type ISeederService } from "@/services/seeder.service.js";
import { errAsync, okAsync } from "neverthrow";

export const SeederFunction = () => {
  const seederService: ISeederService = new SeederService();

  return seederService
    .seedRolesAndPermission()
    .orElse((err) => {
      if (err.status === 409) {
        console.info("ℹ️ System roles already present. Continuing...");
        return okAsync(undefined);
      }
      return errAsync(err);
    })
    .andThen(() => {
      return seederService
        .seedSystemAdmin({
          account: {
            email: env.EMAIL_FROM || "admin@pit.edu.ph",
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
        .orElse((err) => {
          if (err.status === 409) {
            console.info("ℹ️ Active Superadmin already exists. Safe to continue.");
            return okAsync(undefined);
          }
          return errAsync(err);
        });
    })
    .map(() => {
      console.info("🌱 Database seeding verification completed.");
    });
};
