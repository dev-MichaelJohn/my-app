import { CollegeController } from "@/controllers/college.controller.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const CollegeRouter: IRouter = Router();
const collegeController = new CollegeController();

CollegeRouter.get(
  "/:id",
  //RequirePermission(PERMISSIONS.COLLEGE_READ),
  collegeController.getCollegeById,
);

export default CollegeRouter;
