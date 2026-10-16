import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  EvaluationInstrumentService,
  type IEvaluationInstrumentService,
} from "@/services/evaluation-instrument.service.js";
import z from "zod";

export class EvaluationInstrumentController {
  constructor(
    private instrumentService: IEvaluationInstrumentService = new EvaluationInstrumentService(),
  ) {}

  private idSchema = z.coerce.number().int().positive("Invalid Form ID provided.");

  createStudentForm = runAsync((req) => {
    return this.instrumentService
      .createStudentForm(req.body, undefined, req.user, req)
      .map((data) => ({
        status: 201,
        message: "Student evaluation form template created successfully.",
        data,
      }));
  });

  getStudentFormById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService.getStudentFormById(formId).map((data) => ({
        status: 200,
        message: "Student evaluation form hierarchy retrieved.",
        data,
      }));
    });
  });

  getStudentForms = runAsync((req) => {
    return this.instrumentService.getStudentForms(req.query).map((data) => ({
      status: 200,
      message: "Student evaluation forms retrieved.",
      data,
    }));
  });

  updateStudentForm = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService
        .updateStudentForm(formId, req.body, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Student evaluation form updated.",
          data,
        }));
    });
  });

  deleteStudentForm = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService.deleteStudentForm(formId, undefined, req.user, req).map(() => ({
        status: 200,
        message: "Student evaluation form archived successfully.",
        data: null,
      }));
    });
  });

  restoreStudentForm = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService
        .restoreStudentForm(formId, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Student evaluation form restored.",
          data,
        }));
    });
  });

  createSupervisorForm = runAsync((req) => {
    return this.instrumentService
      .createSupervisorForm(req.body, undefined, req.user, req)
      .map((data) => ({
        status: 201,
        message: "Supervisor evaluation form template created successfully.",
        data,
      }));
  });

  getSupervisorFormById = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService.getSupervisorFormById(formId).map((data) => ({
        status: 200,
        message: "Supervisor evaluation form hierarchy retrieved.",
        data,
      }));
    });
  });

  getSupervisorForms = runAsync((req) => {
    return this.instrumentService.getSupervisorForms(req.query).map((data) => ({
      status: 200,
      message: "Supervisor evaluation forms retrieved.",
      data,
    }));
  });

  updateSupervisorForm = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService
        .updateSupervisorForm(formId, req.body, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Supervisor evaluation form updated.",
          data,
        }));
    });
  });

  deleteSupervisorForm = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService
        .deleteSupervisorForm(formId, undefined, req.user, req)
        .map(() => ({
          status: 200,
          message: "Supervisor evaluation form archived successfully.",
          data: null,
        }));
    });
  });

  restoreSupervisorForm = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.id).asyncAndThen((formId) => {
      return this.instrumentService
        .restoreSupervisorForm(formId, undefined, req.user, req)
        .map((data) => ({
          status: 200,
          message: "Supervisor evaluation form restored.",
          data,
        }));
    });
  });
}
