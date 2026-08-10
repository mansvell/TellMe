import {
    ArrowLeft,
    ExternalLink,
    File,
    FileText,
    Image as ImageIcon,
    LoaderCircle,
    Play,
    Video,
} from "lucide-react";

import {
    Link,
    useParams,
} from "react-router-dom";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getGroupMedia,
    type GroupMediaItem,
    type GroupMediaKind,
} from "../services/group";


type MediaTab =
    | "image"
    | "video"
    | "file";


export default function MediaPage() {

    const { groupId } =
        useParams<{ groupId: string }>();

    const [media, setMedia] =
        useState<GroupMediaItem[]>([]);

    const [activeTab, setActiveTab] =
        useState<MediaTab>("image");

    const [loading, setLoading] =
        useState(true);

    const [preview, setPreview] =
        useState<GroupMediaItem | null>(null);


    // Charge tous les médias du groupe.
    useEffect(() => {

        if (!groupId) return;

        let active = true;

        getGroupMedia(groupId)
            .then((data) => {

                if (!active) return;

                setMedia(data);
                setLoading(false);
            })
            .catch((error) => {

                console.error(
                    "Media error:",
                    error,
                );

                if (active) {
                    setLoading(false);
                }
            });

        return () => {
            active = false;
        };

    }, [groupId]);


    const filteredMedia =
        useMemo(
            () =>
                media.filter(
                    (item) =>
                        item.kind === activeTab,
                ),
            [media, activeTab],
        );


    function count(
        kind: GroupMediaKind,
    ): number {

        return media.filter(
            (item) => item.kind === kind,
        ).length;
    }


    return (

        <main className="min-h-screen bg-slate-100">

            <header className="sticky top-0 z-20 border-b border-slate-200 bg-white">

                <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-5">

                    <Link
                        to={`/gdetailp/${groupId}`}
                        className="flex h-10 w-10 items-center justify-center rounded-xl hover:bg-slate-100"
                    >
                        <ArrowLeft />
                    </Link>

                    <h1 className="text-xl font-bold">
                        Médias
                    </h1>

                </div>

            </header>


            <section className="mx-auto max-w-6xl p-5">

                {/* Tabs */}

                <div className="flex gap-2 overflow-x-auto pb-2">

                    <TabButton
                        active={
                            activeTab === "image"
                        }
                        onClick={() =>
                            setActiveTab("image")
                        }
                        icon={
                            <ImageIcon size={18} />
                        }
                        text={`Photos (${count("image")})`}
                    />

                    <TabButton
                        active={
                            activeTab === "video"
                        }
                        onClick={() =>
                            setActiveTab("video")
                        }
                        icon={
                            <Video size={18} />
                        }
                        text={`Vidéos (${count("video")})`}
                    />

                    <TabButton
                        active={
                            activeTab === "file"
                        }
                        onClick={() =>
                            setActiveTab("file")
                        }
                        icon={
                            <FileText size={18} />
                        }
                        text={`Fichiers (${count("file")})`}
                    />

                </div>


                {loading ? (

                    <div className="flex min-h-72 items-center justify-center">

                        <LoaderCircle
                            size={32}
                            className="animate-spin text-sky-500"
                        />

                    </div>

                ) : filteredMedia.length === 0 ? (

                    <EmptyMedia
                        activeTab={activeTab}
                    />

                ) : activeTab === "file" ? (

                    /* Fichiers */

                    <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm">

                        {filteredMedia.map(
                            (item) => (

                                <a
                                    key={item.id}
                                    href={
                                        item.signedUrl
                                    }
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-4 border-b p-4 transition last:border-0 hover:bg-slate-50 sm:p-5"
                                >

                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">

                                        <File size={22} />

                                    </div>

                                    <div className="min-w-0 flex-1">

                                        <p className="truncate font-semibold text-slate-800">
                                            {
                                                item.fileName
                                            }
                                        </p>

                                        <p className="mt-1 text-xs text-slate-400">

                                            {formatFileSize(
                                                item.fileSize,
                                            )}

                                            {" • "}

                                            {new Date(
                                                item.createdAt,
                                            ).toLocaleDateString(
                                                "fr-FR",
                                            )}

                                        </p>

                                    </div>

                                    <ExternalLink
                                        size={18}
                                        className="shrink-0 text-slate-400"
                                    />

                                </a>

                            ),
                        )}

                    </div>

                ) : (

                    /* Photos / vidéos */

                    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 md:gap-3 lg:grid-cols-4">

                        {filteredMedia.map(
                            (item) => (

                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() =>
                                        setPreview(
                                            item,
                                        )
                                    }
                                    className="group relative aspect-square overflow-hidden rounded-2xl bg-slate-200 sm:rounded-3xl"
                                >

                                    {item.kind ===
                                    "image" ? (

                                        <img
                                            src={
                                                item.signedUrl
                                            }
                                            alt={
                                                item.fileName
                                            }
                                            loading="lazy"
                                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                                        />

                                    ) : (

                                        <>
                                            <video
                                                src={
                                                    item.signedUrl
                                                }
                                                preload="metadata"
                                                className="h-full w-full object-cover"
                                            />

                                            <div className="absolute inset-0 flex items-center justify-center bg-black/20">

                                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/60 text-white">

                                                    <Play
                                                        size={
                                                            22
                                                        }
                                                        fill="currentColor"
                                                    />

                                                </div>

                                            </div>
                                        </>

                                    )}

                                </button>

                            ),
                        )}

                    </div>

                )}

            </section>


            {/* Preview plein écran */}

            {preview && (

                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
                    onClick={() =>
                        setPreview(null)
                    }
                >

                    <button
                        type="button"
                        onClick={() =>
                            setPreview(null)
                        }
                        className="absolute right-5 top-5 rounded-full bg-white/10 px-4 py-2 font-semibold text-white backdrop-blur"
                    >
                        Fermer
                    </button>

                    {preview.kind === "image" ? (

                        <img
                            src={preview.signedUrl}
                            alt={preview.fileName}
                            className="max-h-[88vh] max-w-full rounded-2xl object-contain"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        />

                    ) : (

                        <video
                            src={preview.signedUrl}
                            controls
                            autoPlay
                            className="max-h-[88vh] max-w-full rounded-2xl"
                            onClick={(event) =>
                                event.stopPropagation()
                            }
                        />

                    )}

                </div>

            )}

        </main>
    );
}


