import { Router, type IRouter } from "express";
import AuthRouter from "./auth.router.js";
import CollegeRouter from "./college.router.js";
import ProgramRouter from "./program.router.js";
import CourseRouter from "./course.router.js";
import CurriculumRouter from "./curriculum.router.js";
import ClassRouter from "./class.router.js";
import ClassStudentRouter from "./class-student.router.js";
import OfferingRouter from "./offering.router.js";
import StudentClassRouter from "./student-class.router.js";
import UserRouter from "./user.router.js";
import SemesterRouter from "./semester.router.js";
import BulkImportRouter from "./bulk-import.router.js";
import InstrumentRouter from "./evaluation-instrument.router.js";
import BuilderRouter from "./evaluation-builder.router.js";
import ScheduleRouter from "./evaluation-schedule.router.js";
import SubmissionRouter from "./evaluation-submission.router.js";
import ReportRouter from "./evaluation-report.router.js";
import AnalyticsRouter from "./analytics.router.js";
import { checkSystemHealth } from "@/libs/health.lib.js";

const V1Router: IRouter = Router();

V1Router.get("/health", async (_req, res, _next) => {
  const { isHealthy, report } = await checkSystemHealth();
  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 200 : 503,
    message: isHealthy ? "PIT-FES API and Database operational." : "Database connection degraded.",
    data: report,
  });
});

V1Router.use("/auth", AuthRouter);
V1Router.use("/colleges", CollegeRouter);
V1Router.use("/programs", ProgramRouter);
V1Router.use("/courses", CourseRouter);
V1Router.use("/curriculums", CurriculumRouter);
V1Router.use("/classes", ClassRouter);
V1Router.use("/class-students", ClassStudentRouter);
V1Router.use("/offerings", OfferingRouter);
V1Router.use("/student-classes", StudentClassRouter);
V1Router.use("/users", UserRouter);
V1Router.use("/semesters", SemesterRouter);
V1Router.use("/bulk-import", BulkImportRouter);
V1Router.use("/evaluation-instruments", InstrumentRouter);
V1Router.use("/evaluation-builder", BuilderRouter);
V1Router.use("/evaluation-schedules", ScheduleRouter);
V1Router.use("/evaluation-submissions", SubmissionRouter);
V1Router.use("/evaluation-reports", ReportRouter);
V1Router.use("/analytics", AnalyticsRouter);

export default V1Router;
