# Gradebook System Documentation

## System Overview
A Next.js application that manages teacher gradebooks with Google Classroom integration. The system uses:
- Supabase for database
- NextAuth.js for authentication
- Google Classroom API for integration
- TypeScript for type safety
- Tailwind CSS with Shadcn/UI components

## Core Features

### 1. Gradebook Management
- **Calendar View**
  - Weekly/Monthly toggle
  - Student birthday tracking
  - Assignment date visualization
  - Todo list with assignment tags

- **Assignment Management**
  - Cards show assignment details
  - Filterable by subject (Math 8/Algebra I)
  - Sortable by date
  - Groupable by type (Daily/Assessment)
  - Color coding by subject or type
  - Drag-and-drop reordering

- **Grade Entry**
  - Per-period grade input
  - Extra points system
  - Auto-tagging for retests (<70 on assessments)
  - DMAC score import functionality
  - Batch grade saving

### 2. Student Tracking
- **Organization**
  - Students grouped by periods
  - Special handling for SPED classes
  - Birthday calendar integration
  - Search by name or ID

- **Tagging System**
  - Absent
  - Late
  - Incomplete
  - Retest (automatically triggered)
  - Todo list generation from tags

### 3. Google Classroom Integration
- **Course Setup**
  - Period mapping
  - Student roster matching
  - Auto-matching by name similarity
  - Manual student mapping override

- **Data Sync**
  - Assignment import
  - Grade synchronization
  - Student roster updates

### Google Classroom Grade Sync
- **API Endpoint**: `/api/classroom/grades/sync`
  - Handles grade synchronization with Google Classroom
  - Supports both draft and assigned grades
  - Validates request parameters
  - Requires authentication
  - Uses Google Classroom API v1

- **Grade Sync Flow**:
  1. Validate request parameters
  2. Check user authentication
  3. Call Google Classroom API
  4. Update local database
  5. Return sync status

- **Required Permissions**:
  - `https://www.googleapis.com/auth/classroom.coursework.students`
  - `https://www.googleapis.com/auth/classroom.coursework.me`

## Database Structure

### Primary Tables
1. **students**
   - Stores student records with periods
   - Tracks birthdays and Google linkages
   - Indexed for efficient period lookups

2. **assignments**
   - Maintains assignment details
   - Supports multiple periods per assignment
   - Links to Google Classroom assignments

3. **grades**
   - Records student grades
   - Handles extra points
   - Tracks Google submission sync

4. **assignment_tags**
   - Manages student status flags
   - Links assignments to students
   - Types: absent, late, incomplete, retest

### Integration Tables
5. **course_mappings**
   - Links Google courses to periods
   - Tracks setup completion
   - Maintains subject associations

6. **student_mappings**
   - Connects Google and local students
   - Preserves email mappings
   - Period-specific assignments

## User Interface Components

### Navigation
- Top-level tabs for Gradebook/Google Classroom
- Period selection via URL parameters
- Persistent layout with container structure

### Gradebook Layout
1. **Left Sidebar**
   - Collapsible calendar
   - Birthday list
   - Todo list from tags

2. **Main Content**
   - Assignment cards grid
   - Two-column or grouped layout
   - Expanding grade entry panels

3. **Grade Entry**
   - Student list with search
   - Quick-action tag buttons
   - Grade/extra points inputs
   - Total calculation display

### Google Classroom Layout
1. **Header**
   - Authentication status
   - Login/Logout button
   - Course refresh button

2. **Course Grid**
   - Card per Google Classroom course
   - Course name and section
   - Setup status indicator
   - Two states:
     * Not Set Up: Shows setup button
     * Set Up: Shows period mapping and options

3. **Course Setup Dialog**
   - Period selection with SPED indicators
   - Subject selection (Math 8/Algebra I)
   - Student roster matching:
     * Auto-matching by name similarity
     * Manual override options
     * Match status indicators
   - Setup completion tracking

4. **Assignment Import**
   - Assignment list from Google Classroom
   - Period selection for import
   - Grade sync status
   - Last sync timestamp

5. **Student Sync Panel**
   - Roster comparison
   - New student detection
   - Email mapping display
   - Sync status indicators

## Key Workflows

### 1. Assignment Creation
1. Select date from calendar
2. Enter assignment details
   - Name
   - Type (Daily/Assessment)
   - Subject
   - Periods
3. Auto-generates clean URL-safe ID
4. Creates assignment record
5. Initializes grade placeholders

### 2. Grade Management
1. Expand assignment card
2. Select period tab
3. Enter grades via:
   - Manual input
   - DMAC import
   - Google Classroom sync
4. Add extra points if needed
5. Apply status tags
6. Save changes to database

### 3. Google Classroom Setup
1. Select course from list
2. Choose matching period
3. Auto-match students
4. Review/adjust matches
5. Complete setup
6. Enable assignment import

## Security & Configuration
- Google OAuth credentials in .env
- Supabase connection details
- NextAuth configuration
- Protected API routes

## Performance Considerations
- Indexed database queries
- Optimized student lookups
- Efficient grade updates
- Cached period data

## Future Enhancements
1. Batch assignment operations
2. Grade analytics
3. Enhanced report exports
4. Parent portal integration
5. Advanced filtering options

## Maintenance Notes
- Regular backup tables
- Migration management
- API rate limiting
- Cache invalidation

## Key Files Structure

### Core Components
- `/src/components/GradeBook.tsx` - Main gradebook interface with calendar, assignments, and grade entry
- `/src/components/GradebookTable.tsx` - Grid view of students and grades
- `/src/components/CourseSetupDialog.tsx` - Google Classroom course mapping and student matching
- `/src/components/Navigation.tsx` - Top-level navigation between Gradebook and Google Classroom
- `/src/components/PeriodSelector.tsx` - Dynamic period selection component that:
  - Fetches available periods from Supabase
  - Handles SPED class indicators
  - Provides navigation between periods
  - Maintains URL parameters for routing

### Pages
- `/src/app/layout.tsx` - Root layout with navigation and providers
- `/src/app/gradebook/page.tsx` - Main gradebook page with period-specific views
- `/src/app/classroom/page.tsx` - Google Classroom integration page

### Data & Types
- `/src/types/gradebook.ts` - TypeScript definitions for core entities
- `/src/types/next-auth.d.ts` - Authentication type extensions
- `/src/lib/supabaseConfig.ts` - Database connection configuration

### API Routes
- `/src/app/api/classroom/[...routes]/route.ts` - Google Classroom API endpoints
- `/src/app/api/grades/route.ts` - Grade management endpoints
- `/src/app/api/students/route.ts` - Student data endpoints

### Configuration
- `/components.json` - Shadcn/UI component configuration
- `/next.config.ts` - Next.js configuration
- `/tailwind.config.ts` - Styling configuration
- `/.env.local` - Environment variables and secrets

### Database
- `/supabase/migrations/` - Database schema evolution
- `/supabase/config.toml` - Supabase configuration
- `/supabase/queries/` - Stored procedures and complex queries

## Version Control Notes
- Use `git stash` to temporarily store local changes
- Configure rebase strategy for pulls: `git config pull.rebase true`
- Handle divergent branches by preserving local work before syncing
- Maintain backup files for critical components
- Workflow for pushing local changes:
  1. Commit local changes first
  2. Pull with rebase to preserve commit history
  3. Resolve any conflicts
  4. Push to remote branch

