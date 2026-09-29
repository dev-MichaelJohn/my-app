import { http, type ApiError } from "@/lib/api.lib";
import type { ResultAsync } from "neverthrow";
import type {
  IStudentEvalCategoryInsert,
  IStudentEvalCategorySelect,
  IStudentEvalCategoryUpdate,
  IStudentEvalQuestionInsert,
  IStudentEvalQuestionSelect,
  IStudentEvalQuestionUpdate,
  ISupervisorEvalCategoryInsert,
  ISupervisorEvalCategorySelect,
  ISupervisorEvalCategoryUpdate,
  ISupervisorEvalMeansInsert,
  ISupervisorEvalMeansSelect,
  ISupervisorEvalMeansUpdate,
  ISupervisorEvalQuestionInsert,
  ISupervisorEvalQuestionSelect,
  ISupervisorEvalQuestionUpdate,
} from "@my-app/shared";

export class EvaluationBuilderAPI {
  // =========================================================================
  // 1. SET (STUDENT BUILDER)
  // =========================================================================

  // Categories
  addStudentCategory(
    formId: number,
    info: IStudentEvalCategoryInsert,
  ): ResultAsync<IStudentEvalCategorySelect, ApiError> {
    return http.post<IStudentEvalCategorySelect>(
      `/evaluation-builder/student/forms/${formId}/categories`,
      info,
    );
  }

  updateStudentCategory(
    categoryId: number,
    info: IStudentEvalCategoryUpdate,
  ): ResultAsync<IStudentEvalCategorySelect, ApiError> {
    return http.put<IStudentEvalCategorySelect>(
      `/evaluation-builder/student/categories/${categoryId}`,
      info,
    );
  }

