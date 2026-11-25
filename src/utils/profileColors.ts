export function profileAvatarStyle(value: string) {
    const backgroundColor = /^#[0-9a-f]{6}$/i.test(value) ? value : "#0EA5E9";
    const [red, green, blue] = [1, 3, 5].map(start => {
        const channel = parseInt(backgroundColor.slice(start, start + 2), 16) / 255;
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    const luminance = red * 0.2126 + green * 0.7152 + blue * 0.0722;
    return { backgroundColor, color: luminance > 0.179 ? "#000000" : "#FFFFFF" };
}
