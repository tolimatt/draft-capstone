import { useRef } from "react";
import { FileUp, X } from "lucide-react";
import { validateReportEvidenceFiles } from "../utils/fileValidation";

export default function EvidenceFilePicker({ files = [], onChange, onError, disabled = false }) {
  const inputRef = useRef(null);

  const chooseFiles = (event) => {
    const selected = Array.from(event.target.files || []);
    try {
      const validated = validateReportEvidenceFiles(selected);
      onChange?.(validated);
      onError?.("");
    } catch (validationError) {
      onChange?.([]);
      onError?.(validationError.message || "The selected evidence files are invalid.");
    } finally {
      event.target.value = "";
    }
  };

  const removeFile = (index) => {
    onChange?.(files.filter((_, fileIndex) => fileIndex !== index));
    onError?.("");
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-blue-300">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <FileUp size={18} className="text-blue-600" />Private evidence (optional)
          </span>
          <span className="mt-1 block text-xs leading-5 text-slate-500">
            Up to five JPG, PNG, WEBP, or PDF files, 5 MB each. Only you and reviewing administrators can view them.
          </span>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="shrink-0 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={chooseFiles}
          disabled={disabled}
          className="hidden"
          aria-label="Choose private evidence files"
        />
      </div>
      {files.length ? (
        <ul className="mt-3 space-y-2" aria-label="Selected evidence files">
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700">
              <span className="min-w-0 truncate">{file.name}</span>
              <button type="button" onClick={() => removeFile(index)} disabled={disabled} aria-label={`Remove ${file.name}`} className="shrink-0 rounded p-0.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50">
                <X size={16} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
