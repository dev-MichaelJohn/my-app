import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { CourseService, type ICourseService } from "@/services/course.service.js";
import z from "zod";

export class CourseController {
  constructor(private courseService: ICourseService = new CourseService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid Program ID provided.");

  getCourseById = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((courseId) => {
      return this.courseService.getCourseById(courseId).map((data) => ({
        status: 200,
        message: "Course details retrieved successfully.",
        data,
      }));
    });
  });

  getCourses = runAsync((req, _res) => {
    return this.courseService.getCourses(req.query).map((data) => ({
      status: 200,
      message: "Courses retrieved successfully.",
      data,
    }));
  });

  createCourse = runAsync((req, _res) => {
    return this.courseService.createCourse(req.body).map((data) => ({
      status: 200,
      message: "Course created successfully.",
      data,
    }));
  });

  updateCourse = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((courseId) => {
      return this.courseService.updateCourse(courseId, req.body).map((data) => ({
        status: 200,
        message: "Course updated successfully.",
        data,
      }));
    });
  });

  deleteCourse = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((courseId) => {
      return this.courseService.deleteCourse(courseId).map(() => ({
        status: 200,
        message: "Course archived successfully.",
        data: null,
      }));
    });
  });

  restoreCourse = runAsync((req, _res) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((courseId) => {
      return this.courseService.restoreCourse(courseId).map((data) => ({
        status: 200,
        message: "Course restored successfully.",
        data,
      }));
    });
  });
}
