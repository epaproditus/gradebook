# Gradebook Project Documentation

## Database Schema

### Core Tables

1. **students**
   - `id`: bigint (PK, auto-increment)
   - `name`: text (required)
   - `class_period`: text (required, default '1')
   - `birthday`: date (optional)
   - `google_id`: text (optional)
   - `google_email`: text (optional)
   - `period`: text (optional)
   Indexes: class_period, google_id, google_email

2. **assignments**
   - `id`: uuid (PK)
   - `name`: text (required)
   - `date`: date (required)
   - `type`: text (required)
   - `periods`: text[] (required)
   - `subject`: text (default 'assignment')
   - `google_classroom_id`: text (optional)
   - `google_classroom_link`: text (optional)
   - `max_points`: integer (default 100)
   Indexes: date, google_classroom_id

3. **grades**
   - `id`: uuid (PK)
   - `student_id`: text (required)
   - `period`: text (required)
   - `grade`: text (required)
   - `assignment_id`: uuid (FK to assignments)
   - `extra_points`: smallint (default 0)
   - `google_submission_id`: text (optional)
   - `last_synced`: timestamp
   Indexes: student_id, google_submission_id

### Google Classroom Integration

4. **course_mappings**
   - `id`: uuid (PK)
   - `google_course_id`: text (required)
   - `period`: text (required, default '1')
   - `subject`: text (required)
   - `setup_completed`: boolean (default false)
   - `setup_completed_at`: timestamp
   Unique constraint: (google_course_id, period)

5. **student_mappings**
   - `id`: uuid (PK)
   - `google_id`: text (required, unique)
   - `google_email`: text (optional)
   - `student_id`: bigint (FK to students)
   - `period`: text (required, default '1')
   Indexes: google_id, student_id, period

### Tag System

6. **assignment_tags**
   - `id`: uuid (PK)
   - `assignment_id`: text (optional)
   - `student_id`: bigint (FK to students)
   - `period`: text (required)
   - `tag_type`: text (required)
   Indexes: assignment_id, student_id, composite(assignment_id, student_id, period)

7. **absences**
   - `id`: uuid (PK)
   - `assignment_id`: text (optional)
   - `student_id`: text (required)
   - `period`: text (required)

8. **settings**
   - `id`: uuid (PK)
   - `user_id`: uuid (FK)
   - `daily_color`: text (default '#f0f9ff')
   - `assessment_color`: text (default '#fff1f2')
   - `hidden_periods`: text[]

## Key Relationships
- Students have assignments through grades
- Google Classroom mappings connect courses to periods
- Student mappings link Google Classroom students to local students
- Assignment tags track metadata like absences, retests, etc.

## Indexes and Performance
- Optimized queries for period-based lookups
- Fast student search by ID or Google info
- Efficient assignment filtering by date
- Quick tag lookup for todo lists

## Backup Tables
Note: Backup tables exist for:
- assignments_backup
- student_mappings_backup
These maintain the same structure as their primary tables.

## Essential Files to Review
1. **Core Features**:
   - `/src/components/GradeBook.tsx` - Main gradebook implementation
   - `/src/components/CourseSetupDialog.tsx` - Google Classroom integration
   - `/src/types/gradebook.ts` - Type definitions

2. **Database Models**:
   - `/prisma/schema.prisma` - Database schema
   - `/supabase/migrations/` - Migration history

3. **API Integration**:
   - `/src/pages/api/classroom/` - Google Classroom API endpoints
   - `/src/lib/supabaseConfig.ts` - Database configuration

## Key Features
1. **Gradebook**:
   - Birthday calendar with todo list
   - Assignment cards with filtering/sorting
   - Grade entry by period
   - Student tags (absent, late, retest)

2. **Google Classroom Integration**:
   - Course setup and mapping
   - Student roster synchronization
   - Assignment import

## Data Models
[Request database schema dump for complete structure]

## Authentication
- Google OAuth for Classroom API
- NextAuth.js configuration in `.env.local`

## Questions to Answer
1. What's the complete database schema?
2. How are assignments organized and tagged?
3. What's the student-period relationship structure?
4. How are Google Classroom mappings stored?

## Next Steps
1. Review Supabase database schema
2. Examine migration files
3. Check API route implementations
4. Review type definitions

