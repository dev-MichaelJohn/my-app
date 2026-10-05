import { and, eq, inArray, isNull, lte, gte, isNotNull, desc, asc } from "drizzle-orm";
import { type ResultAsync } from "neverthrow";
import db from "@/configs/db.config.js";
import {
  Accounts,
  Classes,
  CollegeDeans,
  Colleges,
  CourseCurriculums,
  CourseOfferings,
  Courses,
  PersonalDetails,
  ProgramChairs,
  Programs,
  Semesters,
  StudentClasses,
  StudentEvaluationForms,
  StudentEvaluationRatings,
  StudentEvaluations,
  SupervisorEvaluationRatings,
  SupervisorEvaluations,
  SupervisorEvaluationSchedules,
  StudentEvaluationSchedules,
  type FacultyTeachingOffering,
  type TeachingStudentItem,
  SupervisorEvaluationForms,
  type EvaluableSupervisorFaculty,
} from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { analyzeCommentSentiment } from "@/libs/sentiment.lib.js";
import { emitEvaluationPulse } from "@/libs/socket.lib.js";
import {
  EvaluationInstrumentService,
  type IEvaluationInstrumentService,
} from "./evaluation-instrument.service.js";
import {
  SubmitStudentEvaluationSchema,
  SubmitSupervisorEvaluationSchema,
  type EvaluableStudentSubject,
  type StudentEvaluationFormView,
  type SubmitStudentEvaluation,
  type SubmitSupervisorEvaluation,
  type SupervisorEvaluationFormView,
} from "@my-app/shared";
import { UserService, type IUserService } from "./user.service.js";
import { getFormulaById } from "@my-app/shared";

export interface IEvaluationSubmissionService {
  // Student (SET)
  getEvaluableStudentSubjects(
    studentAccountId: number,
    client?: DbClient,
  ): ResultAsync<EvaluableStudentSubject[], AppError>;
  getStudentEvaluationFormView(
    studentAccountId: number,
    studentClassId: number,
    client?: DbClient,
  ): ResultAsync<StudentEvaluationFormView, AppError>;
  submitStudentEvaluation(
    studentAccountId: number,
    payload: SubmitStudentEvaluation,
    client?: DbClient,
  ): ResultAsync<
    {
      evaluation_id: number;
      rating: number | null;
      sentiment_score: number | null;
      sentiment_classification: string | null;
    },
    AppError
  >;

  // Supervisor (SEF)
  getEvaluableSupervisorFaculty(
    evaluatorAccountId: number,
    client?: DbClient,
  ): ResultAsync<EvaluableSupervisorFaculty[], AppError>;
  getSupervisorEvaluationFormView(
    evaluatorAccountId: number,
    courseOfferingId: number,
    client?: DbClient,
  ): ResultAsync<SupervisorEvaluationFormView, AppError>;
  submitSupervisorEvaluation(
    evaluatorAccountId: number,
    payload: SubmitSupervisorEvaluation,
    client?: DbClient,
  ): ResultAsync<
    {
      evaluation_id: number;
      rating: number | null;
      sentiment_score: number | null;
      sentiment_classification: string | null;
    },
    AppError
  >;

  getFacultyTeachingOfferings(
    facultyAccountId: number,
    semesterId?: number,
    client?: DbClient,
  ): ResultAsync<FacultyTeachingOffering[], AppError>;
}

export class EvaluationSubmissionService implements IEvaluationSubmissionService {
  constructor(
    private instrumentService: IEvaluationInstrumentService = new EvaluationInstrumentService(),
    private userService: IUserService = new UserService(),
  ) {}

  // =========================================================================
  // 1. STUDENT (SET) EVALUATION FLOW
  // =========================================================================

  getEvaluableStudentSubjects(
    studentAccountId: number,
    client: DbClient = db,
  ): ResultAsync<EvaluableStudentSubject[], AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

      const [activeSchedule] = await tx
        .select()
        .from(StudentEvaluationSchedules)
        .where(
          and(
            lte(StudentEvaluationSchedules.open_at, now),
            gte(StudentEvaluationSchedules.close_at, now),
            isNull(StudentEvaluationSchedules.deleted_at),
          ),
        )
        .limit(1);

      if (!activeSchedule) {
        return [];
      }

