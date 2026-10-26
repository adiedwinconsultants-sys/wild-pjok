ALTER TABLE `assessments` ADD `mutation_version` text DEFAULT '' NOT NULL;
--> statement-breakpoint
CREATE TRIGGER assessment_scores_final_insert BEFORE INSERT ON assessment_scores
WHEN (SELECT status FROM assessments WHERE id = NEW.assessment_id) = 'finalized'
BEGIN SELECT RAISE(ABORT, 'ASSESSMENT_FINALIZED'); END;
--> statement-breakpoint
CREATE TRIGGER assessment_scores_final_update BEFORE UPDATE ON assessment_scores
WHEN (SELECT status FROM assessments WHERE id = OLD.assessment_id) = 'finalized'
  OR (SELECT status FROM assessments WHERE id = NEW.assessment_id) = 'finalized'
BEGIN SELECT RAISE(ABORT, 'ASSESSMENT_FINALIZED'); END;
--> statement-breakpoint
CREATE TRIGGER assessment_scores_final_delete BEFORE DELETE ON assessment_scores
WHEN (SELECT status FROM assessments WHERE id = OLD.assessment_id) = 'finalized'
BEGIN SELECT RAISE(ABORT, 'ASSESSMENT_FINALIZED'); END;
--> statement-breakpoint
CREATE TRIGGER assessments_history_delete BEFORE DELETE ON assessments
WHEN OLD.status IN ('finalized', 'reopened')
BEGIN SELECT RAISE(ABORT, 'CLASS_HAS_ASSESSMENTS'); END;
--> statement-breakpoint
CREATE TRIGGER students_participant_delete BEFORE DELETE ON students
WHEN EXISTS (SELECT 1 FROM classes WHERE id = OLD.class_id)
AND EXISTS (SELECT 1 FROM assessments, json_each(assessments.participant_ids_json) AS participant
  WHERE participant.value = OLD.id)
BEGIN SELECT RAISE(ABORT, 'STUDENT_HAS_RESULTS'); END;
