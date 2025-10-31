import { useTranslation } from "react-i18next";

function Example({ exercise }: { exercise: string }) {
  const { t } = useTranslation();
  return (
    <>
      <h2>{t("explanation.title", { exercise })}</h2>
      <button>{t("actions.clearAll")}</button>
    </>
  );
}

export default Example; 