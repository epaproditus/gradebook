# Google Classroom Technical Implementation Guide

## Authentication Flow

### 1. NextAuth Configuration
```typescript
// pages/api/auth/[...nextauth].ts
import GoogleProvider from "next-auth/providers/google";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_ID!,
      clientSecret: process.env.GOOGLE_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "https://www.googleapis.com/auth/classroom.courses.readonly",
            "https://www.googleapis.com/auth/classroom.coursework.me",
            "https://www.googleapis.com/auth/classroom.rosters.readonly"
          ].join(" ")
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken;
      return session;
    }
  }
};
```

## API Routes Implementation

### 1. Fetch Courses
```typescript
// api/classroom/courses/route.ts
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  
  const response = await fetch("https://classroom.googleapis.com/v1/courses", {
    headers: { Authorization: authHeader! }
  });
  
  const data = await response.json();
  return Response.json({ courses: data.courses || [] });
}
```

### 2. Fetch Course Work
```typescript
// api/classroom/coursework/route.ts
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const courseId = searchParams.get("courseId");
  const authHeader = request.headers.get("authorization");

  const response = await fetch(
    `https://classroom.googleapis.com/v1/courses/${courseId}/courseWork`,
    { headers: { Authorization: authHeader! } }
  );

  const data = await response.json();
  return Response.json({ courseWork: data.courseWork || [] });
}
```

## React Component Implementation

### 1. Course Selection
```typescript
const CourseSelect: FC<{ onSelect: (courseId: string) => void }> = ({ onSelect }) => {
  const { data: session } = useSession();
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (session?.accessToken) {
      fetch('/api/classroom/courses', {
        headers: {
          Authorization: `Bearer ${session.accessToken}`
        }
      })
      .then(res => res.json())
      .then(data => setCourses(data.courses));
    }
  }, [session]);

  return (
    <Select onValueChange={onSelect}>
      <SelectTrigger>
        <SelectValue placeholder="Select a course" />
      </SelectTrigger>
      <SelectContent>
        {courses.map(course => (
          <SelectItem key={course.id} value={course.id}>
            {course.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
```

## Error Handling Examples

```typescript
// Generic API error handler
const handleApiRequest = async (url: string, token: string) => {
  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      }
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Session validation
const validateSession = (session: Session | null) => {
  if (!session) throw new Error('No active session');
  if (!session.accessToken) throw new Error('No access token');
  return session.accessToken;
};
```

## Data Models

```typescript
interface Course {
  id: string;
  name: string;
  section?: string;
  description?: string;
}

interface CourseWork {
  id: string;
  title: string;
  description: string;
  maxPoints?: number;
  dueDate?: {
    year: number;
    month: number;
    day: number;
  };
}

interface Submission {
  courseWorkId: string;
  assignedGrade?: number;
  draftGrade?: number;
  state: 'TURNED_IN' | 'NEW' | 'RETURNED';
}
```

## Caching Implementation

```typescript
// Simple cache utility
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

class ApiCache {
  private static cache: Map<string, { data: any; timestamp: number }> = new Map();

  static set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  static get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > CACHE_DURATION) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
}

// Usage example
const fetchCourseWithCache = async (courseId: string, token: string) => {
  const cacheKey = `course_${courseId}`;
  const cached = ApiCache.get(cacheKey);
  
  if (cached) return cached;
  
  const data = await handleApiRequest(
    `/api/classroom/courses/${courseId}`,
    token
  );
  
  ApiCache.set(cacheKey, data);
  return data;
};
```

## Common Gotchas and Solutions

1. **Token Expiration**
   ```typescript
   const isTokenExpired = (error: any) => {
     return error.status === 401 || 
            error.message?.includes('invalid_token');
   };

   const handleTokenExpiration = async () => {
     await signOut();
     await signIn('google');
   };
   ```

2. **Rate Limiting**
   ```typescript
   const rateLimiter = {
     requests: new Map<string, number>(),
     reset: () => {
       setTimeout(() => rateLimiter.requests.clear(), 60000);
     },
     checkLimit: (endpoint: string, limit: number) => {
       const count = rateLimiter.requests.get(endpoint) || 0;
       if (count >= limit) return false;
       rateLimiter.requests.set(endpoint, count + 1);
       return true;
     }
   };
   ```

Remember to handle these implementations with proper error boundaries and loading states in your React components.
