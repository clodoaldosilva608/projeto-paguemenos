import type { ReactNode } from "react";
export default function Link({ href, children, className, ...rest }: { href: string; children: ReactNode; className?: string; [key: string]: unknown }) {
  return <a href={href} className={className} {...(rest as any)}>{children}</a>;
}
