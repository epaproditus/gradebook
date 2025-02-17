import { FC } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface ColorSettingsProps {
  showColors: boolean;
  colorMode: 'none' | 'subject' | 'type' | 'status';
  onShowColorsChange: (show: boolean) => void;
  onColorModeChange: (mode: 'none' | 'subject' | 'type' | 'status') => void;
}

export const ColorSettings: FC<ColorSettingsProps> = ({
  showColors,
  colorMode,
  onShowColorsChange,
  onColorModeChange,
}) => {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={showColors}
          onCheckedChange={(checked) => {
            onShowColorsChange(!!checked);
            if (checked) {
              onColorModeChange('status');
            }
          }}
        />
        <span className="text-sm">Show Colors</span>
      </div>
      {showColors && (
        <Select
          value={colorMode}
          onValueChange={(value: 'none' | 'subject' | 'type' | 'status') => onColorModeChange(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Color by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="status">Color by Status</SelectItem>
            <SelectItem value="type">Color by Type</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
};
