"use client";

type Props = {
  activeTab: "editor" | "personalize";
  onTabChange: (tab: "editor" | "personalize") => void;
};

export default function TopBar({ activeTab, onTabChange }: Props) {
  return (
    <div className="top-bar">
      <div className="top-bar-brand">
        <svg
          className="top-bar-logo-icon"
          width="26"
          height="26"
          viewBox="0 0 26 26"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Continuous open arc forming an abstract "C" — represents
              "Continuum" as an unbroken, flowing line. Open at the top
              right so it reads as a letterform, not a closed circle. */}
          <path
            d="M19.5 7C17.9 4.6 15.2 3 12 3C6.5 3 2 7.5 2 13C2 18.5 6.5 23 12 23C15.2 23 17.9 21.4 19.5 19"
            stroke="#e4e4e7"
            strokeWidth="2.4"
            strokeLinecap="round"
          />
          {/* Small green accent dot at the line's leading end — a quiet
              highlight suggesting a cursor/continuation point, not a
              dominant second color. */}
          <circle cx="20.5" cy="6.2" r="1.9" fill="#4ade80" />
        </svg>
        <span className="top-bar-wordmark">Continuum</span>
      </div>

      <div className="top-bar-tabs">
        <button
          type="button"
          className={activeTab === "editor" ? "active" : ""}
          onClick={() => onTabChange("editor")}
        >
          Editor
        </button>
        <button
          type="button"
          className={activeTab === "personalize" ? "active" : ""}
          onClick={() => onTabChange("personalize")}
        >
          Personalize
        </button>
      </div>
    </div>
  );
}