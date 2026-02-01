import LogoMark from "./LogoMark";

export default function Brand({
  size = 24,
  textClassName = "",
  wrapClassName = "",
}: {
  size?: number;
  textClassName?: string;
  wrapClassName?: string;
}) {
  return (
    <span className={`brandInline ${wrapClassName}`}>
      <LogoMark size={size} className="brandLogo" />
      <span className={`brandName ${textClassName}`}>TrusToken</span>
    </span>
  );
}
