# Gradebook System Documentation

This project is a comprehensive gradebook application designed for teachers to manage student data, track academic performance, and analyze assessment results.

## Core Components

- Student management
- Grade tracking
- Assessment analysis
- Benchmark reporting
- Standards-based grading

## Key Features

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

## Implementation Notes

- The application uses Next.js with TypeScript for type safety
- UI components are built with a custom component library using Tailwind CSS
- Authentication is handled through Supabase Auth
- Application state is managed with React hooks
- Error handling implemented to ensure data integrity when processing student performance metrics
