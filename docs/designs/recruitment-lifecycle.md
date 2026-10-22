# Recruitment UI and scheduling organisation

Date: 15 October 2026 (Asia/Kolkata)
Status: Implemented; local build and test checks passed
Priority: Organise the existing recruitment UI, interview scheduling flow and interview management.

This replaces the earlier broad lifecycle proposal. Improve the screens and flows already present. External integrations, automated reminders, new ownership systems, assessment-attempt models and broader workflow expansion are excluded from this revision.

## 1. Recruitment navigation

Keep job openings as the entry point. Selecting an opening opens its candidate pipeline; selecting a candidate opens their details. Show a clear breadcrumb: Recruitment → Opening → Candidate.

Keep New application near the opening heading and preserve the selected opening when entering the form. Keep resume autofill at the top of the application form, with editable extracted values and clear required/optional labels. Notice period remains optional.

Candidate cards show only the information needed to act: name, current stage, existing interview status, next action and appointment time where available. Keep search and existing filters together, show the selected opening clearly and preserve filters when returning from a candidate.

## 2. Candidate details layout

Organise the existing content in this order:

1. Candidate name, opening and current stage.
2. Current action, such as Schedule interview, Update interview status, Submit feedback or Continue to next stage.
3. Stage progress, using existing stages and rules.
4. Current round's appointment and feedback.
5. Candidate information and earlier round/history details in expandable sections.

Use one obvious primary action for the current task. Keep secondary actions such as reschedule and cancel grouped with the relevant appointment. Keep past information available for reading while preserving existing restrictions on editing completed stages.

Do not add Screening or scheduling for Telephonic. Telephonic keeps its existing assessment/notes and progression controls.

## 3. Interview scheduling flow

Candidate → Schedule interview → Review details → Save → Updated appointment visible.

Reuse the current scheduling form from recruitment and the calendar:
- Prefill the candidate and opening from the place the user started.
- Show the eligible round clearly; preserve existing round restrictions.
- Group interviewer, date/time and duration together.
- Group interview mode and location/meeting details together.
- Label Asia/Kolkata clearly using the current timezone behaviour.
- Keep the entered values when validation or an existing conflict check fails.
- Show a specific error beside the relevant field, with a clear retry action.
- After save, close the form and refresh the existing candidate and calendar views.

Rescheduling opens the same form with the existing appointment values and the existing reason field. Clearly distinguish Schedule interview from Reschedule interview. Preserve the current backend conflict checks, permissions and history behaviour.

## 4. Interview management and feedback

Keep the current Interview Calendar with List and Month views. Group the existing search and filters in one compact toolbar. Show candidate, opening, round, date/time, interviewer and status consistently.

Keep actions attached to the correct appointment:
- Scheduled: view details, reschedule, cancel and permitted outcome updates.
- Completed without feedback: submit feedback.
- Feedback draft: continue editing the draft.
- Submitted feedback: read the result and use existing permitted correction controls.

Present the current appointment and feedback in one readable section or dialog. Reuse the existing feedback fields, draft saving and submission logic. Clearly distinguish Save draft from Submit feedback. Keep interview attendance/status separate from the candidate's hiring decision.

Use the existing history filters and data. Keep previous appointment and feedback details readable without introducing another history system. Do not infer completion or no-show solely because the scheduled time has passed.

### Shortlist, interviewer notice and offer history

Add a Shortlist view to the candidate pipeline for applications marked `SHORTLISTED`, meaning they are selected to proceed to interviews. Show candidate contact, opening, qualification, experience, current stage and shortlist status in a searchable, paginated grid that opens the existing candidate details.

When an interview is scheduled for an assigned interviewer, create an in-app `INTERVIEW` notification with the candidate, opening, round and Asia/Kolkata time. Do this for both a new scheduled application and an interview scheduled from an existing candidate. Rescheduling sends a notice to the currently assigned interviewer.

Record each reschedule's previous and updated date/time, round, interviewer, location, reason and acting user in the existing audit log. Show the count and an expandable dated change log on the interview card/details. Record offer and joining status changes in the same audit log and show a count plus the dated status history in the candidate's Offer and Joining views. Do not include compensation values in history responses.

### Previous-round feedback on the scheduled candidate card

