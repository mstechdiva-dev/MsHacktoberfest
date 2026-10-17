"use client";

// Settings are kept in this browser only. settings.json holds the defaults for everyone.
export default function SettingsPanel({ open, onClose, values, defaults, skins, problems, source, onSource, helper, onHelper, onChange, onReset }) {
  if (!open) return null;
  const num = (key, label, hint) => (
    <label className="field" key={key}>
      <span>{label}</span>
      <input type="number" value={values[key]} onChange={(e) => onChange(key, e.target.value === "" ? "" : Number(e.target.value))} />
      <small>{hint} Default {defaults[key]}.</small>
    </label>
  );
  return (
    <div className="panel" role="dialog" aria-label="Settings">
      <div className="panel-head">
        <h2>Settings</h2>
        <button type="button" onClick={onClose}>Done</button>
      </div>
      {problems.length > 0 ? (
        <ul className="problems">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}

      <label className="field">
        <span>Where the memory number comes from</span>
        <select value={source} onChange={(e) => onSource(e.target.value)}>
          <option value="demo">Demo slider</option>
          <option value="tab">This browser tab only (Chrome or Edge)</option>
          <option value="helper">Helper on this computer (real memory)</option>
        </select>
      </label>
      {source === "helper" ? (
        <>
          <label className="field">
            <span>Helper address</span>
            <input type="text" value={helper.url} onChange={(e) => onHelper({ ...helper, url: e.target.value.trim() })} />
          </label>
          <label className="field">
            <span>Helper code</span>
            <input type="password" value={helper.token} onChange={(e) => onHelper({ ...helper, token: e.target.value.trim() })} />
            <small>The helper prints the address and code when it starts.</small>
          </label>
        </>
      ) : null}

      <label className="field">
        <span>Figure</span>
        <select value={values.skin} onChange={(e) => onChange("skin", e.target.value)}>
          {skins.map((s) => (
            <option key={s.id} value={s.id}>
              {s.id}{s.source === "community" ? " (community)" : ""}
            </option>
          ))}
        </select>
      </label>
      {num("enterPercent", "He arrives at (percent)", "The figure comes out at this memory percent or higher.")}
      {num("leavePercent", "He leaves below (percent)", "Keep this lower than the arrival number.")}
      {num("reminderMinutes", "Reminder every (minutes)", "How often the reminder repeats while memory stays high.")}
      {num("snoozeMinutes", "Snooze lasts (minutes)", "How long Snooze holds him back.")}
      {num("autoOnHours", "Turn off lasts (hours)", "Turn off switches itself back on after this long.")}
      {num("pollSeconds", "Check every (seconds)", "How often the helper is asked for a new reading.")}
      <div className="panel-foot">
        <button type="button" onClick={onReset}>Back to the defaults</button>
      </div>
    </div>
  );
}
