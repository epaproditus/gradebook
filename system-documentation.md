# Gradebook System Documentation

This project is a comprehensive gradebook application designed for teachers to manage student data, track academic performance, and analyze assessment results.

## Core Components

- Student management
- Grade tracking
- Assessment analysis
- Benchmark reporting
- Standards-based grading

## Key Features

### Grade Import/Export Functionality

The system provides robust grade import and export capabilities:

- **ImportScoresDialog**: Allows importing student scores from CSV files (including DMAC exports)
  - Uses a controlled dialog pattern with explicit state management
  - Separates UI event handling from dialog control for reliable operation
  - Uses icon-based interface with tooltips for improved UI consistency
  - Automatically detects student ID and score columns in various CSV formats
  - Maps imported grades to the correct students across periods
  - Preselects the current assignment to streamline the workflow
  - Validates data before importing to prevent errors
  
- **GradeExportDialog**: Enables exporting grades in CSV format
  - Implements the same controlled dialog pattern as the import dialog
  - Uses explicit state management to prevent event propagation issues
  - Supports selecting specific assignments and class periods
  - Offers option to merge all periods into a single export file
  - Creates properly formatted CSV files with student ID, name, and grades
  - Handles special characters in student names with proper CSV escaping

### Assignment Card Interface

The assignment card interface provides a comprehensive view of each assignment with several interactive features:

- **Expandable/Collapsible Cards**: Cards can be expanded to show detailed grade information
- **Action Buttons**: 
  - Copy button: Creates a duplicate of an assignment with all its grades
  - Import button: Opens the import dialog to bulk import grades from CSV
  - Export button: Opens the export dialog to export grades to CSV
  - Delete button: Removes an assignment after confirmation
  - All buttons implement proper event propagation handling to avoid unintended card toggling

- **Card Header**: Shows assignment name, date, subject, and status indicator
- **Editing Mode**: Allows inline editing of assignment details
- **Grade Entry Grid**: Shows a table of students with grade input fields when expanded

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

## Implementation Notes

- The application uses Next.js with TypeScript for type safety
- UI components are built with a custom component library using Tailwind CSS
- Authentication is handled through Supabase Auth
- Application state is managed with React hooks
- Error handling implemented to ensure data integrity when processing student performance metrics
