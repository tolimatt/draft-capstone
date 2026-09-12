const acronyms = new Set(["suv", "mpv", "atv", "utv", "ev"]);

export function formatVehicleClassification(value) {
  return String(value || "").trim().replace(/\S+/g, (word) => {
    const lower = word.toLowerCase();
    return acronyms.has(lower) ? lower.toUpperCase() : lower.charAt(0).toUpperCase() + lower.slice(1);
  });
}

export function presentVehicle(vehicle) {
  return {
    ...vehicle,
    type: formatVehicleClassification(vehicle.type),
    category: formatVehicleClassification(vehicle.category),
    description: String(vehicle.description || "").trim(),
  };
}
