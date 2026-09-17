import { CourseController } from "@/controllers/course.controller.js";
import { standardApiLimiter } from "@/libs/limiter.lib.js";
import { RequirePermission } from "@/middlewares/rbac.middleware.js";
import { PERMISSIONS } from "@my-app/shared";
import { Router, type IRouter } from "express";

const CourseRouter: IRouter = Router();
const courseController = new CourseController();

CourseRouter.use(standardApiLimiter);

CourseRouter.get(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_READ),
  courseController.getCourseById,
);

CourseRouter.get("/", RequirePermission(PERMISSIONS.COURSE_READ), courseController.getCourses);

CourseRouter.post("/", RequirePermission(PERMISSIONS.COURSE_CREATE), courseController.createCourse);

CourseRouter.put(
  "/:id",
  RequirePermission(PERMISSIONS.COURSE_UPDATE),
  courseController.updateCourse,
);

CourseRouter.delete(
  "/",
  RequirePermission(PERMISSIONS.COURSE_DELETE),
  courseController.deleteCourse,
);

CourseRouter.put(
  "/:id/restore",
  RequirePermission(PERMISSIONS.COURSE_UPDATE),
  courseController.restoreCourse,
);

export default CourseRouter;
