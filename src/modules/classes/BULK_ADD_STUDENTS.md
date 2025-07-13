# Bulk Add Students to Class API

This document describes the new API endpoint for bulk adding students to a class.

## Endpoint

```
POST /v1/classes/:classesId/students/bulk-add
```

## Description

This endpoint allows administrators to bulk add multiple students to a specific class. The operation will:

- Validate that the class exists
- Validate that all provided student IDs exist and are valid students
- Check for duplicate students (students already enrolled in the class)
- Add only new students to the class (duplicates are ignored)
- Return the updated class with all students

## Authentication

- **Required**: Bearer token with admin privileges
- **Middleware**: `authMiddleware('manageClasses')`

## Request Parameters

### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| classesId | string | Yes | The ID of the class to add students to |

### Request Body

```json
{
  "studentIds": ["studentId1", "studentId2", "studentId3"]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| studentIds | array of strings | Yes | Array of student IDs to add to the class |

## Response

### Success Response (200 OK)

```json
{
  "id": "classId",
  "name": "Class Name",
  "teacherId": "teacherId",
  "courseId": "courseId",
  "students": ["studentId1", "studentId2", "studentId3", "existingStudentId"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

### Error Responses

#### 400 Bad Request
- Invalid request body format
- Empty studentIds array
- All students are already enrolled in the class

#### 403 Forbidden
- User is not an admin

#### 404 Not Found
- Class does not exist
- One or more students do not exist or are not valid students

## Example Usage

### cURL

```bash
curl -X POST \
  http://localhost:3000/v1/classes/64f1a2b3c4d5e6f7g8h9i0j1/students/bulk-add \
  -H 'Authorization: Bearer YOUR_ADMIN_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "studentIds": [
      "64f1a2b3c4d5e6f7g8h9i0j2",
      "64f1a2b3c4d5e6f7g8h9i0j3",
      "64f1a2b3c4d5e6f7g8h9i0j4"
    ]
  }'
```

### JavaScript (fetch)

```javascript
const response = await fetch('/v1/classes/64f1a2b3c4d5e6f7g8h9i0j1/students/bulk-add', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_ADMIN_TOKEN',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    studentIds: [
      '64f1a2b3c4d5e6f7g8h9i0j2',
      '64f1a2b3c4d5e6f7g8h9i0j3',
      '64f1a2b3c4d5e6f7g8h9i0j4'
    ]
  })
});

const result = await response.json();
```

## Notes

- Only administrators can use this endpoint
- The operation uses MongoDB's `$addToSet` operator to prevent duplicate students
- If all provided students are already enrolled, the API returns a 400 error
- The response includes all students in the class (both existing and newly added)
- Student IDs must be valid MongoDB ObjectIds
- All students must have the role 'student' in the system 