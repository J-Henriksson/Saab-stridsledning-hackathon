import { useMemo } from "react";
// @ts-expect-error milsymbol has no bundled types
import ms from "milsymbol";

interface UnitSymbolProps {
  sidc: string;
  size?: number;
  className?: string;
  title?: string;
}

export function UnitSymbol({ sidc, size = 36, className, title }: UnitSymbolProps) {
  const svg = useMemo(() => {
    try {
      const sym = new ms.Symbol(sidc, { size });
      return sym.asSVG();
    } catch {
      return "";
    }
  }, [sidc, size]);

  if (!svg) {
    return <span className={className} title={title}>?</span>;
  }
  return (
    <span
      className={className}
      title={title}
      style={{ display: "inline-block", width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
