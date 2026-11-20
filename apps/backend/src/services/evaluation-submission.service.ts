import { and, eq, inArray, isNull, lte, gte, isNotNull, desc, asc, ne } from "drizzle-orm";
import { type ResultAsync } from "neverthrow";
import db, { type PgTransaction } from "@/configs/db.config.js";
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
  OfferingStudents,
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

export interface IEvaluationSubmissionService {
  getEvaluableStudentSubjects(
    studentAccountId: number,
    client?: DbClient,
  ): ResultAsync<EvaluableStudentSubject[], AppError>;
  getStudentEvaluationFormView(
    studentAccountId: number,
    offeringStudentId: number,
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
          offeringStudentId: OfferingStudents.id,
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
        .from(OfferingStudents)
        .innerJoin(CourseOfferings, eq(OfferingStudents.course_offering_id, CourseOfferings.id))
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
            eq(OfferingStudents.student_account_id, studentAccountId),
            eq(CourseOfferings.semester_id, activeSchedule.semester_id),
            isNotNull(CourseOfferings.faculty_id),
            isNull(OfferingStudents.deleted_at),
            isNull(CourseOfferings.deleted_at),
          ),
        );

      if (enrollments.length === 0) return [];

      const offeringIds = enrollments.map((e) => e.offeringId);
      const offeringStudentIds = enrollments.map((e) => e.offeringStudentId);

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

      const drafts = await tx
        .select()
        .from(StudentEvaluationDrafts)
        .where(
          and(
            eq(StudentEvaluationDrafts.schedule_id, activeSchedule.id),
            inArray(StudentEvaluationDrafts.offering_student_id, offeringStudentIds),
          ),
        );
      const draftMap = new Map(drafts.map((d) => [d.offering_student_id, d]));

      return enrollments.map((e): EvaluableStudentSubject => {
        const turnout = turnoutMap.get(e.offeringId);
        const draft = draftMap.get(e.offeringStudentId);
        const hasSubmitted = Boolean(turnout);
        const isDraft = Boolean(!hasSubmitted && draft);

        return {
          offering_student_id: e.offeringStudentId,
          has_submitted: hasSubmitted,
          is_draft: isDraft,
          submitted_at: turnout?.submitted_at ?? null,
          computed_rating: null,
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
    offeringStudentId: number,
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
          offeringStudentId: OfferingStudents.id,
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
        .from(OfferingStudents)
        .innerJoin(CourseOfferings, eq(OfferingStudents.course_offering_id, CourseOfferings.id))
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
            eq(OfferingStudents.id, offeringStudentId),
            eq(OfferingStudents.student_account_id, studentAccountId),
            eq(CourseOfferings.semester_id, schedule.semester_id),
            isNotNull(CourseOfferings.faculty_id),
            isNull(OfferingStudents.deleted_at),
          ),
        );

      if (!enrollment) {
        throw new AppError(404, "Student enrollment record not found for this active term.");
      }

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

      const [draft] = await tx
        .select()
        .from(StudentEvaluationDrafts)
        .where(
          and(
            eq(StudentEvaluationDrafts.schedule_id, schedule.id),
            eq(StudentEvaluationDrafts.offering_student_id, offeringStudentId),
          ),
        );

      const savedRatings = (draft?.saved_ratings as Record<number, number>) ?? {};

      return {
        schedule_id: schedule.id,
        offering_student_id: offeringStudentId,
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

        const [enrollment] = await tx
          .select({
            offeringStudentId: OfferingStudents.id,
            offeringId: CourseOfferings.id,
            semesterId: CourseOfferings.semester_id,
            facultyId: CourseOfferings.faculty_id,
          })
          .from(OfferingStudents)
          .innerJoin(CourseOfferings, eq(OfferingStudents.course_offering_id, CourseOfferings.id))
          .where(
            and(
              eq(OfferingStudents.id, data.offering_student_id),
              eq(OfferingStudents.student_account_id, studentAccountId),
              isNull(OfferingStudents.deleted_at),
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
                eq(StudentEvaluationDrafts.offering_student_id, data.offering_student_id),
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
              offering_student_id: data.offering_student_id,
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

        await tx.insert(StudentEvaluationTurnout).values({
          schedule_id: data.schedule_id,
          student_account_id: studentAccountId,
          course_offering_id: enrollment.offeringId,
          submitted_at: now,
        });

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

        if (data.ratings.length > 0) {
          const ratingInserts = data.ratings.map((r) => ({
            ballot_id: ballot!.id,
            question_id: r.question_id,
            rating: r.rating,
          }));
          await tx.insert(StudentBallotRatings).values(ratingInserts);
        }

        await tx
          .delete(StudentEvaluationDrafts)
          .where(
            and(
              eq(StudentEvaluationDrafts.schedule_id, data.schedule_id),
              eq(StudentEvaluationDrafts.offering_student_id, data.offering_student_id),
            ),
          );

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

  /**
   * Resolves all target faculty Account IDs eligible for SEF evaluation by `evaluatorAccountId`
   * during `semesterId`, implementing:
   * - College Dean: rates Department Chairs (ProgramChairs) in their college, plus Service-College
   *   GE faculty if the college is a service college and the faculty's program has no ProgramChair.
   * - Department Chair (CMO 19 s. 2025 Sec 9.3 & 9.4):
   *     1. All Faculty appointed to the Chair's own program (excluding active ProgramChairs).
   *     2. Any Faculty / teaching Administrator (Dean, VPAA, etc.) teaching a PROFESSIONAL
   *        course offering in the Chair's program during `semesterId`.
   *     (General Education courses taught by service college faculty are NOT rated by recipient
   *      program chairs; they remain under their service college supervisor.)
   */
  private async resolveSupervisoryTargetAccountIds(
    evaluatorAccountId: number,
    semesterId: number,
    tx: PgTransaction,
  ): Promise<Set<number>> {
    const [deanships, chairships] = await Promise.all([
      tx
        .select({
          collegeId: CollegeDeans.college_id,
          isServiceCollege: Colleges.is_service_college,
        })
        .from(CollegeDeans)
        .innerJoin(Colleges, eq(CollegeDeans.college_id, Colleges.id))
        .where(
          and(
            eq(CollegeDeans.dean_id, evaluatorAccountId),
            isNull(CollegeDeans.deleted_at),
            isNull(Colleges.deleted_at),
          ),
        ),
      tx
        .select({ programId: ProgramChairs.program_id })
        .from(ProgramChairs)
        .where(
          and(eq(ProgramChairs.chair_id, evaluatorAccountId), isNull(ProgramChairs.deleted_at)),
        ),
    ]);

    const deanCollegeIds = deanships.map((d) => d.collegeId);
    const serviceCollegeIds = deanships.filter((d) => d.isServiceCollege).map((d) => d.collegeId);
    const chairProgramIds = chairships.map((c) => c.programId);

    const eligibleAccountIds = new Set<number>();

    // 1. College Dean -> rates Department Chairs in their college
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

      // Service College fallback (Section 9.3): GE faculty in a service college unit lacking a Chair
      if (serviceCollegeIds.length > 0) {
        const serviceFacultyNoChair = await tx
          .select({ accountId: Faculties.account_id })
          .from(Faculties)
          .innerJoin(Programs, eq(Faculties.program_id, Programs.id))
          .leftJoin(
            ProgramChairs,
            and(eq(Programs.id, ProgramChairs.program_id), isNull(ProgramChairs.deleted_at)),
          )
          .where(
            and(
              inArray(Programs.college_id, serviceCollegeIds),
              isNull(ProgramChairs.id),
              isNull(Faculties.deleted_at),
              isNull(Programs.deleted_at),
            ),
          );

        serviceFacultyNoChair.forEach((f) => eligibleAccountIds.add(f.accountId));
      }
    }

    // 2. Department Chair -> own program faculty + cross-program PROFESSIONAL courses + teaching admins (9.3 & 9.4)
    if (chairProgramIds.length > 0) {
      const allChairs = await tx
        .select({ chairId: ProgramChairs.chair_id })
        .from(ProgramChairs)
        .where(isNull(ProgramChairs.deleted_at));
      const allChairAccountIds = new Set(allChairs.map((c) => c.chairId));

      // 2a. Home/appointed faculty inside Chair's program (excluding other Chairs; Deans are caught if teaching below)
      const deptFaculty = await tx
        .select({ accountId: Faculties.account_id })
        .from(Faculties)
        .where(and(inArray(Faculties.program_id, chairProgramIds), isNull(Faculties.deleted_at)));

      deptFaculty.forEach((df) => {
        if (df.accountId !== evaluatorAccountId && !allChairAccountIds.has(df.accountId)) {
          eligibleAccountIds.add(df.accountId);
        }
      });

      // 2b. CMO 9.3 & 9.4: Anyone (including cross-program faculty & teaching Deans/Admins)
      //     teaching a PROFESSIONAL course offering in the Chair's program this semester
      const professionalTeachersInProgram = await tx
        .selectDistinct({ accountId: Faculties.account_id })
        .from(CourseOfferings)
        .innerJoin(Faculties, eq(CourseOfferings.faculty_id, Faculties.id))
        .innerJoin(Classes, eq(CourseOfferings.class_id, Classes.id))
        .innerJoin(
          CourseCurriculums,
          eq(CourseOfferings.course_curriculum_id, CourseCurriculums.id),
        )
        .innerJoin(Courses, eq(CourseCurriculums.course_id, Courses.id))
        .where(
          and(
            eq(CourseOfferings.semester_id, semesterId),
            inArray(Classes.program_id, chairProgramIds),
            eq(Courses.course_type, "PROFESSIONAL"),
            isNotNull(CourseOfferings.faculty_id),
            isNull(CourseOfferings.deleted_at),
            isNull(Faculties.deleted_at),
          ),
        );

      professionalTeachersInProgram.forEach((row) => {
        if (row.accountId !== evaluatorAccountId) {
          eligibleAccountIds.add(row.accountId);
        }
      });
    }

    eligibleAccountIds.delete(evaluatorAccountId);
    return eligibleAccountIds;
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

      const eligibleAccountIds = await this.resolveSupervisoryTargetAccountIds(
        evaluatorAccountId,
        activeSchedule.semester_id,
        tx,
      );

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
            courseType: Courses.course_type,
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
              isNull(Faculties.deleted_at),
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
            course_type: o.courseType,
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

      const eligibleIds = await this.resolveSupervisoryTargetAccountIds(
        evaluatorAccountId,
        schedule.semester_id,
        tx,
      );
      if (!eligibleIds.has(facultyId)) {
        throw new AppError(
          403,
          "Access denied: This faculty member is not within your authorized supervisory scope.",
        );
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
          courseType: Courses.course_type,
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
            isNull(Faculties.deleted_at),
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
          course_type: o.courseType,
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

        const isDean = await this.userService.hasRole(evaluatorAccountId, "COLLEGE_DEAN", tx);
        const isChair = await this.userService.hasRole(evaluatorAccountId, "DEPARTMENT_CHAIR", tx);
        if ((isDean.isErr() || !isDean.value) && (isChair.isErr() || !isChair.value)) {
          throw new AppError(
            403,
            "Only designated College Deans and Department Chairs can submit supervisory evaluations.",
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

        const eligibleIds = await this.resolveSupervisoryTargetAccountIds(
          evaluatorAccountId,
          schedule.semester_id,
          tx,
        );
        if (!eligibleIds.has(data.faculty_id)) {
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
            isNull(Faculties.deleted_at),
          ),
        );

      if (offerings.length === 0) return [];

      const results: FacultyTeachingOffering[] = [];

      for (const off of offerings) {
        const enrollments = await tx
          .select({
            offeringStudentId: OfferingStudents.id,
            accountId: Accounts.id,
            email: Accounts.email,
            institutionalId: PersonalDetails.institutional_id,
            firstName: PersonalDetails.first_name,
            lastName: PersonalDetails.last_name,
            middleName: PersonalDetails.middle_name,
            suffix: PersonalDetails.suffix,
          })
          .from(OfferingStudents)
          .innerJoin(Accounts, eq(OfferingStudents.student_account_id, Accounts.id))
          .innerJoin(PersonalDetails, eq(Accounts.personal_details_id, PersonalDetails.id))
          .where(
            and(
              eq(OfferingStudents.course_offering_id, off.id),
              isNull(OfferingStudents.deleted_at),
              isNull(Accounts.deleted_at),
            ),
          )
          .orderBy(asc(PersonalDetails.last_name), asc(PersonalDetails.first_name));

        const studentAccountIds = enrollments.map((e) => e.accountId);

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
            offering_student_id: s.offeringStudentId,
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
