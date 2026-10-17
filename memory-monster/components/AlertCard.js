"use client";

// The card pinned top-left. It lists the biggest programs when the helper supplies them,
// and says plainly when it cannot see them. Closing anything needs a second, separate click.
export default function AlertCard({ show, message, top, sample, canClose, note, pulse, asking, onAsk, onConfirm, onCancel }) {
  return (
    <div className={`card${show ? " show" : ""}${pulse ? " pulse" : ""}`} role="alert" aria-live="polite">
      <h2>{message}</h2>
      {top && top.length > 0 ? (
        <ul>
          {top.map((p) => (
            <li key={p.name} className={asking === p.name ? "asking" : ""}>
              {asking === p.name ? (
                <div className="confirm">
                  <span>Close {p.name}? Anything you have not saved in it can be lost.</span>
                  <span className="confirm-btns">
                    <button type="button" className="closeit" onClick={() => onConfirm(p.name)}>Yes, close it</button>
                    <button type="button" className="closeit quiet" onClick={onCancel}>Not now</button>
                  </span>
                </div>
              ) : (
                <>
                  <span className="pname">{p.name}</span>
                  <span className="pmb">{p.mb >= 1024 ? `${(p.mb / 1024).toFixed(1)} GB` : `${p.mb} MB`}</span>
                  {canClose && !sample ? (
                    <button type="button" className="closeit" onClick={() => onAsk(p.name)}>
                      Close it
                    </button>
                  ) : null}
                </>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="tiny">To see which programs use the most memory, connect the helper in Settings.</p>
      )}
      {sample ? <p className="tiny">These programs are sample data for the test.</p> : null}
      {note ? <p className="tiny">{note}</p> : null}
    </div>
  );
}
