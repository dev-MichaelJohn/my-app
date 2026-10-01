import { and, eq, inArray, isNull, lte, gte, ne, isNotNull, desc, asc } from "drizzle-orm";
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
  StudentEvaluationSchedules,
  SupervisorEvaluationForms,
  SupervisorEvaluationRatings,
  SupervisorEvaluations,
  SupervisorEvaluationSchedules,
  type FacultyTeachingOffering,
  type TeachingStudentItem,
} from "@my-app/shared";
import { AppError } from "@/libs/error.lib.js";
import { ValidateSchema } from "@/libs/result.lib.js";
import { WithTransaction, type DbClient } from "@/libs/transaction.lib.js";
import { analyzeCommentSentiment } from "@/libs/sentiment.lib.js";
import {
  EvaluationInstrumentService,
  type IEvaluationInstrumentService,
} from "./evaluation-instrument.service.js";
import {
  SubmitStudentEvaluationSchema,
  SubmitSupervisorEvaluationSchema,
  type EvaluableStudentSubject,
  type EvaluableSupervisorOffering,
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
  getEvaluableSupervisorOfferings(
    evaluatorAccountId: number,
    client?: DbClient,
  ): ResultAsync<EvaluableSupervisorOffering[], AppError>;
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
        .leftJoin(
          Accounts,
          and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
        )
        .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(StudentClasses.student_account_id, studentAccountId),
            eq(CourseOfferings.semester_id, activeSchedule.semester_id),
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
        .leftJoin(
          Accounts,
          and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
        )
        .leftJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(StudentClasses.id, studentClassId),
            eq(StudentClasses.student_account_id, studentAccountId),
            eq(CourseOfferings.semester_id, schedule.semester_id),
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
          );

        if (existing && existing.submitted_at !== null) {
          throw new AppError(409, "You have already submitted an evaluation for this subject.");
        }

        // ══════════════════════════════════════════════════════════════════
        // 🔌 PLUG-AND-PLAY FORMULA CALCULATION (SET)
        // ══════════════════════════════════════════════════════════════════
        let computedRating: number | null = null;
        if (data.ratings.length > 0) {
          // Fetch the template's chosen calculation formula and score bounds
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

          // Runs the plug-and-play formula
          computedRating = formula.calculate({
            ratings: data.ratings,
            totalScore,
            questionCount: data.ratings.length,
            maxPossibleScore,
            minRating: formRecord?.min_rating ?? 1,
            maxRating: maxRatingPerQ,
          });
        }
        // ══════════════════════════════════════════════════════════════════

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
              set_rating: computedRating !== null ? String(computedRating) : null, // 👈 Saved in DB
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
              set_rating: computedRating !== null ? String(computedRating) : null, // 👈 Saved in DB
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

        console.log({
          evaluation_id: evaluationId,
          rating: computedRating,
          sentiment_score: commentScore,
          sentiment_classification: commentSentiment,
        });

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

  getEvaluableSupervisorOfferings(
    evaluatorAccountId: number,
    client: DbClient = db,
  ): ResultAsync<EvaluableSupervisorOffering[], AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

      // 1. Check active supervisor evaluation schedule
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

      // 2. Fetch offices held by evaluator
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

      // 3. Find Program Chair Account IDs under the Dean's colleges
      let programChairsUnderDean: number[] = [];
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
        programChairsUnderDean = chairAccounts.map((c) => c.chairId);
      }

      // 4. Fetch all active offerings for this semester
      const offerings = await tx
        .select({
          offeringId: CourseOfferings.id,
          courseName: Courses.name,
          courseCode: Courses.initialism,
          yearLevel: Classes.year_level,
          section: Classes.section,
          programId: Programs.id,
          programName: Programs.name,
          programCode: Programs.initialism,
          collegeId: Colleges.id,
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
        .from(CourseOfferings)
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .innerJoin(Colleges, eq(Programs.college_id, Colleges.id))
        .innerJoin(Semesters, eq(CourseOfferings.semester_id, Semesters.id))
        .innerJoin(
          Accounts,
          and(eq(CourseOfferings.faculty_id, Accounts.id), isNull(Accounts.deleted_at)),
        )
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(CourseOfferings.semester_id, activeSchedule.semester_id),
            isNull(CourseOfferings.deleted_at),
            ne(CourseOfferings.faculty_id, evaluatorAccountId), // CANNOT rate self
          ),
        );

      // 5. Apply the strict hierarchy:
      // - If Dean: CAN ONLY rate Program Chairs under their college
      // - If Chair: CAN ONLY rate faculty teaching subjects under their program
      const scopedOfferings = offerings.filter((o) => {
        // A. Program Chair role: Rates faculty in their program
        if (chairProgramIds.includes(o.programId)) {
          return true;
        }

        // B. College Dean role: Rates ONLY Program Chairs under their college
        if (
          deanCollegeIds.includes(o.collegeId) &&
          programChairsUnderDean.includes(o.facultyAccountId)
        ) {
          return true;
        }

        return false;
      });

      if (scopedOfferings.length === 0) return [];

      const offeringIds = scopedOfferings.map((o) => o.offeringId);

      const existingEvaluations = await tx
        .select()
        .from(SupervisorEvaluations)
        .where(
          and(
            eq(SupervisorEvaluations.schedule_id, activeSchedule.id),
            eq(SupervisorEvaluations.evaluator_id, evaluatorAccountId),
            inArray(SupervisorEvaluations.course_offering_id, offeringIds),
          ),
        );

      const evalMap = new Map(existingEvaluations.map((ev) => [ev.course_offering_id, ev]));

      return scopedOfferings.map((o): EvaluableSupervisorOffering => {
        const ev = evalMap.get(o.offeringId);
        return {
          offering: {
            id: o.offeringId,
            course_curriculum: {
              id: o.curriculumId,
              course: { id: 0, name: o.courseName, initialism: o.courseCode },
            },
            class: {
              id: 0,
              year_level: o.yearLevel,
              section: o.section,
              program: { id: o.programId, name: o.programName, initialism: o.programCode },
            },
            semester: {
              id: o.semesterId,
              semester_term: o.semesterTerm,
              school_year_start: o.schoolYearStart,
              school_year_end: o.schoolYearEnd,
              start_date: o.startDate,
              end_date: o.endDate,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
            faculty: {
              account: {
                id: o.facultyAccountId,
                email: o.facultyEmail,
                is_verified: true,
                personal_details_id: 0,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
              details: {
                id: 0,
                institutional_id: o.facultyInstitutionalId,
                first_name: o.facultyFirstName,
                last_name: o.facultyLastName,
                middle_name: o.facultyMiddleName,
                suffix: o.facultySuffix,
                created_at: new Date(),
                updated_at: new Date(),
                deleted_at: null,
              },
            },
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
          has_submitted: Boolean(ev && ev.submitted_at !== null),
          is_draft: Boolean(ev && ev.submitted_at === null),
          submitted_at: ev?.submitted_at ?? null,
          computed_rating: ev?.set_rating ? Number(ev.set_rating) : null,
          evaluation_id: ev?.id ?? null,
        };
      });
    });
  }

  getSupervisorEvaluationFormView(
    evaluatorAccountId: number,
    courseOfferingId: number,
    client: DbClient = db,
  ): ResultAsync<SupervisorEvaluationFormView, AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

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

      const [offering] = await tx
        .select({
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
        .from(CourseOfferings)
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
        .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
        .where(
          and(
            eq(CourseOfferings.id, courseOfferingId),
            eq(CourseOfferings.semester_id, schedule.semester_id),
            isNull(CourseOfferings.deleted_at),
          ),
        );

      if (!offering) {
        throw new AppError(404, "Course offering not found for this evaluation term.");
      }

      const [existingEval] = await tx
        .select()
        .from(SupervisorEvaluations)
        .where(
          and(
            eq(SupervisorEvaluations.schedule_id, schedule.id),
            eq(SupervisorEvaluations.evaluator_id, evaluatorAccountId),
            eq(SupervisorEvaluations.course_offering_id, courseOfferingId),
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
        course_offering_id: courseOfferingId,
        form: formResult.value,
        saved_ratings: savedRatings,
        saved_comment: existingEval?.comment ?? null,
        is_submitted: Boolean(existingEval && existingEval.submitted_at !== null),
        submitted_at: existingEval?.submitted_at ?? null,
        offering: {
          id: offering.offeringId,
          course_curriculum: {
            id: offering.curriculumId,
            course: { id: 0, name: offering.courseName, initialism: offering.courseCode },
          },
          class: {
            id: 0,
            year_level: offering.yearLevel,
            section: offering.section,
            program: {
              id: offering.programId,
              name: offering.programName,
              initialism: offering.programCode,
            },
          },
          semester: {
            id: offering.semesterId,
            semester_term: offering.semesterTerm,
            school_year_start: offering.schoolYearStart,
            school_year_end: offering.schoolYearEnd,
            start_date: offering.startDate,
            end_date: offering.endDate,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
          faculty: {
            account: {
              id: offering.facultyAccountId,
              email: offering.facultyEmail,
              is_verified: true,
              personal_details_id: 0,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
            details: {
              id: 0,
              institutional_id: offering.facultyInstitutionalId,
              first_name: offering.facultyFirstName,
              last_name: offering.facultyLastName,
              middle_name: offering.facultyMiddleName,
              suffix: offering.facultySuffix,
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          },
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
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
        const isSupervisor = await this.userService.hasRole(evaluatorAccountId, "SUPERVISOR", tx);
        if (isSupervisor.isErr() || !isSupervisor.value) {
          throw new AppError(403, "Administrators cannot submit supervisory evaluations.");
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

        const [offering] = await tx
          .select()
          .from(CourseOfferings)
          .where(
            and(
              eq(CourseOfferings.id, data.course_offering_id),
              isNull(CourseOfferings.deleted_at),
            ),
          );

        if (!offering || !offering.faculty_id) {
          throw new AppError(400, "Invalid course offering or no faculty instructor assigned.");
        }

        const [existing] = await tx
          .select()
          .from(SupervisorEvaluations)
          .where(
            and(
              eq(SupervisorEvaluations.schedule_id, data.schedule_id),
              eq(SupervisorEvaluations.evaluator_id, evaluatorAccountId),
              eq(SupervisorEvaluations.course_offering_id, data.course_offering_id),
            ),
          );

        if (existing && existing.submitted_at !== null) {
          throw new AppError(
            409,
            "You have already submitted an evaluation for this faculty course offering.",
          );
        }

        // ══════════════════════════════════════════════════════════════════
        // 🔌 PLUG-AND-PLAY FORMULA CALCULATION (SEF)
        // ══════════════════════════════════════════════════════════════════
        let computedRating: number | null = null;
        if (data.ratings.length > 0) {
          // Fetch the template's chosen calculation formula and score bounds
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

          // Runs the plug-and-play formula
          computedRating = formula.calculate({
            ratings: data.ratings,
            totalScore,
            questionCount: data.ratings.length,
            maxPossibleScore,
            minRating: formRecord?.min_rating ?? 1,
            maxRating: maxRatingPerQ,
          });
        }
        // ══════════════════════════════════════════════════════════════════

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
              set_rating: computedRating !== null ? String(computedRating) : null, // 👈 Saved in DB
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
              course_offering_id: data.course_offering_id,
              comment: data.comment ?? null,
              comment_score: commentScore !== null ? String(commentScore) : null,
              comment_sentiment: commentSentiment,
              set_rating: computedRating !== null ? String(computedRating) : null, // 👈 Saved in DB
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

        console.log({
          evaluation_id: evaluationId,
          rating: computedRating,
          sentiment_score: commentScore,
          sentiment_classification: commentSentiment,
        });

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
      // 1. Determine Target Semester (active or latest)
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

      // 2. Fetch all offerings assigned to this faculty member for the semester
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
        // 3. Fetch all enrolled students for this course offering
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

        // 4. Fetch SET submissions for this offering
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
                    isNotNull(StudentEvaluations.submitted_at), // Only finalized submissions
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
