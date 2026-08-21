import { Link } from "@tanstack/react-router";
import { useConsent } from "@/lib/consent";

export function ConsentCheck() {
  const agreed = useConsent((s) => s.agreed);
  const setAgreed = useConsent((s) => s.setAgreed);

  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-snug">
      <input
        type="checkbox"
        checked={agreed}
        onChange={(e) => setAgreed(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-fg"
        autoComplete="off"
        required
      />
      <span>
        Соглашаюсь на обработку персональных данных.{" "}
        <Link to="/legal" className="underline underline-offset-2 hover:text-fg">
          152-ФЗ
        </Link>
      </span>
    </label>
  );
}
