import { runAsync } from "@/libs/express-adapter.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import {
  EvaluationBuilderService,
  type IEvaluationBuilderService,
} from "@/services/evaluation-builder.service.js";
import z from "zod";

export class EvaluationBuilderController {
  constructor(private builderService: IEvaluationBuilderService = new EvaluationBuilderService()) {}

  private idSchema = z.coerce.number().int().positive("Invalid ID provided.");
  private reorderSchema = z.object({
    orderedIds: z.array(
      z.number().int().positive("IDs in reorder list must be positive integers."),
    ),
  });

  // =========================================================================
  // 1. STUDENT EVALUATION INSTRUMENT (SET) HANDLERS
  // =========================================================================

  // ── Categories ──
  addStudentCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.form_id).asyncAndThen((formId) => {
      return this.builderService.addStudentCategory(formId, req.body).map((data) => ({
        status: 201,
        message: "Category created successfully.",
        data,
      }));
    });
  });

  updateStudentCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.updateStudentCategory(categoryId, req.body).map((data) => ({
        status: 200,
        message: `Category updated to version ${data.version}.`,
        data,
      }));
    });
  });

  deleteStudentCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.deleteStudentCategory(categoryId).map(() => ({
        status: 200,
        message: "Category and its questions archived.",
        data: null,
      }));
    });
  });

  restoreStudentCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.restoreStudentCategory(categoryId).map((data) => ({
        status: 200,
        message: "Category restored successfully.",
        data,
      }));
    });
  });

  getStudentCategoryHistory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.getStudentCategoryHistory(categoryId).map((data) => ({
        status: 200,
        message: "Category revision history retrieved.",
        data,
      }));
    });
  });

  reorderStudentCategories = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.form_id).asyncAndThen((formId) => {
      return ValidateSchema(this.reorderSchema, req.body).asyncAndThen(({ orderedIds }) => {
        return this.builderService.reorderStudentCategories(formId, orderedIds).map(() => ({
          status: 200,
          message: "Categories reordered successfully.",
          data: null,
        }));
      });
    });
  });

  // ── Questions ──
  addStudentQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.addStudentQuestion(categoryId, req.body).map((data) => ({
        status: 201,
        message: "Question added successfully.",
        data,
      }));
    });
  });

  updateStudentQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.updateStudentQuestion(questionId, req.body).map((data) => ({
        status: 200,
        message: `Question updated to version ${data.version}.`,
        data,
      }));
    });
  });

  deleteStudentQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.deleteStudentQuestion(questionId).map(() => ({
        status: 200,
        message: "Question archived.",
        data: null,
      }));
    });
  });

  restoreStudentQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.restoreStudentQuestion(questionId).map((data) => ({
        status: 200,
        message: "Question restored successfully.",
        data,
      }));
    });
  });

  getStudentQuestionHistory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.getStudentQuestionHistory(questionId).map((data) => ({
        status: 200,
        message: "Question revision history retrieved.",
        data,
      }));
    });
  });

  reorderStudentQuestions = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return ValidateSchema(this.reorderSchema, req.body).asyncAndThen(({ orderedIds }) => {
        return this.builderService.reorderStudentQuestions(categoryId, orderedIds).map(() => ({
          status: 200,
          message: "Questions reordered successfully.",
          data: null,
        }));
      });
    });
  });

  // =========================================================================
  // 2. SUPERVISOR EVALUATION INSTRUMENT (SEF) HANDLERS
  // =========================================================================

  // ── Categories ──
  addSupervisorCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.form_id).asyncAndThen((formId) => {
      return this.builderService.addSupervisorCategory(formId, req.body).map((data) => ({
        status: 201,
        message: "Supervisor category created.",
        data,
      }));
    });
  });

  updateSupervisorCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.updateSupervisorCategory(categoryId, req.body).map((data) => ({
        status: 200,
        message: `Supervisor category updated to version ${data.version}.`,
        data,
      }));
    });
  });

  deleteSupervisorCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.deleteSupervisorCategory(categoryId).map(() => ({
        status: 200,
        message: "Supervisor category archived.",
        data: null,
      }));
    });
  });

  restoreSupervisorCategory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.restoreSupervisorCategory(categoryId).map((data) => ({
        status: 200,
        message: "Supervisor category restored.",
        data,
      }));
    });
  });

  getSupervisorCategoryHistory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.getSupervisorCategoryHistory(categoryId).map((data) => ({
        status: 200,
        message: "Supervisor category revision history retrieved.",
        data,
      }));
    });
  });

  reorderSupervisorCategories = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.form_id).asyncAndThen((formId) => {
      return ValidateSchema(this.reorderSchema, req.body).asyncAndThen(({ orderedIds }) => {
        return this.builderService.reorderSupervisorCategories(formId, orderedIds).map(() => ({
          status: 200,
          message: "Supervisor categories reordered.",
          data: null,
        }));
      });
    });
  });

  // ── Questions ──
  addSupervisorQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return this.builderService.addSupervisorQuestion(categoryId, req.body).map((data) => ({
        status: 201,
        message: "Supervisor question added.",
        data,
      }));
    });
  });

  updateSupervisorQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.updateSupervisorQuestion(questionId, req.body).map((data) => ({
        status: 200,
        message: `Supervisor question updated to version ${data.version}.`,
        data,
      }));
    });
  });

  deleteSupervisorQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.deleteSupervisorQuestion(questionId).map(() => ({
        status: 200,
        message: "Supervisor question archived.",
        data: null,
      }));
    });
  });

  restoreSupervisorQuestion = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.restoreSupervisorQuestion(questionId).map((data) => ({
        status: 200,
        message: "Supervisor question restored.",
        data,
      }));
    });
  });

  getSupervisorQuestionHistory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.getSupervisorQuestionHistory(questionId).map((data) => ({
        status: 200,
        message: "Supervisor question revision history retrieved.",
        data,
      }));
    });
  });

  reorderSupervisorQuestions = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.category_id).asyncAndThen((categoryId) => {
      return ValidateSchema(this.reorderSchema, req.body).asyncAndThen(({ orderedIds }) => {
        return this.builderService.reorderSupervisorQuestions(categoryId, orderedIds).map(() => ({
          status: 200,
          message: "Supervisor questions reordered.",
          data: null,
        }));
      });
    });
  });

  // ── MOVs / Means Descriptors ──
  addMeansDescriptor = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return this.builderService.addMeansDescriptor(questionId, req.body).map((data) => ({
        status: 201,
        message: "MOV descriptor added.",
        data,
      }));
    });
  });

  updateMeansDescriptor = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.means_id).asyncAndThen((meansId) => {
      return this.builderService.updateMeansDescriptor(meansId, req.body).map((data) => ({
        status: 200,
        message: `MOV descriptor updated to version ${data.version}.`,
        data,
      }));
    });
  });

  deleteMeansDescriptor = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.means_id).asyncAndThen((meansId) => {
      return this.builderService.deleteMeansDescriptor(meansId).map(() => ({
        status: 200,
        message: "MOV descriptor archived.",
        data: null,
      }));
    });
  });

  restoreMeansDescriptor = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.means_id).asyncAndThen((meansId) => {
      return this.builderService.restoreMeansDescriptor(meansId).map((data) => ({
        status: 200,
        message: "MOV descriptor restored.",
        data,
      }));
    });
  });

  getMeansDescriptorHistory = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.means_id).asyncAndThen((meansId) => {
      return this.builderService.getMeansDescriptorHistory(meansId).map((data) => ({
        status: 200,
        message: "MOV descriptor revision history retrieved.",
        data,
      }));
    });
  });

  reorderMeansDescriptors = runAsync((req) => {
    return ValidateSchema(this.idSchema, req.params.question_id).asyncAndThen((questionId) => {
      return ValidateSchema(this.reorderSchema, req.body).asyncAndThen(({ orderedIds }) => {
        return this.builderService.reorderMeansDescriptors(questionId, orderedIds).map(() => ({
          status: 200,
          message: "MOV descriptors reordered.",
          data: null,
        }));
      });
    });
  });
}
