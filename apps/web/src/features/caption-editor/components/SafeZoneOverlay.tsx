interface SafeZoneOverlayProps {
  visible: boolean;
}

export function SafeZoneOverlay({ visible }: SafeZoneOverlayProps) {
  if (!visible) return null;

  return (
    <div className="absolute inset-0 pointer-events-none border-2 border-dashed border-[#16A34A] flex flex-col justify-between p-4 z-40">
      <span className="text-[10px] font-mono text-white bg-[#16A34A] px-2 py-0.5 rounded-md self-start font-bold shadow-md">
        Safe Zone Top
      </span>
      <span className="text-[10px] font-mono text-white bg-[#16A34A] px-2 py-0.5 rounded-md self-end font-bold shadow-md">
        Reels / TikTok UI Safe Zone
      </span>
    </div>
  );
}
