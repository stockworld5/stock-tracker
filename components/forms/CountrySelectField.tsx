"use client";

import { useId, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import countryList from "react-select-country-list";

export default function CountrySelectField({
  value,
  onChange,
  triggerClassName,
}: {
  value: string;
  onChange: (value: string) => void;
  triggerClassName?: string;
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const countries = countryList().getData();

  const selectedCountry = countries.find((c) => c.value === value);

  const getFlagEmoji = (code: string) =>
    String.fromCodePoint(
      ...code
        .toUpperCase()
        .split("")
        .map((c) => 127397 + c.charCodeAt(0))
    );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-controls={listboxId}
          aria-expanded={open}
          className={cn(
            "flex h-12 w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm shadow-sm transition",
            "outline-none hover:border-slate-300 hover:bg-slate-50/80",
            "focus-visible:border-blue-400 focus-visible:ring-4 focus-visible:ring-blue-100",
            triggerClassName
          )}
        >
          {selectedCountry ? (
            <span className="flex min-w-0 items-center gap-3">
              <span className="text-base leading-none">
                {getFlagEmoji(selectedCountry.value)}
              </span>
              <span className="truncate font-medium text-slate-900">
                {selectedCountry.label}
              </span>
            </span>
          ) : (
            <span className="text-slate-400">Select your country...</span>
          )}

          <ChevronsUpDown className="h-4 w-4 shrink-0 text-slate-400" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] min-w-[280px] rounded-2xl border border-slate-200 p-0 shadow-[0_16px_40px_rgba(15,23,42,0.10)]"
      >
        <Command>
          <CommandInput placeholder="Search countries…" className="h-11" />
          <CommandEmpty>No country found.</CommandEmpty>

          <CommandList id={listboxId} className="max-h-64">
            <CommandGroup>
              {countries.map((country) => (
                <CommandItem
                  key={country.value}
                  value={`${country.label} ${country.value}`}
                  onSelect={() => {
                    onChange(country.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 px-3 py-2.5"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      value === country.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="text-base leading-none">
                      {getFlagEmoji(country.value)}
                    </span>
                    <span className="truncate">{country.label}</span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
