CREATE TYPE "system_role" AS ENUM('SYS_ADMIN', 'ADMIN', 'SUPERVISOR', 'FACULTY', 'STUDENT');--> statement-breakpoint
CREATE TYPE "section" AS ENUM('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z');--> statement-breakpoint
CREATE TYPE "semester_term" AS ENUM('1st', '2nd', 'Summer');--> statement-breakpoint
CREATE TYPE "year_level" AS ENUM('I', 'II', 'III', 'IV', 'V');--> statement-breakpoint
CREATE TYPE "sentiment_classification" AS ENUM('POSITIVE', 'NEUTRAL', 'NEGATIVE', 'MIXED');--> statement-breakpoint
CREATE TYPE "report_status" AS ENUM('DRAFT', 'FINALIZED', 'PUBLISHED');--> statement-breakpoint
CREATE TABLE "account_roles" (
	"id" serial PRIMARY KEY,
	"account_id" integer NOT NULL,
	"role_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" serial PRIMARY KEY,
	"personal_details_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"password" varchar(255) NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" serial PRIMARY KEY,
	"email" varchar(255) NOT NULL,
	"code" varchar(8) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" serial PRIMARY KEY,
	"permission_key" varchar(64) NOT NULL,
	"description" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "personal_details" (
	"id" serial PRIMARY KEY,
	"institutional_id" varchar(32) NOT NULL,
	"last_name" varchar(64) NOT NULL,
	"first_name" varchar(64) NOT NULL,
	"middle_name" varchar(64),
	"suffix" varchar(8),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" serial PRIMARY KEY,
	"account_id" integer NOT NULL,
	"email" varchar(255) NOT NULL,
	"token_hash" varchar(255) NOT NULL,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"id" serial PRIMARY KEY,
	"role_id" integer NOT NULL,
	"permission_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY,
	"system_role" "system_role" NOT NULL,
	"description" varchar(128),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "class_students" (
	"id" serial PRIMARY KEY,
	"class_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"student_account_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" serial PRIMARY KEY,
	"program_id" integer NOT NULL,
	"year_level" "year_level" NOT NULL,
	"section" "section" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "college_deans" (
	"id" serial PRIMARY KEY,
	"college_id" integer NOT NULL,
	"dean_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "colleges" (
	"id" serial PRIMARY KEY,
	"name" varchar(128) NOT NULL,
	"initialism" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "course_curriculums" (
	"id" serial PRIMARY KEY,
	"course_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"year_level" "year_level" NOT NULL,
	"semester_term" "semester_term" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "course_offerings" (
	"id" serial PRIMARY KEY,
	"course_curriculum_id" integer NOT NULL,
	"class_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"faculty_id" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "courses" (
	"id" serial PRIMARY KEY,
	"program_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"initialism" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" serial PRIMARY KEY,
	"account_id" integer NOT NULL,
	"program_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "program_chairs" (
	"id" serial PRIMARY KEY,
	"program_id" integer NOT NULL,
	"chair_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "programs" (
	"id" serial PRIMARY KEY,
	"college_id" integer NOT NULL,
	"name" varchar(128) NOT NULL,
	"initialism" varchar(16) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "semesters" (
	"id" serial PRIMARY KEY,
	"semester_term" "semester_term" NOT NULL,
	"school_year_start" smallint NOT NULL,
	"school_year_end" smallint GENERATED ALWAYS AS ("semesters"."school_year_start" + 1) STORED NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "chk_semester_date_order" CHECK ("start_date" < "end_date")
);
--> statement-breakpoint
CREATE TABLE "student_classes" (
	"id" serial PRIMARY KEY,
	"student_account_id" integer NOT NULL,
	"course_offering_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "student_evaluation_categories" (
	"id" serial PRIMARY KEY,
	"form_id" integer NOT NULL,
	"parent_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "student_evaluation_forms" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"description" text,
	"min_rating" integer DEFAULT 1 NOT NULL,
	"max_rating" integer DEFAULT 5 NOT NULL,
	"calculation_formula" varchar(64) DEFAULT 'PERCENTAGE_75' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "chk_student_eval_rating_bounds" CHECK ("min_rating" < "max_rating")
);
--> statement-breakpoint
CREATE TABLE "student_evaluation_questions" (
	"id" serial PRIMARY KEY,
	"category_id" integer NOT NULL,
	"parent_id" integer,
	"question" text NOT NULL,
	"max_rating" integer DEFAULT 5 NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "supervisor_evaluation_categories" (
	"id" serial PRIMARY KEY,
	"form_id" integer NOT NULL,
	"parent_id" integer,
	"name" varchar(255) NOT NULL,
	"description" text,
	"order" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "supervisor_evaluation_forms" (
	"id" serial PRIMARY KEY,
	"title" varchar(255) NOT NULL,
	"description" text,
	"min_rating" integer DEFAULT 1 NOT NULL,
	"max_rating" integer DEFAULT 5 NOT NULL,
	"calculation_formula" varchar(64) DEFAULT 'PERCENTAGE_75' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "chk_supervisor_eval_rating_bounds" CHECK ("min_rating" < "max_rating")
);
--> statement-breakpoint
CREATE TABLE "supervisor_evaluation_means" (
	"id" serial PRIMARY KEY,
	"question_id" integer NOT NULL,
	"parent_id" integer,
	"descriptor" varchar(255) NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "supervisor_evaluation_questions" (
	"id" serial PRIMARY KEY,
	"category_id" integer NOT NULL,
	"parent_id" integer,
	"question" text NOT NULL,
	"max_rating" integer DEFAULT 5 NOT NULL,
	"order" integer DEFAULT 1 NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "student_evaluation_schedules" (
	"id" serial PRIMARY KEY,
	"semester_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"open_at" timestamp NOT NULL,
	"close_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "supervisor_evaluation_schedules" (
	"id" serial PRIMARY KEY,
	"semester_id" integer NOT NULL,
	"form_id" integer NOT NULL,
	"open_at" timestamp NOT NULL,
	"close_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "student_evaluation_ratings" (
	"id" serial PRIMARY KEY,
	"evaluation_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"rating" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_evaluations" (
	"id" serial PRIMARY KEY,
	"schedule_id" integer NOT NULL,
	"student_class_id" integer NOT NULL,
	"comment" text,
	"comment_score" numeric(5,2),
	"comment_sentiment" "sentiment_classification",
	"set_rating" numeric(5,2),
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "supervisor_evaluation_ratings" (
	"id" serial PRIMARY KEY,
	"evaluation_id" integer NOT NULL,
	"question_id" integer NOT NULL,
	"rating" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supervisor_evaluations" (
	"id" serial PRIMARY KEY,
	"schedule_id" integer NOT NULL,
	"evaluator_id" integer NOT NULL,
	"faculty_id" integer NOT NULL,
	"comment" text,
	"comment_score" numeric(5,2),
	"comment_sentiment" "sentiment_classification",
	"set_rating" numeric(5,2),
	"submitted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "individual_faculty_reports" (
	"id" serial PRIMARY KEY,
	"faculty_id" integer NOT NULL,
	"semester_id" integer NOT NULL,
	"overall_set_rating" numeric(5,2) NOT NULL,
	"overall_sef_rating" numeric(5,2),
	"total_students_evaluated" integer DEFAULT 0 NOT NULL,
	"total_classes" integer DEFAULT 0 NOT NULL,
	"total_weighted_score" numeric(10,2) DEFAULT '0' NOT NULL,
	"calculation_formula" varchar(64) DEFAULT 'ANNEX_C_WEIGHTED' NOT NULL,
	"class_breakdown" jsonb DEFAULT '[]' NOT NULL,
	"student_comments" jsonb DEFAULT '[]' NOT NULL,
	"supervisor_comments" jsonb DEFAULT '[]' NOT NULL,
	"set_category_analytics" jsonb DEFAULT '[]' NOT NULL,
	"set_indicator_analytics" jsonb DEFAULT '[]' NOT NULL,
	"sef_category_analytics" jsonb DEFAULT '[]' NOT NULL,
	"sef_indicator_analytics" jsonb DEFAULT '[]' NOT NULL,
	"analytics_summary" jsonb DEFAULT '{}' NOT NULL,
	"fedaf_plan" jsonb DEFAULT '{"areas_for_improvement":"","proposed_activities":"","action_plan":"","supervisor_name":"","supervisor_signed_at":null,"faculty_signed_at":null}' NOT NULL,
	"status" "report_status" DEFAULT 'DRAFT'::"report_status" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_accountrole_account_role" ON "account_roles" ("account_id","role_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_account_roles_role_id" ON "account_roles" ("role_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_accounts_email" ON "accounts" ("email") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_accounts_personal_details" ON "accounts" ("personal_details_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_otp_email" ON "otp_codes" ("email") WHERE "is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_permissions_permission_key" ON "permissions" ("permission_key") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_institution_id" ON "personal_details" ("institutional_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_personal_details_composite" ON "personal_details" ("institutional_id", "last_name", "first_name", COALESCE("middle_name", ''), COALESCE("suffix", '')) WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_refresh_tokens_hash" ON "refresh_tokens" ("token_hash");--> statement-breakpoint
CREATE INDEX "idx_refresh_tokens_account_id" ON "refresh_tokens" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_role_permissions_role_id_permission_id" ON "role_permissions" ("role_id","permission_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_roles_system_role" ON "roles" ("system_role") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_semester_student" ON "class_students" ("semester_id","student_account_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_class_students_class_semester" ON "class_students" ("class_id","semester_id");--> statement-breakpoint
CREATE INDEX "idx_class_students_student_account_id" ON "class_students" ("student_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_class_program_year_section" ON "classes" ("program_id","year_level","section") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_college_dean" ON "college_deans" ("college_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_dean_account" ON "college_deans" ("dean_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_college_deans_dean_id" ON "college_deans" ("dean_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_college_name" ON "colleges" ("name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_college_initialism" ON "colleges" ("initialism") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_course_curriculum" ON "course_curriculums" ("course_id","program_id","year_level","semester_term") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_course_curriculum_program_year_term" ON "course_curriculums" ("program_id","year_level","semester_term");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_course_offering" ON "course_offerings" ("class_id","course_curriculum_id","semester_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_course_offerings_faculty_id" ON "course_offerings" ("faculty_id");--> statement-breakpoint
CREATE INDEX "idx_course_offerings_class_id" ON "course_offerings" ("class_id");--> statement-breakpoint
CREATE INDEX "idx_course_offerings_semester_id" ON "course_offerings" ("semester_id");--> statement-breakpoint
CREATE INDEX "idx_course_offerings_curriculum_id" ON "course_offerings" ("course_curriculum_id");--> statement-breakpoint
CREATE INDEX "idx_offerings_faculty_semester" ON "course_offerings" ("faculty_id","semester_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_offerings_class_semester" ON "course_offerings" ("class_id","semester_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_course_program_name" ON "courses" ("program_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_course_program_initialism" ON "courses" ("program_id","initialism") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_faculty_account" ON "faculties" ("account_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_faculties_program_id" ON "faculties" ("program_id");--> statement-breakpoint
CREATE INDEX "idx_faculties_account_id" ON "faculties" ("account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_program_chair" ON "program_chairs" ("program_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_program_chairs_chair_id" ON "program_chairs" ("chair_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_program_college_name" ON "programs" ("college_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_program_name_initialism" ON "programs" ("initialism") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_semester" ON "semesters" ("semester_term","school_year_start","school_year_end") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_student_course_offering" ON "student_classes" ("student_account_id","course_offering_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_student_classes_student_account_id" ON "student_classes" ("student_account_id");--> statement-breakpoint
CREATE INDEX "idx_student_classes_course_offering_id" ON "student_classes" ("course_offering_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_categories_form_id" ON "student_evaluation_categories" ("form_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_student_eval_category_name" ON "student_evaluation_categories" ("form_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_student_eval_form_title" ON "student_evaluation_forms" ("title") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_student_eval_questions_category_id" ON "student_evaluation_questions" ("category_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_categories_form_id" ON "supervisor_evaluation_categories" ("form_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_supervisor_eval_category_name" ON "supervisor_evaluation_categories" ("form_id","name") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_supervisor_eval_form_title" ON "supervisor_evaluation_forms" ("title") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_means_question_id" ON "supervisor_evaluation_means" ("question_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_questions_category_id" ON "supervisor_evaluation_questions" ("category_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_schedule_semester_id" ON "student_evaluation_schedules" ("semester_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_schedule_form_id" ON "student_evaluation_schedules" ("form_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_student_schedule" ON "student_evaluation_schedules" ("semester_id","form_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_schedule_semester_id" ON "supervisor_evaluation_schedules" ("semester_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_schedule_form_id" ON "supervisor_evaluation_schedules" ("form_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_active_supervisor_schedule" ON "supervisor_evaluation_schedules" ("semester_id","form_id") WHERE deleted_at IS NULL;--> statement-breakpoint
CREATE INDEX "idx_student_eval_ratings_evaluation_id" ON "student_evaluation_ratings" ("evaluation_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_ratings_question_id" ON "student_evaluation_ratings" ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_unique_student_question_rating" ON "student_evaluation_ratings" ("evaluation_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_schedule_id" ON "student_evaluations" ("schedule_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_student_class_id" ON "student_evaluations" ("student_class_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_sentiment" ON "student_evaluations" ("comment_sentiment");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_unique_student_submission" ON "student_evaluations" ("schedule_id","student_class_id");--> statement-breakpoint
CREATE INDEX "idx_student_eval_submitted" ON "student_evaluations" ("student_class_id","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_student_eval_schedule_submitted" ON "student_evaluations" ("schedule_id","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_ratings_evaluation_id" ON "supervisor_evaluation_ratings" ("evaluation_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_ratings_question_id" ON "supervisor_evaluation_ratings" ("question_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_unique_supervisor_question_rating" ON "supervisor_evaluation_ratings" ("evaluation_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_schedule_id" ON "supervisor_evaluations" ("schedule_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_evaluator_id" ON "supervisor_evaluations" ("evaluator_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_faculty_id" ON "supervisor_evaluations" ("faculty_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_sentiment" ON "supervisor_evaluations" ("comment_sentiment");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_unique_supervisor_submission" ON "supervisor_evaluations" ("schedule_id","evaluator_id","faculty_id");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_offering_submitted" ON "supervisor_evaluations" ("faculty_id","submitted_at");--> statement-breakpoint
CREATE INDEX "idx_supervisor_eval_evaluator_schedule" ON "supervisor_evaluations" ("evaluator_id","schedule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uidx_faculty_semester_report" ON "individual_faculty_reports" ("faculty_id","semester_id");--> statement-breakpoint
CREATE INDEX "idx_reports_faculty_id" ON "individual_faculty_reports" ("faculty_id");--> statement-breakpoint
CREATE INDEX "idx_reports_semester_id" ON "individual_faculty_reports" ("semester_id");--> statement-breakpoint
CREATE INDEX "idx_reports_status" ON "individual_faculty_reports" ("status");--> statement-breakpoint
CREATE INDEX "idx_reports_sem_status_faculty" ON "individual_faculty_reports" ("semester_id","status","faculty_id");--> statement-breakpoint
ALTER TABLE "account_roles" ADD CONSTRAINT "account_roles_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "account_roles" ADD CONSTRAINT "account_roles_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_personal_details_id_personal_details_id_fkey" FOREIGN KEY ("personal_details_id") REFERENCES "personal_details"("id");--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id");--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id");--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id");--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_semester_id_semesters_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id");--> statement-breakpoint
ALTER TABLE "class_students" ADD CONSTRAINT "class_students_student_account_id_accounts_id_fkey" FOREIGN KEY ("student_account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_program_id_programs_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id");--> statement-breakpoint
ALTER TABLE "college_deans" ADD CONSTRAINT "college_deans_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "college_deans" ADD CONSTRAINT "college_deans_dean_id_accounts_id_fkey" FOREIGN KEY ("dean_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "course_curriculums" ADD CONSTRAINT "course_curriculums_course_id_courses_id_fkey" FOREIGN KEY ("course_id") REFERENCES "courses"("id");--> statement-breakpoint
ALTER TABLE "course_curriculums" ADD CONSTRAINT "course_curriculums_program_id_programs_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id");--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_OBhsYJlQqsc0_fkey" FOREIGN KEY ("course_curriculum_id") REFERENCES "course_curriculums"("id");--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_class_id_classes_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id");--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_semester_id_semesters_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id");--> statement-breakpoint
ALTER TABLE "course_offerings" ADD CONSTRAINT "course_offerings_faculty_id_faculties_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "faculties"("id");--> statement-breakpoint
ALTER TABLE "courses" ADD CONSTRAINT "courses_program_id_programs_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id");--> statement-breakpoint
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_account_id_accounts_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "faculties" ADD CONSTRAINT "faculties_program_id_programs_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id");--> statement-breakpoint
ALTER TABLE "program_chairs" ADD CONSTRAINT "program_chairs_program_id_programs_id_fkey" FOREIGN KEY ("program_id") REFERENCES "programs"("id");--> statement-breakpoint
ALTER TABLE "program_chairs" ADD CONSTRAINT "program_chairs_chair_id_accounts_id_fkey" FOREIGN KEY ("chair_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "programs" ADD CONSTRAINT "programs_college_id_colleges_id_fkey" FOREIGN KEY ("college_id") REFERENCES "colleges"("id");--> statement-breakpoint
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_student_account_id_accounts_id_fkey" FOREIGN KEY ("student_account_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "student_classes" ADD CONSTRAINT "student_classes_course_offering_id_course_offerings_id_fkey" FOREIGN KEY ("course_offering_id") REFERENCES "course_offerings"("id");--> statement-breakpoint
ALTER TABLE "student_evaluation_categories" ADD CONSTRAINT "student_evaluation_categories_xTAfyeEWOMxZ_fkey" FOREIGN KEY ("form_id") REFERENCES "student_evaluation_forms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_evaluation_categories" ADD CONSTRAINT "student_evaluation_categories_rXuByOzK7XJK_fkey" FOREIGN KEY ("parent_id") REFERENCES "student_evaluation_categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "student_evaluation_questions" ADD CONSTRAINT "student_evaluation_questions_55O6L6AKDBAZ_fkey" FOREIGN KEY ("category_id") REFERENCES "student_evaluation_categories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_evaluation_questions" ADD CONSTRAINT "student_evaluation_questions_9YzyymzOyswG_fkey" FOREIGN KEY ("parent_id") REFERENCES "student_evaluation_questions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_categories" ADD CONSTRAINT "supervisor_evaluation_categories_ppQRMBx792L7_fkey" FOREIGN KEY ("form_id") REFERENCES "supervisor_evaluation_forms"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_categories" ADD CONSTRAINT "supervisor_evaluation_categories_ZXZMzYqAMsPk_fkey" FOREIGN KEY ("parent_id") REFERENCES "supervisor_evaluation_categories"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_means" ADD CONSTRAINT "supervisor_evaluation_means_RDj2xhuTq2SL_fkey" FOREIGN KEY ("question_id") REFERENCES "supervisor_evaluation_questions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_means" ADD CONSTRAINT "supervisor_evaluation_means_I2t8JZIFkHbI_fkey" FOREIGN KEY ("parent_id") REFERENCES "supervisor_evaluation_means"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_questions" ADD CONSTRAINT "supervisor_evaluation_questions_PROBl4TbgSRh_fkey" FOREIGN KEY ("category_id") REFERENCES "supervisor_evaluation_categories"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_questions" ADD CONSTRAINT "supervisor_evaluation_questions_sTM6miogC1fy_fkey" FOREIGN KEY ("parent_id") REFERENCES "supervisor_evaluation_questions"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "student_evaluation_schedules" ADD CONSTRAINT "student_evaluation_schedules_semester_id_semesters_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id");--> statement-breakpoint
ALTER TABLE "student_evaluation_schedules" ADD CONSTRAINT "student_evaluation_schedules_1hn5CeURrtTz_fkey" FOREIGN KEY ("form_id") REFERENCES "student_evaluation_forms"("id");--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_schedules" ADD CONSTRAINT "supervisor_evaluation_schedules_semester_id_semesters_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id");--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_schedules" ADD CONSTRAINT "supervisor_evaluation_schedules_jcn6PxhpA9BN_fkey" FOREIGN KEY ("form_id") REFERENCES "supervisor_evaluation_forms"("id");--> statement-breakpoint
ALTER TABLE "student_evaluation_ratings" ADD CONSTRAINT "student_evaluation_ratings_2LnBKPIOxXKC_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "student_evaluations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "student_evaluation_ratings" ADD CONSTRAINT "student_evaluation_ratings_DOXWHpvNykMl_fkey" FOREIGN KEY ("question_id") REFERENCES "student_evaluation_questions"("id");--> statement-breakpoint
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_XT7qtGwJkpGb_fkey" FOREIGN KEY ("schedule_id") REFERENCES "student_evaluation_schedules"("id");--> statement-breakpoint
ALTER TABLE "student_evaluations" ADD CONSTRAINT "student_evaluations_student_class_id_student_classes_id_fkey" FOREIGN KEY ("student_class_id") REFERENCES "student_classes"("id");--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_ratings" ADD CONSTRAINT "supervisor_evaluation_ratings_h2I5CXP4b9Ru_fkey" FOREIGN KEY ("evaluation_id") REFERENCES "supervisor_evaluations"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "supervisor_evaluation_ratings" ADD CONSTRAINT "supervisor_evaluation_ratings_F4KjdtCbyDNt_fkey" FOREIGN KEY ("question_id") REFERENCES "supervisor_evaluation_questions"("id");--> statement-breakpoint
ALTER TABLE "supervisor_evaluations" ADD CONSTRAINT "supervisor_evaluations_YxD4qe0svcyV_fkey" FOREIGN KEY ("schedule_id") REFERENCES "supervisor_evaluation_schedules"("id");--> statement-breakpoint
ALTER TABLE "supervisor_evaluations" ADD CONSTRAINT "supervisor_evaluations_evaluator_id_accounts_id_fkey" FOREIGN KEY ("evaluator_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "supervisor_evaluations" ADD CONSTRAINT "supervisor_evaluations_faculty_id_accounts_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "individual_faculty_reports" ADD CONSTRAINT "individual_faculty_reports_faculty_id_accounts_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "accounts"("id");--> statement-breakpoint
ALTER TABLE "individual_faculty_reports" ADD CONSTRAINT "individual_faculty_reports_semester_id_semesters_id_fkey" FOREIGN KEY ("semester_id") REFERENCES "semesters"("id");