      const enrollments = await tx
        .select({
          studentClassId: StudentClasses.id,
          offeringId: CourseOfferings.id,
          courseName: Courses.name,
          courseCode: Courses.initialism,
          yearLevel: Classes.year_level,
          section: Classes.section,
          programId: Programs.id,
          programName: Programs.name,
          programCode: Programs.initialism,
          semesterId: Semesters.id,
          semesterTerm: Semesters.semester_term,
          schoolYearStart: Semesters.school_year_start,
          schoolYearEnd: Semesters.school_year_end,
          startDate: Semesters.start_date,
          endDate: Semesters.end_date,
          curriculumId: CourseCurriculums.id,
          facultyAccountId: Accounts.id,
          facultyEmail: Accounts.email,
          facultyFirstName: PersonalDetails.first_name,
          facultyLastName: PersonalDetails.last_name,
          facultyMiddleName: PersonalDetails.middle_name,
          facultySuffix: PersonalDetails.suffix,
          facultyInstitutionalId: PersonalDetails.institutional_id,
        })
        .from(StudentClasses)
        .innerJoin(CourseOfferings, eq(StudentClasses.course_offering_id, CourseOfferings.id))
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .innerJoin(
          Accounts,
          and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
        )
        .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(StudentClasses.student_account_id, studentAccountId),
            eq(CourseOfferings.semester_id, activeSchedule.semester_id),
            isNotNull(CourseOfferings.faculty_id),
            isNull(StudentClasses.deleted_at),
            isNull(CourseOfferings.deleted_at),
          ),
        );

      if (enrollments.length === 0) {
        return [];
      }

      const studentClassIds = enrollments.map((e) => e.studentClassId);

      const existingEvaluations = await tx
        .select()
        .from(StudentEvaluations)
        .where(
          and(
            eq(StudentEvaluations.schedule_id, activeSchedule.id),
            inArray(StudentEvaluations.student_class_id, studentClassIds),
          ),
        );

      const evalMap = new Map(existingEvaluations.map((ev) => [ev.student_class_id, ev]));

      return enrollments.map((e): EvaluableStudentSubject => {
        const ev = evalMap.get(e.studentClassId);
        const hasSubmitted = Boolean(ev && ev.submitted_at !== null);
        const isDraft = Boolean(ev && ev.submitted_at === null);

        return {
          student_class_id: e.studentClassId,
          has_submitted: hasSubmitted,
          is_draft: isDraft,
          submitted_at: ev?.submitted_at ?? null,
          computed_rating: ev?.set_rating ? Number(ev.set_rating) : null,
          evaluation_id: ev?.id ?? null,
          offering: {
            id: e.offeringId,
            course_curriculum: {
              id: e.curriculumId,
              course: { id: 0, name: e.courseName, initialism: e.courseCode },
            },
            class: {
              id: 0,
              year_level: e.yearLevel,
              section: e.section,
              program: { id: e.programId, name: e.programName, initialism: e.programCode },
            },
            semester: {
              id: e.semesterId,
              semester_term: e.semesterTerm,
              school_year_start: e.schoolYearStart,
              school_year_end: e.schoolYearEnd,
              start_date: e.startDate,
              end_date: e.endDate,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
            faculty: e.facultyAccountId
              ? {
                  account: {
                    id: e.facultyAccountId,
                    email: e.facultyEmail || "",
                    is_verified: true,
                    personal_details_id: 0,
                    created_at: new Date(),
                    updated_at: new Date(),
                    deleted_at: null,
                  },
                  details: {
                    id: 0,
                    institutional_id: e.facultyInstitutionalId || "",
                    first_name: e.facultyFirstName || "",
                    last_name: e.facultyLastName || "",
                    middle_name: e.facultyMiddleName || null,
                    suffix: e.facultySuffix || null,
                    created_at: new Date(),
                    updated_at: new Date(),
                    deleted_at: null,
                  },
                }
              : null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        };
      });
    });
  }

  getStudentEvaluationFormView(
    studentAccountId: number,
    studentClassId: number,
    client: DbClient = db,
  ): ResultAsync<StudentEvaluationFormView, AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

      const [schedule] = await tx
        .select()
        .from(StudentEvaluationSchedules)
        .where(
          and(
            lte(StudentEvaluationSchedules.open_at, now),
            gte(StudentEvaluationSchedules.close_at, now),
            isNull(StudentEvaluationSchedules.deleted_at),
          ),
        )
        .limit(1);

      if (!schedule) {
        throw new AppError(400, "There is no active student evaluation period ongoing.");
      }

      const formResult = await this.instrumentService.getStudentFormById(
        schedule.form_id,
        false,
        tx,
      );
      if (formResult.isErr()) throw formResult.error;

      const [enrollment] = await tx
        .select({
          studentClassId: StudentClasses.id,
          offeringId: CourseOfferings.id,
          courseName: Courses.name,
          courseCode: Courses.initialism,
          yearLevel: Classes.year_level,
          section: Classes.section,
          programId: Programs.id,
          programName: Programs.name,
          programCode: Programs.initialism,
          semesterId: Semesters.id,
          semesterTerm: Semesters.semester_term,
          schoolYearStart: Semesters.school_year_start,
          schoolYearEnd: Semesters.school_year_end,
          startDate: Semesters.start_date,
          endDate: Semesters.end_date,
          curriculumId: CourseCurriculums.id,
          facultyAccountId: Accounts.id,
          facultyEmail: Accounts.email,
          facultyFirstName: PersonalDetails.first_name,
          facultyLastName: PersonalDetails.last_name,
          facultyMiddleName: PersonalDetails.middle_name,
          facultySuffix: PersonalDetails.suffix,
          facultyInstitutionalId: PersonalDetails.institutional_id,
        })
        .from(StudentClasses)
        .innerJoin(CourseOfferings, eq(StudentClasses.course_offering_id, CourseOfferings.id))
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .innerJoin(
          Accounts,
          and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
        )
        .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(StudentClasses.id, studentClassId),
            eq(StudentClasses.student_account_id, studentAccountId),
            eq(CourseOfferings.semester_id, schedule.semester_id),
            isNotNull(CourseOfferings.faculty_id),
            isNull(StudentClasses.deleted_at),
          ),
        );

      if (!enrollment) {
        throw new AppError(404, "Student enrollment record not found for this active term.");
      }

      const [existingEval] = await tx
        .select()
        .from(StudentEvaluations)
        .where(
          and(
            eq(StudentEvaluations.schedule_id, schedule.id),
            eq(StudentEvaluations.student_class_id, studentClassId),
          ),
        );

      let savedRatings: Record<number, number> = {};
      if (existingEval) {
        const ratingRows = await tx
          .select()
          .from(StudentEvaluationRatings)
          .where(eq(StudentEvaluationRatings.evaluation_id, existingEval.id));
        for (const r of ratingRows) {
          savedRatings[r.question_id] = r.rating;
        }
      }

      return {
        schedule_id: schedule.id,
        student_class_id: studentClassId,
        form: formResult.value,
        saved_ratings: savedRatings,
        saved_comment: existingEval?.comment ?? null,
        is_submitted: Boolean(existingEval && existingEval.submitted_at !== null),
        submitted_at: existingEval?.submitted_at ?? null,
        offering: {
          id: enrollment.offeringId,
          course_curriculum: {
            id: enrollment.curriculumId,
            course: { id: 0, name: enrollment.courseName, initialism: enrollment.courseCode },
          },
          class: {
            id: 0,
            year_level: enrollment.yearLevel,
            section: enrollment.section,
            program: {
              id: enrollment.programId,
              name: enrollment.programName,
              initialism: enrollment.programCode,
            },
          },
          semester: {
            id: enrollment.semesterId,
            semester_term: enrollment.semesterTerm,
            school_year_start: enrollment.schoolYearStart,
            school_year_end: enrollment.schoolYearEnd,
            start_date: enrollment.startDate,
            end_date: enrollment.endDate,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
          faculty: enrollment.facultyAccountId
            ? {
                account: {
                  id: enrollment.facultyAccountId,
                  email: enrollment.facultyEmail || "",
                  is_verified: true,
                  personal_details_id: 0,
                  created_at: new Date(),
                  updated_at: new Date(),
                  deleted_at: null,
                },
                details: {
                  id: 0,
                  institutional_id: enrollment.facultyInstitutionalId || "",
                  first_name: enrollment.facultyFirstName || "",
                  last_name: enrollment.facultyLastName || "",
                  middle_name: enrollment.facultyMiddleName || null,
                  suffix: enrollment.facultySuffix || null,
                  created_at: new Date(),
                  updated_at: new Date(),
                  deleted_at: null,
                },
              }
            : null,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      };
    });
  }

  submitStudentEvaluation(
    studentAccountId: number,
    payload: SubmitStudentEvaluation,
    client: DbClient = db,
  ): ResultAsync<
    {
      evaluation_id: number;
      rating: number | null;
      sentiment_score: number | null;
      sentiment_classification: string | null;
    },
    AppError
  > {
    return ValidateSchema(SubmitStudentEvaluationSchema, payload).asyncAndThen((data) => {
      return WithTransaction(client, async (tx) => {
        const isStudent = await this.userService.hasRole(studentAccountId, "STUDENT", tx);
        if (isStudent.isErr() || !isStudent.value) {
          throw new AppError(
            403,
            "Administrators and non-students cannot submit student evaluations.",
          );
        }

        const now = new Date();

        const [schedule] = await tx
          .select()
          .from(StudentEvaluationSchedules)
          .where(
            and(
              eq(StudentEvaluationSchedules.id, data.schedule_id),
              lte(StudentEvaluationSchedules.open_at, now),
              gte(StudentEvaluationSchedules.close_at, now),
              isNull(StudentEvaluationSchedules.deleted_at),
            ),
          );

        if (!schedule) {
          throw new AppError(400, "The evaluation period is closed or not available.");
        }

        const [studentClass] = await tx
          .select()
          .from(StudentClasses)
          .where(
            and(
              eq(StudentClasses.id, data.student_class_id),
              eq(StudentClasses.student_account_id, studentAccountId),
              isNull(StudentClasses.deleted_at),
            ),
          );

        if (!studentClass) {
          throw new AppError(403, "You are not enrolled in this course offering.");
        }

        const [existing] = await tx
          .select()
          .from(StudentEvaluations)
          .where(
            and(
              eq(StudentEvaluations.schedule_id, data.schedule_id),
              eq(StudentEvaluations.student_class_id, data.student_class_id),
            ),
          )
          .for("update");

        if (existing && existing.submitted_at !== null) {
          throw new AppError(409, "You have already submitted an evaluation for this subject.");
        }

        // Calculate Likert Mean
        let computedRating: number | null = null;
        if (data.ratings.length > 0) {
          const [formRecord] = await tx
            .select({
              min_rating: StudentEvaluationForms.min_rating,
              max_rating: StudentEvaluationForms.max_rating,
              calculation_formula: StudentEvaluationForms.calculation_formula,
            })
            .from(StudentEvaluationForms)
            .where(eq(StudentEvaluationForms.id, schedule.form_id));

          const formula = getFormulaById(formRecord?.calculation_formula);
          const totalScore = data.ratings.reduce((acc, curr) => acc + curr.rating, 0);
          const maxRatingPerQ = formRecord?.max_rating ?? 5;
          const maxPossibleScore = data.ratings.length * maxRatingPerQ;

          computedRating = formula.calculate({
            ratings: data.ratings,
            totalScore,
            questionCount: data.ratings.length,
            maxPossibleScore,
            minRating: formRecord?.min_rating ?? 1,
            maxRating: maxRatingPerQ,
          });
        }

        const sentiment = data.comment ? analyzeCommentSentiment(data.comment) : null;
        const commentScore = sentiment ? sentiment.score : null;
        const commentSentiment = sentiment ? sentiment.classification : null;

        let evaluationId: number;

        if (existing) {
          const [updated] = await tx
            .update(StudentEvaluations)
            .set({
              comment: data.comment ?? null,
              comment_score: commentScore !== null ? String(commentScore) : null,
              comment_sentiment: commentSentiment,
              set_rating: computedRating !== null ? String(computedRating) : null,
              submitted_at: data.is_draft ? null : now,
            })
            .where(eq(StudentEvaluations.id, existing.id))
            .returning({ id: StudentEvaluations.id });

          evaluationId = updated!.id;
          await tx
            .delete(StudentEvaluationRatings)
            .where(eq(StudentEvaluationRatings.evaluation_id, evaluationId));
        } else {
          const [inserted] = await tx
            .insert(StudentEvaluations)
            .values({
              schedule_id: data.schedule_id,
              student_class_id: data.student_class_id,
              comment: data.comment ?? null,
              comment_score: commentScore !== null ? String(commentScore) : null,
              comment_sentiment: commentSentiment,
              set_rating: computedRating !== null ? String(computedRating) : null,
              submitted_at: data.is_draft ? null : now,
            })
            .returning({ id: StudentEvaluations.id });

          evaluationId = inserted!.id;
        }

        if (data.ratings.length > 0) {
          const ratingInserts = data.ratings.map((r) => ({
            evaluation_id: evaluationId,
            question_id: r.question_id,
            rating: r.rating,
          }));
          await tx.insert(StudentEvaluationRatings).values(ratingInserts);
        }

        if (!data.is_draft) {
          const [offeringMeta] = await tx
            .select({
              courseCode: Courses.initialism,
              courseName: Courses.name,
              programCode: Programs.initialism,
              programId: Programs.id,
              collegeCode: Colleges.initialism,
              collegeId: Colleges.id,
              yearLevel: Classes.year_level,
              section: Classes.section,
            })
            .from(CourseOfferings)
            .innerJoin(
              CourseCurriculums,
              eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
            )
            .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
            .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
            .innerJoin(Programs, eq(Classes.program_id, Programs.id))
            .innerJoin(Colleges, eq(Programs.college_id, Colleges.id))
            .where(eq(CourseOfferings.id, studentClass.course_offering_id));

          if (offeringMeta) {
            emitEvaluationPulse({
              id: `pulse-set-${evaluationId}`,
              type: "SET",
              timestamp: now.toISOString(),
              courseCode: offeringMeta.courseCode,
              courseName: offeringMeta.courseName,
              programCode: offeringMeta.programCode,
              programId: offeringMeta.programId,
              collegeCode: offeringMeta.collegeCode,
              collegeId: offeringMeta.collegeId,
              yearLevel: offeringMeta.yearLevel,
              section: offeringMeta.section,
            });
          }
        }

        return {
          evaluation_id: evaluationId,
          rating: computedRating,
          sentiment_score: commentScore,
          sentiment_classification: commentSentiment,
        };
      });
    });
  }

  // =========================================================================
  // 2. SUPERVISOR (SEF) EVALUATION FLOW
  // =========================================================================

  getEvaluableSupervisorFaculty(
    evaluatorAccountId: number,
    client: DbClient = db,
  ): ResultAsync<EvaluableSupervisorFaculty[], AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

      // 1. Check active supervisor evaluation window
      const [activeSchedule] = await tx
        .select()
        .from(SupervisorEvaluationSchedules)
        .where(
          and(
            lte(SupervisorEvaluationSchedules.open_at, now),
            gte(SupervisorEvaluationSchedules.close_at, now),
            isNull(SupervisorEvaluationSchedules.deleted_at),
          ),
        )
        .limit(1);

      if (!activeSchedule) return [];

      // 2. Resolve Evaluator's Academic Offices
      const [deanships, chairships] = await Promise.all([
        tx
          .select({ collegeId: CollegeDeans.college_id })
          .from(CollegeDeans)
          .where(
            and(eq(CollegeDeans.dean_id, evaluatorAccountId), isNull(CollegeDeans.deleted_at)),
          ),
        tx
          .select({ programId: ProgramChairs.program_id })
          .from(ProgramChairs)
          .where(
            and(eq(ProgramChairs.chair_id, evaluatorAccountId), isNull(ProgramChairs.deleted_at)),
          ),
      ]);

      const deanCollegeIds = deanships.map((d) => d.collegeId);
      const chairProgramIds = chairships.map((c) => c.programId);

      if (deanCollegeIds.length === 0 && chairProgramIds.length === 0) {
        return [];
      }

      // 3. Determine subordinate faculty to evaluate based on scope
      const eligibleFacultyIds = new Set<number>();

      // ── A. COLLEGE DEAN: Evaluates Program Chairs under their college (+ vacant chair programs) ──
      if (deanCollegeIds.length > 0) {
        const chairAccounts = await tx
          .select({ chairId: ProgramChairs.chair_id })
          .from(ProgramChairs)
          .innerJoin(Programs, eq(ProgramChairs.program_id, Programs.id))
          .where(
            and(
              inArray(Programs.college_id, deanCollegeIds),
              isNull(ProgramChairs.deleted_at),
              isNull(Programs.deleted_at),
            ),
          );
        chairAccounts.forEach((c) => eligibleFacultyIds.add(c.chairId));

        // Vacant Chair Coverage: Dean evaluates faculty in programs with no chair
        const vacantOfferings = await tx
          .selectDistinct({ facultyId: CourseOfferings.faculty_id })
          .from(CourseOfferings)
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Programs, eq(Courses.program_id, Programs.id))
          .leftJoin(
            ProgramChairs,
            and(eq(Programs.id, ProgramChairs.program_id), isNull(ProgramChairs.deleted_at)),
          )
          .where(
            and(
              inArray(Programs.college_id, deanCollegeIds),
              eq(CourseOfferings.semester_id, activeSchedule.semester_id),
              isNull(ProgramChairs.id), // No chair appointed
              isNotNull(CourseOfferings.faculty_id),
              isNull(CourseOfferings.deleted_at),
            ),
          );
        vacantOfferings.forEach((v) => {
          if (v.facultyId) eligibleFacultyIds.add(v.facultyId);
        });
      }

      // ── B. PROGRAM CHAIR: Evaluates regular faculty teaching in their program ──
      if (chairProgramIds.length > 0) {
        const allChairs = await tx
          .select({ chairId: ProgramChairs.chair_id })
          .from(ProgramChairs)
          .where(isNull(ProgramChairs.deleted_at));
        const allChairIds = new Set(allChairs.map((c) => c.chairId));

        const deptOfferings = await tx
          .selectDistinct({ facultyId: CourseOfferings.faculty_id })
          .from(CourseOfferings)
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .where(
            and(
              inArray(Courses.program_id, chairProgramIds),
              eq(CourseOfferings.semester_id, activeSchedule.semester_id),
              isNotNull(CourseOfferings.faculty_id),
              isNull(CourseOfferings.deleted_at),
            ),
          );

        deptOfferings.forEach((d) => {
          if (d.facultyId && !allChairIds.has(d.facultyId)) {
            eligibleFacultyIds.add(d.facultyId);
          }
        });
      }

      // 🔒 Cannot evaluate self
      eligibleFacultyIds.delete(evaluatorAccountId);

      if (eligibleFacultyIds.size === 0) return [];

      const targetFacultyList = Array.from(eligibleFacultyIds);

      // 4. Fetch the single SEF evaluation row for each faculty member
      const existingEvaluations = await tx
        .select()
        .from(SupervisorEvaluations)
        .where(
          and(
            eq(SupervisorEvaluations.schedule_id, activeSchedule.id),
            eq(SupervisorEvaluations.evaluator_id, evaluatorAccountId),
            inArray(SupervisorEvaluations.faculty_id, targetFacultyList),
          ),
        );

      const evalMap = new Map(existingEvaluations.map((ev) => [ev.faculty_id, ev]));

      // 5. Build response per faculty member (with their semester teaching load)
      const results: EvaluableSupervisorFaculty[] = [];

      for (const facultyId of targetFacultyList) {
        const userRes = await this.userService.getUserById(facultyId, tx);
        if (userRes.isErr()) continue;
        const facultyUser = userRes.value;

        // Query all classes taught by this faculty member this semester for reference
        const teachingOfferings = await tx
          .select({
            offeringId: CourseOfferings.id,
            courseCode: Courses.initialism,
            courseName: Courses.name,
            yearLevel: Classes.year_level,
            section: Classes.section,
            programCode: Programs.initialism,
          })
          .from(CourseOfferings)
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .where(
            and(
              eq(CourseOfferings.faculty_id, facultyId),
              eq(CourseOfferings.semester_id, activeSchedule.semester_id),
              isNull(CourseOfferings.deleted_at),
            ),
          );

        const ev = evalMap.get(facultyId);

        results.push({
          faculty: facultyUser,
          has_submitted: Boolean(ev && ev.submitted_at !== null),
          is_draft: Boolean(ev && ev.submitted_at === null),
          submitted_at: ev?.submitted_at ?? null,
          computed_rating: ev?.set_rating ? Number(ev.set_rating) : null,
          evaluation_id: ev?.id ?? null,
          teaching_classes: teachingOfferings.map((o) => ({
            offering_id: o.offeringId,
            course_code: o.courseCode,
            course_name: o.courseName,
            year_level: o.yearLevel,
            section: o.section,
            program_code: o.programCode,
          })),
        });
      }

      return results;
    });
  }

  getSupervisorEvaluationFormView(
    evaluatorAccountId: number,
    facultyId: number,
    client: DbClient = db,
  ): ResultAsync<SupervisorEvaluationFormView, AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

      if (evaluatorAccountId === facultyId) {
        throw new AppError(403, "You cannot evaluate yourself.");
      }

      const [schedule] = await tx
        .select()
        .from(SupervisorEvaluationSchedules)
        .where(
          and(
            lte(SupervisorEvaluationSchedules.open_at, now),
            gte(SupervisorEvaluationSchedules.close_at, now),
            isNull(SupervisorEvaluationSchedules.deleted_at),
          ),
        )
        .limit(1);

      if (!schedule) {
        throw new AppError(400, "There is no active supervisor evaluation period ongoing.");
      }

      const formResult = await this.instrumentService.getSupervisorFormById(
        schedule.form_id,
        false,
        tx,
      );
      if (formResult.isErr()) throw formResult.error;

      const userRes = await this.userService.getUserById(facultyId, tx);
      if (userRes.isErr()) throw userRes.error;
      const facultyUser = userRes.value;

      // Fetch teaching load for reference
      const teachingOfferings = await tx
        .select({
          offeringId: CourseOfferings.id,
          courseCode: Courses.initialism,
          courseName: Courses.name,
          yearLevel: Classes.year_level,
          section: Classes.section,
          programCode: Programs.initialism,
        })
        .from(CourseOfferings)
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .where(
          and(
            eq(CourseOfferings.faculty_id, facultyId),
            eq(CourseOfferings.semester_id, schedule.semester_id),
            isNull(CourseOfferings.deleted_at),
          ),
        );

      const [existingEval] = await tx
        .select()
        .from(SupervisorEvaluations)
        .where(
          and(
            eq(SupervisorEvaluations.schedule_id, schedule.id),
            eq(SupervisorEvaluations.evaluator_id, evaluatorAccountId),
            eq(SupervisorEvaluations.faculty_id, facultyId),
          ),
        );

      let savedRatings: Record<number, number> = {};
      if (existingEval) {
        const ratingRows = await tx
          .select()
          .from(SupervisorEvaluationRatings)
          .where(eq(SupervisorEvaluationRatings.evaluation_id, existingEval.id));
        for (const r of ratingRows) {
          savedRatings[r.question_id] = r.rating;
        }
      }

      return {
        schedule_id: schedule.id,
        faculty_id: facultyId,
        faculty: facultyUser,
        teaching_classes: teachingOfferings.map((o) => ({
          offering_id: o.offeringId,
          course_code: o.courseCode,
          course_name: o.courseName,
          year_level: o.yearLevel,
          section: o.section,
          program_code: o.programCode,
        })),
        form: formResult.value,
        saved_ratings: savedRatings,
        saved_comment: existingEval?.comment ?? null,
        is_submitted: Boolean(existingEval && existingEval.submitted_at !== null),
        submitted_at: existingEval?.submitted_at ?? null,
      };
    });
  }

  submitSupervisorEvaluation(
    evaluatorAccountId: number,
    payload: SubmitSupervisorEvaluation,
    client: DbClient = db,
  ): ResultAsync<
    {
      evaluation_id: number;
      rating: number | null;
      sentiment_score: number | null;
      sentiment_classification: string | null;
    },
    AppError
  > {
    return ValidateSchema(SubmitSupervisorEvaluationSchema, payload).asyncAndThen((data) => {
      return WithTransaction(client, async (tx) => {
        if (evaluatorAccountId === data.faculty_id) {
          throw new AppError(403, "You cannot evaluate yourself.");
        }

        const isSupervisor = await this.userService.hasRole(evaluatorAccountId, "SUPERVISOR", tx);
        if (isSupervisor.isErr() || !isSupervisor.value) {
          throw new AppError(
            403,
            "Only designated supervisors can submit supervisory evaluations.",
          );
        }

        const now = new Date();

        const [schedule] = await tx
          .select()
          .from(SupervisorEvaluationSchedules)
          .where(
            and(
              eq(SupervisorEvaluationSchedules.id, data.schedule_id),
              lte(SupervisorEvaluationSchedules.open_at, now),
              gte(SupervisorEvaluationSchedules.close_at, now),
              isNull(SupervisorEvaluationSchedules.deleted_at),
            ),
          );

        if (!schedule) {
          throw new AppError(400, "The supervisor evaluation period is closed or not available.");
        }

        const [existing] = await tx
          .select()
          .from(SupervisorEvaluations)
          .where(
            and(
              eq(SupervisorEvaluations.schedule_id, data.schedule_id),
              eq(SupervisorEvaluations.evaluator_id, evaluatorAccountId),
              eq(SupervisorEvaluations.faculty_id, data.faculty_id),
            ),
          )
          .for("update");

        if (existing && existing.submitted_at !== null) {
          throw new AppError(
            409,
            "You have already submitted an evaluation for this faculty member for this term.",
          );
        }

        // 🔌 Formula calculation
        let computedRating: number | null = null;
        if (data.ratings.length > 0) {
          const [formRecord] = await tx
            .select({
              min_rating: SupervisorEvaluationForms.min_rating,
              max_rating: SupervisorEvaluationForms.max_rating,
              calculation_formula: SupervisorEvaluationForms.calculation_formula,
            })
            .from(SupervisorEvaluationForms)
            .where(eq(SupervisorEvaluationForms.id, schedule.form_id));

          const formula = getFormulaById(formRecord?.calculation_formula);
          const totalScore = data.ratings.reduce((acc, curr) => acc + curr.rating, 0);
          const maxRatingPerQ = formRecord?.max_rating ?? 5;
          const maxPossibleScore = data.ratings.length * maxRatingPerQ;

          computedRating = formula.calculate({
            ratings: data.ratings,
            totalScore,
            questionCount: data.ratings.length,
            maxPossibleScore,
            minRating: formRecord?.min_rating ?? 1,
            maxRating: maxRatingPerQ,
          });
        }

        const sentiment = data.comment ? analyzeCommentSentiment(data.comment) : null;
        const commentScore = sentiment ? sentiment.score : null;
        const commentSentiment = sentiment ? sentiment.classification : null;

        let evaluationId: number;

        if (existing) {
          const [updated] = await tx
            .update(SupervisorEvaluations)
            .set({
              comment: data.comment ?? null,
              comment_score: commentScore !== null ? String(commentScore) : null,
              comment_sentiment: commentSentiment,
              set_rating: computedRating !== null ? String(computedRating) : null,
              submitted_at: data.is_draft ? null : now,
            })
            .where(eq(SupervisorEvaluations.id, existing.id))
            .returning({ id: SupervisorEvaluations.id });

          evaluationId = updated!.id;
          await tx
            .delete(SupervisorEvaluationRatings)
            .where(eq(SupervisorEvaluationRatings.evaluation_id, evaluationId));
        } else {
          const [inserted] = await tx
            .insert(SupervisorEvaluations)
            .values({
              schedule_id: data.schedule_id,
              evaluator_id: evaluatorAccountId,
              faculty_id: data.faculty_id,
              comment: data.comment ?? null,
              comment_score: commentScore !== null ? String(commentScore) : null,
              comment_sentiment: commentSentiment,
              set_rating: computedRating !== null ? String(computedRating) : null,
              submitted_at: data.is_draft ? null : now,
            })
            .returning({ id: SupervisorEvaluations.id });

          evaluationId = inserted!.id;
        }

        if (data.ratings.length > 0) {
          const ratingInserts = data.ratings.map((r) => ({
            evaluation_id: evaluationId,
            question_id: r.question_id,
            rating: r.rating,
          }));
          await tx.insert(SupervisorEvaluationRatings).values(ratingInserts);
        }

        // 📡 Real-time pulse
        if (!data.is_draft) {
          const facultyUser = await this.userService.getUserById(data.faculty_id, tx);
          const facultyName = facultyUser.isOk()
            ? `${facultyUser.value.details.first_name} ${facultyUser.value.details.last_name}`
            : "Faculty Member";

          emitEvaluationPulse({
            id: `pulse-sef-${evaluationId}`,
            type: "SEF",
            timestamp: now.toISOString(),
            courseCode: "SEF-TERM",
            courseName: `Semester Evaluation: ${facultyName}`,
            programCode: "SUPERVISORY",
            programId: 0,
            collegeCode: "ACADEMICS",
            collegeId: 0,
            yearLevel: "N/A",
            section: "SEF",
          });
        }

        return {
          evaluation_id: evaluationId,
          rating: computedRating,
          sentiment_score: commentScore,
          sentiment_classification: commentSentiment,
        };
      });
    });
  }

  getFacultyTeachingOfferings(
    facultyAccountId: number,
    semesterId?: number,
    client: DbClient = db,
  ): ResultAsync<FacultyTeachingOffering[], AppError> {
    return WithTransaction(client, async (tx) => {
      let targetSemesterId = semesterId;
      if (!targetSemesterId) {
        const today = new Date().toISOString().slice(0, 10);
        const [activeSem] = await tx
          .select({ id: Semesters.id })
          .from(Semesters)
          .where(
            and(
              lte(Semesters.start_date, today),
              gte(Semesters.end_date, today),
              isNull(Semesters.deleted_at),
            ),
          )
          .limit(1);

        if (activeSem) {
          targetSemesterId = activeSem.id;
        } else {
          const [latestSem] = await tx
            .select({ id: Semesters.id })
            .from(Semesters)
            .where(isNull(Semesters.deleted_at))
            .orderBy(desc(Semesters.start_date))
            .limit(1);
          targetSemesterId = latestSem?.id;
        }
      }

      if (!targetSemesterId) return [];

      const offerings = await tx
        .select({
          id: CourseOfferings.id,
          courseName: Courses.name,
          courseCode: Courses.initialism,
          yearLevel: Classes.year_level,
          section: Classes.section,
          programId: Programs.id,
          programName: Programs.name,
          programCode: Programs.initialism,
          semesterId: Semesters.id,
          semesterTerm: Semesters.semester_term,
          schoolYearStart: Semesters.school_year_start,
          schoolYearEnd: Semesters.school_year_end,
          startDate: Semesters.start_date,
          endDate: Semesters.end_date,
          curriculumId: CourseCurriculums.id,
        })
        .from(CourseOfferings)
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .where(
          and(
            eq(CourseOfferings.faculty_id, facultyAccountId),
            eq(CourseOfferings.semester_id, targetSemesterId),
            isNull(CourseOfferings.deleted_at),
          ),
        );

      if (offerings.length === 0) return [];

      const results: FacultyTeachingOffering[] = [];

      for (const off of offerings) {
        const enrollments = await tx
          .select({
            studentClassId: StudentClasses.id,
            accountId: Accounts.id,
            email: Accounts.email,
            institutionalId: PersonalDetails.institutional_id,
            firstName: PersonalDetails.first_name,
            lastName: PersonalDetails.last_name,
            middleName: PersonalDetails.middle_name,
            suffix: PersonalDetails.suffix,
          })
          .from(StudentClasses)
          .innerJoin(Accounts, eq(StudentClasses.student_account_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(
            and(
              eq(StudentClasses.course_offering_id, off.id),
              isNull(StudentClasses.deleted_at),
              isNull(Accounts.deleted_at),
            ),
          )
          .orderBy(asc(PersonalDetails.last_name), asc(PersonalDetails.first_name));

        const studentClassIds = enrollments.map((e) => e.studentClassId);

        const submissions =
          studentClassIds.length > 0
            ? await tx
                .select({
                  studentClassId: StudentEvaluations.student_class_id,
                  submittedAt: StudentEvaluations.submitted_at,
                })
                .from(StudentEvaluations)
                .where(
                  and(
                    inArray(StudentEvaluations.student_class_id, studentClassIds),
                    isNotNull(StudentEvaluations.submitted_at),
                  ),
                )
            : [];

        const submissionMap = new Map(submissions.map((s) => [s.studentClassId, s.submittedAt]));

        const students: TeachingStudentItem[] = enrollments.map((s) => {
          const submittedAt = submissionMap.get(s.studentClassId);
          return {
            student_account_id: s.accountId,
            institutional_id: s.institutionalId,
            first_name: s.firstName,
            last_name: s.lastName,
            middle_name: s.middleName,
            suffix: s.suffix,
            email: s.email,
            has_evaluated: Boolean(submittedAt),
            evaluated_at: submittedAt ?? null,
          };
        });

        const totalStudents = students.length;
        const totalEvaluated = students.filter((s) => s.has_evaluated).length;
        const completionRate =
          totalStudents > 0 ? Number(((totalEvaluated / totalStudents) * 100).toFixed(1)) : 0;

        results.push({
          offering: {
            id: off.id,
            course_curriculum: {
              id: off.curriculumId,
              course: { id: 0, name: off.courseName, initialism: off.courseCode },
            },
            class: {
              id: 0,
              year_level: off.yearLevel,
              section: off.section,
              program: { id: off.programId, name: off.programName, initialism: off.programCode },
            },
            semester: {
              id: off.semesterId,
              semester_term: off.semesterTerm,
              school_year_start: off.schoolYearStart,
              school_year_end: off.schoolYearEnd,
              start_date: off.startDate,
              end_date: off.endDate,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
            faculty: null,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
          total_students: totalStudents,
          total_evaluated: totalEvaluated,
          completion_rate: completionRate,
          students,
        });
      }

      return results;
    });
  }
}
