# MRT (Monthly Review Test) Module

The MRT module provides comprehensive functionality for managing Monthly Review Test records for students in different classes.

## Features

- **CRUD Operations**: Create, read, update, and delete MRT records
- **Score Management**: Track scores across 5 key areas with automatic total and average calculation
- **Validation**: Comprehensive input validation for all fields
- **Access Control**: Teachers and admins can create/update, while anyone can read
- **Pagination**: Built-in pagination support for listing records
- **Search & Filter**: Filter records by student, class, or month

## Data Model

### Core Fields

| Field                  | Type     | Range              | Description                  |
| ---------------------- | -------- | ------------------ | ---------------------------- |
| `month`                | String   | MM-YYYY or YYYY-MM | Month and year of the review |
| `classId`              | ObjectId | -                  | Reference to the class       |
| `studentId`            | ObjectId | -                  | Reference to the student     |
| `sptAndFileSubmission` | Number   | 0-100              | SPT & File Submission score  |
| `regularity`           | Number   | 0-100              | Regularity score             |
| `learningSpeed`        | Number   | 0-100              | Learning Speed score         |
| `songLearning`         | Number   | 0-100              | Song Learning score          |
| `assignment`           | Number   | 0-100              | Assignment score             |

### Computed Fields

| Field          | Type   | Description                     |
| -------------- | ------ | ------------------------------- |
| `totalScore`   | Number | Sum of all 5 scores (0-500)     |
| `averageScore` | Number | Average of all 5 scores (0-100) |

### Metadata Fields

| Field       | Type     | Description                       |
| ----------- | -------- | --------------------------------- |
| `remarks`   | String   | Optional comments (max 500 chars) |
| `createdBy` | ObjectId | User who created the record       |
| `updatedBy` | ObjectId | User who last updated the record  |
| `createdAt` | Date     | Creation timestamp                |
| `updatedAt` | Date     | Last update timestamp             |

## API Endpoints

### Create MRT Record

```
POST /v1/mrt
Authorization: Bearer <token>
Content-Type: application/json

{
  "month": "12-2024",
  "classId": "class_id_here",
  "studentId": "student_id_here",
  "sptAndFileSubmission": 85,
  "regularity": 90,
  "learningSpeed": 88,
  "songLearning": 92,
  "assignment": 87,
  "remarks": "Good progress this month"
}
```

### Get All MRT Records

```
GET /v1/mrt?page=1&limit=10&sortBy=month&sortOrder=desc
```

### Get MRT by ID

```
GET /v1/mrt/:mrtId
```

### Update MRT Record

```
PATCH /v1/mrt/:mrtId
Authorization: Bearer <token>
Content-Type: application/json

{
  "sptAndFileSubmission": 88,
  "remarks": "Updated remarks"
}
```

### Delete MRT Record

```
DELETE /v1/mrt/:mrtId
Authorization: Bearer <token>
```

### Get MRTs by Student

```
GET /v1/mrt/student/:studentId?page=1&limit=10&sortBy=month&sortOrder=desc
```

### Get MRTs by Class

```
GET /v1/mrt/class/:classId?page=1&limit=10&sortBy=month&sortOrder=asc
```

### Get MRTs by Month

```
GET /v1/mrt/month/:month?page=1&limit=10&sortBy=classId&sortOrder=asc
```

### Get MRT by Student, Class, and Month

```
GET /v1/mrt/student/:studentId/class/:classId/month/:month
```

## Query Parameters

### Pagination

- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Sorting

- `sortBy`: Field to sort by
- `sortOrder`: Sort direction (`asc` or `desc`)

### Filtering

- `month`: Filter by month
- `classId`: Filter by class
- `studentId`: Filter by student

## Access Control

- **Create/Update/Delete**: Teachers and Admins only (requires authentication)
- **Read**: Public access (no authentication required)

## Validation Rules

### Month Format

- Must be in format `MM-YYYY` or `YYYY-MM`
- Examples: `12-2024`, `2024-12`

### Score Validation

- All scores must be integers between 0 and 100
- Scores are automatically validated and calculated

### Unique Constraints

- Only one MRT record per student per class per month
- Attempting to create duplicate records will result in a conflict error

## Business Logic

### Automatic Calculations

- `totalScore`: Sum of all 5 individual scores
- `averageScore`: Rounded average of all 5 scores

### Data Integrity

- Pre-save middleware ensures scores are always calculated
- Compound index prevents duplicate records
- Referential integrity with User and Classes collections

## Error Handling

The module provides comprehensive error handling for:

- Validation errors
- Duplicate records
- Not found records
- Authorization failures
- Invalid data formats

## Usage Examples

### Creating Monthly Reviews

Teachers can create monthly reviews for their students at the end of each month to track progress across different learning areas.

### Progress Tracking

Students and parents can view their monthly progress to understand strengths and areas for improvement.

### Class Performance Analysis

Administrators can analyze class performance by month to identify trends and make informed decisions.

### Report Generation

The data can be used to generate comprehensive reports for stakeholders including parents, teachers, and administrators.
