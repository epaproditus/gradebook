import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SixWeeeksSelectorProps {
  value: string | null;
  onChange: (value: string | null) => void;
}

export function SixWeeksSelector({ value, onChange }: SixWeeeksSelectorProps) {
  return (
    <Select
      value={value || "all"}
      onValueChange={(v) => onChange(v === "all" ? null : v)}
    >
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select Six Weeks" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All Periods</SelectItem>
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
