// ...existing imports...

const getBasePeriods = (periods: string[]): string[] => {
  const uniqueBases = new Set(periods.map(p => p.split(' ')[0]));
  return Array.from(uniqueBases).sort((a, b) => {
    const aNum = parseInt(a.match(/\d+/)?.[0] || '0');
    const bNum = parseInt(b.match(/\d+/)?.[0] || '0');
    return aNum - bNum;
  });
};

return (
  <Select
    value={selectedPeriod.split(' ')[0]} // Only use base period for value
    onValueChange={setSelectedPeriod}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select period" />
    </SelectTrigger>
    <SelectContent>
      {getBasePeriods(Object.keys(students)).map(period => (
        <SelectItem key={period} value={period}>
          Period {period}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);
