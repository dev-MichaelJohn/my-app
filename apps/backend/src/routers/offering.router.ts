import { OfferingController } from "@/controllers/offering.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const OfferingRouter: IRouter = Router();
const offeringController = new OfferingController();

OfferingRouter.use(standardApiLimiter);

OfferingRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_OFFERING_READ),
  offeringController.getOfferingById,
);

OfferingRouter.get(
  "/",
  RequirePermission(PERMISSIONS.COURSE_OFFERING_READ),
  offeringController.getOfferings,
);

OfferingRouter.post(
  "/",
  RequirePermission(PERMISSIONS.COURSE_OFFERING_CREATE),
  offeringController.createOffering,
);

OfferingRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_OFFERING_UPDATE),
  offeringController.updateOffering,
);

OfferingRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_OFFERING_DELETE),
  offeringController.deleteOffering,
);

OfferingRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_OFFERING_UPDATE),
  offeringController.restoreOffering,
);

export default OfferingRouter;
