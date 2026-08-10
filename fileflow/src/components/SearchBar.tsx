import { Search, X } from "lucide-react";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

export default function SearchBar({ value, onChange }: Readonly<{ value: string; onChange: (value: string) => void }>) {
  return <InputGroup className="max-w-md">
    <InputGroupAddon>
    <Search />
    </InputGroupAddon>
    <InputGroupInput 
      value={value} 
      onChange={(event) => onChange(event.target.value)} 
      placeholder="Search in My files" aria-label="Search files" />
      {value ? <InputGroupAddon align="inline-end">
      <InputGroupButton 
        size="icon-xs" 
        aria-label="Clear search" 
        onClick={() => onChange("")}>
          <X />
      </InputGroupButton>
    </InputGroupAddon> : null}
    </InputGroup>;
}
