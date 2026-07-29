type TellMeLogoProps = {
    size?: number;
    showText?: boolean;
};

export default function TellMeLogo({
                                       size = 130,
                                       showText = true,
                                   }: TellMeLogoProps) {
    return (
        <div className="flex flex-col items-center select-none">
            <svg
                width={size}
                height={size}
                viewBox="0 0 180 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
            >
                <defs>
                    <linearGradient id="cloudGradient" x1="0" y1="0" x2="180" y2="180">
                        <stop offset="0%" stopColor="#5AC8FA" />
                        <stop offset="100%" stopColor="#0EA5E9" />
                    </linearGradient>

                    <filter
                        id="shadow"
                        x="-50%"
                        y="-50%"
                        width="200%"
                        height="200%"
                    >
                        <feDropShadow
                            dx="0"
                            dy="10"
                            stdDeviation="12"
                            floodColor="#38BDF8"
                            floodOpacity="0.22"
                        />
                    </filter>
                </defs>

                {/* Cloud */}

                <g filter="url(#shadow)">
                    <path
                        d="
                        M45 118
                        C24 118 12 104 12 84
                        C12 64 27 50 46 49
                        C53 29 71 16 93 16
                        C118 16 138 31 144 54
                        C163 56 176 70 176 88
                        C176 107 161 121 141 121
                        Z
                    "
                        fill="url(#cloudGradient)"
                    />
                </g>

                {/* Thumb */}

                <g transform="translate(48 43)">
                    <path
                        d="
                        M36 66
                        C31 66 28 63 28 58
                        L28 35
                        C28 33 29 31 30 29
                        L41 13
                        C44 9 46 3 46 0
                        C55 3 57 12 55 21
                        L52 35
                        H76
                        C82 35 86 39 86 45
                        C86 48 85 51 83 53
                        L73 74
                        C71 79 66 82 61 82
                        H42
                        C38 82 36 79 36 75
                        Z
                    "
                        fill="white"
                    />

                    <rect
                        x="8"
                        y="36"
                        width="20"
                        height="46"
                        rx="8"
                        fill="white"
                    />
                </g>
            </svg>

            {showText && (
                <>
                    <h1 className="mt-7 text-5xl font-black tracking-tight">
                        <span className="text-slate-900">Tell</span>
                        <span className="text-sky-500">Me</span>
                    </h1>

                    <p className="mt-3 text-center text-slate-500 text-lg leading-relaxed">
                        Le vrai. Le bon.
                        <br />
                        Ta liberté d'expression.
                    </p>
                </>
            )}
        </div>
    );
}