import { google } from 'googleapis';

export interface StudentProfile {
  id: string;
  name: { givenName: string; familyName: string; fullName: string };
  emailAddress: string;
  photoUrl?: string;
}

export async function fetchStudentProfiles(auth: any, courseId: string): Promise<StudentProfile[]> {
  const classroom = google.classroom({ version: 'v1', auth });
  
  try {
    const response = await classroom.courses.students.list({
      courseId: courseId,
      pageSize: 100
    });

    if (!response.data.students) {
      return [];
    }

    return response.data.students.map(student => ({
      id: student.userId || '',
      name: {
        givenName: student.profile?.name?.givenName || '',
        familyName: student.profile?.name?.familyName || '',
        fullName: student.profile?.name?.fullName || ''
      },
      emailAddress: student.profile?.emailAddress || '',
      photoUrl: student.profile?.photoUrl || undefined
    }));
  } catch (error: any) {
    throw new Error(`Failed to fetch student profiles: ${error.message}`);
  }
}

export function matchStudentsByName(
  classroomStudents: StudentProfile[],
  localStudents: { id: number; name: string }[]
): Map<number, { googleId: string; googleEmail: string; googleName: string }> {
  const matches = new Map();
  
  console.log('Matching students:');
  console.log('Classroom students:', classroomStudents.length);
  console.log('Local students:', localStudents.length);
  
  for (const localStudent of localStudents) {
    const normalizedLocalName = normalizeStudentName(localStudent.name);
    const match = findBestNameMatch(normalizedLocalName, classroomStudents);
    
    if (match) {
      console.log(`Matched: ${localStudent.name} -> ${match.name.fullName} (${match.id})`);
      matches.set(localStudent.id, {
        googleId: match.id,
        googleEmail: match.emailAddress,
        googleName: match.name.fullName
      });
    } else {
      console.log(`No match found for: ${localStudent.name}`);
    }
  }
  
  return matches;
}

function normalizeStudentName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestNameMatch(localName: string, classroomStudents: StudentProfile[]): StudentProfile | null {
  let bestMatch: StudentProfile | null = null;
  let highestScore = 0;
  
  for (const student of classroomStudents) {
    const classroomName = normalizeStudentName(student.name.fullName);
    const score = calculateNameSimilarity(localName, classroomName);
    
    if (score > highestScore && score > 0.8) { // 80% similarity threshold
      highestScore = score;
      bestMatch = student;
    }
  }
  
  return bestMatch;
}

function calculateNameSimilarity(name1: string, name2: string): number {
  const shorter = name1.length < name2.length ? name1 : name2;
  const longer = name1.length < name2.length ? name2 : name1;
  
  if (longer.length === 0) return 1.0;
  
  const costs: number[] = new Array(shorter.length + 1);
  for (let i = 0; i <= shorter.length; i++) costs[i] = i;
  
  for (let i = 1; i <= longer.length; i++) {
    let nw = i - 1;
    costs[0] = i;
    
    for (let j = 1; j <= shorter.length; j++) {
      const cj = Math.min(
        1 + Math.min(costs[j], costs[j - 1]),
        longer[i - 1] === shorter[j - 1] ? nw : nw + 1
      );
      nw = costs[j];
      costs[j] = cj;
    }
  }
  
  return (longer.length - costs[shorter.length]) / longer.length;
}
