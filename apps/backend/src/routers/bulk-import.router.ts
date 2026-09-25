import { Router, type IRouter } from "express";
import multer from "multer";
import { AuthController } from "@/controllers/auth.controller.js";
import { BulkImportController } from "@/controllers/bulk-import.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
});

const BulkImportRouter: IRouter = Router();
const bulkImportController = new BulkImportController();
const authController = new AuthController();

BulkImportRouter.use(authController.verifyJWT);
BulkImportRouter.use(standardApiLimiter);
BulkImportRouter.use(RequirePermission(PERMISSIONS.BULK_IMPORT_EXECUTE));

BulkImportRouter.post("/:entity", upload.single("file"), bulkImportController.importEntity);

export default BulkImportRouter;
