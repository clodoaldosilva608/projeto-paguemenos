import { useBranding } from "@/contexts/ThemeContext";

/**
 * DynamicBranding — renderiza o nome do app + logo dinamicamente
 * baseado nas variáveis de ambiente ou config salva no localStorage.
 *
 * Fallback: se não houver white-label configurado, mostra "ORION"
 * com o logo padrão (sol/círculo azul).
 *
 * Quando o Orion injeta VITE_APP_NAME, VITE_PRIMARY_COLOR, VITE_LOGO_URL,
 * este componente se adapta automaticamente.
 */
export function DynamicLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const branding = useBranding();

  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-16 w-16",
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
  };

  if (branding.logoUrl) {
    // Logo customizado (white-label)
    return (
      <img
        src={branding.logoUrl}
        alt={branding.appName}
        className={`${sizes[size]} rounded-lg object-contain`}
      />
    );
  }

  // Logo padrão (ORION — sol/círculo azul)
  return (
    <div
      className={`${sizes[size]} flex items-center justify-center rounded-xl shadow-lg`}
      style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={1.5} className={iconSizes[size]}>
        <circle cx="12" cy="12" r="3" />
        <path
          d="M12 2v4M12 18v4M4.9 4.9l2.9 2.9M16.2 16.2l2.9 2.9M2 12h4M18 12h4M4.9 19.1l2.9-2.9M16.2 7.8l2.9-2.9"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * DynamicAppName — renderiza o nome do app
 */
export function DynamicAppName({ className = "" }: { className?: string }) {
  const branding = useBranding();
  return <span className={className}>{branding.appName}</span>;
}

/**
 * DynamicHeader — cabeçalho completo com logo + nome
 */
export function DynamicHeader({ subtitle }: { subtitle?: string }) {
  const branding = useBranding();

  return (
    <div className="flex items-center gap-3">
      <DynamicLogo size="md" />
      <div>
        <h1 className="font-display text-lg leading-none text-white">{branding.appName}</h1>
        {subtitle && <p className="mt-0.5 text-[10px] uppercase tracking-[0.3em] text-blue-400">{subtitle}</p>}
        {branding.companyName && (
          <p className="mt-0.5 text-[10px] text-slate-400">{branding.companyName}</p>
        )}
      </div>
    </div>
  );
}
