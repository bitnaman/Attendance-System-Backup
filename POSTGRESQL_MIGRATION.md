# 🗄️ POSTGRESQL MIGRATION GUIDE
# Upgrade from SQLite to PostgreSQL

## 🤔 SQLite vs PostgreSQL

### Current SQLite Limitations:
- ❌ Single-writer (bottleneck with multiple users)
- ❌ No connection pooling
- ❌ Limited concurrent reads
- ❌ File-based (single point of failure)
- ❌ No advanced indexing
- ❌ Limited full-text search

### PostgreSQL Benefits:
- ✅ Multi-user concurrent access
- ✅ Connection pooling
- ✅ Advanced indexing (face encoding optimization)
- ✅ Full-text search (student names, subjects)
- ✅ JSON support (metadata storage)
- ✅ Backup/replication built-in
- ✅ ACID compliance
- ✅ Triggers and stored procedures

## 📊 When to Migrate?

| Metric | SQLite Limit | Your Current | Migrate When |
|--------|--------------|--------------|--------------|
| **Students** | ~1,000 | 11 | >100 students |
| **Concurrent Users** | 1-2 | 1 | >5 users |
| **Daily Attendance** | ~500 records | <50 | >200/day |
| **Database Size** | ~1GB | <10MB | >100MB |
| **Face Recognition Speed** | Slower | Good | Need <1s response |

**Recommendation**: Migrate now for future-proofing and performance gains.

## 🚀 Migration Strategy

### Step 1: Update Database Models
```python
# backend/database.py - Enhanced for PostgreSQL
import os
from sqlalchemy import create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import QueuePool

# PostgreSQL Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://user:password@localhost:5432/attendance")

# Optimized engine for PostgreSQL
engine = create_engine(
    DATABASE_URL,
    pool_size=20,          # Connection pool
    max_overflow=30,       # Extra connections
    pool_pre_ping=True,    # Health checks
    pool_recycle=3600,     # Recycle connections hourly
    echo=False,            # SQL debugging (set True for development)
    future=True            # Use SQLAlchemy 2.0 style
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False, 
    bind=engine,
    expire_on_commit=False  # Keep objects after commit
)

Base = declarative_base()
```

### Step 2: Optimized Models for Face Recognition
```python
# Enhanced models with PostgreSQL-specific optimizations
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Float, Text, Index
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY
import uuid

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(UUID(as_uuid=True), default=uuid.uuid4, unique=True, index=True)
    student_id = Column(String(50), unique=True, index=True)
    name = Column(String(255), nullable=False, index=True)  # Indexed for fast search
    email = Column(String(255), unique=True, index=True)
    phone = Column(String(20), index=True)
    class_id = Column(Integer, ForeignKey("classes.id"), index=True)
    
    # Face recognition optimizations
    face_encoding = Column(ARRAY(Float), nullable=True)  # Direct array storage
    face_encoding_metadata = Column(JSONB, default={})   # JSON metadata
    face_model_version = Column(String(50), default="facenet512")
    
    # Performance tracking
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Database indexes for performance
    __table_args__ = (
        Index('idx_student_class_active', 'class_id', 'is_active'),
        Index('idx_student_name_search', 'name'),  # For search functionality
        Index('idx_student_created', 'created_at'),
    )

class AttendanceRecord(Base):
    __tablename__ = "attendance_records"
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id"), index=True)
    student_id = Column(Integer, ForeignKey("students.id"), index=True)
    
    # Enhanced recognition data
    confidence = Column(Float, nullable=False, index=True)  # For confidence queries
    detection_metadata = Column(JSONB, default={})  # Recognition details
    face_coordinates = Column(JSONB, default={})    # Bounding box data
    
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Composite indexes for performance
    __table_args__ = (
        Index('idx_attendance_session_student', 'session_id', 'student_id'),
        Index('idx_attendance_date_range', 'timestamp'),
        Index('idx_attendance_confidence', 'confidence'),
    )
```

### Step 3: Migration Script
```python
# migrate_to_postgresql.py
import sqlite3
import psycopg2
from sqlalchemy import create_engine
import json
import numpy as np

def migrate_sqlite_to_postgresql():
    # Source SQLite database
    sqlite_conn = sqlite3.connect('backend/attendance.db')
    sqlite_cursor = sqlite_conn.cursor()
    
    # Target PostgreSQL database
    pg_engine = create_engine(DATABASE_URL)
    
    with pg_engine.begin() as pg_conn:
        print("🔄 Migrating students...")
        sqlite_cursor.execute("SELECT * FROM students")
        students = sqlite_cursor.fetchall()
        
        for student in students:
            # Convert face encoding from file to array
            if student['face_encoding_path']:
                encoding = np.load(student['face_encoding_path'])
                encoding_array = encoding.tolist()
            else:
                encoding_array = None
                
            pg_conn.execute("""
                INSERT INTO students (id, student_id, name, email, phone, class_id, 
                                    face_encoding, photo_path, is_active, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                student['id'], student['student_id'], student['name'], 
                student['email'], student['phone'], student['class_id'],
                encoding_array, student['photo_path'], student['is_active'],
                student['created_at']
            ))
        
        print("🔄 Migrating attendance records...")
        sqlite_cursor.execute("""
            SELECT ar.*, s.name as student_name 
            FROM attendance_records ar 
            JOIN students s ON ar.student_id = s.id
        """)
        records = sqlite_cursor.fetchall()
        
        for record in records:
            metadata = {
                "detection_method": "facenet512",
                "student_name": record['student_name'],
                "migrated_from_sqlite": True
            }
            
            pg_conn.execute("""
                INSERT INTO attendance_records (id, session_id, student_id, 
                                              confidence, detection_metadata, timestamp)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                record['id'], record['session_id'], record['student_id'],
                record.get('confidence', 0.9), json.dumps(metadata),
                record['timestamp']
            ))
        
        print("✅ Migration completed successfully!")

if __name__ == "__main__":
    migrate_sqlite_to_postgresql()
```

