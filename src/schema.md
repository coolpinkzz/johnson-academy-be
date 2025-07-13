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
  classes: [{ 
    classId: ObjectId,
  }],
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

### 5. Student Channel  
```javascript
{
  _id: ObjectId,
  studentId: ObjectId,
  classId: ObjectId,  
  chapterProgress: [{
    chapterId: ObjectId, 
    status: { type: String, enum: ['Completed', 'In Progress', 'Start', 'Upcoming'] },
    remark: String,
    score: Number,
    startDate: Date,
    endDate: Date,
    dateTakenToComplete: Number, 
  }],
  createdAt: Date,
  updatedAt: Date,
}
```