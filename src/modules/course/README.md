# Course Module

This module handles course management for the Johnson Academy backend system.

## Overview

The course module provides functionality to create, read, update, and delete courses. It also supports managing chapters within courses and filtering courses by their allowed course types.

## Schema

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  chapters: [ObjectId], // References to Chapter documents
  allowedCourses: [{ type: String, enum: ["Theory", "Technical", "Learning"] }],
  createdAt: Date,
  updatedAt: Date,
}
```

## Features

- **CRUD Operations**: Create, read, update, and delete courses
- **Chapter Management**: Add and remove chapters from courses
- **Course Type Filtering**: Filter courses by allowed course types (Theory, Technical, Learning)
- **Pagination**: Support for paginated course listings
- **Validation**: Comprehensive input validation using Joi
- **Authentication**: Role-based access control

## API Endpoints

### Base Path: `/v1/courses`

#### GET `/courses`
- **Description**: Get all courses with pagination and filtering
- **Query Parameters**:
  - `name`: Filter by course name
  - `allowedCourses`: Filter by course type (Theory, Technical, Learning)
  - `sortBy`: Sort field (e.g., `name:asc`)
  - `limit`: Number of results per page (default: 10)
  - `page`: Page number (default: 1)
- **Permissions**: `getCourses`

#### POST `/courses`
- **Description**: Create a new course
- **Body**:
  ```json
  {
    "name": "Course Name",
    "description": "Course Description",
    "allowedCourses": ["Theory", "Technical"]
  }
  ```
- **Permissions**: `manageCourses`

#### GET `/courses/:courseId`
- **Description**: Get a specific course by ID
- **Permissions**: `getCourses`

#### PATCH `/courses/:courseId`
- **Description**: Update a course
- **Body**: Any combination of course fields
- **Permissions**: `manageCourses`

#### DELETE `/courses/:courseId`
- **Description**: Delete a course
- **Permissions**: `manageCourses`

#### GET `/courses/allowed-course`
- **Description**: Get courses by allowed course type
- **Query Parameters**:
  - `allowedCourse`: Course type (Theory, Technical, Learning)
- **Permissions**: `getCourses`

#### GET `/courses/with-chapters`
- **Description**: Get all courses with populated chapter data
- **Permissions**: `getCourses`

#### POST `/courses/:courseId/chapters/:chapterId`
- **Description**: Add a chapter to a course
- **Permissions**: `manageCourses`

#### DELETE `/courses/:courseId/chapters/:chapterId`
- **Description**: Remove a chapter from a course
- **Permissions**: `manageCourses`

## Service Functions

### Core CRUD Operations
- `createCourse(courseBody)`: Create a new course
- `getCourseById(id)`: Get course by ID with populated chapters
- `updateCourseById(id, updateBody)`: Update course by ID
- `deleteCourseById(id)`: Delete course by ID
- `queryCourses(filter, options)`: Query courses with pagination

### Specialized Operations
- `getCoursesByAllowedCourse(allowedCourse)`: Get courses by type
- `addChapterToCourse(courseId, chapterId)`: Add chapter to course
- `removeChapterFromCourse(courseId, chapterId)`: Remove chapter from course
- `getAllCoursesWithChapters()`: Get all courses with chapter data

## Validation

The module includes comprehensive validation for:
- Course name and description (required)
- Allowed course types (must be one of: Theory, Technical, Learning)
- ObjectId validation for course and chapter IDs
- Query parameter validation for filtering and pagination

## Permissions

- **Admin**: Full access to all course operations
- **Teacher**: Can create, update, delete, and view courses
- **Student**: Can view courses only

## Error Handling

The module provides proper error handling for:
- Course not found (404)
- Invalid input data (400)
- Duplicate chapter assignments (400)
- Unauthorized access (401/403)

## Testing

Run the course module tests:
```bash
npm test -- --testPathPattern=course.test.ts
```

## Dependencies

- **Mongoose**: Database operations
- **Joi**: Input validation
- **Express**: HTTP routing
- **Jest**: Testing framework 