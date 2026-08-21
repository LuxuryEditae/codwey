import { Link } from "@tanstack/react-router";
import { useConsent } from "@/lib/consent";
import { useHydrated } from "@/lib/use-hydrated";

export function ConsentCheck() {
  const hydrated = useHydrated();
  const agreed = useConsent((s) => s.agreed);
  const setAgreed = useConsent((s) => s.setAgreed);
  const checked = hydrated && agreed;

  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm leading-snug">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => setAgreed(e.target.checked)}
        className="mt-1 size-5 shrink-0 accent-fg"
        required
      />
      <span>
        Соглашаюсь на обработку персональных данных. Без галочки заявку не примем.{" "}
        <Link to="/legal" className="underline underline-offset-2 hover:text-fg">
          Закон 152-ФЗ
        </Link>
      </span>
    </label>
  );
}
