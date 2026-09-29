import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  EvaluationScheduleService,
  type IEvaluationScheduleService,
} from "@/services/evaluation-schedule.service.js";
import z from "zod";

export class EvaluationScheduleController {
  constructor(
    private scheduleService: IEvaluationScheduleService = new EvaluationScheduleService(),
  ) {}

  private idSchema = z.coerce.number().int().positive("Invalid Schedule ID provided.");

  // ── Student Schedule (SET) Handlers ──
  getStudentScheduleById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.getStudentScheduleById(id).map((data) => ({
        status: 200,
        message: "Student evaluation schedule retrieved.",
        data,
      }));
    });
  });

  getActiveStudentSchedule = runAsync((req) => {
    const semId = req.query.semester_id ? Number(req.query.semester_id) : undefined;
    return this.scheduleService.getActiveStudentSchedule(semId).map((data) => ({
      status: 200,
      message: data
        ? "Active student evaluation window retrieved."
        : "No active student evaluation schedule ongoing.",
      data,
    }));
  });

  getStudentSchedules = runAsync((req) => {
    return this.scheduleService.getStudentSchedules(req.query).map((data) => ({
      status: 200,
      message: "Student evaluation schedules retrieved.",
      data,
    }));
  });

  createStudentSchedule = runAsync((req) => {
    return this.scheduleService.createStudentSchedule(req.body).map((data) => ({
      status: 201,
      message: "Student evaluation schedule created successfully.",
      data,
    }));
  });

  updateStudentSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.updateStudentSchedule(id, req.body).map((data) => ({
        status: 200,
        message: "Student evaluation schedule updated.",
        data,
      }));
    });
  });

  deleteStudentSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.deleteStudentSchedule(id).map(() => ({
        status: 200,
        message: "Student evaluation schedule archived.",
        data: null,
      }));
    });
  });

  restoreStudentSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.restoreStudentSchedule(id).map((data) => ({
        status: 200,
        message: "Student evaluation schedule restored.",
        data,
      }));
    });
  });

  forceStopStudentSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.forceStopStudentSchedule(id).map((data) => ({
        status: 200,
        message: "Student evaluation window concluded immediately.",
        data,
      }));
    });
  });

  // ── Supervisor Schedule (SEF) Handlers ──
  getSupervisorScheduleById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.getSupervisorScheduleById(id).map((data) => ({
        status: 200,
        message: "Supervisor evaluation schedule retrieved.",
        data,
      }));
    });
  });

  getActiveSupervisorSchedule = runAsync((req) => {
    const semId = req.query.semester_id ? Number(req.query.semester_id) : undefined;
    return this.scheduleService.getActiveSupervisorSchedule(semId).map((data) => ({
      status: 200,
      message: data
        ? "Active supervisor evaluation window retrieved."
        : "No active supervisor evaluation schedule ongoing.",
      data,
    }));
  });

  getSupervisorSchedules = runAsync((req) => {
    return this.scheduleService.getSupervisorSchedules(req.query).map((data) => ({
      status: 200,
      message: "Supervisor evaluation schedules retrieved.",
      data,
    }));
  });

  createSupervisorSchedule = runAsync((req) => {
    return this.scheduleService.createSupervisorSchedule(req.body).map((data) => ({
      status: 201,
      message: "Supervisor evaluation schedule created successfully.",
      data,
    }));
  });

  updateSupervisorSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.updateSupervisorSchedule(id, req.body).map((data) => ({
        status: 200,
        message: "Supervisor evaluation schedule updated.",
        data,
      }));
    });
  });

  deleteSupervisorSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.deleteSupervisorSchedule(id).map(() => ({
        status: 200,
        message: "Supervisor evaluation schedule archived.",
        data: null,
      }));
    });
  });

  restoreSupervisorSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.restoreSupervisorSchedule(id).map((data) => ({
        status: 200,
        message: "Supervisor evaluation schedule restored.",
        data,
      }));
    });
  });

  forceStopSupervisorSchedule = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((id) => {
      return this.scheduleService.forceStopSupervisorSchedule(id).map((data) => ({
        status: 200,
        message: "Supervisor evaluation window concluded immediately.",
        data,
      }));
    });
  });
}
