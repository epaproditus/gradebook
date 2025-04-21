# Gradebook System Documentation

This project is a comprehensive gradebook application designed for teachers to manage student data, track academic performance, and analyze assessment results.

## Core Components

- Student management
- Grade tracking
- Assessment analysis
- Benchmark reporting
- Standards-based grading
- Student deactivation

## Key Features

### Student Management

The system provides comprehensive student management features:

- **Student Records**: Maintain detailed student information
- **Roster Organization**: Group students by class periods
- **Student Deactivation**: Safely remove students while preserving historical data
  - Uses a soft-delete approach by marking students as inactive (`is_active: false`)
  - Updates UI immediately to show the change without requiring page refresh
  - Properly updates local state across all relevant components
  - Provides clear feedback through toast notifications
  - Securely handles database updates with proper error handling

### Grade Import/Export Functionality

The system provides robust grade import and export capabilities:

- **ImportScoresDialog**: Allows importing student scores from CSV files (including DMAC exports)
  - Uses a controlled dialog pattern with explicit state management
  - Separates UI event handling from dialog control for reliable operation
  - Pre-selects the current assignment by default in the assignment dropdown
  - Shows the actual assignment name in the select field rather than just a placeholder
  - Uses icon-based interface with tooltips for improved UI consistency
  - Automatically detects student ID and score columns in various CSV formats
  - Maps imported grades to the correct students across periods
  - Validates data before importing to prevent errors
  
- **BulkImportDialog**: Enables importing multiple assignments from a single spreadsheet
  - Accepts tab-delimited data pasted from spreadsheet applications
  - Automatically detects student ID and name columns
  - Treats each additional column as a separate assignment
  - Handles numeric column headers like "0", "1", "2" as assignment identifiers
  - Automatically filters out non-assignment columns like "Cycle Grade", "Average", "Total"
  - Uses intelligent column detection to differentiate between grade and non-grade columns
  - Allows mapping to existing assignments or creating new ones
  - Supports assigning to multiple class periods in a single operation
  - Shows preview of detected assignments with editable properties
  - Displays count of grades found for each assignment
  - Provides flexible date, type, and name editing before import

- **GradeExportDialog**: Enables exporting grades in CSV format
  - Implements the same controlled dialog pattern as the import dialog
  - Uses explicit state management to prevent event propagation issues
  - Supports selecting specific assignments and class periods
  - Offers option to merge all periods into a single export file
  - Creates properly formatted CSV files with student ID, name, and grades
  - Handles special characters in student names with proper CSV escaping

### Assignment Management Interface

The assignment management interface provides a comprehensive view of each assignment with several interactive features:

- **Expandable/Collapsible Cards**: Cards can be expanded to show detailed grade information
- **Action Buttons**: 
  - Copy button: Creates a duplicate of an assignment with all its grades
  - Import button: Opens the import dialog to bulk import grades from CSV
  - Export button: Opens the export dialog to export grades to CSV
  - Delete button: Removes an assignment after confirmation through a reliable React dialog component
  - All buttons implement proper event propagation handling to avoid unintended card toggling

- **Card Header**: Shows assignment name, date, subject, and status indicator
- **Editing Mode**: Allows inline editing of assignment details
- **Grade Entry Grid**: Shows a table of students with grade input fields when expanded
- **Assignment Deletion**: Implements cascading deletion process to ensure database integrity:
  - **Single Assignment Deletion**: Uses a custom confirmation dialog to ensure reliable deletion process
  - **Bulk Assignment Deletion**: Allows deleting multiple assignments at once through the BulkActionsDialog
  - Both deletion processes handle all foreign key dependencies correctly, including:
    - First deletes records from `assignment_flags` table
    - Then deletes from `assignment_tags` table
    - Deletes from `grades` table
    - Deletes from `google_classroom_links` table
    - Deletes from `extra_points` table
    - Deletes from `assignment_notes` table
    - Finally deletes the assignment records themselves
  - Uses controlled React state for dialog visibility
  - Provides clear feedback through toast notifications
  - Updates local state for immediate UI feedback
  - Shows assignment name in confirmation to help prevent accidental deletion

- **Bulk Actions Dialog**: The system includes a bulk actions dialog accessible from the assignment view:
  - Located in the filter options row next to the Six Weeks selector, Subject filter, and Date filter
  - Appears as a button with a trash icon and "Bulk Actions" label
  - When clicked, opens a dialog showing all assignments with checkboxes
  - Supports selecting multiple assignments for deletion
  - Includes a "Select All" option for quick selection
  - Shows a count of selected assignments
  - Has a scrollable area for browsing assignments when there are many
  - Displays assignment details (date, type, number of periods) for each item
  - Requires confirmation before performing deletion operations
  - Handles cascading deletion properly like single-assignment deletion
  - Only visible in the assignment view mode, not in roster view mode

### TeacherBenchmark Component

The TeacherBenchmark component displays benchmark assessment results in different views:

- **By Student**: Shows student performance grouped by class periods and performance levels
- **By Standard**: Shows standard-by-standard analysis with mastery percentages

Recent Updates:
- Added TEKS (Texas Essential Knowledge and Skills) standard filtering functionality
- Added ability to filter by TEKS category (Algebra vs Regular)
  - Algebra TEKS begin with "A." prefix
  - Regular TEKS begin with numeric prefixes (e.g., "8.")
- Students can be filtered by both class period and specific TEKS standards
- The Standards view shows performance metrics for each selected standard
- Added ability to see highest performing standards and standards needing growth
- Fixed data handling to ensure proper initialization of nested objects in performance grouping

The component uses collapsible sections to manage information density and improve user experience.

### BenchmarkScores Component

Displays detailed benchmark scores for individual students, including:
- Overall performance level
- Standard-by-standard mastery percentages
- Historical performance data

### Tutoring Center (Implemented)

The Tutoring Center feature provides personalized practice for students based on their performance in benchmark assessments:

- **Student-Specific Remediation**: Targets standards where students scored below mastery level
- **Interactive Practice Problems**: Multiple-choice questions with hints and step-by-step solutions
- **Progress Tracking**: Monitors student improvement on specific TEKS standards
- **Adaptive Learning**: Increases problem difficulty as students demonstrate mastery
- **Engagement Features**: Includes achievement streaks and visual progress indicators

Implementation details:
- Problems are generated using a hybrid approach combining SymPy for mathematical precision and AI for context
- Problems are categorized by TEKS standard and difficulty level
- Students can filter practice problems by TEKS category (Algebra vs Regular)
- Progress data is persisted to show improvement over time
- Supports features like hints, detailed solutions, and immediate feedback

Technical documentation for this feature is available in `/docs/tutoring-center-approach.md` with a sample implementation in `/scripts/generate_problems.py`.

### Database Structure

The application uses Supabase with the following main tables:
- `students` - Student personal and academic information
- `benchmark_scores` - Overall benchmark assessment scores
- `benchmark_standards` - Standard-specific performance data
- `assignments` - Assignment information including type, subject, and periods
- `grades` - Student grades for assignments with extra points tracking
- `assignment_tags` - Tags for tracking absences, late work, and retest requirements
- `assignment_flags` - Flags for assignment review notifications
- `assignment_notes` - Notes associated with assignments
- `google_classroom_links` - Connection mappings between assignments and Google Classroom
- `extra_points` - Extra credit points awarded to students

## Implementation Notes

- The application uses Next.js with TypeScript for type safety
- UI components are built with a custom component library using Tailwind CSS
- Authentication is handled through Supabase Auth
- Application state is managed with React hooks
- Error handling implemented to ensure data integrity when processing student performance metrics
