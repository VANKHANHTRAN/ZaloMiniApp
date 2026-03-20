// Ghi history theo chuẩn:
// { status, time, by, role, note, photos: [], action, duration_from_last_step }
export function makeHistoryLog({
  status,
  by,
  role,
  note,
  photos,
  action,
  duration_from_last_step,
}) {
  return {
    status,
    time: new Date().toISOString(),
    by,
    role,
    note: note || "",
    photos: Array.isArray(photos) ? photos : [],
    action: action || note || "",
    duration_from_last_step: duration_from_last_step || "",
  };
}

