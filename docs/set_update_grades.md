Set grades for student submissions
The StudentSubmission resource has two fields to store grades: assignedGrade, which is the grade reported to students, and draftGrade, which is a tentative grade visible only to teachers. These fields are updated using courses.courseWork.studentSubmissions.patch.

`StudentSubmission studentSubmission = null;
try {
  // Updating the draftGrade and assignedGrade fields for the specific student submission.
  StudentSubmission content =
      service
          .courses()
          .courseWork()
          .studentSubmissions()
          .get(courseId, courseWorkId, id)
          .execute();
  content.setAssignedGrade(90.00);
  content.setDraftGrade(80.00);

  // The updated studentSubmission object is returned with the new draftGrade and assignedGrade.
  studentSubmission =
      service
          .courses()
          .courseWork()
          .studentSubmissions()
          .patch(courseId, courseWorkId, id, content)
          .set("updateMask", "draftGrade,assignedGrade")
          .execute();

  /* Prints the updated student submission. */
  System.out.printf(
      "Updated student submission draft grade (%s) and assigned grade (%s).\n",
      studentSubmission.getDraftGrade(), studentSubmission.getAssignedGrade());
} catch (GoogleJsonResponseException e) {
  // TODO (developer) - handle error appropriately
  GoogleJsonError error = e.getDetails();
  if (error.getCode() == 404) {
    System.out.printf(
        "The courseId (%s), courseWorkId (%s), or studentSubmissionId (%s) does "
            + "not exist.\n",
        courseId, courseWorkId, id);
  } else {
    throw e;
  }
} catch (Exception e) {
  throw e;
}
return studentSubmission;`

When working with the Classroom UI, teachers can't assign a grade until they have first saved a draft grade. The assigned grade can then be returned to a student. Your application can grade a student's assignment in one of two ways:

Assign just the draftGrade. This is useful, for example, to let the teacher manually review grades before finalizing them. Students cannot see draft grades.

Assign both the draftGrade and assignedGrade to fully grade an assignment.