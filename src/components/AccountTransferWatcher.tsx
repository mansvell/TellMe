import { useEffect } from "react";
import { watchTransferredSession } from "../lib/transferStorage";

export default function AccountTransferWatcher() {
    useEffect(watchTransferredSession, []);
    return null;
}
