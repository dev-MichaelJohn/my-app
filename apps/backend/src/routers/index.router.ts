import { createAPIResponse } from "@/libs/response.lib.js";
import { Router, type IRouter } from "express";
import AuthRouter from "./auth.router.js";
import CollegeRouter from "./college.router.js";
import ProgramRouter from "./program.router.js";
import CourseRouter from "./course.router.js";
import CurriculumRouter from "./curriculum.router.js";
import ClassStudentRouter from "./class-student.router.js";
import OfferingRouter from "./offering.router.js";

const V1Router: IRouter = Router();

V1Router.get("/health", (_req, res, _next) => {
  const response = createAPIResponse(200, "Hello from PIT-FES V1 API!!");
  res.status(response.status).json(response);
});

V1Router.use("/auth", AuthRouter);
V1Router.use("/colleges", CollegeRouter);
V1Router.use("/programs", ProgramRouter);
V1Router.use("/courses", CourseRouter);
V1Router.use("/curriculums", CurriculumRouter);
V1Router.use("/class-students", ClassStudentRouter);
V1Router.use("/offerings", OfferingRouter);

export default V1Router;
