"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div id="main" className="shell page-space">
      <p className="eyebrow">System status · interrupted</p>
      <h1 className="page-title">This view could not be loaded.</h1>
      <button type="button" onClick={reset} className="button-primary mt-8">
        Try again
      </button>
    </div>
  );
}