For the authorised interviewer assigned to the next round, show a read-only Previous round feedback section directly in the scheduled candidate card. Include the prior round name, submitted feedback, score/recommendation where recorded, reviewer name and submission date. Show a short preview with an Expand feedback control for longer notes so the interviewer can prepare without navigating away.

Use feedback from the immediately preceding completed applicable round for the same candidate application/opening. When several appointments exist in that round, use the latest submitted feedback belonging to a completed appointment and identify that appointment/date clearly. Do not substitute a current/future round or another application with the same contact details. If the previous round has no submitted feedback, show Previous round feedback not available; drafts remain private. For the first round show No previous round.

Apply server-side candidate/interview access checks. Assignment to the scheduled next round may grant read access to this prior submitted interview feedback only within the existing recruitment permission boundary; it must not expose private drafts, restricted compensation or unrelated candidate records. The next interviewer cannot edit previous-round feedback. Reuse existing interview/feedback records; no external integration or new scoring system is needed.

## 5. Mobile and accessibility

Stack form fields on narrow screens. Keep candidate name, stage, next action and interview time visible without horizontal scrolling. Keep labels, validation messages and button wording consistent across recruitment and calendar. Use readable status text alongside colour; support keyboard focus and preserve entered information on failure.

## Implementation order

1. Clean up recruitment navigation, opening context, candidate cards and candidate details layout.
2. Organise the existing schedule/reschedule form and its entry points.
3. Align appointment details, status actions and feedback presentation across candidate and calendar views.
4. Check mobile layouts and test the existing flow end to end.

Primary files: RecruitmentPage.tsx, CandidatePipeline.tsx, CandidateStageControls.tsx, InterviewCalendarPage.tsx and ScheduleInterviewModal.tsx. Reuse current API and model contracts; any backend change needed to resolve a demonstrated bug should be identified separately before expanding scope.

## Acceptance checks

- Selecting an opening, adding an application and returning from a candidate preserves useful context.
- Resume autofill stays editable; required fields are clear; notice period can remain blank.
- Scheduling and rescheduling work from the existing entry points with consistent labels and preserved input on failure.
- Current backend conflict checks and permission checks still apply.
- Status updates, feedback draft/save/submit and next-stage actions refresh the relevant views.
- The displayed actions match the existing appointment/feedback state, without duplicate or misleading primary buttons.
- Earlier round details remain readable; completed-stage editing rules stay enforced.
- The assigned next-round interviewer sees the correct previous-round submitted feedback on the scheduled candidate card, with reviewer, round and date; long feedback expands in place.
- Shortlist shows only applications selected to proceed to interviews and retains opening/search context when opening a candidate.
- The assigned interviewer receives an in-app notification for new and rescheduled appointments.
- Interview history reports reschedule counts and old/new appointment details; offer history reports dated status changes without exposing salary.
- Verify first-round/no-feedback states, multiple appointments, separate applications for the same person and denied access for unauthorised users; drafts and restricted compensation are never included.
- List and Month remain available; Week, Screening and Telephonic scheduling remain absent.
- The core flow works on a narrow mobile viewport and with keyboard navigation.

## Research retained

The earlier research informs this smaller UI plan: NN/g recommends supporting finding records, inspecting/editing them and taking action; W3C recommends concise accessible form errors. These principles can be applied using the existing portal components.

- https://www.nngroup.com/articles/data-tables/
- https://www.w3.org/WAI/tutorials/forms/notifications/

The earlier independent review concerned the broader proposal. This revised document does not claim formal design/engineering review completion or implementation validation.

## Implementation verification — 15 October 2026

Implemented the scoped UI organisation, shared appointment/feedback panel, scheduled-card previous-round feedback, shortlist grid, interviewer notifications, reschedule logs, offer status history, grouping/validation in scheduling, mobile stage selection and preserved navigation context. Previous feedback is projected from already authorised candidate queries using an explicit field list and reviewer-name lookup; appointment and offer history reuse the existing audit log, with compensation values excluded; no new schema or external integration was introduced.

Verification: 24 focused client tests, four server projection tests and one complete API journey passed. The API journey ran against an isolated local database and covered schedule/reschedule history, feedback draft/submission, next-round feedback visibility, read-only manager access, compensation redaction, unauthorised access and booking conflicts. TypeScript checks and the production client build passed. Live browser checks covered the scheduling form, previous-feedback display and mobile stage → candidate → back navigation.