type TabButtonProps = {
    active: boolean;
    onClick: () => void;
    icon: React.ReactNode;
    text: string;
};


function TabButton({
                       active,
                       onClick,
                       icon,
                       text,
                   }: TabButtonProps) {

    return (

        <button
            type="button"
            onClick={onClick}
            className={`flex h-11 shrink-0 items-center gap-2 rounded-full px-5 font-semibold transition ${
                active
                    ? "bg-sky-500 text-white"
                    : "bg-white text-slate-600 hover:bg-sky-50"
            }`}
        >
            {icon}
            {text}
        </button>
    );
}


function EmptyMedia({
                        activeTab,
                    }: {
    activeTab: MediaTab;
}) {

    const label =
        activeTab === "image"
            ? "Aucune photo"
            : activeTab === "video"
                ? "Aucune vidéo"
                : "Aucun fichier";

    return (

        <div className="mt-6 flex min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-sky-100 text-sky-500">

                {activeTab === "image"
                    ? <ImageIcon size={26} />
                    : activeTab === "video"
                        ? <Video size={26} />
                        : <FileText size={26} />}

            </div>

            <p className="mt-4 font-semibold text-slate-700">
                {label}
            </p>

            <p className="mt-1 text-sm text-slate-400">
                Les éléments partagés dans le chat apparaîtront ici.
            </p>

        </div>
    );
}


// Affiche proprement la taille d'un fichier.
function formatFileSize(
    bytes: number | null,
): string {

    if (!bytes) return "Taille inconnue";

    if (bytes < 1024) {
        return `${bytes} o`;
    }

    if (bytes < 1024 * 1024) {
        return `${(
            bytes / 1024
        ).toFixed(1)} Ko`;
    }

    return `${(
        bytes
        / (1024 * 1024)
    ).toFixed(1)} Mo`;
}