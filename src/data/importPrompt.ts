export const SYLLABI_IMPORT_PROMPT = `I am going to give you information about my college courses, including my syllabus, course schedule, assignment dates, exam dates, readings, projects, and other academic deadlines.

Organize ALL of the information into the exact format below.

Do not leave out any assignments, exams, quizzes, projects, readings, presentations, or important academic dates.

Do not invent or assume information. If something is not provided, write "Unknown."

For recurring classes, include the meeting days, start time, end time, and location if available.

Use the following format (keep the colons and section headers exactly):

COURSE:
Course Code:
Course Name:
Professor:
Semester:

CLASS SCHEDULE:
Day:
Start Time:
End Time:
Location:

(Repeat Day / Start Time / End Time / Location for each meeting day.)

ACADEMIC EVENTS:

1.
Title:
Type: [Assignment / Homework / Quiz / Exam / Project / Reading / Presentation / Class Meeting / Other]
Date:
Time:
Description:

2.
Title:
Type:
Date:
Time:
Description:

3.
Title:
Type:
Date:
Time:
Description:

Continue until EVERY academic event from the provided information has been included.

IMPORTANT:

* Include recurring class meetings.
* Include every deadline listed in the syllabus.
* Keep dates exact.
* Keep times exact when provided.
* Do not create information that is not present.
* Separate each course clearly.
* Start EVERY course with a line that says exactly "COURSE:" (including the 2nd, 3rd, 4th, and 5th courses).
* Preserve the course code for every event.
* Use the semester/year provided.
* If a deadline has no specific time, write "Unknown."
* If an event has a date range, preserve the full date range.

At the end, provide a section called:

CALENDAR SUMMARY

Total Courses:
Total Class Meetings:
Total Assignments:
Total Exams:
Total Quizzes:
Total Projects:
Total Readings:
Total Other Events:

Here is my course information:

[PASTE SYLLABUS AND COURSE SCHEDULE HERE]`;
