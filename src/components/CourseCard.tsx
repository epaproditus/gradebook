import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface CourseCardProps {
  name: string;
  section?: string;
  id: string;
  onSync: (courseId: string) => void;
}

export function CourseCard({ name, section, id, onSync }: CourseCardProps) {
  return (
    <Card className="p-6 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">{name}</h3>
        {section && <p className="text-sm text-gray-500">{section}</p>}
      </div>
      <div className="flex justify-end">
        <Button onClick={() => onSync(id)}>
          Sync Assignments
        </Button>
      </div>
    </Card>
  );
}
