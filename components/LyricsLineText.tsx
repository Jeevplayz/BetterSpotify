/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { classes } from "@utils/misc";
import { React } from "@webpack/common";

import { LyricsLine } from "../lib/lyrics";

export function LyricsLineText({ line, position, highlightWord = false }: { line: LyricsLine; position: number; highlightWord?: boolean; }) {
    if (!line.words?.length) return <>{line.text || "♪"}</>;

    let activeWord = -1;
    if (highlightWord) {
        for (let i = 0; i < line.words.length; i++) {
            if (line.words[i].time > position) break;
            activeWord = i;
        }
    }

    return (
        <>
            {line.words.map((word, index) => (
                <span
                    key={word.time + "-" + index}
                    className={classes("vc-spotify-lyrics-word", highlightWord && index === activeWord && "is-active")}
                >
                    {word.text}{index < line.words.length - 1 ? " " : ""}
                </span>
            ))}
        </>
    );
}
