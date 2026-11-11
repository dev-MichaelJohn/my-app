import { and, eq, inArray, isNull, lte, gte, isNotNull, desc, asc, ne, sql } from "drizzle-orm";
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
  StudentEvaluationTurnout,
  StudentEvaluationDrafts,
  StudentBallots,
  StudentBallotRatings,
  SupervisorEvaluationRatings,
  SupervisorEvaluations,
  SupervisorEvaluationSchedules,
  StudentEvaluationSchedules,
  type FacultyTeachingOffering,
  type TeachingStudentItem,
  SupervisorEvaluationForms,
  type EvaluableSupervisorFaculty,
  Faculties,
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
import type { PgTransaction } from "@/configs/db.config.js";

export interface IEvaluationSubmissionService {
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

  getEvaluableSupervisorFaculty(
    evaluatorAccountId: number,
    client?: DbClient,
  ): ResultAsync<EvaluableSupervisorFaculty[], AppError>;
  getSupervisorEvaluationFormView(
    evaluatorAccountId: number,
    facultyId: number,
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
  // 1. STUDENT (SET) EVALUATION FLOW (DECOUPLED BALLOT BOX)
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

      if (!activeSchedule) return [];

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
          facultyRecordId: Faculties.id,
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
          Faculties,
          and(eq(CourseOfferings.faculty_id, Faculties.id), isNull(Faculties.deleted_at)),
        )
        .leftJoin(Accounts, and(eq(Faculties.account_id, Accounts.id), isNull(Accounts.deleted_at)))
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

      if (enrollments.length === 0) return [];

      const offeringIds = enrollments.map((e) => e.offeringId);
      const studentClassIds = enrollments.map((e) => e.studentClassId);

      // Check Turnout Log (Who voted)
      const turnouts = await tx
        .select()
        .from(StudentEvaluationTurnout)
        .where(
          and(
            eq(StudentEvaluationTurnout.schedule_id, activeSchedule.id),
            eq(StudentEvaluationTurnout.student_account_id, studentAccountId),
            inArray(StudentEvaluationTurnout.course_offering_id, offeringIds),
          ),
        );
      const turnoutMap = new Map(turnouts.map((t) => [t.course_offering_id, t]));

      // Check Drafts (Who has an in-progress draft)
      const drafts = await tx
        .select()
        .from(StudentEvaluationDrafts)
        .where(
          and(
            eq(StudentEvaluationDrafts.schedule_id, activeSchedule.id),
            inArray(StudentEvaluationDrafts.student_class_id, studentClassIds),
          ),
        );
      const draftMap = new Map(drafts.map((d) => [d.student_class_id, d]));

