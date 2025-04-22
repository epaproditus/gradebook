'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { format } from 'date-fns';
import { getSixWeeksForDate } from '@/lib/dateUtils';

export default function FixSixWeeksPeriodsPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [results, setResults] = useState<{fixed: number, unchanged: number} | null>(null);
  const supabase = createClientComponentClient();

  // Load assignments on page load
  useEffect(() => {
    async function loadAssignments() {
      try {
        setLoading(true);
        const { data, error } = await supabase.from('assignments').select('*');
        if (error) throw error;
        
        // Convert date strings to Date objects
        const processedAssignments = data.map(assignment => ({
          ...assignment,
          date: new Date(assignment.date + 'T00:00:00Z') // Ensure consistent UTC handling
        }));
        
        setAssignments(processedAssignments);
      } catch (error) {
        console.error('Error loading assignments:', error);
        alert('Failed to load assignments');
      } finally {
        setLoading(false);
      }
    }
    
    loadAssignments();
  }, [supabase]);
  
  // Check which assignments have incorrect six_weeks_period
  const assignmentsWithIncorrectPeriod = assignments.filter(assignment => {
    const correctPeriod = getSixWeeksForDate(assignment.date);
    return assignment.six_weeks_period !== correctPeriod;
  });
  
  // Function to fix all assignments with incorrect periods
  const fixAllAssignments = async () => {
    try {
      setUpdating(true);
      let fixedCount = 0;
      
      // Process assignments in batches to avoid overwhelming the database
      for (const assignment of assignmentsWithIncorrectPeriod) {
        const correctPeriod = getSixWeeksForDate(assignment.date);
        
        const { error } = await supabase
          .from('assignments')
          .update({ six_weeks_period: correctPeriod })
          .eq('id', assignment.id);
          
        if (error) {
          console.error(`Failed to update assignment ${assignment.id}:`, error);
        } else {
          fixedCount++;
        }
      }
      
      // Update results for display
      setResults({
        fixed: fixedCount,
        unchanged: assignmentsWithIncorrectPeriod.length - fixedCount
      });
      
      // Reload assignments to reflect changes
      const { data, error } = await supabase.from('assignments').select('*');
      if (error) throw error;
      
      const processedAssignments = data.map(assignment => ({
        ...assignment,
        date: new Date(assignment.date + 'T00:00:00Z')
      }));
      
      setAssignments(processedAssignments);
      
    } catch (error) {
      console.error('Error fixing assignments:', error);
      alert('Failed to update some assignments');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Fix Six Weeks Periods Tool</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Assignment Six Weeks Period Fixer</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading assignments...</p>
          ) : (
            <>
              <p className="mb-4">
                Found <span className="font-bold">{assignments.length}</span> total assignments.
                <br />
                <span className="font-bold text-amber-600">{assignmentsWithIncorrectPeriod.length}</span> assignments have incorrect six weeks periods.
              </p>
              
              <Button 
                onClick={fixAllAssignments} 
                disabled={updating || assignmentsWithIncorrectPeriod.length === 0}
              >
                {updating ? 'Fixing...' : `Fix All ${assignmentsWithIncorrectPeriod.length} Assignments`}
              </Button>
              
              {results && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
                  <p>Results:</p>
                  <ul className="list-disc pl-6">
                    <li>{results.fixed} assignments fixed successfully</li>
                    <li>{results.unchanged} assignments failed to update</li>
                  </ul>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
      
      {assignmentsWithIncorrectPeriod.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Assignments with Incorrect Six Weeks Periods</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2 text-left">Name</th>
                    <th className="border p-2 text-left">Date</th>
                    <th className="border p-2 text-left">Current Period</th>
                    <th className="border p-2 text-left">Correct Period</th>
                  </tr>
                </thead>
                <tbody>
                  {assignmentsWithIncorrectPeriod.map(assignment => (
                    <tr key={assignment.id}>
                      <td className="border p-2">{assignment.name}</td>
                      <td className="border p-2">
                        {format(assignment.date, 'yyyy-MM-dd')}
                      </td>
                      <td className="border p-2 text-red-500">
                        {assignment.six_weeks_period || 'None'}
                      </td>
                      <td className="border p-2 text-green-500">
                        {getSixWeeksForDate(assignment.date)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}