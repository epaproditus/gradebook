import { Card } from "@/components/ui/card";

export default function Loading() {
  return (
    <div className="p-4">
      <Card className="mb-6">
        <div className="p-6 space-y-4">
          <div className="w-[180px] h-8 bg-gray-200 rounded animate-pulse" />
          <div className="w-full h-[400px] bg-gray-100 rounded animate-pulse" />
        </div>
      </Card>
    </div>
  );
}