      return enrollments.map((e): EvaluableStudentSubject => {
        const turnout = turnoutMap.get(e.offeringId);
        const draft = draftMap.get(e.studentClassId);
        const hasSubmitted = Boolean(turnout);
        const isDraft = Boolean(!hasSubmitted && draft);

        return {
          student_class_id: e.studentClassId,
          has_submitted: hasSubmitted,
          is_draft: isDraft,
          submitted_at: turnout?.submitted_at ?? null,
          computed_rating: null, // Untraceable: ratings are decoupled from student identity
          evaluation_id: null,
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
          Faculties,
          and(eq(CourseOfferings.faculty_id, Faculties.id), isNull(Faculties.deleted_at)),
        )
        .leftJoin(Accounts, and(eq(Faculties.account_id, Accounts.id), isNull(Accounts.deleted_at)))
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

      // Check Turnout Log (Has this student cast their final ballot?)
      const [turnout] = await tx
        .select()
        .from(StudentEvaluationTurnout)
        .where(
          and(
            eq(StudentEvaluationTurnout.schedule_id, schedule.id),
            eq(StudentEvaluationTurnout.student_account_id, studentAccountId),
            eq(StudentEvaluationTurnout.course_offering_id, enrollment.offeringId),
          ),
        );

      // Check Drafts Table (Loads auto-saved draft if still in progress)
      const [draft] = await tx
        .select()
        .from(StudentEvaluationDrafts)
        .where(
          and(
            eq(StudentEvaluationDrafts.schedule_id, schedule.id),
            eq(StudentEvaluationDrafts.student_class_id, studentClassId),
          ),
        );

      const savedRatings = (draft?.saved_ratings as Record<number, number>) ?? {};

      return {
        schedule_id: schedule.id,
        student_class_id: studentClassId,
        form: formResult.value,
        saved_ratings: savedRatings,
        saved_comment: draft?.saved_comment ?? null,
        is_submitted: Boolean(turnout),
        submitted_at: turnout?.submitted_at ?? null,
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

        // Validate enrollment and semester alignment
        const [enrollment] = await tx
          .select({
            studentClassId: StudentClasses.id,
            offeringId: CourseOfferings.id,
            semesterId: CourseOfferings.semester_id,
            facultyId: CourseOfferings.faculty_id,
          })
          .from(StudentClasses)
          .innerJoin(CourseOfferings, eq(StudentClasses.course_offering_id, CourseOfferings.id))
          .where(
            and(
              eq(StudentClasses.id, data.student_class_id),
              eq(StudentClasses.student_account_id, studentAccountId),
              isNull(StudentClasses.deleted_at),
              isNull(CourseOfferings.deleted_at),
            ),
          );

        if (!enrollment) {
          throw new AppError(403, "You are not actively enrolled in this course offering.");
        }

        if (!enrollment.facultyId) {
          throw new AppError(
            400,
            "Cannot evaluate: No faculty instructor is assigned to this course offering.",
          );
        }

        if (enrollment.semesterId !== schedule.semester_id) {
          throw new AppError(
            400,
            "This subject belongs to a different academic semester than the active evaluation schedule.",
          );
        }

        // 🛡️ Prevent duplicate voting: Check Turnout Register
        const [alreadyVoted] = await tx
          .select({ id: StudentEvaluationTurnout.id })
          .from(StudentEvaluationTurnout)
          .where(
            and(
              eq(StudentEvaluationTurnout.schedule_id, data.schedule_id),
              eq(StudentEvaluationTurnout.student_account_id, studentAccountId),
              eq(StudentEvaluationTurnout.course_offering_id, enrollment.offeringId),
            ),
          );

        if (alreadyVoted) {
          throw new AppError(409, "You have already cast your ballot for this subject.");
        }

        // ════════════════════════════════════════════════════════════════════
        // CASE A: DRAFT AUTO-SAVE (Private to Student)
        // ════════════════════════════════════════════════════════════════════
        if (data.is_draft) {
          const ratingsMap = data.ratings.reduce(
            (acc, curr) => {
              acc[curr.question_id] = curr.rating;
              return acc;
            },
            {} as Record<number, number>,
          );

          const [existingDraft] = await tx
            .select({ id: StudentEvaluationDrafts.id })
            .from(StudentEvaluationDrafts)
            .where(
              and(
                eq(StudentEvaluationDrafts.schedule_id, data.schedule_id),
                eq(StudentEvaluationDrafts.student_class_id, data.student_class_id),
              ),
            );

          if (existingDraft) {
            await tx
              .update(StudentEvaluationDrafts)
              .set({
                saved_ratings: ratingsMap,
                saved_comment: data.comment ?? null,
                updated_at: now,
              })
              .where(eq(StudentEvaluationDrafts.id, existingDraft.id));
          } else {
            await tx.insert(StudentEvaluationDrafts).values({
              schedule_id: data.schedule_id,
              student_class_id: data.student_class_id,
              saved_ratings: ratingsMap,
              saved_comment: data.comment ?? null,
            });
          }

          return {
            evaluation_id: 0,
            rating: null,
            sentiment_score: null,
            sentiment_classification: null,
          };
        }

        // ════════════════════════════════════════════════════════════════════
        // CASE B: FINAL BALLOT CAST (Completely Anonymized & Decoupled)
        // ════════════════════════════════════════════════════════════════════
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

        const computedRating = formula.calculate({
          ratings: data.ratings,
          totalScore,
          questionCount: data.ratings.length,
          maxPossibleScore,
          minRating: formRecord?.min_rating ?? 1,
          maxRating: maxRatingPerQ,
        });

        const sentiment = data.comment ? analyzeCommentSentiment(data.comment) : null;
        const commentScore = sentiment ? sentiment.score : null;
        const commentSentiment = sentiment ? sentiment.classification : null;

        // 1. Mark attendance in Voter Turnout log (prevents double voting)
        await tx.insert(StudentEvaluationTurnout).values({
          schedule_id: data.schedule_id,
          student_account_id: studentAccountId,
          course_offering_id: enrollment.offeringId,
          submitted_at: now,
        });

        // 2. Drop the ANONYMOUS ballot into the ballot box (ZERO student identifiers)
        const [ballot] = await tx
          .insert(StudentBallots)
          .values({
            schedule_id: data.schedule_id,
            course_offering_id: enrollment.offeringId,
            set_rating: String(computedRating),
            comment: data.comment ?? null,
            comment_score: commentScore !== null ? String(commentScore) : null,
            comment_sentiment: commentSentiment,
            cast_at: now,
          })
          .returning({ id: StudentBallots.id });

        // 3. Insert individual ratings linked ONLY to the anonymous ballot ID
        if (data.ratings.length > 0) {
          const ratingInserts = data.ratings.map((r) => ({
            ballot_id: ballot!.id,
            question_id: r.question_id,
            rating: r.rating,
          }));
          await tx.insert(StudentBallotRatings).values(ratingInserts);
        }

        // 4. Destroy the private draft (The Shredder)
        await tx
          .delete(StudentEvaluationDrafts)
          .where(
            and(
              eq(StudentEvaluationDrafts.schedule_id, data.schedule_id),
              eq(StudentEvaluationDrafts.student_class_id, data.student_class_id),
            ),
          );

        // 5. Emit real-time pulse (Naturally anonymous)
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
          .where(eq(CourseOfferings.id, enrollment.offeringId));

        if (offeringMeta) {
          emitEvaluationPulse({
            id: `pulse-set-${ballot!.id}`,
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

        return {
          evaluation_id: ballot!.id,
          rating: computedRating,
          sentiment_score: commentScore,
          sentiment_classification: commentSentiment,
        };
      });
    });
  }

  // =========================================================================
  // 2. SUPERVISOR (SEF) FLOW
  // =========================================================================

  private async verifySupervisoryScope(
    evaluatorAccountId: number,
    targetFacultyAccountId: number,
    tx: PgTransaction,
  ): Promise<boolean> {
    const [deanMatch] = await tx
      .select({ id: ProgramChairs.id })
      .from(CollegeDeans)
      .innerJoin(Programs, eq(CollegeDeans.college_id, Programs.college_id))
      .innerJoin(ProgramChairs, eq(Programs.id, ProgramChairs.program_id))
      .where(
        and(
          eq(CollegeDeans.dean_id, evaluatorAccountId),
          eq(ProgramChairs.chair_id, targetFacultyAccountId),
          isNull(CollegeDeans.deleted_at),
          isNull(Programs.deleted_at),
          isNull(ProgramChairs.deleted_at),
        ),
      )
      .limit(1);

    if (deanMatch) return true;

    const [chairMatch] = await tx
      .select({ id: Faculties.id })
      .from(ProgramChairs)
      .innerJoin(Faculties, eq(ProgramChairs.program_id, Faculties.program_id))
      .where(
        and(
          eq(ProgramChairs.chair_id, evaluatorAccountId),
          eq(Faculties.account_id, targetFacultyAccountId),
          isNull(ProgramChairs.deleted_at),
          isNull(Faculties.deleted_at),
        ),
      )
      .limit(1);

    if (chairMatch) {
      const [targetIsChair] = await tx
        .select({ id: ProgramChairs.id })
        .from(ProgramChairs)
        .where(
          and(eq(ProgramChairs.chair_id, targetFacultyAccountId), isNull(ProgramChairs.deleted_at)),
        )
        .limit(1);
      if (!targetIsChair) return true;
    }

    return false;
  }

  getEvaluableSupervisorFaculty(
    evaluatorAccountId: number,
    client: DbClient = db,
  ): ResultAsync<EvaluableSupervisorFaculty[], AppError> {
    return WithTransaction(client, async (tx) => {
      const now = new Date();

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

      if (deanCollegeIds.length === 0 && chairProgramIds.length === 0) return [];

      const eligibleAccountIds = new Set<number>();

      if (chairProgramIds.length > 0) {
        const allChairs = await tx
          .select({ chairId: ProgramChairs.chair_id })
          .from(ProgramChairs)
          .where(isNull(ProgramChairs.deleted_at));
        const allChairAccountIds = new Set(allChairs.map((c) => c.chairId));

        const deptFaculty = await tx
          .select({ accountId: Faculties.account_id })
          .from(Faculties)
          .where(and(inArray(Faculties.program_id, chairProgramIds), isNull(Faculties.deleted_at)));

        deptFaculty.forEach((df) => {
          if (df.accountId !== evaluatorAccountId && !allChairAccountIds.has(df.accountId)) {
            eligibleAccountIds.add(df.accountId);
          }
        });
      }

      if (deanCollegeIds.length > 0) {
        const chairAccounts = await tx
          .select({ chairId: ProgramChairs.chair_id })
          .from(ProgramChairs)
          .innerJoin(Programs, eq(ProgramChairs.program_id, Programs.id))
          .where(
            and(
              inArray(Programs.college_id, deanCollegeIds),
              ne(ProgramChairs.chair_id, evaluatorAccountId),
              isNull(ProgramChairs.deleted_at),
              isNull(Programs.deleted_at),
            ),
          );

        chairAccounts.forEach((c) => eligibleAccountIds.add(c.chairId));
      }

      eligibleAccountIds.delete(evaluatorAccountId);
      if (eligibleAccountIds.size === 0) return [];

      const targetAccountList = Array.from(eligibleAccountIds);

      const existingEvaluations = await tx
        .select()
        .from(SupervisorEvaluations)
        .where(
          and(
            eq(SupervisorEvaluations.schedule_id, activeSchedule.id),
            eq(SupervisorEvaluations.evaluator_id, evaluatorAccountId),
            inArray(SupervisorEvaluations.faculty_id, targetAccountList),
          ),
        );

      const evalMap = new Map(existingEvaluations.map((ev) => [ev.faculty_id, ev]));
      const results: EvaluableSupervisorFaculty[] = [];

      for (const accountId of targetAccountList) {
        const userRes = await this.userService.getUserById(accountId, tx);
        if (userRes.isErr()) continue;
        const facultyUser = userRes.value;

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
          .innerJoin(Faculties, eq(CourseOfferings.faculty_id, Faculties.id))
          .innerJoin(
            CourseCurriculums,
            eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
          )
          .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
          .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
          .innerJoin(Programs, eq(Classes.program_id, Programs.id))
          .where(
            and(
              eq(Faculties.account_id, accountId),
              eq(CourseOfferings.semester_id, activeSchedule.semester_id),
              isNull(CourseOfferings.deleted_at),
            ),
          );

        const ev = evalMap.get(accountId);

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
        .innerJoin(Faculties, eq(CourseOfferings.faculty_id, Faculties.id))
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(Programs, eq(Classes.program_id, Programs.id))
        .where(
          and(
            eq(Faculties.account_id, facultyId),
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

      const savedRatings: Record<number, number> = {};
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

        // Scope check
        const isAuthorized = await this.verifySupervisoryScope(
          evaluatorAccountId,
          data.faculty_id,
          tx,
        );
        if (!isAuthorized) {
          throw new AppError(
            403,
            "Access denied: This faculty member is not within your authorized supervisory scope.",
          );
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

        if (!data.is_draft) {
          const [facultyInfo] = await tx
            .select({
              firstName: PersonalDetails.first_name,
              lastName: PersonalDetails.last_name,
              collegeId: Colleges.id,
              collegeCode: Colleges.initialism,
              programId: Programs.id,
              programCode: Programs.initialism,
            })
            .from(Accounts)
            .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
            .leftJoin(
              Faculties,
              and(eq(Faculties.account_id, Accounts.id), isNull(Faculties.deleted_at)),
            )
            .leftJoin(
              Programs,
              and(eq(Faculties.program_id, Programs.id), isNull(Programs.deleted_at)),
            )
            .leftJoin(
              Colleges,
              and(eq(Programs.college_id, Colleges.id), isNull(Colleges.deleted_at)),
            )
            .where(eq(Accounts.id, data.faculty_id))
            .limit(1);

          const facultyName = facultyInfo
            ? `${facultyInfo.firstName} ${facultyInfo.lastName}`
            : "Faculty Member";

          emitEvaluationPulse({
            id: `pulse-sef-${evaluationId}`,
            type: "SEF",
            timestamp: now.toISOString(),
            courseCode: "SEF-APPRAISAL",
            courseName: `Term Appraisal: ${facultyName}`,
            programCode: facultyInfo?.programCode ?? "DEPT",
            programId: facultyInfo?.programId ?? 0,
            collegeCode: facultyInfo?.collegeCode ?? "COLL",
            collegeId: facultyInfo?.collegeId ?? 0,
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

  // =========================================================================
  // 3. FACULTY TEACHING LOAD (Uses Voter Turnout for Response Rate)
  // =========================================================================

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
        .innerJoin(Faculties, eq(CourseOfferings.faculty_id, Faculties.id))
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
            eq(Faculties.account_id, facultyAccountId),
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

        const studentAccountIds = enrollments.map((e) => e.accountId);

        // Turnout check (Uses Turnout Register; Zero ratings scanned)
        const turnouts =
          studentAccountIds.length > 0
            ? await tx
                .select({
                  studentAccountId: StudentEvaluationTurnout.student_account_id,
                  submittedAt: StudentEvaluationTurnout.submitted_at,
                })
                .from(StudentEvaluationTurnout)
                .where(
                  and(
                    eq(StudentEvaluationTurnout.course_offering_id, off.id),
                    inArray(StudentEvaluationTurnout.student_account_id, studentAccountIds),
                  ),
                )
            : [];

        const turnoutMap = new Map(turnouts.map((t) => [t.studentAccountId, t.submittedAt]));

        const students: TeachingStudentItem[] = enrollments.map((s) => {
          const submittedAt = turnoutMap.get(s.accountId);
          return {
            student_class_id: s.studentClassId,
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
