/*
 * Vencord, a modification for Discord's desktop app
 * GPL v3
 */

import { Switch } from "@components/Switch";
import { BaseText } from "@components/BaseText";
import { classNameFactory } from "@api/Styles";
import { SettingsSection } from "@components/settings/tabs/plugins/components/Common";
import { React, Select, Slider, TextInput, useEffect, useState } from "@webpack/common";
import { classes } from "@utils/misc";

import { settings } from "../settings";
import "../settingsTabs.css";

const cl = classNameFactory("vc-spotify-settings-");
type Tab = "general" | "lyrics" | "appearance";

const fontOptions = [
    { label: "Discord Default", value: "inherit", default: true },
    { label: "Sans Serif", value: "'gg sans', 'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
    { label: "Monospace", value: "'Consolas', 'Courier New', monospace" },
    { label: "Rounded", value: "'Varela Round', 'Segoe UI Rounded', sans-serif" }
];

const validOptionalHex = (value: string) => value === "" || /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(value);
const validColor = (value: string) => value === "" || /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value) || value === "transparent" || /^(?:rgba?|var)\(.+\)$/.test(value);

function Toggle({ id, name, description, value, onChange }: { id: string; name: string; description: string; value: boolean; onChange(value: boolean): void; }) {
    return <SettingsSection tag="label" id={id} name={name} description={description} inlineSetting><Switch checked={value} onChange={onChange} /></SettingsSection>;
}

function TextOption({ id, name, description, value, placeholder, onChange }: { id: string; name: string; description: string; value: string; placeholder?: string; onChange(value: string): void; }) {
    return <SettingsSection id={id} name={name} description={description}><TextInput type="text" value={value} placeholder={placeholder ?? "Enter a value"} maxLength={null} onChange={onChange} /></SettingsSection>;
}

function NumberOption({ id, name, description, value, onChange }: { id: string; name: string; description: string; value: number; onChange(value: number): void; }) {
    const [draft, setDraft] = useState(String(value));
    const [error, setError] = useState<string | null>(null);
    useEffect(() => setDraft(String(value)), [value]);
    return (
        <SettingsSection id={id} name={name} description={description} error={error}>
            <TextInput type="number" value={draft} placeholder="1" maxLength={null} min={0} max={5} step={0.1}
                onChange={next => {
                    setDraft(next);
                    if (next === "") return;
                    const parsed = Number(next);
                    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 5) {
                        setError(null);
                        onChange(parsed);
                    } else setError("Enter a line height from 0 to 5. Decimals are allowed.");
                }}
                onBlur={() => setDraft(String(value))}
            />
        </SettingsSection>
    );
}

function ColorOption({ id, name, description, value, placeholder, isValid, onChange }: { id: string; name: string; description: string; value: string; placeholder: string; isValid(value: string): boolean; onChange(value: string): void; }) {
    const [draft, setDraft] = useState(value);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => setDraft(value), [value]);
    return (
        <SettingsSection id={id} name={name} description={description} error={error}>
            <TextInput type="text" value={draft} placeholder={placeholder} maxLength={null}
                onChange={next => {
                    setDraft(next);
                    if (isValid(next)) {
                        setError(null);
                        onChange(next);
                    } else setError("Enter a valid color or leave this field blank to use the default.");
                }}
                onBlur={() => setDraft(value)}
            />
        </SettingsSection>
    );
}

function SliderOption({ id, name, description, value, markers, unit, onChange }: { id: string; name: string; description: string; value: number; markers: number[]; unit?: string; onChange(value: number): void; }) {
    return (
        <SettingsSection id={id} name={name} description={description}>
            <Slider markers={markers} minValue={markers[0]} maxValue={markers[markers.length - 1]} initialValue={value} onValueChange={onChange} onValueRender={(next: number) => `${next}${unit ?? ""}`} stickToMarkers />
        </SettingsSection>
    );
}

