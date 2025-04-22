'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { debugDatePeriod, getSixWeeksForDate } from '@/lib/dateUtils';

export default function SixWeeksDebugger() {
  const [dateString, setDateString] = useState('2025-04-02');
  const [results, setResults] = useState<any>(null);

  const handleCheckDate = () => {
    try {
      // Use the built-in debug function from dateUtils
      const debugResult = debugDatePeriod(dateString);
      
      // Also check directly with getSixWeeksForDate for comparison
      const date = new Date(dateString);
      const directPeriod = getSixWeeksForDate(date);
      
      setResults({
        ...debugResult,
        directPeriod,
        inputDateObj: date.toString(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      setResults({ error: String(error) });
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Six Weeks Period Debugger</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 mb-6">
          <Input
            type="date"
            value={dateString}
            onChange={(e) => setDateString(e.target.value)}
            className="w-48"
          />
          <Button onClick={handleCheckDate}>Check Period</Button>
        </div>
        
        {results && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="font-semibold">Input Date:</div>
              <div>{format(new Date(results.inputDate), 'PPP')}</div>
              
              <div className="font-semibold">Input Date String:</div>
              <div className="break-all">{results.inputDate}</div>
              
              <div className="font-semibold">JavaScript Date:</div>
              <div className="break-all">{results.inputDateObj}</div>
              
              <div className="font-semibold">Normalized Date:</div>
              <div>{format(new Date(results.normalizedDate), 'PPP')}</div>
              
              <div className="font-semibold">Matched Period:</div>
              <div className="text-xl font-bold">{results.matchedPeriod}</div>
              
              <div className="font-semibold">Direct Period Check:</div>
              <div className="text-xl font-bold">{results.directPeriod}</div>
            </div>
            
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Period Matching Results:</h3>
              <div className="border rounded-md overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-muted">
                      <th className="px-4 py-2 text-left">Period</th>
                      <th className="px-4 py-2 text-left">Matches</th>
                      <th className="px-4 py-2 text-left">Start Date</th>
                      <th className="px-4 py-2 text-left">End Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.allPeriods?.map((period: any) => (
                      <tr key={period.period} className={period.matches ? "bg-green-50" : ""}>
                        <td className="px-4 py-2">{period.period}</td>
                        <td className="px-4 py-2">{period.matches ? "✅" : "❌"}</td>
                        <td className="px-4 py-2">{format(new Date(period.start), 'yyyy-MM-dd')}</td>
                        <td className="px-4 py-2">{format(new Date(period.end), 'yyyy-MM-dd')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}