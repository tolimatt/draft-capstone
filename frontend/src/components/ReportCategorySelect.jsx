import { Check, ChevronDown } from "lucide-react";
import { useId, useMemo, useState } from "react";

export default function ReportCategorySelect({
  label,
  placeholder,
  groups = [],
  value,
  onChange,
  disabled = false,
}) {
  const listboxId = useId();
  const [open, setOpen] = useState(false);
  const selectedLabel = useMemo(
    () => groups.flatMap((group) => group.options).find(([optionValue]) => optionValue === value)?.[1] || "",
    [groups, value]
  );

  const selectOption = (optionValue) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div
      className="block"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <span className="mb-1.5 block text-sm font-semibold text-slate-800">{label}</span>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (["ArrowDown", "ArrowUp"].includes(event.key)) {
            event.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border bg-white px-3 py-2.5 text-left text-sm outline-none transition focus:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${
          open
            ? "border-blue-500 ring-4 ring-blue-100"
            : "border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-100"
        }`}
      >
        <span className={selectedLabel ? "font-medium text-slate-900" : "text-slate-500"}>
          {selectedLabel || placeholder}
        </span>
        <ChevronDown size={18} strokeWidth={2} className={`shrink-0 text-blue-600 transition ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="mt-2 max-h-56 overflow-y-auto overscroll-contain rounded-xl border border-slate-200 bg-slate-50 p-2 shadow-inner"
        >
          {groups.map((group, groupIndex) => (
            <div
              key={group.label}
              role="group"
              aria-label={group.label}
              className={groupIndex ? "mt-2 border-t border-slate-200 pt-2" : ""}
            >
              <p className="px-2 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.options.map(([optionValue, optionLabel]) => {
                  const selected = optionValue === value;
                  return (
                    <button
                      key={optionValue}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => selectOption(optionValue)}
                      className={`flex w-full items-start justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm leading-5 transition ${
                        selected
                          ? "bg-blue-600 font-semibold text-white"
                          : "bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-800"
                      }`}
                    >
                      <span>{optionLabel}</span>
                      {selected ? <Check size={16} className="mt-0.5 shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
