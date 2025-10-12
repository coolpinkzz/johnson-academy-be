# Student Progress Module

This module handles student progress tracking for the Johnson Academy backend system. It automatically creates progress records when students are added to classes and provides comprehensive tracking of module completion status.

## Overview

The student progress module provides functionality to:

- Automatically create progress records when students are added to classes
- Track individual module progress (completed, in-progress, upcoming)
- Calculate overall progress percentages
- Generate progress statistics for classes and courses
- Update module status with scores

## Key Features

### 1. Automatic Progress Creation

- Progress records are automatically created when students are added to classes
- Each record includes all modules from the course's syllabi
- Initial status is set to 'upcoming' for all modules

### 2. Progress Calculation

- Progress percentage (1-100) is calculated based on completed modules
- Tracks total, completed, in-progress, and upcoming modules
- Automatic recalculation when module status changes

### 3. Module Status Tracking

- **Completed**: Module finished with optional score and completion date
- **In Progress**: Module started with start date tracking
- **Upcoming**: Module not yet started

### 4. Comprehensive Statistics

- Class-level progress statistics
- Course-level progress statistics
- Individual student progress tracking

## Data Model

```typescript
interface IStudentProgress {
  studentId: mongoose.Types.ObjectId; // Reference to User (student)
  classId: mongoose.Types.ObjectId; // Reference to Classes
  courseId: mongoose.Types.ObjectId; // Reference to Course
  progress: number; // Percentage 1-100
  syllabusProgress: ISyllabusProgress[]; // Progress for each syllabus
  totalModules: number; // Total modules across all syllabi
  completedModules: number; // Number of completed modules
  inProgressModules: number; // Number of in-progress modules
  upcomingModules: number; // Number of upcoming modules
}

interface ISyllabusProgress {
  syllabusId: mongoose.Types.ObjectId; // Reference to Syllabus
  modules: IModuleProgress[]; // Progress for each module
}

interface IModuleProgress {
  moduleId: mongoose.Types.ObjectId; // Reference to Module
  status: 'completed' | 'inprogress' | 'upcoming';
  score?: number; // Score (0-100)
  startDate?: Date; // When module was started
  endDate?: Date; // When module was completed
  dateTakenToComplete?: number; // Days taken to complete
}
```

## API Endpoints

### Base URL: `/v1/student-progress`

#### Create Student Progress

- **POST** `/`
- **Permissions**: `manageStudentProgress`
- **Description**: Manually create a progress record (usually not needed as it's automatic)
- **Body**: Complete student progress object

#### Get All Student Progress (Paginated)

- **GET** `/`
- **Permissions**: `getStudentProgress`
- **Query Parameters**:
  - `studentId`: Filter by student ID
  - `classId`: Filter by class ID
  - `courseId`: Filter by course ID
  - `progress`: Filter by progress percentage
  - `sortBy`: Sort field
  - `limit`: Number of results per page
  - `page`: Page number

#### Get Student Progress by ID

- **GET** `/:studentProgressId`
- **Permissions**: `getStudentProgress`

#### Update Student Progress

- **PATCH** `/:studentProgressId`
- **Permissions**: `manageStudentProgress`
- **Body**: Any combination of progress fields

#### Delete Student Progress

- **DELETE** `/:studentProgressId`
- **Permissions**: `manageStudentProgress`

#### Update Module Progress

- **PATCH** `/:studentProgressId/module`
- **Permissions**: `manageStudentProgress`
- **Body**:

```json
{
  "moduleId": "module_id",
  "syllabusId": "syllabus_id",
  "status": "completed|inprogress|upcoming",
  "score": 85
}
```

#### Get Student Progress by Student

- **GET** `/student/:studentId`
- **Permissions**: `getStudentProgress`
- **Description**: Get all progress records for a specific student

#### Get Student Progress by Class

- **GET** `/class/:classId`
- **Permissions**: `getStudentProgress`
- **Description**: Get all progress records for a specific class

#### Get Student Progress by Course

- **GET** `/course/:courseId`
- **Permissions**: `getStudentProgress`
- **Description**: Get all progress records for a specific course

#### Get Student Progress by Student and Class

- **GET** `/student/:studentId/class/:classId`
- **Permissions**: `getStudentProgress`
- **Description**: Get specific progress record for a student in a class

#### Get Class Progress Statistics

- **GET** `/class/:classId/statistics`
- **Permissions**: `getStudentProgress`
- **Response**:

```json
{
  "totalStudents": 25,
  "averageProgress": 67,
  "completedStudents": 5,
  "inProgressStudents": 15,
  "notStartedStudents": 5
}
```

#### Get Course Progress Statistics

- **GET** `/course/:courseId/statistics`
- **Permissions**: `getStudentProgress`
- **Description**: Similar to class statistics but across all classes for a course

## Permissions

- **Admin**: Full access (`manageStudentProgress`, `getStudentProgress`)
- **Teacher**: Read access to their classes (`getStudentProgress`)
- **Student**: Read access to their own progress (`getStudentProgress`)

## Integration with Classes Module

The student progress module is automatically integrated with the classes module:

1. **When creating a class**: Progress records are automatically created for all students in the class
2. **When adding students to a class**: Progress records are automatically created for newly added students
3. **Progress calculation**: Automatically calculates percentages based on module completion

## Usage Examples

### Creating Progress Records (Automatic)

```javascript
// This happens automatically when students are added to classes
const class = await createClasses({
  name: "Advanced Mathematics 101",
  teacherId: teacherId,
  courseId: courseId,
  students: [student1Id, student2Id, student3Id]
});

// Progress records are automatically created for all students
```

### Updating Module Progress

```javascript
// Update a module to completed status
await updateModuleProgress(progressId, {
  moduleId: moduleId,
  syllabusId: syllabusId,
  status: 'completed',
  score: 95,
});
```

### Getting Progress Statistics

```javascript
// Get statistics for a class
const stats = await getClassProgressStatistics(classId);
console.log(`Average progress: ${stats.averageProgress}%`);
```

## Validation

All endpoints include comprehensive validation:

- ObjectId validation for references
- Progress percentage validation (0-100)
- Module status validation
- Score validation (0-100)
- Required field validation

## Error Handling

- **404**: Student progress not found
- **409**: Progress record already exists for student-class combination
- **400**: Invalid data or validation errors
- **403**: Insufficient permissions

## Database Indexes

- Compound index on `{studentId: 1, classId: 1}` with unique constraint
- Ensures one progress record per student per class

## Performance Considerations

- Progress calculation is done asynchronously
- Database indexes optimize queries by student, class, and course
- Pagination support for large datasets
- Populated references for efficient data retrieval
