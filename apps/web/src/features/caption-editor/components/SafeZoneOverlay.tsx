interface SafeZoneOverlayProps {
  visible: boolean;
}

export function SafeZoneOverlay({ visible }: SafeZoneOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-40 select-none overflow-hidden">
      {/* Top Header UI Margin Zone (Search & Following) */}
      <div className="absolute top-0 inset-x-0 h-[10%] border-b border-dashed border-[#16A34A]/70 bg-[#16A34A]/5 flex items-start justify-between p-2">
        <span className="text-[9px] font-mono font-bold text-white bg-[#16A34A] px-2 py-0.5 rounded shadow-xs">
          Header Margin (10%)
        </span>
      </div>

      {/* Right Engagement Buttons Margin Zone (Like, Comment, Share) */}
      <div className="absolute top-[10%] bottom-[22%] right-0 w-[14%] border-l border-dashed border-[#16A34A]/70 bg-[#16A34A]/5 flex flex-col items-center justify-center p-1">
        <span className="text-[8.5px] font-mono font-bold text-white bg-[#16A34A] px-1.5 py-0.5 rounded shadow-xs -rotate-90 whitespace-nowrap">
          Icons Zone
        </span>
      </div>

      {/* Bottom Description & Audio Margin Zone */}
      <div className="absolute bottom-0 inset-x-0 h-[22%] border-t border-dashed border-[#16A34A]/70 bg-[#16A34A]/5 flex items-end justify-between p-2.5">
        <span className="text-[9px] font-mono font-bold text-white bg-[#16A34A] px-2 py-0.5 rounded shadow-xs">
          Title & Audio Zone (22%)
        </span>
        <span className="text-[8.5px] font-mono font-bold text-[#16A34A] bg-black/70 px-2 py-0.5 rounded border border-[#16A34A]/30">
          Optimal Caption Area ↕
        </span>
      </div>

      {/* Center Framing Crosshairs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none opacity-40">
        <div className="absolute top-1/2 left-0 right-0 h-px bg-white" />
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white" />
      </div>
    </div>
  );
}
