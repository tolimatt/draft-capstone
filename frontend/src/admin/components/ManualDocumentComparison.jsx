import { useEffect, useState } from "react";
import { adminDataApi } from "../adminDataApi";

const fieldLabels = {
  full_name: "Holder / registered person's full name", birth_date: "Date of birth", document_number: "Document number",
  issue_date: "Issue date (if shown)", expiration_date: "Expiry date (if shown)",
  business_name: "Registered business name", permit_number: "Permit / registration number",
  tax_identification_number: "TIN", branch_code: "Branch code",
};

export default function ManualDocumentComparison({ document, onCompare }) {
  const [context, setContext] = useState(null);
  const [fields, setFields] = useState({});
  const [checks, setChecks] = useState({});
  const [country, setCountry] = useState("");
  const [surface, setSurface] = useState("PHYSICAL_DOCUMENT");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    adminDataApi.getDocumentComparison(document.id).then((result) => {
      if (!active) return;
      if (result.reviewVersion !== document.reviewVersion || result.fileHash !== document.fileHash) {
        throw new Error("The document changed. Close this review and refresh the document list.");
      }
      setContext(result);
      setFields(result.fields || {});
    }).catch((failure) => { if (active) setError(failure.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [document.id, document.reviewVersion, document.fileHash, attempt]);

  const isId = document.docType === "id";
  const bir = /BIR/.test(document.selectedDocCategory || "");
  const visibleFields = isId ? ["full_name", "birth_date", "document_number", "issue_date", "expiration_date"]
    : ["full_name", "business_name", ...(bir ? ["tax_identification_number", "branch_code"] : ["permit_number"]), "issue_date", "expiration_date"];
  const confirmations = [
    ["readable", "The complete document is readable."],
    ["original", "I inspected the original physical or official digital document, rather than a page of matching text."],
    ["officialLayout", `The visible layout belongs to ${document.selectedDocCategory}.`],
    ["officialMarkings", "The expected issuing-body markings and required document features are visible."],
    ["noVisibleAlteration", "I found no visible alteration requiring further investigation."],
    ...(isId ? [["holderPortrait", "The holder's portrait is visible."]] : []),
    ...(document.selectedDocCategory === "Philippine Passport" ? [["machineReadableZone", "The passport's machine-readable zone is visible."]] : []),
  ];
  const ready = context && !loading && !error && country === "PH" && confirmations.every(([key]) => checks[key] === true);
  return (
    <section aria-labelledby="manual-comparison-title" className="mt-5 border-t border-slate-200 pt-5">
      <h4 id="manual-comparison-title" className="text-base font-bold text-slate-950">Compare document details</h4>
      <p className="mt-2 text-sm leading-6 text-slate-700">Text extraction helps read fields. It does not establish document authenticity. Inspect the original preview and correct the values below. Saving this comparison leaves final approval pending.</p>
      {loading ? <p role="status" className="mt-3 text-sm text-slate-700">Loading registration details and OCR suggestions…</p> : null}
      {error ? <div role="alert" className="mt-3 text-sm text-rose-700"><p>{error}</p><button type="button" onClick={() => { setLoading(true); setError(""); setAttempt((value) => value + 1); }} className="mt-2 h-11 rounded-lg border border-slate-300 px-3 font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100">Retry loading</button></div> : null}
      {context && !loading && !error ? <>
        <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
          {Object.entries(context.profile || {}).filter(([, value]) => value).map(([key, value]) => <div key={key} className="min-w-0"><dt className="font-semibold text-slate-700">Registration: {key.replaceAll("_", " ")}</dt><dd className="break-words text-slate-950">{value}</dd></div>)}
        </dl>
        <p className="mt-4 text-sm leading-6 text-slate-700">{context.extractionNote}</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {visibleFields.map((key) => <label key={key} className="min-w-0 text-sm font-semibold text-slate-700">{fieldLabels[key]}<input
            type={key.endsWith("date") ? "date" : "text"} value={fields[key] || ""} maxLength={200} autoComplete="off"
            onChange={(event) => setFields((current) => ({ ...current, [key]: event.target.value }))}
            className="mt-1 h-11 w-full min-w-0 rounded-lg border border-slate-300 px-3 text-base font-normal text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" /></label>)}
          <label className="text-sm font-semibold text-slate-700">Issuing country<select value={country} onChange={(event) => setCountry(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-base font-normal text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><option value="">Confirm country</option><option value="PH">Philippines</option><option value="other">Another country / uncertain</option></select></label>
          {!isId ? <label className="text-sm font-semibold text-slate-700">Original document format<select value={surface} onChange={(event) => setSurface(event.target.value)} className="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3 text-base font-normal text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"><option value="PHYSICAL_DOCUMENT">Physical document</option><option value="OFFICIAL_DIGITAL_DOCUMENT">Official digital document</option></select></label> : null}
        </div>
        <fieldset className="mt-4 space-y-2"><legend className="mb-2 text-sm font-semibold text-slate-950">Confirm your inspection</legend>
          {confirmations.map(([key, label]) => <label key={key} className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm leading-6 text-slate-700"><input type="checkbox" checked={checks[key] === true} onChange={(event) => setChecks((current) => ({ ...current, [key]: event.target.checked }))} className="mt-1 h-4 w-4 shrink-0 accent-blue-600 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100" /><span>{label}</span></label>)}
        </fieldset>
        <button type="button" disabled={!ready} onClick={() => onCompare({ fields, confirmations: checks, issuingCountry: country, documentSurface: surface,
          documentType: document.selectedDocCategory, fileHash: context.fileHash, reviewVersion: context.reviewVersion })}
          className="mt-3 min-h-11 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-600">Save inspected comparison</button>
      </> : null}
    </section>
  );
}
