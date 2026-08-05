/**
 * OrionLogo — logomarca oficial do ORION
 * Usa orion_logo_3.png (recomendada pelo guia técnico)
 * Suporta dark/light mode automaticamente
 */

interface OrionLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

const SIZES: Record<string, string> = {
  sm: "h-7",
  md: "h-10",
  lg: "h-16",
};

export function OrionLogo({ size = "md", className = "", showText = true }: OrionLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <img
        src="/assets/images/orion_logo.png"
        alt="ORION Logo"
        className={`${SIZES[size]} w-auto`}
        loading="eager"
      />
      {showText && (
        <span className="font-display text-lg font-bold tracking-tight text-white">
          ORION
        </span>
      )}
    </div>
  );
}

export default OrionLogo;
