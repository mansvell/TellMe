import { forwardRef } from "react";
import { t } from "../i18n/runtime";
import BuzzShareCard from "./BuzzShareCard";

const SecretShareCard = forwardRef<HTMLDivElement>((_, ref) => (
    <BuzzShareCard ref={ref} message={t("Dis moi tout en anonyme")} footerMessage={t("Clique sur le lien")} arrows={2} />
));
SecretShareCard.displayName = "SecretShareCard";
export default SecretShareCard;
