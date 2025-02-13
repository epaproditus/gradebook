This document introduces grading concepts relevant to the Classroom API.

See the grade and track assignments article to learn about the teacher grading journeys in the Google Classroom app.

Coursework and submissions
In Google Classroom, students turn in StudentSubmissions for the CourseWork assignments in their Course. CourseWork can be graded or ungraded. If a CourseWork is graded, it has a maxPoints value which represents how many total points the assignment is worth. If maxPoints is zero or unspecified, the assignment is ungraded.

For graded assignments, teachers set a draftGrade grade on the StudentSubmission before they return it to the student. When the submission is returned in the Classroom app, an assignedGrade is set automatically on the StudentSubmission, with the same value as the current draftGrade. Developers can set both of these fields, and must emulate the behavior of the Classroom app. For example, an assignedGrade can't be set without a draftGrade. Both fields are represented with decimals, and if unset, imply that the teacher has not yet set the corresponding grade. See create and manage grades for code examples of reading, setting, and returning grades.

Students can submit multiple submissions to the same CourseWork assignment, and submission state and grade history are tracked in StudentSubmission.submissionHistory.

Late, excused, and missing coursework
When CourseWork items are assigned, placeholder StudentSubmissions are created for each student, even if the student hasn't interacted with the corresponding assignment. Teachers can set a dueDate on the CourseWork, and associated StudentSubmissions are marked with a late field (set to true) if the student does not turn in the assignment before the date. Teachers can also disable late submissions with a setting in the Classroom app.

Additionally, StudentSubmissions that aren't submitted before dueDate are annotated in the Classroom gradebook as being missing. Teachers can also mark submissions as missing manually in the Classroom app. Missing assignments are automatically given a draftGrade, which is customizable by the teacher but defaults to 0.

Missing submissions can be marked as complete or excused by the teacher. StudentSubmissions marked as complete have their default draftGrade field removed until the teacher sets a new one manually. StudentSubmissions marked as excused are removed from overall score calculations, including grading periods.

Note: The complete, missing, and excused states of StudentSubmissions are not distinctly identifiable in the API. If this behavior would affect your application, leave feedback in this issue describing the impact on your use case.
See the grade and return an assignment help article to learn more about how submissions can be handled by teachers.

Overall grade and grading systems
Classroom supports multiple grading systems for calculating students' overall grades in course. Overall grades can be calculated directly from total points, weighted by category, or not calculated at all.

See the set up grading article to learn about the different grading systems with examples.

Some key points:

The Course resource has a gradebookSettings object with details about the course grade settings.
calculationType specifies the calculation method for the course.
displaySettings specifies who can see overall grades in the Classroom app. It's a best practice to respect this in your own application when possible. For example, if students can't see their overall grade in Classroom, don't show it to them in your app.
gradeCategories contains a list of the grading categories configured for the course, including their display names, weighting percentage, and default points for corresponding assignments.
If a course uses weighted grading, you might need to normalize the weights in scenarios where a category is not present. For example, if category weights were 20% for homework, 10% for practice problems, and 70% for quizzes, but no practice problems were actually present, Classroom adjusts the weights to ~22% for homework and ~78% for quizzes when calculating overall grades. If you intend to mirror Classroom overall grades in your application, you'd need to do the same.
Grading periods
Teachers can group CourseWork assignments in a course into distinct date ranges called grading periods. The grading periods can be used to filter coursework in the gradebook view and create distinct buckets for overall grade calculations.

For example, a teacher might create "spring" and "fall" semester grading periods. The overall grade score for the spring period would only include StudentSubmissions due in the spring date range.

The grading system set for the course extends to the grading periods. So if the aforementioned spring and fall example grading periods were set on a course that used weighted grading categories, there would ultimately be three sets of overall grades for students:

The overall grade for all assignments in the course.
The overall grade for all the assignments in the spring date range.
The overall grade for all the assignments in the fall date range.
All three would calculate the overall grade with weighted categories.

See the grading periods announcement to get an overview of the feature.

Developer Preview: API support for grading periods is available as part of the Google Workspace Developer Preview Program, which grants early access to certain features.
Grading periods extend CourseWork with a gradingPeriodId which identifies the grading period that the assignment falls into.

See the grading periods API guide to learn how to read and manage grading periods with the API.

Rubrics
Teachers can create and associate Rubrics with CourseWork assignments, and use these rubrics as a guide when grading corresponding StudentSubmissions.

See the rubrics article to learn how teachers can use rubrics in Classroom.

Developer Preview: API support for rubrics is available as part of the Google Workspace Developer Preview Program, which grants early access to certain features.
Rubrics extend the StudentSubmissions resource with additional fields:

rubricId identifies the rubric that corresponds to the submission's CourseWork.
draftRubricGrades represents the criteria and placeholder scores the teacher has drafted before returning the submission to the student.
assignedRubricGrades represents the criteria and scores the student receives after the teacher returns the submission.
See the rubrics API guide for how to manage rubrics and read related grades with the API.

Grading scales
Classroom supports customizable grading scales, for example, allowing teachers to translate numeric grades into letter grades. These settings and corresponding data aren't available in the API.