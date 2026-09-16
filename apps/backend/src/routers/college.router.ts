import { CollegeController } from "@/controllers/college.controller.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const CollegeRouter: IRouter = Router();
const collegeController = new CollegeController();

CollegeRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.COLLEGE_READ),
  collegeController.getCollegeById,
);

CollegeRouter.get("/", RequirePermission(PERMISSIONS.COLLEGE_READ), collegeController.getColleges);

CollegeRouter.post(
  "/",
  RequirePermission(PERMISSIONS.COLLEGE_CREATE),
  collegeController.createCollege,
);

CollegeRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.COLLEGE_UPDATE),
  collegeController.updateCollege,
);

CollegeRouter.delete(
  "/:id",
  RequirePermission(PERMISSIONS.COLLEGE_DELETE),
  collegeController.deleteCollege,
);

export default CollegeRouter;