### Step 4: Environment Configuration
```bash
# .env (PostgreSQL version)
# Database Configuration
DATABASE_TYPE=postgresql
DATABASE_URL=postgresql://username:password@hostname:5432/database_name

# Or individual components:
POSTGRES_HOST=your-db-host.com
POSTGRES_PORT=5432
POSTGRES_DB=facial_attendance
POSTGRES_USER=attendance_user
POSTGRES_PASSWORD=secure_password_123

# Connection pool settings
DB_POOL_SIZE=20
DB_MAX_OVERFLOW=30
DB_POOL_RECYCLE=3600

# Face Recognition Optimization
FACE_RECOGNITION_BATCH_SIZE=10
FACE_ENCODING_CACHE_SIZE=1000
```

## 🚀 Performance Benefits After Migration

### 1. **Faster Face Recognition**
```python
# Optimized face recognition with PostgreSQL
async def find_matching_students_optimized(face_encoding, class_id, threshold=0.6):
    """PostgreSQL-optimized face matching with vector operations"""
    
    query = """
    SELECT id, student_id, name, face_encoding,
           cosine_distance(face_encoding, %s) as distance
    FROM students 
    WHERE class_id = %s 
      AND is_active = true 
      AND face_encoding IS NOT NULL
    ORDER BY distance
    LIMIT 10
    """
    
    # PostgreSQL can do vector math directly in database
    results = await db.fetch_all(query, (face_encoding.tolist(), class_id))
    
    # Filter by threshold
    matches = [r for r in results if r['distance'] < (1 - threshold)]
    return matches
```

### 2. **Batch Processing**
```python
# Process multiple faces simultaneously
async def batch_face_recognition(face_encodings, class_id):
    """Process multiple faces in a single database query"""
    
    # PostgreSQL array operations
    query = """
    WITH face_batch AS (
        SELECT unnest(%s::float[][]) as query_encoding,
               generate_subscripts(%s::float[][], 1) as batch_index
    )
    SELECT fb.batch_index, s.id, s.name, s.student_id,
           cosine_distance(s.face_encoding, fb.query_encoding) as distance
    FROM face_batch fb
    CROSS JOIN students s
    WHERE s.class_id = %s 
      AND s.is_active = true
      AND s.face_encoding IS NOT NULL
    ORDER BY fb.batch_index, distance
    """
    
    batch_results = await db.fetch_all(query, (
        face_encodings.tolist(), 
        face_encodings.tolist(),  # Needed twice for unnest and generate_subscripts
        class_id
    ))
    
    return batch_results
```

### 3. **Intelligent Caching**
```python
# Redis + PostgreSQL caching strategy
from redis import Redis
import json

class FaceRecognitionCache:
    def __init__(self):
        self.redis = Redis(host='localhost', port=6379, db=0)
        self.cache_ttl = 3600  # 1 hour
    
    async def get_class_encodings(self, class_id):
        """Cache face encodings per class for fast access"""
        
        cache_key = f"class_encodings:{class_id}"
        cached = self.redis.get(cache_key)
        
        if cached:
            return json.loads(cached)
        
        # Load from PostgreSQL
        query = """
        SELECT id, student_id, name, face_encoding
        FROM students 
        WHERE class_id = %s 
          AND is_active = true 
          AND face_encoding IS NOT NULL
        """
        
        results = await db.fetch_all(query, (class_id,))
        
        # Cache for future use
        self.redis.setex(cache_key, self.cache_ttl, json.dumps(results))
        
        return results
```

## 📈 Expected Performance Improvements

| Operation | SQLite Time | PostgreSQL Time | Improvement |
|-----------|-------------|-----------------|-------------|
| **Single Face Match** | 200-500ms | 50-100ms | **5x faster** |
| **Batch Recognition (10 faces)** | 2-5 seconds | 200-500ms | **10x faster** |
| **Student Search** | 100-200ms | 10-20ms | **10x faster** |
| **Attendance Report** | 1-3 seconds | 100-300ms | **10x faster** |
| **Concurrent Users** | 1-2 users | 50+ users | **25x scaling** |

## 🎯 Migration Recommendation

**For your current scale (11 students)**: SQLite is fine, but PostgreSQL will future-proof your system.

**For growth (50+ students)**: PostgreSQL becomes essential.

**For performance**: PostgreSQL + proper indexing + caching = dramatically faster face recognition.

**Best approach**: Migrate to PostgreSQL now on a modern platform like Railway or DigitalOcean, then add performance optimizations.