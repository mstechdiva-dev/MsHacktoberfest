// The four-phase machine: calm -> opening -> nagging -> leaving -> calm.
// Pure functions only, so it can be tested without a browser or a clock.

export const OPEN_MS = 3500; // how long the door and figure take to arrive
export const LEAVE_MS = 3500; // how long he takes to step back and the door to close

export function initialState() {
  return { phase: "calm", since: 0, lastReminderAt: 0, pausedUntil: 0, pausedKind: "" };
}

// kind is "snooze" or "off"; both just hold the figure back until pausedUntil.
export function pause(state, now, ms, kind) {
  return { ...state, pausedUntil: now + ms, pausedKind: kind };
}

export function clearPause(state) {
  return { ...state, pausedUntil: 0, pausedKind: "" };
}

// input: { percent, now } where percent is null when there is no reading yet.
// s: settings with enterPercent, leavePercent, reminderMinutes (openMs / leaveMs optional).
// Returns { state, events } where events is a list of "arrive" | "reminder" | "leave".
export function step(state, input, s) {
  const { percent, now } = input;
  const openMs = s.openMs ?? OPEN_MS;
  const leaveMs = s.leaveMs ?? LEAVE_MS;
  const events = [];
  const next = { ...state };
  const paused = now < state.pausedUntil;
  const hasReading = typeof percent === "number" && !Number.isNaN(percent);

  const go = (phase) => {
    next.phase = phase;
    next.since = now;
  };

  if (state.phase === "calm") {
    if (!paused && hasReading && percent >= s.enterPercent) {
      go("opening");
      next.lastReminderAt = now;
      events.push("arrive");
    }
  } else if (state.phase === "opening" || state.phase === "nagging") {
    // He only leaves below leavePercent (or when paused); the gap is what stops the flicker.
    if (paused || (hasReading && percent < s.leavePercent)) {
      go("leaving");
      events.push("leave");
    } else if (state.phase === "opening" && now - state.since >= openMs) {
      go("nagging");
    } else if (state.phase === "nagging" && now - state.lastReminderAt >= s.reminderMinutes * 60000) {
      next.lastReminderAt = now;
      events.push("reminder");
    }
  } else if (state.phase === "leaving") {
    if (now - state.since >= leaveMs) go("calm");
  }

  return { state: next, events };
}
