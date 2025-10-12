# Schema

## Collection

### 1. Users

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  role: { type: String, enum: ['student', 'teacher', 'admin'] },
  password: String,
  classes: [ObjectId],
  courses:[objectId],
  progress: [studentProgressId]
  createdAt: Date,
  updatedAt: Date,
}
```

### 2. Classes

```javascript
{
  _id: ObjectId,
  name: String,
  teacherId: ObjectId,
  courseId: ObjectId,
  students: [ObjectId],
  createdAt: Date,
  updatedAt: Date,
}
```

### 3. Courses

```javascript
{
  _id: ObjectId,
  name: String,
  description: String,
  syllabus: ObjectId,
  allowedCourses: [{ type: String, enum: ["Theroy", "Technical","Learning"]}],
  createdAt: Date,
  updatedAt: Date,
}
```

### Module Model

```javascript
{
    _id: ObjectId,
    syllabusId: ObjectId,
    type: { type: String, enum: ['theory', 'technical', 'learning'] },
    title: String,
    description: String,
    session: Number
    resources: [{
            file: String,
            key: String
    }]
}

```

### 4. Syllabus

```javascript
{
  _id: ObjectId,
  courseId: ObjectId,
  title: String,
  description: String,
  theory: [moduleId],
  technical: [moduleId],
  learning: [moduleId]
  createdAt: Date,
  updatedAt: Date,
}
```

### 5. Student Progress

```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  classId: ObjectId,
  courseId: ObjectId,
  progress: { type: Number, min: 0, max: 100, default: 0 }, // percentage 1-100
  syllabusProgress: [{
    syllabusId: ObjectId,
    modules: [{
      moduleId: ObjectId,
      status: { type: String, enum: ['completed', 'inprogress', 'upcoming'], default: 'upcoming' },
      score: { type: Number, min: 0, max: 100 },
      startDate: Date,
      endDate: Date,
      dateTakenToComplete: { type: Number, min: 0 }, // in days
    }]
  }],
  totalModules: { type: Number, required: true, default: 0 },
  completedModules: { type: Number, required: true, default: 0 },
  inProgressModules: { type: Number, required: true, default: 0 },
  upcomingModules: { type: Number, required: true, default: 0 },
  createdAt: Date,
  updatedAt: Date,
}
```
