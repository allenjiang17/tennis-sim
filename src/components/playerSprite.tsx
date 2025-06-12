import React, { useEffect, useRef } from "react";

export default function SwingingTennisPlayer({
  player,
  swing,
  swingType = "forehand",
}: {
  player: "player" | "opponent";
  swing: boolean;
  swingType?: "forehand" | "backhand";
}) {
  const racketRef = useRef<SVGGElement>(null);
  const previousSwing = useRef(false);

  useEffect(() => {
    console.log("run useEffect)");
    console.log("swing:", swing, "previousSwing:", previousSwing.current);

    if (swing && !previousSwing.current) {

      const g = racketRef.current;
      if (!g) return;

      // Reset swing
      g.setAttribute("transform", "rotate(0 50 50)");

      requestAnimationFrame(() => {
        setTimeout(() => {
          const angle = swingType === "forehand" ? -120 : 120;
          g.setAttribute("transform", `rotate(${angle} 50 50)`);
        }, 50);

        setTimeout(() => {
          g.setAttribute("transform", "rotate(0 50 50)");
          // Reset swing tracking once done
        }, 300);
      });
    }
    previousSwing.current = swing;

  }, [swing]);

  return (
    <svg viewBox="0 0 100 100" width={28} height={28}>
      <circle cx="50" cy="50" r="12" fill={player === "player" ? "green" : "red"}/>
      <g ref={racketRef} transform="rotate(0 50 50)">
        {(swingType === "forehand" && player === "player" || swingType === "backhand" && player === "opponent") ? 
          <line x1="62" y1="50" x2="90" y2="50" stroke="black" strokeWidth="4" />
          :
          <line x1="38" y1="50" x2="10" y2="50" stroke="black" strokeWidth="4" />
        }
      </g>
    </svg>
  );
}