export function SettingsTabs() {
    const values = settings.use([
        "spotifyClientId", "useSpotifyUris", "previousButtonRestartsTrack", "showSeekBar", "autoplayFallback",
        "showLyricsPreview", "lyricsPreviewFontSize", "lyricsPreviewLineCount", "lyricsPreviewEnglishLineHeight", "lyricsPreviewHindiLineHeight", "lyricsTextColor", "lyricsGlowColor", "menuAccentColor",
        "fontFamily", "fontSize", "albumSize", "menuIconSize", "accentColor", "backgroundColor"
    ]);
    const [tab, setTab] = useState<Tab>("general");
    const set = (key: keyof typeof values, value: unknown) => { (settings.store as any)[key] = value; };

    return (
        <div className={cl("panel")}>
            <div className={cl("tabs")} role="tablist" aria-label="BetterSpotify settings">
                {([["general", "General"], ["lyrics", "Lyrics"], ["appearance", "Appearance"]] as const).map(([id, label]) => (
                    <button key={id} type="button" role="tab" aria-selected={tab === id} className={classes(cl("tab"), tab === id && "is-active")} onClick={() => setTab(id)}>{label}</button>
                ))}
            </div>

            <div role="tabpanel" className={cl("content")}>
                {tab === "general" && <>
                    <TextOption id="spotifyClientId" name="Spotify Client ID" description="Spotify Developer Client ID. Do not enter a Client Secret." value={values.spotifyClientId} placeholder="Enter your Spotify Client ID" onChange={value => set("spotifyClientId", value)} />
                    <Toggle id="useSpotifyUris" name="Use Spotify URIs" description="Open Spotify URIs instead of Spotify URLs. Requires Spotify installed." value={values.useSpotifyUris} onChange={value => set("useSpotifyUris", value)} />
                    <Toggle id="previousButtonRestartsTrack" name="Previous Button Restarts Track" description="Restart the current track when pressing previous if playtime is over 3 seconds." value={values.previousButtonRestartsTrack} onChange={value => set("previousButtonRestartsTrack", value)} />
                    <Toggle id="showSeekBar" name="Show Seek Bar" description="Show a draggable seek bar to scrub through the track." value={values.showSeekBar} onChange={value => set("showSeekBar", value)} />
                    <Toggle id="autoplayFallback" name="Autoplay Fallback" description="Start a random track from Liked Songs if playback stops with an empty queue." value={values.autoplayFallback} onChange={value => set("autoplayFallback", value)} />
                </>}

                {tab === "lyrics" && <>
                    <Toggle id="showLyricsPreview" name="Show Lyrics Preview" description="Show the current and upcoming synced lyric below the mini-player." value={values.showLyricsPreview} onChange={value => set("showLyricsPreview", value)} />
                    <SliderOption id="lyricsPreviewFontSize" name="Lyrics Preview Font Size" description="Font size in pixels for the lyrics below the mini-player." value={values.lyricsPreviewFontSize} markers={[10, 12, 14, 16, 18]} unit="px" onChange={value => set("lyricsPreviewFontSize", value)} />
                    <SliderOption id="lyricsPreviewLineCount" name="Lyrics Preview Lines" description="Number of lyric lines shown around the current line (1–10)." value={values.lyricsPreviewLineCount} markers={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} onChange={value => set("lyricsPreviewLineCount", value)} />
                    <NumberOption id="lyricsPreviewEnglishLineHeight" name="English Lyrics Line Height" description="Line height for English lyrics (0–5; decimals allowed)." value={values.lyricsPreviewEnglishLineHeight} onChange={value => set("lyricsPreviewEnglishLineHeight", value)} />
                    <NumberOption id="lyricsPreviewHindiLineHeight" name="Hindi Lyrics Line Height" description="Line height for Hindi lyrics (0–5; decimals allowed)." value={values.lyricsPreviewHindiLineHeight} onChange={value => set("lyricsPreviewHindiLineHeight", value)} />
                    <ColorOption id="lyricsTextColor" name="Lyrics Text Color" description="Lyrics text color in the Spotify menu and mini-player preview." value={values.lyricsTextColor} placeholder="Default: BetterSpotify theme text color" isValid={validOptionalHex} onChange={value => set("lyricsTextColor", value)} />
                    <ColorOption id="lyricsGlowColor" name="Lyrics Glow Color" description="Highlight color for the currently playing lyric." value={values.lyricsGlowColor} placeholder="Default: Discord theme highlight color" isValid={validOptionalHex} onChange={value => set("lyricsGlowColor", value)} />
                </>}

                {tab === "appearance" && <>
                    <ColorOption id="menuAccentColor" name="Spotify Menu Accent Color" description="Accent color used inside the Spotify menu." value={values.menuAccentColor} placeholder="Default: Discord theme blue accent" isValid={validOptionalHex} onChange={value => set("menuAccentColor", value)} />
                    <ColorOption id="accentColor" name="Player Accent Color" description="Accent color for the mini-player seek bar." value={values.accentColor} placeholder="Default: Discord theme accent color" isValid={validColor} onChange={value => set("accentColor", value)} />
                    <ColorOption id="backgroundColor" name="Player Background Color" description="Background color for the mini-player. Leave blank for transparent." value={values.backgroundColor} placeholder="Default: Transparent" isValid={validColor} onChange={value => set("backgroundColor", value)} />
                    <SettingsSection id="fontFamily" name="Font Family" description="Font used for the player's text.">
                        <Select options={fontOptions} maxVisibleItems={5} closeOnSelect select={value => set("fontFamily", value)} isSelected={value => value === values.fontFamily} serialize={value => String(value)} />
                    </SettingsSection>
                    <SliderOption id="fontSize" name="Title Font Size" description="Base font size in pixels for the song title." value={values.fontSize} markers={[11, 12, 13, 14, 15, 16, 17, 18]} unit="px" onChange={value => set("fontSize", value)} />
                    <SliderOption id="albumSize" name="Album Art Size" description="Album art size in pixels." value={values.albumSize} markers={Array.from({ length: 31 }, (_, i) => i + 20)} unit="px" onChange={value => set("albumSize", value)} />
                    <SliderOption id="menuIconSize" name="Spotify Menu Icon Size" description="Size of the shuffle, previous, play/pause, next, and repeat icons in the Spotify menu. Each step changes the size by 1px." value={values.menuIconSize} markers={Array.from({ length: 15 }, (_, i) => i + 14)} unit="px" onChange={value => set("menuIconSize", value)} />
                    <BaseText className={cl("note")} size="sm">Icon appearance follows the selected Discord theme.</BaseText>
                </>}
            </div>
        </div>
    );
}
