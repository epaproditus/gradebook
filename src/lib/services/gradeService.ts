import { type GradeInfo } from '@/lib/gradeCalculations';

export class GradeService {
  static calculateTotal(grade: string | null | undefined, extra: string = '0'): number {
    // Empty grades count as zero
    const baseGrade = !grade || grade.trim() === '' 
      ? 0 
      : Math.max(0, Math.min(100, parseInt(grade) || 0));
    
    const extraGrade = Math.max(0, Math.min(100, parseInt(extra) || 0));
    return Math.min(100, baseGrade + extraGrade);
  }

  static calculateAverage(grades: GradeInfo[]): number {
    if (grades.length === 0) return 0;
    
    const validGrades = grades.map(g => this.calculateTotal(g.grade, g.extra));
    return validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
  }
}
