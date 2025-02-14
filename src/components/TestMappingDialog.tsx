import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useSession } from 'next-auth/react';
import LoadingSpinner from './ui/loading-spinner';
import { supabase } from '@/lib/supabaseConfig';

interface TestDialogProps {
  courseId: string;
  courseName: string;
  period: string;
  open: boolean;
  onClose: () => void;
}

interface MappingDisplay {
  google: string;
  local: string;
  googleName: string;
  localName: string;
}

interface StudentRecord {
  id: string;
  name: string;
  class_period: string;
}

interface MappingRecord {
  id: string;
  google_id: string;
  google_email: string | null;
  period: string;
  students: StudentRecord;
}

export function TestMappingDialog({ courseId, courseName, period, open, onClose }: TestDialogProps) {
  const [mappings, setMappings] = useState<MappingDisplay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  useEffect(() => {
    async function loadMappings() {
      if (!period) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const { data, error } = await supabase
          .from('student_mappings')
          .select(`
            id,
            google_id,
            google_email,
            period,
            students!inner (
              id,
              name,
              class_period
            )
          `)
          .eq('period', period) as { data: MappingRecord[] | null, error: any };

        if (error) throw error;

        setDebugInfo({
          rawData: data,
          queryTime: new Date().toISOString(),
          period: period,
          courseId: courseId,
          mappingsFound: data?.length || 0
        });

        if (data && data.length > 0) {
          const formattedMappings = data.map(mapping => ({
            google: mapping.google_id,
            local: mapping.students.id,
            googleName: mapping.google_email?.split('@')[0] || 'Unknown',
            localName: mapping.students.name
          }));

          setMappings(formattedMappings);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load mappings');
        console.error('Mapping load error:', err);
      } finally {
        setLoading(false);
      }
    }

    if (open && period) {
      loadMappings();
    }
  }, [period, courseId, open]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Test Mapping View - {courseName} - Period {period}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner className="w-6 h-6 mr-2" />
            <span>Loading mappings...</span>
          </div>
        ) : error ? (
          <div className="bg-red-50 p-4 rounded-md">
            <p className="text-red-600">{error}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-md">
              <h3 className="font-medium mb-2">Current Mappings ({mappings.length})</h3>
              <div className="max-h-40 overflow-y-auto space-y-2">
                {mappings.map((mapping, index) => (
                  <div key={index} className="flex items-center justify-between bg-white p-2 rounded">
                    <span className="text-blue-600">{mapping.googleName}</span>
                    <span className="text-gray-400">→</span>
                    <span className="text-green-600">{mapping.localName}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-md">
              <h3 className="font-medium mb-2">Debug Information</h3>
              <pre className="text-xs bg-white p-2 rounded overflow-x-auto">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
