import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SixWeeksSelectorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export function SixWeeksSelector({ value, onChange, className }: SixWeeksSelectorProps) {
  return (
    <Select
      value={value}
      onValueChange={onChange}
      className={className}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Grading Window" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All</SelectItem>
        <SelectItem value="1SW">1st Six Weeks</SelectItem>
        <SelectItem value="2SW">2nd Six Weeks</SelectItem>
        <SelectItem value="3SW">3rd Six Weeks</SelectItem>
        <SelectItem value="4SW">4th Six Weeks</SelectItem>
        <SelectItem value="5SW">5th Six Weeks</SelectItem>
        <SelectItem value="6SW">6th Six Weeks</SelectItem>
      </SelectContent>
    </Select>
  );
}
