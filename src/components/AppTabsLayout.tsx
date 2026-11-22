import { useLayoutEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import AppNavigation from "./AppNavigation";

export default function AppTabsLayout() {
    const { pathname } = useLocation();
    const content = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        if (content.current) content.current.scrollTop = 0;
    }, [pathname]);

    return (
        <div className="flex h-dvh flex-col overflow-hidden bg-slate-100 text-slate-900 dark:bg-slate-900 dark:text-slate-100 md:flex-row">
            <AppNavigation />
            <div ref={content} className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain md:[scrollbar-gutter:stable]">
                <Outlet />
            </div>
        </div>
    );
}