  deleteStudentCategory(categoryId: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-builder/student/categories/${categoryId}`);
  }

  restoreStudentCategory(categoryId: number): ResultAsync<IStudentEvalCategorySelect, ApiError> {
    return http.put<IStudentEvalCategorySelect>(
      `/evaluation-builder/student/categories/${categoryId}/restore`,
    );
  }

  getStudentCategoryHistory(
    categoryId: number,
  ): ResultAsync<IStudentEvalCategorySelect[], ApiError> {
    return http.get<IStudentEvalCategorySelect[]>(
      `/evaluation-builder/student/categories/${categoryId}/history`,
    );
  }

  reorderStudentCategories(formId: number, orderedIds: number[]): ResultAsync<void, ApiError> {
    return http.put<void>(`/evaluation-builder/student/forms/${formId}/categories/reorder`, {
      orderedIds,
    });
  }

  // Questions
  addStudentQuestion(
    categoryId: number,
    info: IStudentEvalQuestionInsert,
  ): ResultAsync<IStudentEvalQuestionSelect, ApiError> {
    return http.post<IStudentEvalQuestionSelect>(
      `/evaluation-builder/student/categories/${categoryId}/questions`,
      info,
    );
  }

  updateStudentQuestion(
    questionId: number,
    info: IStudentEvalQuestionUpdate,
  ): ResultAsync<IStudentEvalQuestionSelect, ApiError> {
    return http.put<IStudentEvalQuestionSelect>(
      `/evaluation-builder/student/questions/${questionId}`,
      info,
    );
  }

  deleteStudentQuestion(questionId: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-builder/student/questions/${questionId}`);
  }

  restoreStudentQuestion(questionId: number): ResultAsync<IStudentEvalQuestionSelect, ApiError> {
    return http.put<IStudentEvalQuestionSelect>(
      `/evaluation-builder/student/questions/${questionId}/restore`,
    );
  }

  getStudentQuestionHistory(
    questionId: number,
  ): ResultAsync<IStudentEvalQuestionSelect[], ApiError> {
    return http.get<IStudentEvalQuestionSelect[]>(
      `/evaluation-builder/student/questions/${questionId}/history`,
    );
  }

  reorderStudentQuestions(categoryId: number, orderedIds: number[]): ResultAsync<void, ApiError> {
    return http.put<void>(
      `/evaluation-builder/student/categories/${categoryId}/questions/reorder`,
      { orderedIds },
    );
  }

  // =========================================================================
  // 2. SEF (SUPERVISOR BUILDER)
  // =========================================================================

  // Categories
  addSupervisorCategory(
    formId: number,
    info: ISupervisorEvalCategoryInsert,
  ): ResultAsync<ISupervisorEvalCategorySelect, ApiError> {
    return http.post<ISupervisorEvalCategorySelect>(
      `/evaluation-builder/supervisor/forms/${formId}/categories`,
      info,
    );
  }

  updateSupervisorCategory(
    categoryId: number,
    info: ISupervisorEvalCategoryUpdate,
  ): ResultAsync<ISupervisorEvalCategorySelect, ApiError> {
    return http.put<ISupervisorEvalCategorySelect>(
      `/evaluation-builder/supervisor/categories/${categoryId}`,
      info,
    );
  }

  deleteSupervisorCategory(categoryId: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-builder/supervisor/categories/${categoryId}`);
  }

  restoreSupervisorCategory(
    categoryId: number,
  ): ResultAsync<ISupervisorEvalCategorySelect, ApiError> {
    return http.put<ISupervisorEvalCategorySelect>(
      `/evaluation-builder/supervisor/categories/${categoryId}/restore`,
    );
  }

  getSupervisorCategoryHistory(
    categoryId: number,
  ): ResultAsync<ISupervisorEvalCategorySelect[], ApiError> {
    return http.get<ISupervisorEvalCategorySelect[]>(
      `/evaluation-builder/supervisor/categories/${categoryId}/history`,
    );
  }

  reorderSupervisorCategories(formId: number, orderedIds: number[]): ResultAsync<void, ApiError> {
    return http.put<void>(`/evaluation-builder/supervisor/forms/${formId}/categories/reorder`, {
      orderedIds,
    });
  }

  // Questions
  addSupervisorQuestion(
    categoryId: number,
    info: ISupervisorEvalQuestionInsert,
  ): ResultAsync<ISupervisorEvalQuestionSelect, ApiError> {
    return http.post<ISupervisorEvalQuestionSelect>(
      `/evaluation-builder/supervisor/categories/${categoryId}/questions`,
      info,
    );
  }

  updateSupervisorQuestion(
    questionId: number,
    info: ISupervisorEvalQuestionUpdate,
  ): ResultAsync<ISupervisorEvalQuestionSelect, ApiError> {
    return http.put<ISupervisorEvalQuestionSelect>(
      `/evaluation-builder/supervisor/questions/${questionId}`,
      info,
    );
  }

  deleteSupervisorQuestion(questionId: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-builder/supervisor/questions/${questionId}`);
  }

  restoreSupervisorQuestion(
    questionId: number,
  ): ResultAsync<ISupervisorEvalQuestionSelect, ApiError> {
    return http.put<ISupervisorEvalQuestionSelect>(
      `/evaluation-builder/supervisor/questions/${questionId}/restore`,
    );
  }

  getSupervisorQuestionHistory(
    questionId: number,
  ): ResultAsync<ISupervisorEvalQuestionSelect[], ApiError> {
    return http.get<ISupervisorEvalQuestionSelect[]>(
      `/evaluation-builder/supervisor/questions/${questionId}/history`,
    );
  }

  reorderSupervisorQuestions(
    categoryId: number,
    orderedIds: number[],
  ): ResultAsync<void, ApiError> {
    return http.put<void>(
      `/evaluation-builder/supervisor/categories/${categoryId}/questions/reorder`,
      { orderedIds },
    );
  }

  // MOVs / Means Descriptors
  addMeansDescriptor(
    questionId: number,
    info: ISupervisorEvalMeansInsert,
  ): ResultAsync<ISupervisorEvalMeansSelect, ApiError> {
    return http.post<ISupervisorEvalMeansSelect>(
      `/evaluation-builder/supervisor/questions/${questionId}/means`,
      info,
    );
  }

  updateMeansDescriptor(
    meansId: number,
    info: ISupervisorEvalMeansUpdate,
  ): ResultAsync<ISupervisorEvalMeansSelect, ApiError> {
    return http.put<ISupervisorEvalMeansSelect>(
      `/evaluation-builder/supervisor/means/${meansId}`,
      info,
    );
  }

  deleteMeansDescriptor(meansId: number): ResultAsync<void, ApiError> {
    return http.delete<void>(`/evaluation-builder/supervisor/means/${meansId}`);
  }

  restoreMeansDescriptor(meansId: number): ResultAsync<ISupervisorEvalMeansSelect, ApiError> {
    return http.put<ISupervisorEvalMeansSelect>(
      `/evaluation-builder/supervisor/means/${meansId}/restore`,
    );
  }

  getMeansDescriptorHistory(meansId: number): ResultAsync<ISupervisorEvalMeansSelect[], ApiError> {
    return http.get<ISupervisorEvalMeansSelect[]>(
      `/evaluation-builder/supervisor/means/${meansId}/history`,
    );
  }

  reorderMeansDescriptors(questionId: number, orderedIds: number[]): ResultAsync<void, ApiError> {
    return http.put<void>(`/evaluation-builder/supervisor/questions/${questionId}/reorder-means`, {
      orderedIds,
    });
  }
}
